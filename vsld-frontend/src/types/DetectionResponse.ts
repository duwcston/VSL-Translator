export interface Detection {
    class_name: string;
    confidence: number;
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
}
