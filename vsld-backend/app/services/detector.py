import cv2
import torch
import numpy as np
import base64
from time import time
from typing import Dict, List, Tuple, Optional
from functools import lru_cache
from ultralytics import YOLO

from app.core.config import CONF_THRESHOLD


class SignLanguageDetector:
    """
    Sign Language Detection using YOLO models with optimized performance
    for real-time video analysis and streaming.
    """
    
    def __init__(self, model_path: str, conf_threshold: float = CONF_THRESHOLD):
        """
        Initialize the Sign Language Detector
        
        Args:
            model_path: Path to the YOLO model file
            conf_threshold: Minimum confidence threshold for detections
        """
        self.model_path = model_path
        self.conf_threshold = conf_threshold
        self.model = self.load_model(model_path)
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f"[SignLanguageDetector] Using device: {self.device}")
        
        # Move model to device and optimize
        if self.device == 'cuda':
            self.model.to(self.device).half()  # Use half precision for better performance
            # Warm up the model with a dummy input
            dummy_input = torch.zeros(1, 3, 640, 640).to(self.device).half()
            self.model(dummy_input)
        
        # Set model to eval mode for inference
        self.model.eval()
            
    def load_model(self, model_path: str) -> YOLO:
        """
        Load the YOLO model from the given path
        
        Args:
            model_path: Path to the YOLO model file
            
        Returns:
            YOLO model instance
        """
        try:
            model = YOLO(model_path)
            print(f"[SignLanguageDetector] Model loaded successfully from: {model_path}")
            return model
        except Exception as e:
            print(f"[SignLanguageDetector] Error loading model: {e}")
            raise RuntimeError(f"Failed to load model from {model_path}: {e}")
    
    def detect_from_image(self, 
                         image: np.ndarray, 
                         input_size: int = 640, 
                         augment: bool = False) -> Tuple[List[Dict], np.ndarray]:
        """
        Perform detection on a single image frame
        
        Args:
            image: Input image as numpy array (BGR format from OpenCV)
            input_size: Input size for the model
            augment: Whether to use augmentation during inference
            
        Returns:
            Tuple containing:
                - List of detection dictionaries
                - Annotated image with bounding boxes
        """
        # Make sure the frame is correctly sized for performance
        image_resized = self.ensure_frame_size(image, input_size)
        
        # Start timing for performance metrics
        start_time = time()
        
        # Run inference
        results = self.model.predict(
            source=image_resized,
            conf=self.conf_threshold,
            verbose=False,
            imgsz=input_size,
            augment=augment,
            retina_masks=False
        )
        
        # Process results into standardized format
        detections = []
        if results and results[0].boxes:
            for box in results[0].boxes:
                class_id = int(box.cls[0])
                class_name = self.model.names[class_id]
                confidence = float(box.conf[0])
                
                if confidence >= self.conf_threshold:
                    # Get coordinates in x1, y1, x2, y2 format
                    coords = box.xyxy[0].tolist() if hasattr(box, 'xyxy') and len(box.xyxy) > 0 else None
                    
                    detections.append({
                        "class_name": class_name,
                        "confidence": confidence,
                        "bbox": coords
                    })
        
        end_time = time()
        fps = 1 / (end_time - start_time) if (end_time - start_time) > 0 else 0
        
        # Draw bounding boxes on the image
        annotated_image = self.draw_boxes(image, detections, fps)
        
        return detections, annotated_image
    
    def ensure_frame_size(self, frame: np.ndarray, target_size: int) -> np.ndarray:
        """
        Ensure the frame is correctly sized without changing aspect ratio
        
        Args:
            frame: Input frame
            target_size: Target size (will be used for both dimensions)
            
        Returns:
            Resized frame
        """
        if frame is None:
            return None
            
        h, w = frame.shape[:2]
        
        # Only resize if needed
        if h != target_size or w != target_size:
            frame = cv2.resize(frame, (target_size, target_size))
            
        return frame
    
    def draw_boxes(self, 
                  image: np.ndarray, 
                  detections: List[Dict], 
                  fps: Optional[float] = None) -> np.ndarray:
        """
        Draw bounding boxes and labels on the image
        
        Args:
            image: Input image
            detections: List of detection dictionaries
            fps: Frames per second (optional, for display)
            
        Returns:
            Image with bounding boxes and labels drawn
        """
        # Create a copy to avoid modifying the original
        annotated_image = image.copy()
        
        # Draw each detection
        for det in detections:
            if "bbox" not in det or det["bbox"] is None:
                continue
                
            x1, y1, x2, y2 = map(int, det["bbox"])
            
            # Draw rectangle
            cv2.rectangle(annotated_image, (x1, y1), (x2, y2), (0, 255, 0), 2)
            
            # Create label text
            label = f"{det['class_name']}: {det['confidence']:.2f}"
            
            # Calculate text size and position
            text_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_DUPLEX, 0.6, 1)[0]
            
            # Draw label background
            cv2.rectangle(annotated_image, 
                         (x1, y1 - 20), 
                         (x1 + text_size[0], y1), 
                         (0, 255, 0), -1)
            
            # Draw label text
            cv2.putText(annotated_image, 
                       label, 
                       (x1, y1 - 5), 
                       cv2.FONT_HERSHEY_DUPLEX, 
                       0.6, (0, 0, 0), 1)
        
        # Add FPS if provided
        if fps is not None:
            cv2.putText(annotated_image, 
                      f'FPS: {int(fps)}', 
                      (20, 50), 
                      cv2.FONT_HERSHEY_SIMPLEX, 
                      1, (0, 255, 0), 2)
            
        return annotated_image
    
    def process_video(self, 
                     video_path: str,
                     output_path: Optional[str] = None, 
                     max_frames: int = 1000) -> List[Dict]:
        """
        Process a video file and get detections for each frame
        
        Args:
            video_path: Path to the input video file
            output_path: Path to save the output video (if None, no video is saved)
            max_frames: Maximum number of frames to process
            
        Returns:
            List of dictionaries containing frame number, timestamp, and detections
        """
        # Initialize video capture
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Failed to open video file: {video_path}")
        
        # Get video properties
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        # Initialize video writer if output path is provided
        out = None
        if output_path:
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        frame_detections = []
        frame_number = 0
        
        # Process each frame
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            # Get timestamp in seconds
            timestamp = frame_number / fps
            
            # Perform detection
            detections, annotated_frame = self.detect_from_image(frame)
            
            # Write to output video if specified
            if out and annotated_frame is not None:
                out.write(annotated_frame)
            
            # Add to results
            frame_result = {
                "frame_number": frame_number,
                "timestamp": timestamp,
                "detections": detections
            }
            frame_detections.append(frame_result)
            
            frame_number += 1
            
            if frame_number >= max_frames:
                break
        
        # Clean up
        cap.release()
        if out:
            out.release()
            
        return frame_detections
    
    def process_frame_for_websocket(self, 
                                  frame: np.ndarray, 
                                  input_size: int = 320,
                                  return_image: bool = False) -> Dict:
        """
        Process a single frame for WebSocket streaming
        
        Args:
            frame: Input frame
            input_size: Input size for the model
            return_image: Whether to return the annotated image
            
        Returns:
            Dictionary with detections and optionally the annotated image
        """
        # Detect objects
        detections, annotated_image = self.detect_from_image(
            frame, input_size=input_size
        )
        
        # Prepare response
        response = {
            "detections": detections
        }
        
        # Add annotated image if requested
        if return_image:
            _, buffer = cv2.imencode('.jpg', annotated_image, [cv2.IMWRITE_JPEG_QUALITY, 80])
            img_str = base64.b64encode(buffer).decode('utf-8')
            response["image"] = f"data:image/jpeg;base64,{img_str}"
            
        return response


@lru_cache(maxsize=1)
def get_detector(model_path: str = None, conf_threshold: float = None) -> SignLanguageDetector:
    """
    Get a cached instance of SignLanguageDetector
    
    Args:
        model_path: Path to the model file (optional)
        conf_threshold: Confidence threshold (optional)
        
    Returns:
        SignLanguageDetector instance
    """
    from app.core.config import DEFAULT_MODEL_PATH
    
    if model_path is None:
        model_path = DEFAULT_MODEL_PATH
        
    if conf_threshold is None:
        conf_threshold = CONF_THRESHOLD
        
    return SignLanguageDetector(
        model_path=model_path,
        conf_threshold=conf_threshold
    )
