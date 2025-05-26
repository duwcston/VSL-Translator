import { useRef, useCallback } from "react";

export const useWebcam = () => {
    const streamRef = useRef<MediaStream | null>(null);

    const startWebcam = useCallback(async (videoRef: React.RefObject<HTMLVideoElement | null>) => {
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
        if (streamRef.current) {
            const tracks = streamRef.current.getTracks();
            tracks.forEach(track => track.stop());
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []); const captureFrame = useCallback((
        videoRef: React.RefObject<HTMLVideoElement | null>,
        canvasRef: React.RefObject<HTMLCanvasElement | null>
    ) => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            if (context) {
                // Set canvas dimensions to match video
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                // Draw the video frame to the canvas
                context.drawImage(video, 0, 0, canvas.width, canvas.height);                // Get the frame as a data URL
                return canvas.toDataURL('image/jpeg', 1.0);
            }
        }
        return null;
    }, []);

    return {
        startWebcam,
        stopWebcam,
        captureFrame,
        streamRef
    };
};
