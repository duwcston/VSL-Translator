import React, { useCallback, useEffect, useRef, useState } from "react";
import Button from "./UI/Button";
import websocketClient from "../api/websocketClient";

interface Detection {
    class_name: string;
    confidence: number;
    bbox: number[];
}

interface DetectionResult {
    timestamp: number;
    detections: Detection[];
    image?: string;
    error?: string;
    skipped?: boolean;
}

const Realtime: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [detections, setDetections] = useState<Detection[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [returnImage, setReturnImage] = useState(false);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [frameRate, setFrameRate] = useState(10);

    // Performance optimization settings
    const [skipFrames, setSkipFrames] = useState(0);
    const [resizeFactor, setResizeFactor] = useState(1.0);
    const [inputSize, setInputSize] = useState(320);

    const frameInterval = useRef<NodeJS.Timeout | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const lastDetections = useRef<Detection[]>([]);

    // Handle detection results from the WebSocket
    const handleDetectionResult = (data: unknown) => {
        const result = data as DetectionResult;
        if (result.error) {
            setErrorMessage(result.error);
            return;
        }

        // If this is a skipped frame, use the last known detections
        if (result.skipped) {
            setDetections(lastDetections.current);
            return;
        }

        // Store the latest detections for skipped frames
        if (result.detections && result.detections.length > 0) {
            lastDetections.current = result.detections;
        }

        setDetections(result.detections || []);

        // If we requested the annotated image and received it
        if (returnImage && result.image) {
            setProcessedImage(result.image);
        }
    };

    // Start webcam streaming
    const startWebcam = async () => {
        try {
            const constraints = {
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: "user"
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
            }

            setErrorMessage(null);
        } catch (error) {
            console.error("Error accessing webcam:", error);
            setErrorMessage("Failed to access webcam. Please ensure your camera is connected and permissions are granted.");
        }
    };

    // Stop webcam streaming
    const stopWebcam = () => {
        if (streamRef.current) {
            const tracks = streamRef.current.getTracks();
            tracks.forEach(track => track.stop());
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        setProcessedImage(null);
        setDetections([]);
        lastDetections.current = [];
    };

    // Capture frame from video and send to the server
    const captureFrame = useCallback(() => {
        if (videoRef.current && canvasRef.current && isStreaming) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            if (context) {
                // Set canvas dimensions to match video
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                // Draw the video frame to the canvas
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Get the frame as a data URL
                const frameData = canvas.toDataURL('image/jpeg', 0.8);

                // Send the frame to the server via WebSocket with optimization parameters
                websocketClient.sendFrame(
                    frameData,
                    Date.now(),
                    returnImage,
                    skipFrames,
                    resizeFactor,
                    inputSize
                );
            }
        }
    }, [isStreaming, returnImage, skipFrames, resizeFactor, inputSize]);

    // Toggle the streaming state
    const toggleStreaming = async () => {
        if (isStreaming) {
            // Stop streaming
            if (frameInterval.current) {
                clearInterval(frameInterval.current);
                frameInterval.current = null;
            }

            websocketClient.disconnect();
            setIsStreaming(false);

        } else {
            // Start webcam if not already started
            if (!streamRef.current) {
                await startWebcam();
            }

            // Connect to WebSocket server
            try {
                await websocketClient.connect();
                websocketClient.onMessage(handleDetectionResult);
                websocketClient.onError((error) => {
                    console.error("WebSocket error:", error);
                    setErrorMessage("Connection to detection server failed. Please try again.");
                    setIsStreaming(false);
                });

                // Start frame capturing
                frameInterval.current = setInterval(captureFrame, 1000 / frameRate);
                setIsStreaming(true);
                setErrorMessage(null);

            } catch (error) {
                console.error("Failed to connect to WebSocket server:", error);
                setErrorMessage("Failed to connect to detection server. Please ensure the backend is running.");
            }
        }
    };

    // Initialize webcam on component mount
    useEffect(() => {
        startWebcam();

        // Cleanup on component unmount
        return () => {
            if (frameInterval.current) {
                clearInterval(frameInterval.current);
            }
            websocketClient.disconnect();
            stopWebcam();
        };
    }, []);

    // Update frame rate when it changes
    useEffect(() => {
        if (isStreaming && frameInterval.current) {
            clearInterval(frameInterval.current);
            frameInterval.current = setInterval(captureFrame, 1000 / frameRate);
        }
    }, [captureFrame, frameRate, isStreaming]);

    return (
        <div className="flex flex-col gap-4 p-4">

            {errorMessage && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {errorMessage}
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/2">
                    <div className="bg-gray-100 rounded-lg overflow-hidden">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full"
                            style={{ display: 'block' }}
                        />
                    </div>
                    <canvas ref={canvasRef} style={{ display: 'none' }} />

                    <div className="mt-4 flex flex-col gap-2">
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

                                <div className="flex justify-between items-center">
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
                                </div>
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
                                Show processed frames (slower)
                            </label>
                        </div>

                        <Button
                            onClick={toggleStreaming}
                            label={isStreaming ? 'Stop Detection' : 'Start Real-time Detection'}
                            height="auto"
                            width="100%"
                        />
                    </div>
                </div>

                <div className="w-full md:w-1/2">
                    <div className="bg-gray-100 rounded-lg overflow-hidden min-h-[360px] flex justify-center items-center">
                        {processedImage ? (
                            <img
                                src={processedImage}
                                alt="Processed frame with detections"
                                className="w-full"
                            />
                        ) : (
                            <div className="text-center text-gray-500">
                                {isStreaming
                                    ? (returnImage
                                        ? "Waiting for processed frames..."
                                        : "Streaming without visual feedback")
                                    : "Start detection to see results"}
                            </div>
                        )}
                    </div>

                    <div className="mt-4">
                        <h3 className="font-bold text-lg">Detections</h3>
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
                </div>
            </div>
        </div>
    );
};

export default Realtime;