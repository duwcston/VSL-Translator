from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse, FileResponse
from typing import Dict, List, Optional
import os
import cv2
from pathlib import Path

from app.core.config import ALLOWED_EXTENSIONS, ALLOWED_VIDEO_EXTENSIONS, ALLOWED_IMAGE_EXTENSIONS, TEMP_DIR, PREDICTION_DIR, CONF_THRESHOLD
from app.utils.file_utils import is_valid_file, is_video_file, is_image_file, cleanup_runs_directory
from app.services.detector import get_detector
from app.services.video_processor import process_video_frame_by_frame, convert_avi_to_mp4, stream_video_file

router = APIRouter(tags=["Detection"])


async def save_upload_file(file: UploadFile) -> Path:
    """Save an uploaded file to a temporary location and return the path"""
    temp_file = TEMP_DIR / f"temp_{file.filename}"
    
    try:
        contents = await file.read()
        with open(temp_file, "wb") as f:
            f.write(contents)
        return temp_file
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Could not save file: {str(e)}"
        )


@router.post("/detections")
async def predict_objects(file: UploadFile = File(...)):
    """
    Handle video or image uploads for prediction
    
    Args:
        file: The uploaded video or image file
        
    Returns:
        Dictionary with detections and output file information
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided"
        )
        
    if not is_valid_file(file.filename, ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    cleanup_runs_directory()
    
    # Save uploaded file temporarily
    temp_path = await save_upload_file(file)

    try:
        detector = get_detector()
        
        if is_video_file(file.filename, ALLOWED_VIDEO_EXTENSIONS):
            # Check if video is valid
            cap = cv2.VideoCapture(str(temp_path))
            if not cap.isOpened():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to open video file, it may be corrupted"
                )
            
            # Check if video has frames
            ret, _ = cap.read()
            cap.release()
            
            if not ret:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to read video frames"
                )
            
            # Process video frame by frame
            frame_detections, fps = process_video_frame_by_frame(temp_path)
            
            # Run YOLO prediction to get processed video file
            results = detector.model.predict(source=temp_path, save=True, conf=CONF_THRESHOLD, verbose=False, max_det=1)
            
            # Check for AVI files that need to be converted to MP4
            avi_files = list(PREDICTION_DIR.glob("*.avi"))
            if avi_files:
                avi_path = avi_files[0]
                mp4_path = avi_path.with_suffix('.mp4')
                
                await convert_avi_to_mp4(avi_path, mp4_path)
                
                # Remove the original AVI file only if MP4 exists
                if mp4_path.exists():
                    try:
                        os.remove(avi_path)
                        print(f"Successfully removed original AVI file: {avi_path}")
                    except Exception as e:
                        print(f"Warning: Could not remove original AVI: {e}")
                
                return {
                    "detections": frame_detections,
                    "video_path": f"runs/detect/predict/{mp4_path.name}",
                    "type": "video",
                    "fps": fps
                }
            else:
                # Check if the model directly created an MP4
                mp4_files = list(PREDICTION_DIR.glob("*.mp4"))
                if mp4_files:
                    return {
                        "detections": frame_detections,
                        "video_path": f"runs/detect/predict/{mp4_files[0].name}",
                        "type": "video",
                        "fps": fps
                    }
                
                # No video file found in the expected location
                print("Warning: No video files found in prediction directory")
                all_files = list(PREDICTION_DIR.glob("*"))
                print(f"Files in prediction directory: {[f.name for f in all_files]}")
                
                return {
                    "detections": frame_detections,
                    "video_path": None,
                    "type": "video",
                    "fps": fps,
                    "warning": "No output video was generated"
                }
            
        elif is_image_file(file.filename, ALLOWED_IMAGE_EXTENSIONS):
            # Process image
            image = cv2.imread(str(temp_path))
            if image is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, 
                    detail="Failed to read image, it may be corrupted"
                )
            
            # Detect objects in image
            detections, _ = detector.detect_from_image(image, input_size=640)
            
            # Save the annotated image
            detector.model.predict(source=image, save=True, conf=CONF_THRESHOLD, verbose=False, max_det=1)
            
            return {
                "detections": detections,
                "type": "image"
            }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during processing: {str(e)}"
        )
    finally:
        if temp_path.exists():
            try:
                os.remove(temp_path)
            except Exception as e:
                print(f"Error removing temp file: {e}")


@router.get("/detections/result")
async def get_prediction_result():
    """
    Serve the predicted video or image
    
    Returns:
        Video or image content as a streaming or file response
    """
    if not PREDICTION_DIR.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="No predictions available"
        )
        
    files = list(PREDICTION_DIR.glob("*"))
    
    if not files:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="No prediction files found"
        )
        
    file_path = files[0]
    
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prediction file not found"
        )
    
    # Stream video or serve image based on file extension
    extension = Path(file_path.name).suffix.lower()
    if extension in ALLOWED_VIDEO_EXTENSIONS:
        return StreamingResponse(
            content=stream_video_file(file_path),
            media_type="video/mp4",
            headers={"Content-Disposition": f"inline; filename={file_path.name}"}
        )
    else:
        return FileResponse(
            path=file_path, 
            media_type="image/jpeg",
            headers={"Content-Disposition": f"inline; filename={file_path.name}"}
        )
