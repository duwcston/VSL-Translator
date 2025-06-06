import React from "react";
import { motion } from "framer-motion";
import { PlayCircle, Loader, CheckCircle } from "lucide-react";
import { EUploadStatus } from "../../types/FileIntermediate";
import { DetectionResponse } from "../../types/DetectionResponse";

interface MediaDisplayProps {
    status: EUploadStatus;
    resultURL: string | null;
    results: Record<string, DetectionResponse>;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    onTimeUpdate: () => void;
}

const MediaDisplay: React.FC<MediaDisplayProps> = ({
    status,
    resultURL,
    results,
    videoRef,
    onTimeUpdate
}) => {
    return (
        <motion.div
            className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden min-h-[400px] flex justify-center items-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
        >
            {status === EUploadStatus.Idle ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-4 p-8"
                >
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto">
                        <PlayCircle className="w-10 h-10 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-700">Ready for Analysis</h3>
                        <p className="text-gray-500 text-sm mt-2">
                            Upload a file to see detection results and analysis
                        </p>
                    </div>
                </motion.div>
            ) : (status === EUploadStatus.Uploading || status === EUploadStatus.Processing) ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center space-y-6 p-8"
                >
                    <motion.div
                        animate={{
                            rotate: 360,
                            scale: [1, 1.1, 1]
                        }}
                        transition={{
                            rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                            scale: { duration: 1, repeat: Infinity }
                        }}
                        className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg"
                    >
                        <Loader className="w-8 h-8 text-white" />
                    </motion.div>
                    <div className="text-center space-y-2">
                        <h3 className="text-xl font-semibold text-gray-800">
                            {status === EUploadStatus.Uploading ? 'Uploading File' : 'AI Processing'}
                        </h3>
                        <p className="text-gray-600">
                            {status === EUploadStatus.Uploading ?
                                'Please wait while your file is being uploaded...' :
                                'Running AI sign language detection on your file...'}
                        </p>
                        <div className="flex items-center justify-center space-x-2 mt-4">
                            <div className="flex space-x-1">
                                <motion.div
                                    animate={{ opacity: [0.4, 1, 0.4] }}
                                    transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                                    className="w-2 h-2 bg-blue-500 rounded-full"
                                />
                                <motion.div
                                    animate={{ opacity: [0.4, 1, 0.4] }}
                                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                                    className="w-2 h-2 bg-blue-500 rounded-full"
                                />
                                <motion.div
                                    animate={{ opacity: [0.4, 1, 0.4] }}
                                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                                    className="w-2 h-2 bg-blue-500 rounded-full"
                                />
                            </div>
                        </div>
                    </div>
                </motion.div>
            ) : status === EUploadStatus.Success && resultURL ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-full h-full flex flex-col"
                >
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-blue-50 border-b border-green-200">
                        <div className="flex items-center space-x-2">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="font-semibold text-green-700">Processing Complete</span>
                        </div>
                    </div>
                    <div className="flex-1 p-4 flex items-center justify-center">
                        {Object.values(results)[0]?.type === "image" ? (
                            <motion.img
                                key={resultURL}
                                src={resultURL}
                                alt="Detection result"
                                className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3 }}
                            />
                        ) : (
                            <motion.video
                                ref={videoRef}
                                key={resultURL}
                                controls
                                autoPlay
                                muted
                                className="w-full max-h-full rounded-lg shadow-lg"
                                onTimeUpdate={onTimeUpdate}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3 }}
                            >
                                <source src={resultURL} type="video/mp4" />
                                Your browser does not support the video tag.
                            </motion.video>
                        )}
                    </div>
                </motion.div>
            ) : null}
        </motion.div>
    );
};

export default MediaDisplay;
