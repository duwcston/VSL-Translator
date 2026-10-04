import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Play, Square, AlertTriangle, Activity } from "lucide-react";
import Button from "../UI/Button";
import Card from "../UI/Card";
import VideoStream from "./VideoStream";
import DetectionResults from "./DetectionResults";
import { useWebcam } from "../../hooks/useWebcam";
import { useRealtimeDetection } from "../../hooks/useRealtimeDetection";

function Realtime() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showBoxes, setShowBoxes] = useState(true);

  const { startWebcam, stopWebcam, captureFrame, streamRef } = useWebcam();
  const capture = useCallback(
    () => captureFrame(videoRef, canvasRef),
    [captureFrame],
  );
  const {
    detections,
    frameSize,
    isStreaming,
    stats,
    startDetection,
    stopDetection,
  } = useRealtimeDetection({
    onError: setErrorMessage,
    captureFrame: capture,
  });

  // Camera is on while this tab is mounted; Tabs unmounts it when you leave.
  useEffect(() => {
    startWebcam(videoRef).then((result) => {
      if (result.error) setErrorMessage(result.error);
    });
    return () => {
      stopDetection();
      stopWebcam(videoRef);
    };
  }, [startWebcam, stopWebcam, stopDetection]);

  const toggleStreaming = async () => {
    if (isStreaming) {
      stopDetection();
      return;
    }

    if (!streamRef.current) {
      const result = await startWebcam(videoRef);
      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }
    }
    await startDetection();
  };

  return (
    <div className="flex flex-col gap-6">
      {errorMessage && (
        <div
          role="alert"
          className="flex animate-fade-in items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
          <p className="font-medium text-red-700">{errorMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Camera with detection overlay */}
        <Card className="lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <Camera className="h-5 w-5 text-blue-600" />
              Camera Stream
            </h3>
            <span
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors duration-200 ${
                isStreaming ? "text-green-600" : "text-slate-400"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isStreaming ? "bg-green-500" : "bg-slate-300"
                }`}
              />
              {isStreaming ? "Live" : "Idle"}
            </span>
          </div>
          <VideoStream
            videoRef={videoRef}
            canvasRef={canvasRef}
            detections={detections}
            frameSize={frameSize}
            showBoxes={showBoxes}
          />
        </Card>

        {/* Results and controls */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-slate-800">
              Detected Sign
            </h3>
            <DetectionResults
              detections={detections}
              isStreaming={isStreaming}
            />
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" />
                <span className="tabular-nums">
                  {isStreaming ? stats.fps.toFixed(1) : "–"} FPS
                </span>
              </span>
              <span className="tabular-nums">
                Latency {isStreaming ? `${stats.latency.toFixed(0)} ms` : "–"}
              </span>
            </div>
          </Card>

          <Card>
            <h3 className="mb-4 text-lg font-semibold text-slate-800">
              Settings
            </h3>
            <div className="space-y-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-blue-600"
                  checked={showBoxes}
                  onChange={(e) => setShowBoxes(e.target.checked)}
                />
                Show bounding boxes
              </label>
              <Button
                fullWidth
                onClick={toggleStreaming}
                variant={isStreaming ? "secondary" : "primary"}
                icon={
                  isStreaming ? (
                    <Square className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )
                }
                label={
                  isStreaming ? "Stop Detection" : "Start Real-time Detection"
                }
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Realtime;
