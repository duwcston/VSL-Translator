import React from "react";
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

const UploadSection: React.FC<UploadSectionProps> = ({
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
    onClear
}) => {
    return (
        <div className="bg-gray-100 rounded-lg overflow-hidden p-4">
            <FileDropZone
                isDragging={isDragging}
                onDragEnter={onDragEnter}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={onClick}
                onFileChange={onFileChange}
                inputRef={inputRef}
            />

            {file && <FileInformation file={file} />}

            {status === EUploadStatus.Success && (
                <div className="mt-2 text-sm text-green-500 font-medium">
                    File uploaded successfully
                </div>
            )}

            <div className="mt-4 flex flex-col gap-2">
                <Button
                    width="full"
                    height="auto"
                    label={status === EUploadStatus.Uploading ? "Uploading..." : "Upload"}
                    onClick={onUpload}
                />
                <Button
                    width="full"
                    height="auto"
                    label="Clear"
                    onClick={onClear}
                />
            </div>
        </div>
    );
};

export default UploadSection;
