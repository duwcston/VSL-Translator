import { Detection } from "../../types/DetectionResponse";

interface DetectionResultsProps {
  detections: Detection[];
  isStreaming: boolean;
}

function DetectionResults({ detections, isStreaming }: DetectionResultsProps) {
  const top = detections[0];

  return (
    // Fixed height so the panel doesn't jump as detections come and go.
    <div className="flex h-36 flex-col items-center justify-center rounded-lg bg-slate-50 p-4 text-center">
      {top ? (
        <>
          <span className="text-4xl font-bold text-slate-900">
            {top.class_name}
          </span>
          <span className="mt-2 font-mono text-sm text-slate-500">
            {(top.confidence * 100).toFixed(1)}% confidence
          </span>
        </>
      ) : (
        <p className="text-slate-500">
          {isStreaming
            ? "No signs detected"
            : "Start detection to see results"}
        </p>
      )}
    </div>
  );
}

export default DetectionResults;
