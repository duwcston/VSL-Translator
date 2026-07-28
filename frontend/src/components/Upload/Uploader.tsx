import React from "react";
import { motion } from "framer-motion";
import { AlertCircle, Loader } from "lucide-react";
import UploadSection from "./UploadSection";
import MediaDisplay from "./MediaDisplay";
import DetectionDisplay from "./DetectionDisplay";
import ProgressBar from "../UI/ProgressBar";
import { EUploadStatus } from "../../types/FileIntermediate";
import useResultsApi from "../../api/resultsApi";
import { useFileUpload } from "../../hooks/useFileUpload";

const JOB_POLL_INTERVAL_MS = 400;

export default function Uploader() {
  const {
    file,
    isDragging,
    status,
    results,
    resultURL,
    currentTime,
    currentFrameDetections,
    uploadProgress,
    processingProgress,
    currentStage,
    inputRef,
    setStatus,
    setResults,
    setResultURL,
    setUploadProgress,
    setProcessingProgress,
    setCurrentStage,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleClick,
    handleFileChange,
    handleClear,
    handleTimeUpdate,
  } = useFileUpload();

  const resultApi = useResultsApi();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  // Invalidates any in-flight progress poll when a new upload starts, the
  // user clears the file, or the component unmounts mid-poll.
  const uploadTokenRef = React.useRef(0);

  React.useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      uploadTokenRef.current++;
    };
  }, []);

  // Handle video time update
  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      handleTimeUpdate(videoRef.current.currentTime);
    }
  };

  async function pollJobProgress(jobId: string, token: number, filename: string) {
    while (uploadTokenRef.current === token) {
      const job = await resultApi.getJobProgress(jobId);
      if (uploadTokenRef.current !== token) return;

      setProcessingProgress(job.progress);

      if (job.status === "done") {
        setResults((prev) => ({ ...prev, [filename]: job.result! }));
        setResultURL(resultApi.getResult());
        setStatus(EUploadStatus.Success);
        return;
      }

      if (job.status === "error") {
        throw new Error(job.error ?? "Processing failed");
      }

      await new Promise((resolve) => setTimeout(resolve, JOB_POLL_INTERVAL_MS));
    }
  }

  async function handleFileUpload() {
    if (!file) return;

    const token = ++uploadTokenRef.current;

    try {
      // Stage 1: Upload (real byte-level progress from the browser)
      setStatus(EUploadStatus.Uploading);
      setUploadProgress(0);
      setProcessingProgress(0);
      setCurrentStage("upload");

      const { job_id } = await resultApi.uploadFile(file, (progress) => {
        setUploadProgress(progress);
      });
      if (uploadTokenRef.current !== token) return;

      // Stage 2: Processing (real progress polled from the backend job)
      setStatus(EUploadStatus.Processing);
      setCurrentStage("processing");
      setUploadProgress(100);

      await pollJobProgress(job_id, token, file.name);
    } catch (error) {
      if (uploadTokenRef.current !== token) return;
      console.error(error);
      setStatus(EUploadStatus.Error);
      setUploadProgress(0);
      setProcessingProgress(0);
    }
  }

  const handleClearAndAbort = () => {
    uploadTokenRef.current++;
    handleClear();
  };

  return (
    <>
      <div className="space-y-6 p-4">
        {/* Error State */}
        {status === EUploadStatus.Error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg shadow-sm"
          >
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
              <div>
                <p className="text-red-800 font-medium">Upload Error</p>
                <p className="text-red-600 text-sm">
                  Error uploading file. Please try again.
                </p>
              </div>
            </div>
          </motion.div>
        )}
        {/* Processing State */}
        {(status === EUploadStatus.Uploading ||
          status === EUploadStatus.Processing) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6 shadow-lg"
          >
            <div className="flex items-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="mr-3"
              >
                <Loader className="h-5 w-5 text-blue-600" />
              </motion.div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {currentStage === "upload"
                    ? "Uploading File"
                    : "Processing & Detecting Signs"}
                </h3>
                <p className="text-gray-600 text-sm">
                  {currentStage === "upload"
                    ? "Uploading file to server..."
                    : "Running ASL detection on your file..."}
                </p>
              </div>
            </div>
            {currentStage === "upload" ? (
              <ProgressBar
                progress={uploadProgress}
                variant="gradient"
                label=""
                subLabel=""
              />
            ) : (
              <ProgressBar
                progress={processingProgress}
                variant="gradient"
                label=""
                subLabel=""
              />
            )}
          </motion.div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            <UploadSection
              file={file}
              isDragging={isDragging}
              status={status}
              inputRef={inputRef}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleClick}
              onFileChange={handleFileChange}
              onUpload={handleFileUpload}
              onClear={handleClearAndAbort}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <MediaDisplay
              status={status}
              resultURL={resultURL}
              results={results}
              videoRef={videoRef}
              onTimeUpdate={handleVideoTimeUpdate}
            />

            <DetectionDisplay
              results={results}
              currentTime={currentTime}
              currentFrameDetections={currentFrameDetections}
            />
          </motion.div>
        </div>
      </div>
    </>
  );
}
