import React from "react";
import UploadSection from "./Uploader/UploadSection";
import MediaDisplay from "./Uploader/MediaDisplay";
import DetectionDisplay from "./Uploader/DetectionDisplay";
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
        inputRef,
        setStatus,
        setResults,
        setResultURL,
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
    };

    async function handleFileUpload() {
        if (!file) return;

        try {
            setStatus(EUploadStatus.Uploading);
            const response = await resultApi.uploadFile(file);

            const key = file.name;
            setResults((prev) => ({ ...prev, [key]: response }));

            // Wait a bit to let the server process the video
            setTimeout(() => {
                setResultURL(resultApi.getResult());
                setStatus(EUploadStatus.Success);
            }, 1000);
        } catch (error) {
            console.error(error);
            setStatus(EUploadStatus.Error);
        }
    } return (
        <div className="flex flex-col gap-4 p-4">
            {status === EUploadStatus.Error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    Error uploading file. Please try again.
                </div>
            )}            <div className="flex flex-col md:flex-row gap-4">
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
