import React from "react"
import Button from "./UI/Button";
import { EUploadStatus } from "../types/FileIntermediate";
import useResultsApi from "../api/resultsApi";
import { DetectionResponse, Detection, FrameDetection } from "../types/DetectionResponse";

const ALLOWED_FILE_TYPES = ['video/quicktime', 'video/mp4', 'image/jpeg', 'image/png', 'image/jpg']

export function Uploader() {
    const [file, setFile] = React.useState<File | null>(null)
    const [isDragging, setIsDragging] = React.useState(false)
    const [status, setStatus] = React.useState<EUploadStatus>(EUploadStatus.Idle)
    const [results, setResults] = React.useState<Record<string, DetectionResponse>>({})
    const [resultURL, setResultURL] = React.useState<string | null>(null)
    const [currentTime, setCurrentTime] = React.useState<number>(0)
    const [currentFrameDetections, setCurrentFrameDetections] = React.useState<Detection[]>([])
    const videoRef = React.useRef<HTMLVideoElement>(null)
    const inputRef = React.useRef<HTMLInputElement>(null)

    const resultApi = useResultsApi()

    // Update current frame detections when video time changes or results change
    React.useEffect(() => {
        if (status === EUploadStatus.Success && Object.keys(results).length > 0) {
            const result = Object.values(results)[0]

            // Check if we have frame-specific detections
            if (result && Array.isArray(result.detections) &&
                result.detections.length > 0 && 'frame_number' in result.detections[0]) {

                // Find the closest frame to current time
                const frameDetections = result.detections as FrameDetection[]
                const fps = result.fps || 30 // Default to 30fps if not provided
                const currentFrame = Math.round(currentTime * fps)

                // Find the frame detection that matches or is closest to the current frame
                const closestFrame = frameDetections.reduce((prev, curr) => {
                    return Math.abs(curr.frame_number - currentFrame) <
                        Math.abs(prev.frame_number - currentFrame) ? curr : prev
                }, frameDetections[0])

                setCurrentFrameDetections(closestFrame.detections)
            }
            // If there are no frame-specific detections, use the overall detections
            else if (result && Array.isArray(result.detections)) {
                setCurrentFrameDetections(result.detections as Detection[])
            }
            else if (result && !Array.isArray(result.detections)) {
                setCurrentFrameDetections([result.detections as Detection])
            }
        }
    }, [currentTime, results, status])

    // Handle video time update
    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    function onDragEnter(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
    }

    function onDragOver(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault()
        e.stopPropagation()
    }

    function onDragLeave(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }

    function onDrop(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)

        setStatus(EUploadStatus.Idle)
        setResults({})
        setCurrentFrameDetections([])

        const { files } = e.dataTransfer

        if (files.length > 0) {
            const acceptedFiles = Array.from(files).filter((file) => ALLOWED_FILE_TYPES.includes(file.type))
            setFile(acceptedFiles[0])
        }
    }

    function onClick() {
        inputRef.current?.click()
    }

    function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        if (event.target.files) {
            const acceptedFiles = Array.from(event.target.files).filter((file) => ALLOWED_FILE_TYPES.includes(file.type))
            setStatus(EUploadStatus.Idle)
            setFile(acceptedFiles[0])
            setResults({})
            setCurrentFrameDetections([])
        }
    }

    function convertFileSize(size: number) {
        if (size < 1024) {
            return `${size} B`
        } else if (size < 1024 * 1024) {
            return `${(size / 1024).toFixed(2)} KB`
        } else {
            return `${(size / (1024 * 1024)).toFixed(2)} MB`
        }
    }

    function handleClear() {
        setFile(null)
        setStatus(EUploadStatus.Idle)
        setResults({})
        setResultURL(null)
        setCurrentFrameDetections([])
    }

    async function handleFileUpload() {
        if (!file) return

        try {
            setStatus(EUploadStatus.Uploading)
            const response = await resultApi.uploadFile(file)

            const key = file.name
            setResults((prev) => ({ ...prev, [key]: response }))

            // Wait a bit to let the server process the video
            setTimeout(() => {
                setResultURL(resultApi.getResult())
                setStatus(EUploadStatus.Success)
            }, 1000)
        } catch (error) {
            console.error(error)
            setStatus(EUploadStatus.Error)
        }
    }

    return (
        <div className="p-4 grid grid-cols-2 gap-4">
            <div className="bg-gray-100 p-10 items-center gap-2 flex flex-col rounded-md">
                <div className="w-full h-full flex flex-col items-center gap-4 overflow-auto">
                    <div
                        className={`
                            lg:h-[300px] lg:w-[500px] 
                            md:h-[300px] md:w-[300px]
                            border-dashed border-2 rounded-md ${isDragging ? `border-blue-600` : `border-black`}`}
                    >
                        <div
                            className="h-full w-full flex justify-center items-center hover:cursor-pointer"
                            onDragEnter={onDragEnter}
                            onDragOver={onDragOver}
                            onDragLeave={onDragLeave}
                            onDrop={onDrop}
                            onClick={onClick}
                        >
                            {isDragging ? (
                                <div>Drop file here</div>
                            ) : (
                                <div className="flex gap-1">
                                    <span>Drop your file here or</span>
                                    <span className="hover:underline hover:cursor-pointer font-semibold text-[#0074EF]">
                                        Choose
                                    </span>
                                    <input
                                        ref={inputRef}
                                        className="hidden"
                                        type="file"
                                        accept=".mp4, .mov, .jpeg, .png, .jpg"
                                        multiple
                                        onChange={(event) => handleFileChange(event)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                    {file && (
                        <div className="text-sm">
                            <p>File name: {file.name}</p>
                            <p>File size: {convertFileSize(file.size)}</p>
                            <p>File.type: {file.type}</p>
                        </div>
                    )}
                    {status === EUploadStatus.Success && <p className="text-sm text-green-500">File uploaded successfully</p>}
                    {status === EUploadStatus.Error && <p className="text-sm text-red-500">Error uploading file</p>}
                    <Button width="full" height="auto" label="Upload" onClick={handleFileUpload}></Button>
                    <Button width="full" height="auto" label="Clear" onClick={handleClear}></Button>
                </div>
            </div>

            {/* OUTPUT VIDEOS WITH PREDICTION LABELS */}
            <div className="bg-gray-100 p-10 gap-2 flex flex-col rounded-md">
                <div className="w-full h-full flex flex-col items-center gap-4 overflow-auto">
                    <div className="bg-gray-200 rounded-md h-full w-full flex items-center justify-center">
                        {status === EUploadStatus.Idle ? (
                            <span className="flex items-center justify-center">📷</span>
                        ) : status === EUploadStatus.Uploading ? (
                            <div className="flex items-center justify-center cursor-wait">
                                <div className="size-10 animate-spin rounded-full h-8 w-8 border-t-2 border-b-2"></div>
                            </div>
                        ) : status === EUploadStatus.Success && resultURL ? (
                            Object.values(results)[0]?.type === "image" ? (
                                <img
                                    key={resultURL}
                                    src={resultURL}
                                    alt="Detection result"
                                    className="max-h-full max-w-full object-contain"
                                />
                            ) : (
                                <video
                                    ref={videoRef}
                                    key={resultURL}
                                    controls
                                    autoPlay
                                    muted
                                    onTimeUpdate={handleTimeUpdate}>
                                    <source src={resultURL} type="video/mp4" />
                                    Your browser does not support the video tag.
                                </video>
                            )
                        ) : null}
                    </div>
                    <div className="w-full border py-2 px-2 rounded bg-white">
                        {Object.keys(results).length > 0 ? (
                            <div>
                                {Object.values(results)[0]?.type === "video" && (
                                    <div className="mb-2 text-sm text-gray-600">
                                        <div className="flex justify-between">
                                            <span>Current time: {currentTime.toFixed(2)}s</span>
                                            {Object.values(results)[0]?.fps && (
                                                <span>Frame: {Math.round(currentTime * (Object.values(results)[0]?.fps || 30))}</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <div>
                                    {/* Show current frame detections */}
                                    {currentFrameDetections.length > 0 ? (
                                        <div>
                                            <h6 className="font-semibold mb-1">Detected signs:</h6>
                                            {currentFrameDetections.map((detection, index) => (
                                                <div key={`${detection.class_name}-${index}`} className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                    <p className="flex-1">{detection.class_name}: {(detection.confidence).toFixed(2)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500">No signs detected in this frame</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <h5 className="text-gray-400">No predictions available</h5>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
