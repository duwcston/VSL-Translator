import React from "react";

interface PerformanceSettingsProps {
    skipFrames: number;
    setSkipFrames: (value: number) => void;
    resizeFactor: number;
    setResizeFactor: (value: number) => void;
    returnImage: boolean;
    setReturnImage: (value: boolean) => void;
    isStreaming: boolean;
}

const PerformanceSettings: React.FC<PerformanceSettingsProps> = ({
    skipFrames,
    setSkipFrames,
    resizeFactor,
    setResizeFactor,
    returnImage,
    setReturnImage,
    isStreaming
}) => {
    return (
        <>
            <details className="bg-gray-50 p-2 rounded">
                <summary className="font-medium cursor-pointer">Performance Options</summary>
                <div className="mt-2 space-y-3 p-2">
                    <div className="flex justify-between items-center">
                        <label htmlFor="skipFrames" className="text-sm" title="Skip processing certain frames to reduce CPU/GPU load. Higher values improve performance but may miss quick movements.">
                            Skip Frames: {skipFrames}
                            <span className="ml-1 text-xs text-blue-500 cursor-pointer" title="Skip processing certain frames to reduce CPU/GPU load. Higher values improve performance but may miss quick movements.">ⓘ</span>
                        </label>
                        <input
                            id="skipFrames"
                            type="range"
                            min="0"
                            max="5"
                            step="1"
                            value={skipFrames}
                            onChange={(e) => setSkipFrames(parseInt(e.target.value))}
                            className="w-1/2"
                            disabled={isStreaming}
                            title="Higher values skip more frames, improving performance but reducing detection rate"
                        />
                    </div>

                    <div className="flex justify-between items-center">
                        <label htmlFor="resizeFactor" className="text-sm" title="Resize the image before processing. Smaller values mean faster processing but may reduce accuracy for small objects.">
                            Resize Factor: {resizeFactor.toFixed(1)}x
                            <span className="ml-1 text-xs text-blue-500 cursor-pointer" title="Resize the image before processing. Smaller values mean faster processing but may reduce accuracy for small objects.">ⓘ</span>
                        </label>
                        <input
                            id="resizeFactor"
                            type="range"
                            min="0.2"
                            max="1.0"
                            step="0.1"
                            value={resizeFactor}
                            onChange={(e) => setResizeFactor(parseFloat(e.target.value))}
                            className="w-1/2"
                            disabled={isStreaming}
                            title="Lower values reduce image size, improving performance but may reduce detection accuracy"
                        />
                    </div>

                    {/* <div className="flex justify-between items-center">
                        <label htmlFor="inputSize" className="text-sm" title="The input resolution for the YOLO model. Smaller sizes are faster, larger sizes are more accurate.">
                            Input Size: {inputSize}px
                            <span className="ml-1 text-xs text-blue-500 cursor-pointer" title="The input resolution for the YOLO model. Smaller sizes are faster, larger sizes are more accurate.">ⓘ</span>
                        </label>
                        <select
                            id="inputSize"
                            value={inputSize}
                            onChange={(e) => setInputSize(parseInt(e.target.value))}
                            className="w-1/2 p-1 border rounded"
                            disabled={isStreaming}
                            title="Select the input size for the detection model"
                        >
                            <option value={160}>160px (Fastest)</option>
                            <option value={256}>256px (Fast)</option>
                            <option value={320}>320px (Balanced)</option>
                            <option value={416}>416px (Accurate)</option>
                            <option value={640}>640px (Most Accurate)</option>
                        </select>
                    </div> */}
                </div>
            </details>

            <div className="flex items-center gap-2 mt-2">
                <input
                    id="returnImage"
                    type="checkbox"
                    checked={returnImage}
                    onChange={() => setReturnImage(!returnImage)}
                    disabled={isStreaming}
                />
                <label htmlFor="returnImage" title="Show processed frames with detection boxes. Disabling this improves performance significantly.">
                    Show processed frames
                </label>
            </div>
        </>
    );
};

export default PerformanceSettings;
