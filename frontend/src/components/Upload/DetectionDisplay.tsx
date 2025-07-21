import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Clock, MessageSquare, TrendingUp, Zap } from "lucide-react";
import { Detection, DetectionResponse } from "../../types/DetectionResponse";

interface DetectionDisplayProps {
    results: Record<string, DetectionResponse>;
    currentTime: number;
    currentFrameDetections: Detection[];
}

const DetectionDisplay: React.FC<DetectionDisplayProps> = ({
    results,
    currentTime,
    currentFrameDetections
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden"
        >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 border-b border-blue-100">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Eye className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Detection Results</h3>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                {Object.keys(results).length > 0 ? (
                    <div className="space-y-6">
                        {/* Video Timeline Info */}
                        {Object.values(results)[0]?.type === "video" && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Clock className="w-4 h-4 text-blue-600" />
                                        <span className="text-sm font-medium text-gray-700">
                                            Current time: {currentTime.toFixed(2)}s
                                        </span>
                                    </div>
                                    {Object.values(results)[0]?.fps && (
                                        <div className="flex items-center space-x-2">
                                            <Zap className="w-4 h-4 text-purple-600" />
                                            <span className="text-sm text-gray-600">
                                                Frame: {Math.round(currentTime * (Object.values(results)[0]?.fps || 30))}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* Current Frame Detections */}
                        <AnimatePresence mode="wait">
                            {currentFrameDetections && currentFrameDetections.length > 0 ? (
                                <motion.div
                                    key="detections"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <TrendingUp className="w-5 h-5 text-green-600" />
                                        <span className="text-sm font-semibold text-green-700">
                                            Found {currentFrameDetections.length} sign{currentFrameDetections.length > 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <div className="grid gap-3">
                                        {currentFrameDetections.map((detection, index) => (
                                            <motion.div
                                                key={`${detection.class_name}-${index}`}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200"
                                            >
                                                <div className="flex justify-between items-center">
                                                    <span className="font-semibold text-blue-800 text-lg">
                                                        {detection.class_name}
                                                    </span>
                                                    <div className="flex items-center space-x-2">
                                                        <div className="bg-white px-3 py-1 rounded-full shadow-sm">
                                                            <span className="text-gray-700 font-mono text-sm">
                                                                {(detection.confidence * 100).toFixed(1)}%
                                                            </span>
                                                        </div>
                                                        <div className={`w-3 h-3 rounded-full ${detection.confidence > 0.9 ? 'bg-green-500' :
                                                            detection.confidence > 0.7 ? 'bg-yellow-500' : 'bg-red-500'
                                                            }`} />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            ) : (
                                (() => {
                                    const isVideo = Object.values(results)[0]?.type === "video";
                                    const isImage = Object.values(results)[0]?.type === "image";
                                    const detections = Object.values(results)[0]?.detections;
                                    const hasImageDetections = isImage && detections && (
                                        (Array.isArray(detections) && detections.length > 0) ||
                                        (!Array.isArray(detections) && detections)
                                    );

                                    if (isImage && hasImageDetections) {
                                        return null;
                                    }

                                    return (
                                        <motion.div
                                            key="no-detections"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-center"
                                        >
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Eye className="w-8 h-8 text-gray-400" />
                                            </div>
                                            <p className="text-gray-500">
                                                {isVideo ? "No signs detected in this frame" : "No signs detected"}
                                            </p>
                                        </motion.div>
                                    );
                                })()
                            )}
                        </AnimatePresence>

                        {/* All Detections Summary for Images */}
                        {Object.values(results)[0]?.type === "image" && Object.values(results)[0]?.detections && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200"
                            >
                                <div className="flex items-center space-x-2 mb-4">
                                    <TrendingUp className="w-5 h-5 text-blue-600" />
                                    <h4 className="text-lg font-semibold text-blue-800">All Detected Signs</h4>
                                </div>
                                {Array.isArray(Object.values(results)[0].detections) ? (
                                    <div className="space-y-2">
                                        {(Object.values(results)[0].detections as Detection[]).map((detection, index) => (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                className="flex justify-between items-center bg-white rounded-lg p-3 shadow-sm"
                                            >
                                                <span className="font-medium text-gray-800">{detection.class_name}</span>
                                                <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded-full text-sm">
                                                    {(detection.confidence * 100).toFixed(1)}%
                                                </span>
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-lg p-3 shadow-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium text-gray-800">
                                                {(Object.values(results)[0].detections as Detection).class_name}
                                            </span>
                                            <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded-full text-sm">
                                                {((Object.values(results)[0].detections as Detection).confidence * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Paraphrased Sentence */}
                        {Object.values(results)[0]?.sentence && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200"
                            >
                                <div className="flex items-center space-x-2 mb-3">
                                    <MessageSquare className="w-5 h-5 text-green-600" />
                                    <h4 className="text-lg font-semibold text-green-800">Translation</h4>
                                </div>
                                <div className="bg-white rounded-lg p-4 shadow-sm">
                                    <p className="text-gray-800 font-medium text-lg leading-relaxed">
                                        "{Object.values(results)[0].sentence}"
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center"
                    >
                        {/* <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Eye className="w-10 h-10 text-blue-600" />
                        </div> */}
                        {/* <h4 className="text-lg font-semibold text-gray-700 mb-2">Ready to Analyze</h4> */}
                        <p className="text-gray-500">
                            Upload a file to see detection results
                        </p>
                    </motion.div>
                )}
            </div>        </motion.div>
    );
};

export default DetectionDisplay;
