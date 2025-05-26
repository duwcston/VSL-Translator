import React from "react";
import { EUploadStatus } from "../../types/FileIntermediate";
import { DetectionResponse } from "../../types/DetectionResponse";

interface MediaDisplayProps {
    status: EUploadStatus;
    resultURL: string | null;
    results: Record<string, DetectionResponse>;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    onTimeUpdate: () => void;
}

const MediaDisplay: React.FC<MediaDisplayProps> = ({
    status,
    resultURL,
    results,
    videoRef,
    onTimeUpdate
}) => {
    return (
        <div className="bg-gray-100 rounded-lg overflow-hidden min-h-[360px] flex justify-center items-center">
            {status === EUploadStatus.Idle ? (
                <div className="text-center text-gray-500">
                    Upload a file to see detection results
                </div>
            ) : status === EUploadStatus.Uploading ? (
                <div className="flex items-center justify-center cursor-wait">
                    <div className="size-10 animate-spin rounded-full h-8 w-8 border-t-2 border-b-2"></div>
                </div>
            ) : status === EUploadStatus.Success && resultURL ? (
                Object.values(results)[0]?.type === "image" ? (
                    <img
                        key={resultURL}
                        src={resultURL}
                        alt="Detection result"
                        className="max-h-full max-w-full object-contain"
                    />
                ) : (
                    <video
                        ref={videoRef}
                        key={resultURL}
                        controls
                        autoPlay
                        muted
                        className="w-full"
                        onTimeUpdate={onTimeUpdate}>
                        <source src={resultURL} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                )
            ) : null}
        </div>
    );
};

export default MediaDisplay;
