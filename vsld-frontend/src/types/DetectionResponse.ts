export interface Detection {
    class_name: string;
    confidence: number;
    bbox?: number[];
}

export interface RealtimeDetectionResult {
    timestamp: number;
    detections: Detection[];
    image?: string;  // Base64 encoded image with annotations
    error?: string;
    skipped?: boolean;
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
