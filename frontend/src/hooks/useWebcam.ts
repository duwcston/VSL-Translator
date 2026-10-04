import { useRef, useCallback } from "react";

// The model runs at 320x320, so larger frames only cost encode/upload/decode
// time without improving detection.
const CAPTURE_WIDTH = 320;
const JPEG_QUALITY = 0.8;

export const useWebcam = () => {
    const streamRef = useRef<MediaStream | null>(null);
    // Bumped by stopWebcam so a getUserMedia call that resolves after the
    // component was torn down (e.g. React StrictMode's double mount) releases
    // its camera instead of leaking it.
    const generationRef = useRef(0);

    const startWebcam = useCallback(async (videoRef: React.RefObject<HTMLVideoElement | null>) => {
        const generation = generationRef.current;
        if (streamRef.current) return { success: true, error: null };

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: "user"
                }
            });

            if (generation !== generationRef.current || !videoRef.current) {
                stream.getTracks().forEach(track => track.stop());
                return { success: false, error: null };
            }

            videoRef.current.srcObject = stream;
            streamRef.current = stream;
            return { success: true, error: null };
        } catch (error) {
            console.error("Error accessing webcam:", error);
            return {
                success: false,
                error: "Failed to access webcam. Please ensure your camera is connected and permissions are granted."
            };
        }
    }, []);

    const stopWebcam = useCallback((videoRef: React.RefObject<HTMLVideoElement | null>) => {
        generationRef.current++;
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    const captureFrame = useCallback((
        videoRef: React.RefObject<HTMLVideoElement | null>,
        canvasRef: React.RefObject<HTMLCanvasElement | null>
    ) => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || !video.videoWidth) return null;

        const context = canvas.getContext('2d');
        if (!context) return null;

        const width = Math.min(CAPTURE_WIDTH, video.videoWidth);
        const height = Math.round(video.videoHeight * (width / video.videoWidth));
        // Only resize when needed: assigning width/height reallocates the canvas.
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        context.drawImage(video, 0, 0, width, height);
        return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    }, []);

    return {
        startWebcam,
        stopWebcam,
        captureFrame,
        streamRef
    };
};
