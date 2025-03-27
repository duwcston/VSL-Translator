export interface DetectionResponse {
    detections: {
        class_name: string
        confidence: number
    }
}
