import React from "react";

interface FrameRateControlProps {
    frameRate: number;
    setFrameRate: (value: number) => void;
    isStreaming: boolean;
}

const FrameRateControl: React.FC<FrameRateControlProps> = ({
    frameRate,
    setFrameRate,
    isStreaming
}) => {
    return (
        <div className="flex justify-between items-center">
            <label htmlFor="frameRate" className="font-medium">
                Frame Rate: {frameRate} fps
            </label>
            <input
                id="frameRate"
                type="range"
                min="1"
                max="30"
                value={frameRate}
                onChange={(e) => setFrameRate(parseInt(e.target.value))}
                className="w-1/2"
                disabled={isStreaming}
            />
        </div>
    );
};

export default FrameRateControl;
