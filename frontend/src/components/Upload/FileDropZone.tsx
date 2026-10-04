import React from "react";
import { Upload } from "lucide-react";

interface FileDropZoneProps {
  isDragging: boolean;
  disabled?: boolean;
  onDragEnter: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onClick: () => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

const FORMATS = ["MP4", "MOV", "JPG", "PNG"];

function FileDropZone({
  isDragging,
  disabled = false,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  onFileChange,
  inputRef,
}: FileDropZoneProps) {
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      className={`flex h-64 w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-6 text-center transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
        isDragging
          ? "border-blue-500 bg-blue-50"
          : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50"
      } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors duration-200 ${
          isDragging ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-600"
        }`}
      >
        <Upload className="h-6 w-6" />
      </div>

      <div className="space-y-1">
        <div className="text-lg font-semibold text-slate-700">
          {isDragging ? "Drop your file here" : "Upload your media file"}
        </div>
        <div className="text-sm text-slate-500">
          {isDragging ? (
            "Release to select it"
          ) : (
            <>
              Drag and drop your file here, or{" "}
              <span className="font-semibold text-blue-600">
                click to browse
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-500">
        {FORMATS.map((format) => (
          <span key={format} className="rounded-md bg-slate-200/70 px-2 py-1">
            {format}
          </span>
        ))}
      </div>

      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept=".mp4,.mov,.jpeg,.png,.jpg"
        onChange={onFileChange}
      />
    </div>
  );
}

export default FileDropZone;
