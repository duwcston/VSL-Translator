import { useState, useRef, useCallback, useEffect } from "react";
import websocketClient from "../api/websocketClient";
import { Detection, RealtimeDetectionResult } from "../types/DetectionResponse";

// Upper bound on the send rate. Within it, frames are pipelined: the next one
// goes out as soon as the previous result arrives, so throughput follows the
// backend's actual speed instead of a fixed timer.
const MAX_FPS = 15;
const MIN_FRAME_INTERVAL_MS = 1000 / MAX_FPS;
// Retry delay when a frame couldn't be captured (e.g. camera still warming up).
const CAPTURE_RETRY_MS = 100;

interface UseRealtimeDetectionProps {
    onError: (error: string | null) => void;
    captureFrame: () => string | null;
}

export const useRealtimeDetection = ({ onError, captureFrame }: UseRealtimeDetectionProps) => {
    const [detections, setDetections] = useState<Detection[]>([]);
    const [frameSize, setFrameSize] = useState<[number, number] | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [stats, setStats] = useState({ fps: 0, latency: 0 });

    const streamingRef = useRef(false);
    const timerRef = useRef<number | null>(null);
    const lastSentAt = useRef(0);
    const fpsEma = useRef(0);
    // Latest values for the send loop without restarting it on every change.
    const captureRef = useRef(captureFrame);
    const onErrorRef = useRef(onError);
    useEffect(() => {
        captureRef.current = captureFrame;
        onErrorRef.current = onError;
    });

    const clearTimer = () => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    const sendNextFrame = useCallback(() => {
        timerRef.current = null;
        if (!streamingRef.current) return;

        const frame = captureRef.current();
        if (!frame) {
            timerRef.current = window.setTimeout(sendNextFrame, CAPTURE_RETRY_MS);
            return;
        }
        lastSentAt.current = performance.now();
        websocketClient.sendFrame(frame);
    }, []);

    const scheduleNextFrame = useCallback(() => {
        if (!streamingRef.current) return;
        const elapsed = performance.now() - lastSentAt.current;
        clearTimer();
        timerRef.current = window.setTimeout(
            sendNextFrame,
            Math.max(0, MIN_FRAME_INTERVAL_MS - elapsed),
        );
    }, [sendNextFrame]);

    const handleDetectionResult = useCallback((data: unknown) => {
        const result = data as RealtimeDetectionResult;
        const latency = performance.now() - lastSentAt.current;

        if (result.error) {
            onErrorRef.current(result.error);
        } else {
            setDetections(result.detections || []);
            if (result.frame_size) setFrameSize(result.frame_size);

            const instantFps = 1000 / Math.max(latency, MIN_FRAME_INTERVAL_MS);
            fpsEma.current = fpsEma.current ? fpsEma.current * 0.8 + instantFps * 0.2 : instantFps;
            setStats({ fps: fpsEma.current, latency });
        }

        scheduleNextFrame();
    }, [scheduleNextFrame]);

    const stopDetection = useCallback(() => {
        streamingRef.current = false;
        clearTimer();
        websocketClient.disconnect();
        setIsStreaming(false);
        setDetections([]);
        setStats({ fps: 0, latency: 0 });
        fpsEma.current = 0;
    }, []);

    const startDetection = useCallback(async () => {
        websocketClient.onMessage(handleDetectionResult);
        websocketClient.onError((error) => {
            console.error("WebSocket error:", error);
        });
        websocketClient.onClose(() => {
            stopDetection();
            onErrorRef.current("Lost connection to the detection server.");
        });

        try {
            await websocketClient.connect();
        } catch (error) {
            console.error("Failed to connect to WebSocket server:", error);
            onErrorRef.current("Failed to connect to detection server. Please ensure the backend is running.");
            return { success: false };
        }

        streamingRef.current = true;
        setIsStreaming(true);
        onErrorRef.current(null);
        sendNextFrame();
        return { success: true };
    }, [handleDetectionResult, sendNextFrame, stopDetection]);

    // Make sure nothing keeps running after unmount.
    useEffect(() => stopDetection, [stopDetection]);

    return {
        detections,
        frameSize,
        isStreaming,
        stats,
        startDetection,
        stopDetection,
    };
};
