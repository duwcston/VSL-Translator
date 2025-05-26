import React from "react";

interface ProcessedFrameDisplayProps {
    processedImage: string | null;
    isStreaming: boolean;
    returnImage: boolean;
}

const ProcessedFrameDisplay: React.FC<ProcessedFrameDisplayProps> = ({
    processedImage,
    isStreaming,
    returnImage
}) => {
    return (
        <div className="bg-gray-100 rounded-lg overflow-hidden min-h-[360px] flex justify-center items-center">
            {processedImage ? (
                <img
                    src={processedImage}
                    alt="Processed frame with detections"
                    className="w-full"
                />
            ) : (
                <div className="text-center text-gray-500">
                    {isStreaming
                        ? (returnImage
                            ? "Waiting for processed frames..."
                            : "Streaming without visual feedback")
                        : "Start detection to see results"}
                </div>
            )}
        </div>
    );
};

export default ProcessedFrameDisplay;
