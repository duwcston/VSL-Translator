interface ProcessedFrameDisplayProps {
  processedImage: string | null;
  isStreaming: boolean;
  returnImage: boolean;
}

function ProcessedFrameDisplay({
  processedImage,
  isStreaming,
  returnImage,
}: ProcessedFrameDisplayProps) {
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
            ? returnImage
              ? "Waiting for processed frames..."
              : "Streaming without visual feedback"
            : "Start to see the results"}
        </div>
      )}
    </div>
  );
}

export default ProcessedFrameDisplay;
