export interface Detection {
    class_name: string;
    confidence: number;
    bbox?: number[];
}

export interface RealtimeDetectionResult {
    timestamp: number;
    detections: Detection[];
    frame_size?: [number, number];  // [width, height] of the frame the bboxes refer to
    image?: string;  // Base64 encoded annotated frame, only when return_image is set
    error?: string;
}

export interface FrameDetection {
    frame_number: number;
    timestamp: number;
    detections: Detection[];
}

export interface DetectionResponse {
    detections: Detection[] | Detection | FrameDetection[];
    type?: "video" | "image";
    video_path?: string;
    fps?: number;
    sentence?: string;
}

export type JobStatus = "pending" | "processing" | "done" | "error";

export interface UploadJobResponse {
    job_id: string;
}

export interface JobProgressResponse {
    status: JobStatus;
    progress: number;
    result: DetectionResponse | null;
    error: string | null;
}
