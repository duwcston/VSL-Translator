import React, { useState } from "react";
import { Detection } from "../../types/DetectionResponse";

interface VideoStreamProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  detections: Detection[];
  frameSize: [number, number] | null;
  showBoxes: boolean;
}

// Boxes are drawn client-side over the live <video>, so the feed stays at the
// camera's native frame rate and the server never has to encode/send images.
function VideoStream({
  videoRef,
  canvasRef,
  detections,
  frameSize,
  showBoxes,
}: VideoStreamProps) {
  // Matches the camera's real aspect ratio once known, so percentage-based box
  // coordinates line up for any resolution and the layout doesn't jump.
  const [aspectRatio, setAspectRatio] = useState("4 / 3");

  return (
    <div
      className="relative overflow-hidden rounded-lg bg-slate-900"
      style={{ aspectRatio }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="block h-full w-full"
        onLoadedMetadata={(e) => {
          const { videoWidth, videoHeight } = e.currentTarget;
          if (videoWidth && videoHeight) {
            setAspectRatio(`${videoWidth} / ${videoHeight}`);
          }
        }}
      />
      {showBoxes &&
        frameSize &&
        detections.map((detection, index) => {
          if (!detection.bbox) return null;
          const [w, h] = frameSize;
          const [x1, y1, x2, y2] = detection.bbox;
          return (
            <div
              key={index}
              className="pointer-events-none absolute rounded border-2 border-green-400 transition-all duration-100 ease-linear"
              style={{
                left: `${(x1 / w) * 100}%`,
                top: `${(y1 / h) * 100}%`,
                width: `${((x2 - x1) / w) * 100}%`,
                height: `${((y2 - y1) / h) * 100}%`,
              }}
            >
              <span className="absolute -top-6 left-[-2px] rounded-t bg-green-400 px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap text-slate-900">
                {detection.class_name} {(detection.confidence * 100).toFixed(0)}%
              </span>
            </div>
          );
        })}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

export default VideoStream;
