import React from "react";
import Webcam from "react-webcam";

export function Result() {
    const [useWebcam] = React.useState(false);

    return (
        <div className="w-full h-full flex flex-col items-center gap-4 overflow-auto">
            <div className="bg-gray-200 rounded-md">
                {useWebcam ? (
                    <Webcam
                        className="text-gray-400 text-xl"
                        audio={false}
                        height={640}
                        width={640}
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