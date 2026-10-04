import { useState, useRef } from "react";
import { EUploadStatus } from "../types/FileIntermediate";
import { DetectionResponse, Detection, FrameDetection } from "../types/DetectionResponse";

const ALLOWED_FILE_TYPES = ['video/quicktime', 'video/mp4', 'image/jpeg', 'image/png', 'image/jpg'];

export const useFileUpload = () => {
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [status, setStatus] = useState<EUploadStatus>(EUploadStatus.Idle);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [results, setResults] = useState<Record<string, DetectionResponse>>({});
    const [resultURL, setResultURL] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [currentFrameDetections, setCurrentFrameDetections] = useState<Detection[]>([]);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [processingProgress, setProcessingProgress] = useState<number>(0);
    const [currentStage, setCurrentStage] = useState<'upload' | 'processing'>('upload');
    const inputRef = useRef<HTMLInputElement>(null);
    const dragDepth = useRef(0);

    const updateCurrentFrameDetections = (time: number, resultsData: Record<string, DetectionResponse>) => {
        if (status !== EUploadStatus.Success) return;
        const result = Object.values(resultsData)[0];
        if (!result || !Array.isArray(result.detections) || result.detections.length === 0) return;
        if (!('frame_number' in result.detections[0])) return;

        // The backend emits one entry per frame in order (frame_number === index),
        // so the current frame can be looked up directly instead of scanned for.
        const frameDetections = result.detections as FrameDetection[];
        const fps = result.fps || 30;
        const index = Math.min(Math.max(Math.round(time * fps), 0), frameDetections.length - 1);
        setCurrentFrameDetections(frameDetections[index].detections);
    };

    const resetResults = () => {
        setStatus(EUploadStatus.Idle);
        setErrorMessage(null);
        setResults({});
        setResultURL(null);
        setCurrentTime(0);
        setCurrentFrameDetections([]);
        setUploadProgress(0);
        setProcessingProgress(0);
        setCurrentStage('upload');
    };

    const selectFile = (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const accepted = Array.from(files).find((f) => ALLOWED_FILE_TYPES.includes(f.type));
        resetResults();
        if (accepted) {
            setFile(accepted);
        } else {
            setFile(null);
            setStatus(EUploadStatus.Error);
            setErrorMessage("Unsupported file type. Please use MP4, MOV, JPG or PNG.");
        }
    };

    // Drag events fire for every child element; counting depth avoids the
    // highlight flickering as the cursor moves over the drop zone's contents.
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        dragDepth.current++;
        setIsDragging(true);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        dragDepth.current = 0;
        setIsDragging(false);
        selectFile(e.dataTransfer.files);
    };

    const handleClick = () => {
        inputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        selectFile(event.target.files);
        // Reset so choosing the same file again still fires a change event.
        event.target.value = "";
    };

    const handleClear = () => {
        setFile(null);
        resetResults();
    };

    const handleTimeUpdate = (time: number) => {
        setCurrentTime(time);
        updateCurrentFrameDetections(time, results);
    };

    return {
        file,
        isDragging,
        status,
        errorMessage,
        results,
        resultURL,
        currentTime,
        currentFrameDetections,
        inputRef,
        setStatus,
        setErrorMessage,
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
