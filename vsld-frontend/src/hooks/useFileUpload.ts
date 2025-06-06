import { useState, useRef } from "react";
import { EUploadStatus } from "../types/FileIntermediate";
import { DetectionResponse, Detection, FrameDetection } from "../types/DetectionResponse";

const ALLOWED_FILE_TYPES = ['video/quicktime', 'video/mp4', 'image/jpeg', 'image/png', 'image/jpg'];

export const useFileUpload = () => {
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [status, setStatus] = useState<EUploadStatus>(EUploadStatus.Idle);
    const [results, setResults] = useState<Record<string, DetectionResponse>>({});
    const [resultURL, setResultURL] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [currentFrameDetections, setCurrentFrameDetections] = useState<Detection[]>([]); const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [processingProgress, setProcessingProgress] = useState<number>(0);
    const [currentStage, setCurrentStage] = useState<'upload' | 'processing'>('upload');
    const inputRef = useRef<HTMLInputElement>(null);

    // Update current frame detections when video time changes or results change
    const updateCurrentFrameDetections = (time: number, resultsData: Record<string, DetectionResponse>) => {
        if (status === EUploadStatus.Success && Object.keys(resultsData).length > 0) {
            const result = Object.values(resultsData)[0];

            // Check if we have frame-specific detections
            if (result && Array.isArray(result.detections) &&
                result.detections.length > 0 && 'frame_number' in result.detections[0]) {

                // Find the closest frame to current time
                const frameDetections = result.detections as FrameDetection[];
                const fps = result.fps || 30; // Default to 30fps if not provided
                const currentFrame = Math.round(time * fps);

                // Find the frame detection that matches or is closest to the current frame
                const closestFrame = frameDetections.reduce((prev, curr) => {
                    return Math.abs(curr.frame_number - currentFrame) <
                        Math.abs(prev.frame_number - currentFrame) ? curr : prev;
                }, frameDetections[0]);

                setCurrentFrameDetections(closestFrame.detections);
            }
            // If there are no frame-specific detections, use the overall detections
            else if (result && Array.isArray(result.detections)) {
                setCurrentFrameDetections(result.detections as Detection[]);
            }
            else if (result && !Array.isArray(result.detections)) {
                setCurrentFrameDetections([result.detections as Detection]);
            }
        }
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }; const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        setStatus(EUploadStatus.Idle);
        setResults({});
        setCurrentFrameDetections([]);
        setUploadProgress(0);
        setProcessingProgress(0);
        setCurrentStage('upload');

        const { files } = e.dataTransfer;

        if (files.length > 0) {
            const acceptedFiles = Array.from(files).filter((file) => ALLOWED_FILE_TYPES.includes(file.type));
            setFile(acceptedFiles[0]);
        }
    };

    const handleClick = () => {
        inputRef.current?.click();
    }; const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const acceptedFiles = Array.from(event.target.files).filter((file) => ALLOWED_FILE_TYPES.includes(file.type));
            setStatus(EUploadStatus.Idle);
            setFile(acceptedFiles[0]);
            setResults({});
            setCurrentFrameDetections([]);
            setUploadProgress(0);
            setProcessingProgress(0);
            setCurrentStage('upload');
        }
    }; const handleClear = () => {
        setFile(null);
        setStatus(EUploadStatus.Idle);
        setResults({});
        setResultURL(null);
        setCurrentFrameDetections([]);
        setUploadProgress(0);
        setProcessingProgress(0);
        setCurrentStage('upload');
    };

    const handleTimeUpdate = (time: number) => {
        setCurrentTime(time);
        updateCurrentFrameDetections(time, results);
    }; return {
        file,
        isDragging,
        status,
        results,
        resultURL,
        currentTime,
        currentFrameDetections,
        inputRef,
        setStatus,
        setResults,
        setResultURL,
        handleDragEnter,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handleClick,
        handleFileChange,
        handleClear,
        handleTimeUpdate,
        uploadProgress,
        setUploadProgress,
        processingProgress,
        setProcessingProgress,
        currentStage,
        setCurrentStage
    };
};
