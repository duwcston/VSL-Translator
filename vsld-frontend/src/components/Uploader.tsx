import React from "react"
import Button from "./UI/Button";
import { EUploadStatus } from "../types/FileIntermediate";
import useResultsApi from "../api/resultsApi";
import { DetectionResponse, Detection, FrameDetection } from "../types/DetectionResponse";

const ALLOWED_FILE_TYPES = ['video/quicktime', 'video/mp4', 'image/jpeg', 'image/png', 'image/jpg']

export default function Uploader() {
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
        <div className="flex flex-col gap-4 p-4">
            {status === EUploadStatus.Error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    Error uploading file. Please try again.
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/2">
                    <div className="bg-gray-100 rounded-lg overflow-hidden p-4">
                        <div
                            className={`
                                h-85 w-full flex justify-center items-center hover:cursor-pointer
                                border-dashed border-2 rounded-md ${isDragging ? `border-blue-600` : `border-gray-400`}`}
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
                                    <div className="text-blue-600 font-medium">Drop file here</div>
                                ) : (
                                    <div className="flex gap-1 items-center">
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
                            <div className="mt-4 p-2 bg-gray-50 rounded">
                                <h3 className="font-bold text-sm mb-1">File Information</h3>
                                <p className="text-sm">File name: {file.name}</p>
                                <p className="text-sm">File size: {convertFileSize(file.size)}</p>
                                <p className="text-sm">File type: {file.type}</p>
                            </div>
                        )}

                        {status === EUploadStatus.Success && (
                            <div className="mt-2 text-sm text-green-500 font-medium">
                                File uploaded successfully
                            </div>
                        )}

                        <div className="mt-4 flex flex-col gap-2">
                            <Button
                                width="full"
                                height="auto"
                                label={status === EUploadStatus.Uploading ? "Uploading..." : "Upload"}
                                onClick={handleFileUpload}
                            />
                            <Button
                                width="full"
                                height="auto"
                                label="Clear"
                                onClick={handleClear}
                            />
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-1/2">
                    <div className="bg-gray-100 rounded-lg overflow-hidden min-h-[360px] flex justify-center items-center">
                        {status === EUploadStatus.Idle ? (
                            <div className="text-center text-gray-500">
                                Upload a file to see detection results
                            </div>
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
                                    className="w-full"
                                    onTimeUpdate={handleTimeUpdate}>
                                    <source src={resultURL} type="video/mp4" />
                                    Your browser does not support the video tag.
                                </video>
                            )
                        ) : null}
                    </div>

                    <div className="mt-4">
                        <h3 className="font-bold text-lg">Detections</h3>
                        <div className="mt-2 max-h-[200px] overflow-y-auto bg-gray-50 rounded p-2">
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
                                    )}                                    {/* Show current frame detections */}
                                    {currentFrameDetections.length > 0 ? (
                                        <ul className="divide-y divide-gray-200">
                                            {currentFrameDetections.map((detection, index) => (
                                                <li key={`${detection.class_name}-${index}`} className="py-2">
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
                                            No signs detected in this frame
                                        </p>
                                    )}

                                    {/* Show paraphrased sentence */}
                                    {Object.values(results)[0]?.sentence && (
                                        <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                                            <h4 className="text-sm font-semibold mb-1 text-blue-800">Paraphrased Sentence:</h4>
                                            <p className="text-gray-800">{Object.values(results)[0].sentence}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-4">
                                    No predictions available
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
