import cv2
import moviepy.editor as moviepy
from pathlib import Path
from typing import Tuple, List, Dict, Optional

from fastapi import HTTPException, status

from app.services.detector import get_detector


async def convert_avi_to_mp4(input_path: Path, output_path: Path) -> None:
    """
    Convert AVI video to MP4 format using moviepy
    
    Args:
        input_path: Path to input AVI file
        output_path: Path to output MP4 file
    
    Raises:
        HTTPException: If conversion fails
    """
    try:
        clip = moviepy.VideoFileClip(str(input_path))
        clip.write_videofile(str(output_path), codec="libx264", audio_codec="aac")
        clip.close()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error converting video: {str(e)}"
        )


def process_video_frame_by_frame(video_path: Path) -> Tuple[List[Dict], float]:
    """
    Process a video frame by frame to get per-frame predictions
    
    Args:
        video_path: Path to the video file
        
    Returns:
        Tuple of frame detections and FPS
        
    Raises:
        HTTPException: If video processing fails
    """
    detector = get_detector()
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to open video file"
        )
    
    fps = cap.get(cv2.CAP_PROP_FPS)
    
    frame_detections = []
    frame_number = 0
    
    # Process each frame
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        timestamp = frame_number / fps
        
        detections, _ = detector.detect_from_image(
            frame, 
            input_size=640,
            augment=False
        )
        
        frame_result = {
            "frame_number": frame_number,
            "timestamp": timestamp,
            "detections": detections
        }
        frame_detections.append(frame_result)
        
        frame_number += 1
        
        # For very long videos, limit the number of frames processed
        # to avoid memory issues and excessive response size
        if frame_number >= 1000:  # Limit to 1000 frames (~33 sec at 30fps)
            break
    
    cap.release()
    return frame_detections, fps


async def stream_video_file(file_path: Path, chunk_size: int = 1024 * 1024):
    """
    Async generator to stream video files in chunks
    
    Args:
        file_path: Path to the video file
        chunk_size: Size of chunks in bytes
        
    Yields:
        Chunks of the video file
    """
    with open(file_path, 'rb') as video_file:
        while True:
            chunk = video_file.read(chunk_size)
            if not chunk:
                break
            yield chunk


def process_detection_results(results, frame_number: Optional[int] = None, timestamp: Optional[float] = None) -> List[Dict]:
    """
    Process detection results into a consistent format
    
    Args:
        results: Detection results from YOLO
        frame_number: Frame number (optional)
        timestamp: Timestamp in seconds (optional)
        
    Returns:
        List of detection dictionaries or dictionary with frame information
    """
    if not results or not results[0].boxes:
        return []
        
    from app.services.model import get_model
    model = get_model()
    
    detections = [
        {
            "class_name": model.names[int(box.cls[0])],
            "confidence": float(box.conf[0]),
            "bbox": box.xyxy[0].tolist() if hasattr(box, 'xyxy') and len(box.xyxy) > 0 else None,
        }
        for box in results[0].boxes
    ]
    
    # If frame information is provided, include it in the response
    if frame_number is not None and timestamp is not None:
        return {
            "frame_number": frame_number,
            "timestamp": timestamp,
            "detections": detections
        }
    
    return detections
