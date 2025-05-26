import React from "react";
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
    // // Debug logging
    // React.useEffect(() => {
    //     console.log('DetectionDisplay results:', results);
    //     console.log('Current frame detections:', currentFrameDetections);
    // }, [results, currentFrameDetections]);

    return (
        <div className="mt-4">
            <h3 className="font-bold text-lg">Detection Results</h3>
            <div className="mt-2 max-h-[200px] overflow-y-auto bg-gray-50 rounded p-2">
                {Object.keys(results).length > 0 ? (
                    <div>
                        {Object.values(results)[0]?.type === "video" && (
                            <div className="mb-2 text-sm text-gray-600">
                                <div className="flex justify-between">
                                    <span>Current time: {currentTime.toFixed(2)}s</span>
                                    {Object.values(results)[0]?.fps && (
                                        <span>Frame: {Math.round(currentTime * (Object.values(results)[0]?.fps || 30))}</span>
                                    )}
                                </div>
                            </div>
                        )}
                        {/* Show current frame detections */}
                        {currentFrameDetections && currentFrameDetections.length > 0 ? (
                            <div>
                                <div className="mb-2 text-sm text-green-600 font-medium">
                                    Found {currentFrameDetections.length} sign{currentFrameDetections.length > 1 ? 's' : ''}:
                                </div>
                                <ul className="divide-y divide-gray-200">
                                    {currentFrameDetections.map((detection, index) => (
                                        <li key={`${detection.class_name}-${index}`} className="py-2">
                                            <div className="flex justify-between">
                                                <span className="font-medium text-blue-700">{detection.class_name}</span>
                                                <span className="text-gray-600 font-mono">
                                                    {(detection.confidence * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            (() => {
                                const isVideo = Object.values(results)[0]?.type === "video";
                                const isImage = Object.values(results)[0]?.type === "image";
                                const detections = Object.values(results)[0]?.detections;
                                const hasImageDetections = isImage && detections && (
                                    (Array.isArray(detections) && detections.length > 0) ||
                                    (!Array.isArray(detections) && detections)
                                );

                                // For images with detections, don't show "No signs detected"
                                if (isImage && hasImageDetections) {
                                    return null;
                                }

                                return (
                                    <p className="text-gray-500 text-center py-4">
                                        {isVideo ? "No signs detected in this frame" : "No signs detected"}
                                    </p>
                                );
                            })()
                        )}

                        {/* Show all detections summary for images */}
                        {Object.values(results)[0]?.type === "image" && Object.values(results)[0]?.detections && (
                            <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                                <h4 className="text-sm font-semibold mb-2 text-blue-800">All Detected Signs:</h4>
                                {Array.isArray(Object.values(results)[0].detections) ? (
                                    <ul className="text-sm">
                                        {(Object.values(results)[0].detections as Detection[]).map((detection, index) => (
                                            <li key={index} className="flex justify-between py-1">
                                                <span className="font-medium">{detection.class_name}</span>
                                                <span className="text-gray-600">{(detection.confidence * 100).toFixed(1)}%</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm">
                                        <span className="font-medium">{(Object.values(results)[0].detections as Detection).class_name}</span> -
                                        {((Object.values(results)[0].detections as Detection).confidence * 100).toFixed(1)}%
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Show paraphrased sentence */}
                        {Object.values(results)[0]?.sentence && (
                            <div className="mt-4 p-3 bg-green-50 rounded-md border border-green-200">
                                <h4 className="text-sm font-semibold mb-1 text-green-800">Paraphrased Sentence:</h4>
                                <p className="text-gray-800 font-medium">{Object.values(results)[0].sentence}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-4">
                        Upload to see detection results
                    </p>
                )}
            </div>
        </div>
    );
};

export default DetectionDisplay;
