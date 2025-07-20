import React from "react";
import { motion } from "framer-motion";
import { Upload, FileVideo, Image } from "lucide-react";

interface FileDropZoneProps {
    isDragging: boolean;
    onDragEnter: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
    onClick: () => void;
    onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
}

const FileDropZone: React.FC<FileDropZoneProps> = ({
    isDragging,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
    onClick,
    onFileChange,
    inputRef
}) => {
    return (
        <motion.div
            className={`
                relative h-80 w-full flex justify-center items-center cursor-pointer
                border-2 border-dashed rounded-2xl transition-all duration-300
                ${isDragging
                    ? 'border-blue-400 bg-blue-50 scale-105'
                    : 'border-gray-300 bg-gray-50 hover:border-blue-300 hover:bg-blue-25'
                }
            `}
            whileHover={{ scale: isDragging ? 1.05 : 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl"></div>
            </div>

            <div
                className="relative z-10 h-full w-full flex flex-col justify-center items-center p-8 text-center"
                onDragEnter={onDragEnter}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={onClick}
            >
                {isDragging ? (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex flex-col items-center space-y-4"
                    >
                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center shadow-lg"
                        >
                            <Upload className="w-8 h-8 text-white" />
                        </motion.div>
                        <div className="text-xl font-semibold text-blue-600">
                            Drop your file here
                        </div>
                        <div className="text-sm text-blue-500">
                            Release to upload
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        className="flex flex-col items-center space-y-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="flex space-x-4">
                            <motion.div
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center"
                            >
                                <FileVideo className="w-6 h-6 text-blue-600" />
                            </motion.div>
                            <motion.div
                                whileHover={{ scale: 1.1, rotate: -5 }}
                                className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center"
                            >
                                <Image className="w-6 h-6 text-purple-600" />
                            </motion.div>
                        </div>

                        <div className="space-y-2">
                            <div className="text-lg font-semibold text-gray-700">
                                Upload your media file
                            </div>
                            <div className="text-sm text-gray-500">
                                Drag and drop your file here, or{" "}
                                <span className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                                    click to browse
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-400">
                            <span className="bg-gray-100 px-2 py-1 rounded-md">MP4</span>
                            <span className="bg-gray-100 px-2 py-1 rounded-md">MOV</span>
                            <span className="bg-gray-100 px-2 py-1 rounded-md">JPG</span>
                            <span className="bg-gray-100 px-2 py-1 rounded-md">PNG</span>
                        </div>
                    </motion.div>
                )}

                <input
                    ref={inputRef}
                    className="hidden"
                    type="file"
                    accept=".mp4, .mov, .jpeg, .png, .jpg"
                    multiple
                    onChange={onFileChange}
                />
            </div>
        </motion.div>
    );
};

export default FileDropZone;
