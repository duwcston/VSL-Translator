from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse, FileResponse
import cv2
from pathlib import Path

from app.core.config import (
    ALLOWED_EXTENSIONS, ALLOWED_VIDEO_EXTENSIONS, ALLOWED_IMAGE_EXTENSIONS, 
    TEMP_DIR, PREDICTION_DIR, CONF_THRESHOLD
)
from app.utils.file_utils import is_valid_file, is_video_file, is_image_file, cleanup_runs_directory, safe_remove_file
from app.services.detector import get_detector
from app.services.video_processor import process_video_frame_by_frame, convert_avi_to_mp4, stream_video_file
from app.services.sentence_generator import generate_sentence_from_detections

router = APIRouter(tags=["Detection"])

class DetectionHandler:
    def __init__(self):
        self.detector = get_detector()
    
    async def save_upload_file(self, file: UploadFile) -> Path:
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
    
    def validate_file(self, filename: str):
        if not filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No filename provided"
            )
        
        if not is_valid_file(filename, ALLOWED_EXTENSIONS):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file format. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}"
            )
    
    async def process_video(self, temp_path: Path, filename: str):
        self._validate_video_file(temp_path)
        
        frame_detections, fps = process_video_frame_by_frame(temp_path)
        self.detector.model.predict(source=temp_path, save=True, conf=CONF_THRESHOLD, verbose=False, max_det=1)
        
        video_path = await self._handle_video_conversion()
        sentence = generate_sentence_from_detections(frame_detections)
        
        return {
            "detections": frame_detections,
            "video_path": video_path,
            "type": "video",
            "fps": fps,
            "sentence": sentence
        }
    
    def process_image(self, temp_path: Path):
        image = cv2.imread(str(temp_path))
        if image is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Failed to read image, it may be corrupted"
            )
        
        detections, _ = self.detector.detect_from_image(image, input_size=640)
        self.detector.model.predict(source=image, save=True, conf=CONF_THRESHOLD, verbose=False, max_det=1)
        
        sentence = generate_sentence_from_detections(detections)
        return {
            "detections": detections,
            "type": "image",
            "sentence": sentence
        }
    
    def _validate_video_file(self, temp_path: Path):
        cap = cv2.VideoCapture(str(temp_path))
        if not cap.isOpened():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to open video file, it may be corrupted"
            )
        
        ret, _ = cap.read()
        cap.release()
        
        if not ret:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to read video frames"
            )
    
    async def _handle_video_conversion(self):
        avi_files = list(PREDICTION_DIR.glob("*.avi"))
        if avi_files:
            avi_path = avi_files[0]
            mp4_path = avi_path.with_suffix('.mp4')
            await convert_avi_to_mp4(avi_path, mp4_path)
            
            if mp4_path.exists():
                safe_remove_file(avi_path)
                return f"runs/detect/predict/{mp4_path.name}"
        
        mp4_files = list(PREDICTION_DIR.glob("*.mp4"))
        if mp4_files:
            return f"runs/detect/predict/{mp4_files[0].name}"
        
        print("Warning: No video files found in prediction directory")
        return None


handler = DetectionHandler()


@router.post("/detections")
async def predict_objects(file: UploadFile = File(...)):
    handler.validate_file(file.filename)
    cleanup_runs_directory()
    
    temp_path = await handler.save_upload_file(file)
    
    try:
        if is_video_file(file.filename, ALLOWED_VIDEO_EXTENSIONS):
            return await handler.process_video(temp_path, file.filename)
        elif is_image_file(file.filename, ALLOWED_IMAGE_EXTENSIONS):
            return handler.process_image(temp_path)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during processing: {str(e)}"
        )
    finally:
        safe_remove_file(temp_path)


@router.get("/detections/result")
async def get_prediction_result():
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
