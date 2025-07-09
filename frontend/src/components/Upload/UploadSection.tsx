import React from "react";
import { motion } from "framer-motion";
import { Upload, Trash2, CheckCircle, Clock } from "lucide-react";
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
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 space-y-6">
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

            {file && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <FileInformation file={file} />
                </motion.div>
            )}

            {(status === EUploadStatus.Success || status === EUploadStatus.Processing) && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center space-x-2 p-3 rounded-lg bg-gradient-to-r from-green-50 to-blue-50 border border-green-200"
                >
                    {status === EUploadStatus.Success ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                        <Clock className="w-5 h-5 text-blue-500" />
                    )}
                    <span className="text-sm font-medium text-gray-700">
                        {status === EUploadStatus.Success ? 'File processed successfully!' : 'Processing your file...'}
                    </span>
                </motion.div>
            )}

            <div className="flex flex-row gap-3 ">
                <motion.div
                    className="flex-1"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Button
                        width="full"
                        height="12"
                        label={
                            status === EUploadStatus.Uploading ? "Uploading..." :
                                status === EUploadStatus.Processing ? "Processing..." :
                                    "Upload"
                        }
                        onClick={onUpload}
                        disabled={status === EUploadStatus.Uploading || status === EUploadStatus.Processing || !file}
                        icon={<Upload className="w-4 h-4" />}
                        variant="primary"
                    />
                </motion.div>

                {file && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Button
                            width="auto"
                            height="12"
                            label="Clear"
                            onClick={onClear}
                            disabled={status === EUploadStatus.Uploading || status === EUploadStatus.Processing}
                            icon={<Trash2 className="w-4 h-4" />}
                            variant="outline"
                        />
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default UploadSection;
