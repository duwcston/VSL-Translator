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
    const isAwaitingResponse = useRef(false);

    const handleDetectionResult = useCallback((data: unknown) => {
        isAwaitingResponse.current = false;
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
                isAwaitingResponse.current = false;
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
        isAwaitingResponse.current = false;
    }, []);

    const sendFrame = useCallback((
        frameData: string,
        returnImage: boolean,
        skipFrames: number,
        resizeFactor: number,
        inputSize: number
    ) => {
        // Skip sending while a previous frame's response is still pending,
        // so the client doesn't keep encoding/queueing frames the backend
        // would just drop.
        if (isAwaitingResponse.current) return;
        isAwaitingResponse.current = true;
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
        isAwaitingResponse,
        startDetection,
        stopDetection,
        sendFrame
    };
};
