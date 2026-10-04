import React from "react";
import { AlertCircle } from "lucide-react";
import UploadSection from "./UploadSection";
import MediaDisplay from "./MediaDisplay";
import DetectionDisplay from "./DetectionDisplay";
import ProgressBar from "../UI/ProgressBar";
import { EUploadStatus } from "../../types/FileIntermediate";
import useResultsApi from "../../api/resultsApi";
import { useFileUpload } from "../../hooks/useFileUpload";

const JOB_POLL_INTERVAL_MS = 400;

function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    // FastAPI errors arrive as { detail: "..." } (see httpClient).
    if ("detail" in error && typeof error.detail === "string") {
      return error.detail;
    }
    if (error instanceof Error && error.message) {
      return error.message;
    }
  }
  return "Error uploading file. Please make sure the backend is running and try again.";
}

export default function Uploader() {
  const {
    file,
    isDragging,
    status,
    errorMessage,
    results,
    resultURL,
    currentTime,
    currentFrameDetections,
    uploadProgress,
    processingProgress,
    currentStage,
    inputRef,
    setStatus,
    setErrorMessage,
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

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      handleTimeUpdate(time);
    }
  };

  async function pollJobProgress(
    jobId: string,
    token: number,
    filename: string,
  ) {
    while (uploadTokenRef.current === token) {
      const job = await resultApi.getJobProgress(jobId);
      if (uploadTokenRef.current !== token) return;

      setProcessingProgress(job.progress);

      if (job.status === "done") {
        setResults({ [filename]: job.result! });
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
      setErrorMessage(null);
      setResults({});
      setResultURL(null);
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
      setErrorMessage(getErrorMessage(error));
      setUploadProgress(0);
      setProcessingProgress(0);
    }
  }

  const handleClearAndAbort = () => {
    uploadTokenRef.current++;
    handleClear();
  };

  const isBusy =
    status === EUploadStatus.Uploading || status === EUploadStatus.Processing;

  return (
    <div className="space-y-6 p-2 sm:p-4">
      {/* Error State */}
      {status === EUploadStatus.Error && (
        <div
          role="alert"
          className="flex animate-fade-in items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="font-medium text-red-800">Upload Error</p>
            <p className="text-sm text-red-600">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Progress State */}
      {isBusy && (
        <div className="animate-fade-in space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div>
            <h3 className="font-semibold text-slate-800">
              {currentStage === "upload"
                ? "Uploading File"
                : "Processing & Detecting Signs"}
            </h3>
            <p className="text-sm text-slate-500">
              {currentStage === "upload"
                ? "Uploading file to server..."
                : "Running ASL detection on your file..."}
            </p>
          </div>
          <ProgressBar
            progress={
              currentStage === "upload" ? uploadProgress : processingProgress
            }
          />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
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
        </div>

        <div className="space-y-6">
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
            onSeek={handleSeek}
          />
        </div>
      </div>
    </div>
  );
}
