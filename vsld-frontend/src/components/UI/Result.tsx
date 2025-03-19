import { useEffect, useState } from "react";

export function Result() {
    const [imageSrc, setImageSrc] = useState('');
    const useWebcam = true;

    useEffect(() => {
        // Initialize WebSocket connection
        const socket = new WebSocket(`ws://localhost:8000/yolo/video`);

        socket.onopen = () => {
            console.log('WebSocket connection established.');
        };

        socket.onmessage = (event) => {
            setImageSrc(`data:image/jpeg;base64,${event.data}`);
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        socket.onclose = () => {
            console.log('WebSocket connection closed.');
        };

        return () => {
            socket.close();
        };
    }, []);

    return (
        <div className="w-full h-full flex flex-col items-center gap-4 overflow-auto">
            <div className="bg-gray-200 rounded-md">
                {useWebcam ? (
                    <img
                        src={imageSrc || ''}
                        alt="Video Stream Loading..."
                    />
                ) : (
                    <span className="text-gray-400 text-xl h-[320px] w-[640px] flex items-center justify-center">📷</span>
                )}
            </div>
            <div className="w-[640px] border py-2 px-2 rounded bg-white">
                <input type="text" placeholder="Detection Output" />
            </div>
        </div>
    );
}