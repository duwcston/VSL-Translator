import React from "react";

interface VideoStreamProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

const VideoStream: React.FC<VideoStreamProps> = ({ videoRef, canvasRef }) => {
    return (
        <div className="bg-gray-100 rounded-lg overflow-hidden">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full"
                style={{ display: 'block' }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
    );
};

export default VideoStream;
