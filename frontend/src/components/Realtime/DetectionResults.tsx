import React from "react";
import { Detection } from "../../types/DetectionResponse";

interface DetectionResultsProps {
    detections: Detection[];
}

const DetectionResults: React.FC<DetectionResultsProps> = ({ detections }) => {
    return (
        <div className="mt-4">
            {/* <h3 className="font-bold text-lg">Detections</h3> */}
            <div className="mt-2 max-h-[200px] overflow-y-auto bg-gray-50 rounded p-2">
                {detections.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                        {detections.map((detection, index) => (
                            <li key={index} className="py-2">
                                <div className="flex justify-between">
                                    <span className="font-medium">{detection.class_name}</span>
                                    <span className="text-gray-600">
                                        {(detection.confidence * 100).toFixed(1)}%
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500 text-center py-4">
                        No detections found
                    </p>
                )}
            </div>
        </div>
    );
};

export default DetectionResults;
