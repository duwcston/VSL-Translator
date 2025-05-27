import React from "react";
import UploadSection from "./Uploader/UploadSection";
import MediaDisplay from "./Uploader/MediaDisplay";
import DetectionDisplay from "./Uploader/DetectionDisplay";
import ProgressBar from "./UI/ProgressBar";
import { EUploadStatus } from "../types/FileIntermediate";
import useResultsApi from "../api/resultsApi";
import { useFileUpload } from "../hooks/useFileUpload";

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
        handleTimeUpdate
    } = useFileUpload();

    const resultApi = useResultsApi();
    const videoRef = React.useRef<HTMLVideoElement>(null);

    // Handle video time update
    const handleVideoTimeUpdate = () => {
        if (videoRef.current) {
            handleTimeUpdate(videoRef.current.currentTime);
        }
    }; async function handleFileUpload() {
        if (!file) return;

        try {
            // Stage 1: Upload
            setStatus(EUploadStatus.Uploading);
            setUploadProgress(0);
            setProcessingProgress(0);
            setCurrentStage('upload');

            const response = await resultApi.uploadFile(file, (progress) => {
                setUploadProgress(progress);
            });

            // Stage 2: Processing
            setStatus(EUploadStatus.Processing);
            setCurrentStage('processing');
            setUploadProgress(100);

            // Simulate processing progress for user feedback
            const simulateProcessingProgress = () => {
                let progress = 0;
                const interval = setInterval(() => {
                    progress += Math.random() * 15; // Random increment
                    if (progress >= 90) {
                        progress = 90; // Cap at 90% until actual completion
                        clearInterval(interval);
                    }
                    setProcessingProgress(progress);
                }, 200);
                return interval;
            };

            const progressInterval = simulateProcessingProgress();

            const key = file.name;
            setResults((prev) => ({ ...prev, [key]: response }));

            // Wait a bit to let the server process the video, then complete processing
            setTimeout(() => {
                clearInterval(progressInterval);
                setProcessingProgress(100);
                setResultURL(resultApi.getResult());
                setStatus(EUploadStatus.Success);
            }, 1000);
        } catch (error) {
            console.error(error);
            setStatus(EUploadStatus.Error);
            setUploadProgress(0);
            setProcessingProgress(0);
        }
    } return (
        <div className="flex flex-col gap-4 p-4">
            {status === EUploadStatus.Error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    Error uploading file. Please try again.
                </div>
            )}            {(status === EUploadStatus.Uploading || status === EUploadStatus.Processing) && (
                <div className="bg-blue-50 border border-blue-200 px-4 py-3 rounded">
                    <ProgressBar
                        progress={currentStage === 'upload' ? uploadProgress : processingProgress}
                        variant="default"
                        className="mt-2"
                        label={currentStage === 'upload' ? 'Uploading File' : 'Processing & Detecting Signs'}
                        subLabel={currentStage === 'upload'
                            ? 'Uploading file to server...'
                            : 'Running sign language detection on your file...'}
                    />
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/2">
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
                        onClear={handleClear}
                    />
                </div>

                <div className="w-full md:w-1/2">
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
                </div>
            </div>
        </div>
    );
}
