import React from "react";
import { Upload, Trash2 } from "lucide-react";
import Button from "../UI/Button";
import FileDropZone from "./FileDropZone";
import FileInformation from "./FileInformation";
import { EUploadStatus } from "../../types/FileIntermediate";

interface UploadSectionProps {
  file: File | null;
  isDragging: boolean;
  status: EUploadStatus;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onDragEnter: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onClick: () => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
  onClear: () => void;
}

function UploadSection({
  file,
  isDragging,
  status,
  inputRef,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  onFileChange,
  onUpload,
  onClear,
}: UploadSectionProps) {
  const isBusy =
    status === EUploadStatus.Uploading || status === EUploadStatus.Processing;

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <FileDropZone
        isDragging={isDragging}
        disabled={isBusy}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onClick}
        onFileChange={onFileChange}
        inputRef={inputRef}
      />

      {file && <FileInformation key={file.name + file.size} file={file} />}

      <div className="flex gap-3">
        <div className="flex-1">
          <Button
            fullWidth
            label={
              status === EUploadStatus.Uploading
                ? "Uploading..."
                : status === EUploadStatus.Processing
                  ? "Processing..."
                  : "Upload"
            }
            onClick={onUpload}
            disabled={isBusy || !file}
            icon={<Upload className="h-4 w-4" />}
            variant="primary"
          />
        </div>

        {file && (
          <Button
            label="Clear"
            onClick={onClear}
            disabled={isBusy}
            icon={<Trash2 className="h-4 w-4" />}
            variant="outline"
          />
        )}
      </div>
    </div>
  );
}

export default UploadSection;
