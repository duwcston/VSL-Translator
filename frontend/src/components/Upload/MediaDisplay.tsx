import React from "react";
import { PlayCircle, Loader2, CheckCircle } from "lucide-react";
import { EUploadStatus } from "../../types/FileIntermediate";
import { DetectionResponse } from "../../types/DetectionResponse";

interface MediaDisplayProps {
  status: EUploadStatus;
  resultURL: string | null;
  results: Record<string, DetectionResponse>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onTimeUpdate: () => void;
}

function MediaDisplay({
  status,
  resultURL,
  results,
  videoRef,
  onTimeUpdate,
}: MediaDisplayProps) {
  const isBusy =
    status === EUploadStatus.Uploading || status === EUploadStatus.Processing;
  const showResult = status === EUploadStatus.Success && resultURL;

  return (
    <div className="flex min-h-[360px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      {showResult ? (
        <div key={resultURL} className="flex flex-1 animate-fade-in flex-col">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-slate-800">
              Processing Complete
            </span>
          </div>
          <div className="flex flex-1 items-center justify-center bg-slate-900 p-2">
            {Object.values(results)[0]?.type === "image" ? (
              <img
                src={resultURL}
                alt="Detection result"
                decoding="async"
                className="max-h-[480px] max-w-full rounded object-contain"
              />
            ) : (
              <video
                ref={videoRef}
                src={resultURL}
                controls
                autoPlay
                muted
                playsInline
                preload="auto"
                className="max-h-[480px] w-full rounded"
                onTimeUpdate={onTimeUpdate}
                onSeeked={onTimeUpdate}
              >
                Your browser does not support the video tag.
              </video>
            )}
          </div>
        </div>
      ) : (
        <div
          key={isBusy ? "busy" : "idle"}
          className="flex flex-1 animate-fade-in flex-col items-center justify-center gap-4 p-8 text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
            {isBusy ? (
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            ) : (
              <PlayCircle className="h-8 w-8 text-blue-600" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              {status === EUploadStatus.Uploading
                ? "Uploading File"
                : status === EUploadStatus.Processing
                  ? "Processing"
                  : "Ready for Detection"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {status === EUploadStatus.Uploading
                ? "Please wait while your file is being uploaded..."
                : status === EUploadStatus.Processing
                  ? "Running sign language detection on your file..."
                  : "Upload a file to see detection results"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default MediaDisplay;
