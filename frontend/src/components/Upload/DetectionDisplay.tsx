import { Eye, Clock, Film, MessageSquare } from "lucide-react";
import { Detection, DetectionResponse } from "../../types/DetectionResponse";
import GlossSequence from "./GlossSequence";

interface DetectionDisplayProps {
  results: Record<string, DetectionResponse>;
  currentTime: number;
  currentFrameDetections: Detection[];
  onSeek: (time: number) => void;
}

function confidenceColor(confidence: number) {
  if (confidence > 0.9) return "bg-green-500";
  if (confidence > 0.7) return "bg-yellow-500";
  return "bg-red-500";
}

function DetectionDisplay({
  results,
  currentTime,
  currentFrameDetections,
  onSeek,
}: DetectionDisplayProps) {
  const result = Object.values(results)[0];
  const isVideo = result?.type === "video";

  // Images: everything detected in the file. Videos: the frame under the playhead.
  const detections: Detection[] = !result
    ? []
    : isVideo
      ? currentFrameDetections
      : Array.isArray(result.detections)
        ? (result.detections as Detection[])
        : [result.detections as Detection];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
        <Eye className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-slate-800">Detection Results</h3>
      </div>

      <div className="space-y-4 p-4">
        {!result ? (
          <p className="text-center text-slate-500">
            Upload a file to see detection results
          </p>
        ) : (
          <>
            {isVideo && (
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span className="tabular-nums">
                    {currentTime.toFixed(2)}s
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <Film className="h-4 w-4 text-slate-400" />
                  <span className="tabular-nums">
                    Frame {Math.round(currentTime * (result.fps || 30))}
                  </span>
                </span>
              </div>
            )}

            {/* Fixed min-height keeps the panel from jumping as frames change. */}
            <div className="min-h-[64px]">
              {detections.length > 0 ? (
                <ul className="space-y-2">
                  {detections.map((detection, index) => (
                    <li
                      key={index}
                      className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-4 py-3"
                    >
                      <span className="text-lg font-semibold text-blue-900">
                        {detection.class_name}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="rounded-full bg-white px-3 py-1 font-mono text-sm text-slate-700">
                          {(detection.confidence * 100).toFixed(1)}%
                        </span>
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${confidenceColor(detection.confidence)}`}
                        />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-center text-slate-500">
                  {isVideo
                    ? "No signs detected in this frame"
                    : "No signs detected"}
                </p>
              )}
            </div>

            {isVideo && result.sentence && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-blue-900">
                  <MessageSquare className="h-4 w-4" />
                  Translation
                </div>
                <p className="text-lg leading-relaxed font-medium text-slate-900">
                  {result.sentence}
                </p>
              </div>
            )}

            {isVideo && result.glosses && (
              <div className="border-t border-slate-200 pt-4">
                <GlossSequence
                  glosses={result.glosses}
                  currentTime={currentTime}
                  onSeek={onSeek}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default DetectionDisplay;
