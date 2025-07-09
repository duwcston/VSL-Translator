import { useState, useRef, useCallback } from "react";
import websocketClient from "../api/websocketClient";
import { Detection } from "../types/DetectionResponse";

interface RealtimeDetectionResult {
    timestamp: number;
    detections: Detection[];
    image?: string;
    error?: string;
    skipped?: boolean;
}

interface UseRealtimeDetectionProps {
    onError: (error: string) => void;
}

export const useRealtimeDetection = ({ onError }: UseRealtimeDetectionProps) => {
    const [detections, setDetections] = useState<Detection[]>([]);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const lastDetections = useRef<Detection[]>([]);

    const handleDetectionResult = useCallback((data: unknown) => {
        const result = data as RealtimeDetectionResult;
        if (result.error) {
            onError(result.error);
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
        if (result.image) {
            setProcessedImage(result.image);
        }
    }, [onError]);

    const startDetection = useCallback(async () => {
        try {
            await websocketClient.connect();
            websocketClient.onMessage(handleDetectionResult);
            websocketClient.onError((error) => {
                console.error("WebSocket error:", error);
                onError("Connection to detection server failed. Please try again.");
                setIsStreaming(false);
            });
            setIsStreaming(true);
            return { success: true };
        } catch (error) {
            console.error("Failed to connect to WebSocket server:", error);
            onError("Failed to connect to detection server. Please ensure the backend is running.");
            return { success: false };
        }
    }, [handleDetectionResult, onError]);

    const stopDetection = useCallback(() => {
        websocketClient.disconnect();
        setIsStreaming(false);
        setProcessedImage(null);
        setDetections([]);
        lastDetections.current = [];
    }, []);

    const sendFrame = useCallback((
        frameData: string,
        returnImage: boolean,
        skipFrames: number,
        resizeFactor: number,
        inputSize: number
    ) => {
        websocketClient.sendFrame(
            frameData,
            Date.now(),
            returnImage,
            skipFrames,
            resizeFactor,
            inputSize
        );
    }, []);

    return {
        detections,
        processedImage,
        isStreaming,
        startDetection,
        stopDetection,
        sendFrame
    };
};
