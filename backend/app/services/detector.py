import cv2
import torch
import numpy as np
import base64
from time import time
from typing import Dict, List, Tuple, Optional
from ultralytics import YOLO

from app.core.config import CONF_THRESHOLD, DEFAULT_MODEL_PATH

class SignLanguageDetector:
    def __init__(self, model_path: str, conf_threshold: float = CONF_THRESHOLD):
        self.model_path = model_path
        self.conf_threshold = conf_threshold
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        self.model = self._load_and_optimize_model()
        
    def _load_and_optimize_model(self) -> YOLO:
        try:
            model = YOLO(self.model_path)
            print(f"Model loaded from: {self.model_path}")
            # model.export(format="onnx", imgz=320, dynamic=True, simplify=True)
            # onnx_model = YOLO("best.onnx")
            print(f"Using device: {self.device}")
            
            if self.device == 'cuda':
                model.to(self.device).half()
                dummy_input = torch.zeros(1, 3, 640, 640).to(self.device).half()
                model(dummy_input)
            
            return model
        except Exception as e:
            raise RuntimeError(f"Failed to load model from {self.model_path}: {e}")
    
    def detect_from_image(self, image: np.ndarray, input_size: int = 640) -> Tuple[List[Dict], np.ndarray]:
        image_resized = self._ensure_frame_size(image, input_size)
        start_time = time()
        
        results = self.model.predict(
            source=image_resized,
            conf=self.conf_threshold,
            verbose=False,
            imgsz=input_size,
            retina_masks=False
        )
        
        detections = self._extract_detections(results)
        fps = 1 / (time() - start_time) if (time() - start_time) > 0 else 0
        annotated_image = self._draw_detections(image, detections, fps)
        
        return detections, annotated_image
    
    def _extract_detections(self, results) -> List[Dict]:
        detections = []
        if results and results[0].boxes:
            for box in results[0].boxes:
                class_id = int(box.cls[0])
                class_name = self.model.names[class_id]
                confidence = float(box.conf[0])
                
                if confidence >= self.conf_threshold:
                    coords = box.xyxy[0].tolist() if hasattr(box, 'xyxy') and len(box.xyxy) > 0 else None
                    detections.append({
                        "class_name": class_name,
                        "confidence": confidence,
                        "bbox": coords
                    })
        return detections
    
    def _ensure_frame_size(self, frame: np.ndarray, target_size: int) -> np.ndarray:
        if frame is None:
            return None
        
        h, w = frame.shape[:2]
        if h != target_size or w != target_size:
            frame = cv2.resize(frame, (target_size, target_size))
        return frame
    
    def _draw_detections(self, image: np.ndarray, detections: List[Dict], fps: Optional[float] = None) -> np.ndarray:
        annotated_image = image.copy()
        
        for det in detections:
            if "bbox" not in det or det["bbox"] is None:
                continue
                
            x1, y1, x2, y2 = map(int, det["bbox"])
            
            cv2.rectangle(annotated_image, (x1, y1), (x2, y2), (0, 255, 0), 2)
            label = f"{det['class_name']}: {det['confidence']:.2f}"
            text_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_DUPLEX, 0.6, 1)[0]
            
            cv2.rectangle(annotated_image, (x1, y1 - 20), (x1 + text_size[0], y1), (0, 255, 0), -1)
            cv2.putText(annotated_image, label, (x1, y1 - 5), cv2.FONT_HERSHEY_DUPLEX, 0.6, (0, 0, 0), 1)
        
        if fps is not None:
            cv2.putText(annotated_image, f'FPS: {int(fps)}', (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            
        return annotated_image
    
    def process_video_frames(self, video_path: str, max_frames: int = 1000) -> Tuple[List[Dict], float]:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Failed to open video file: {video_path}")
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_detections = []
        frame_number = 0
        
        while True:
            ret, frame = cap.read()
            if not ret or frame_number >= max_frames:
                break
                
            timestamp = frame_number / fps
            detections, _ = self.detect_from_image(frame)
            
            frame_detections.append({
                "frame_number": frame_number,
                "timestamp": timestamp,
                "detections": detections
            })
            
            frame_number += 1
        
        cap.release()
        return frame_detections, fps
    
    def process_frame_for_websocket(self, frame: np.ndarray, input_size: int = 320, return_image: bool = False) -> Dict:
        detections, annotated_image = self.detect_from_image(frame, input_size=input_size)
        
        response = {"detections": detections}
        
        if return_image:
            _, buffer = cv2.imencode('.jpg', annotated_image, [cv2.IMWRITE_JPEG_QUALITY, 80])
            img_str = base64.b64encode(buffer).decode('utf-8')
            response["image"] = f"data:image/jpeg;base64,{img_str}"
            
        return response

_detector_instance = None

def get_detector() -> SignLanguageDetector:
    global _detector_instance
    if _detector_instance is None:
        _detector_instance = SignLanguageDetector(DEFAULT_MODEL_PATH)
    return _detector_instance

def initialize_detector():
    global _detector_instance
    if _detector_instance is None:
        _detector_instance = SignLanguageDetector(DEFAULT_MODEL_PATH)
