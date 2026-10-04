import cv2
import torch
import numpy as np
from typing import Callable, Dict, List, Tuple, Optional
from ultralytics import YOLO

from app.config.config import CONF_THRESHOLD, DEFAULT_MODEL_PATH, REALTIME_INPUT_SIZE


class SignLanguageDetector:
    def __init__(self, model_path: str, conf_threshold: float = CONF_THRESHOLD):
        self.model_path = model_path
        self.conf_threshold = conf_threshold
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = self._load_and_optimize_model()

    def _load_and_optimize_model(self) -> YOLO:
        try:
            model = YOLO(self.model_path, task="detect")
            print(f"Model loaded from: {self.model_path}")
            print(f"Using device: {self.device}")

            # Warm up once so the first real request doesn't pay for backend
            # initialisation (ONNX session / CUDA kernels).
            dummy = np.zeros((REALTIME_INPUT_SIZE, REALTIME_INPUT_SIZE, 3), np.uint8)
            model.predict(
                dummy,
                imgsz=REALTIME_INPUT_SIZE,
                device=self.device,
                verbose=False,
            )
            return model
        except Exception as e:
            raise RuntimeError(f"Failed to load model from {self.model_path}: {e}")

    def predict(self, source, **kwargs):
        # Always FP32, the precision the exported ONNX models use, so .pt and
        # .onnx weights give the same results on CPU and GPU.
        return self.model.predict(
            source=source, device=self.device, half=False, verbose=False, **kwargs
        )

    def extract_detections(self, results) -> List[Dict]:
        return self._extract_detections(results)

    def extract_video_detections(
        self,
        results,
        video_path: str,
        on_progress: Optional[Callable[[int, int], None]] = None,
    ) -> Tuple[List[Dict], float]:
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        cap.release()

        frame_detections = []
        for frame_number, result in enumerate(results):
            detections = self._extract_detections([result])
            frame_detections.append(
                {
                    "frame_number": frame_number,
                    "timestamp": frame_number / fps,
                    "detections": detections,
                }
            )

            if on_progress:
                on_progress(frame_number + 1, total_frames)

        return frame_detections, fps

    def _extract_detections(
        self, results, conf_threshold: Optional[float] = None
    ) -> List[Dict]:
        threshold = self.conf_threshold if conf_threshold is None else conf_threshold
        detections = []
        if results and results[0].boxes:
            for box in results[0].boxes:
                class_id = int(box.cls[0])
                class_name = self.model.names[class_id]
                confidence = float(box.conf[0])

                if confidence >= threshold:
                    coords = (
                        box.xyxy[0].tolist()
                        if hasattr(box, "xyxy") and len(box.xyxy) > 0
                        else None
                    )
                    detections.append(
                        {
                            "class_name": class_name,
                            "confidence": confidence,
                            "bbox": coords,
                        }
                    )
        return detections


_detector_instance = None


def get_detector() -> SignLanguageDetector:
    global _detector_instance
    if _detector_instance is None:
        _detector_instance = SignLanguageDetector(DEFAULT_MODEL_PATH)
    return _detector_instance


def initialize_detector():
    get_detector()
