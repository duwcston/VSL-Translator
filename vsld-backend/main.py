import os
from pathlib import Path
import shutil
from typing import Dict, List
from functools import lru_cache

from fastapi import FastAPI, File, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from ultralytics import YOLO
import cv2
from fastapi import UploadFile

# Constants
ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png'}
ALLOWED_VIDEO_EXTENSIONS = {'.mp4', '.mov'}
ALLOWED_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS.union(ALLOWED_VIDEO_EXTENSIONS)
CONF_THRESHOLD = 0.6
TEMP_DIR = Path("temp_files")
PREDICTION_DIR = Path("runs/detect/predict")
CHUNK_SIZE = 1024 * 1024  # 1MB chunks for streaming

# Create temp directory if it doesn't exist
TEMP_DIR.mkdir(exist_ok=True)

origins = [
    "http://localhost:5173",
]

app = FastAPI(
    title="VSL Detection Backend",
    description="API for visual sign language detection using YOLO models",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@lru_cache(maxsize=1)
def get_model():
    """Load and cache the YOLO model"""
    return YOLO("models/yolo11s.pt")

def cleanup_runs_directory():
    """Clean up the runs directory before new predictions"""
    if PREDICTION_DIR.exists():
        try:
            shutil.rmtree(PREDICTION_DIR.parent.parent)
        except Exception as e:
            print(f"Error cleaning up directory: {e}")

def get_file_extension(filename: str) -> str:
    """Extract and return the file extension"""
    return Path(filename).suffix.lower()

def is_valid_file(filename: str) -> bool:
    """Check if the file has a valid extension"""
    return get_file_extension(filename) in ALLOWED_EXTENSIONS

def is_video_file(filename: str) -> bool:
    """Check if the file is a video"""
    return get_file_extension(filename) in ALLOWED_VIDEO_EXTENSIONS

def is_image_file(filename: str) -> bool:
    """Check if the file is an image"""
    return get_file_extension(filename) in ALLOWED_IMAGE_EXTENSIONS

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

def process_detection_results(results) -> List[Dict]:
    """Process detection results into a consistent format"""
    if not results or not results[0].boxes:
        return []
        
    model = get_model()
    return [
        {
            "class_name": model.names[int(box.cls[0])],
            "confidence": float(box.conf[0]),
        }
        for box in results[0].boxes
    ]

@app.get("/")
def read_root():
    return {
        "status": "online", 
        "message": "VSL Detection Backend running"
    }

@app.post("/yolo/predict")
async def predict_objects(file: UploadFile = File(...)):
    """Handle video or image uploads for prediction"""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided"
        )
        
    if not is_valid_file(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Clean up previous predictions
    cleanup_runs_directory()
    
    # Save uploaded file temporarily
    temp_path = await save_upload_file(file)

    try:
        model = get_model()
        
        if is_video_file(file.filename):
            # Validate video file
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
                
            # Process video with YOLO model
            results = model.predict(source=temp_path, save=True, conf=CONF_THRESHOLD)
            detections = process_detection_results(results)
            
            return {
                "detections": detections,
                "video_path": f"runs/detect/predict/{file.filename}",
                "type": "video"
            }
            
        elif is_image_file(file.filename):
            image = cv2.imread(str(temp_path))
            if image is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, 
                    detail="Failed to read image, it may be corrupted"
                )
                
            results = model.predict(source=image, save=True, conf=CONF_THRESHOLD)
            detections = process_detection_results(results)
            
            return {
                "detections": detections,
                "type": "image"
            }
    except Exception as e:
        # Handle unexpected errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during processing: {str(e)}"
        )
    finally:
        # Clean up temporary file
        if temp_path.exists():
            try:
                os.remove(temp_path)
            except Exception as e:
                print(f"Error removing temp file: {e}")

@app.get("/yolo/result")
async def get_prediction_result():
    """Serve the predicted video or image"""
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
    
    if get_file_extension(file_path.name) in ALLOWED_VIDEO_EXTENSIONS:
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

async def stream_video_file(file_path: Path):
    """Async generator to stream video files in chunks"""
    async with open(file_path, 'rb') as video_file:
        while chunk := await video_file.read(CHUNK_SIZE):
            yield chunk
