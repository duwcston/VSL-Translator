export interface Detection {
    class_name: string;
    confidence: number;
    bbox?: number[];  // Optional bounding box coordinates [x1, y1, x2, y2]
}

export interface DetectionResult {
    detections: Detection[];
    type?: "image" | "video";
    video_path?: string;
    fps?: number;
    warning?: string;
}

export interface RealtimeDetectionResult {
    timestamp: number;
    detections: Detection[];
    image?: string;  // Base64 encoded image with annotations
    error?: string;
}
