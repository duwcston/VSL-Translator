import React, { useCallback, useEffect, useRef, useState } from "react";
import Button from "./UI/Button";
import VideoStream from "./Realtime/VideoStream";
import FrameRateControl from "./Realtime/FrameRateControl";
import PerformanceSettings from "./Realtime/PerformanceSettings";
import ProcessedFrameDisplay from "./Realtime/ProcessedFrameDisplay";
import DetectionResults from "./Realtime/DetectionResults";
import { useWebcam } from "../hooks/useWebcam";
import { useRealtimeDetection } from "../hooks/useRealtimeDetection";

interface RealtimeProps {
    isActive?: boolean;
}

const Realtime: React.FC<RealtimeProps> = ({ isActive = true }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [returnImage, setReturnImage] = useState(false);
    const [frameRate, setFrameRate] = useState(10);    // Performance optimization settings
    const [skipFrames, setSkipFrames] = useState(0);
    const [resizeFactor, setResizeFactor] = useState(1.0);
    const [inputSize, setInputSize] = useState(320);

    const frameInterval = useRef<NodeJS.Timeout | null>(null);

    // Custom hooks
    const { startWebcam, stopWebcam, captureFrame, streamRef } = useWebcam();
    const {
        detections,
        processedImage,
        isStreaming,
        startDetection,
        stopDetection,
        sendFrame
    } = useRealtimeDetection({
        onError: setErrorMessage
    });

    // Capture frame from video and send to the server
    const handleCaptureFrame = useCallback(() => {
        if (isStreaming) {
            const frameData = captureFrame(videoRef, canvasRef);
            if (frameData) {
                sendFrame(frameData, returnImage, skipFrames, resizeFactor, inputSize);
            }
        }
    }, [isStreaming, returnImage, skipFrames, resizeFactor, inputSize, captureFrame, sendFrame]);

    // Toggle the streaming state
    const toggleStreaming = async () => {
        if (isStreaming) {
            // Stop streaming
            if (frameInterval.current) {
                clearInterval(frameInterval.current);
                frameInterval.current = null;
            }
            stopDetection();
        } else {
            // Start webcam if not already started
            if (!streamRef.current) {
                const result = await startWebcam(videoRef);
                if (!result.success) {
                    setErrorMessage(result.error);
                    return;
                }
            }

            // Connect to WebSocket server and start detection
            const result = await startDetection();
            if (result.success) {
                // Start frame capturing
                frameInterval.current = setInterval(handleCaptureFrame, 1000 / frameRate);
                setErrorMessage(null);
            }
        }
    };    // Effect to handle isActive prop changes
    useEffect(() => {
        if (!isActive && isStreaming) {
            if (frameInterval.current) {
                clearInterval(frameInterval.current);
                frameInterval.current = null;
            }
            stopDetection();
        }

        // Stop webcam when navigating away from realtime page
        if (!isActive) {
            stopWebcam(videoRef);
        }
    }, [isActive, isStreaming, stopDetection, stopWebcam]);

    // Effect to initialize webcam when component becomes active
    useEffect(() => {
        if (isActive) {
            startWebcam(videoRef);
        }

        return () => {
            if (frameInterval.current) {
                clearInterval(frameInterval.current);
            }
            stopDetection();
            stopWebcam(videoRef);
        };
    }, [isActive, startWebcam, stopDetection, stopWebcam]);

    // Update frame rate when it changes
    useEffect(() => {
        if (isStreaming && frameInterval.current) {
            clearInterval(frameInterval.current);
            frameInterval.current = setInterval(handleCaptureFrame, 1000 / frameRate);
        }
    }, [handleCaptureFrame, frameRate, isStreaming]);

    return (
        <div className="flex flex-col gap-4 p-4">
            {errorMessage && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {errorMessage}
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/2">
                    <VideoStream videoRef={videoRef} canvasRef={canvasRef} />

                    <div className="mt-4 flex flex-col gap-2">
                        <FrameRateControl
                            frameRate={frameRate}
                            setFrameRate={setFrameRate}
                            isStreaming={isStreaming}
                        />

                        <PerformanceSettings
                            skipFrames={skipFrames}
                            setSkipFrames={setSkipFrames}
                            resizeFactor={resizeFactor}
                            setResizeFactor={setResizeFactor}
                            inputSize={inputSize}
                            setInputSize={setInputSize}
                            returnImage={returnImage}
                            setReturnImage={setReturnImage}
                            isStreaming={isStreaming}
                        />

                        <Button
                            onClick={toggleStreaming}
                            label={isStreaming ? 'Stop Detection' : 'Start Real-time Detection'}
                            height="auto"
                            width="100%"
                        />
                    </div>
                </div>

                <div className="w-full md:w-1/2">
                    <ProcessedFrameDisplay
                        processedImage={processedImage}
                        isStreaming={isStreaming}
                        returnImage={returnImage}
                    />

                    <DetectionResults detections={detections} />
                </div>
            </div>
        </div>
    );
};

export default Realtime;