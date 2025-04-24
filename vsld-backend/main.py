import os
from pathlib import Path
import shutil
from typing import Dict, List, Optional
from functools import lru_cache
import moviepy.editor as moviepy

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

async def convert_avi_to_mp4(input_path: Path, output_path: Path) -> None:
    """Convert AVI video to MP4 format using moviepy"""
    try:
        clip = moviepy.VideoFileClip(str(input_path))
        clip.write_videofile(str(output_path), codec="libx264", audio_codec="aac")
        clip.close()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error converting video: {str(e)}"
        )

def process_detection_results(results, frame_number: Optional[int] = None, timestamp: Optional[float] = None) -> List[Dict]:
    """Process detection results into a consistent format"""
    if not results or not results[0].boxes:
        return []
        
    model = get_model()
    detections = [
        {
            "class_name": model.names[int(box.cls[0])],
            "confidence": float(box.conf[0]),
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

def process_video_frame_by_frame(video_path: Path, model) -> List[Dict]:
    """Process a video frame by frame to get per-frame predictions"""
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
            
        # Get timestamp in seconds
        timestamp = frame_number / fps
        
        # Run YOLO detection on the frame
        results = model.predict(source=frame, conf=CONF_THRESHOLD, verbose=False)
        frame_result = process_detection_results(results, frame_number, timestamp)
        frame_detections.append(frame_result)
        
        frame_number += 1
        
        # For very long videos, limit the number of frames processed
        # to avoid memory issues and excessive response size
        if frame_number >= 1000:  # Limit to 1000 frames (~33 sec at 30fps)
            break
    
    cap.release()
    return frame_detections, fps

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
    
    cleanup_runs_directory()
    
    # Save uploaded file temporarily
    temp_path = await save_upload_file(file)

    try:
        model = get_model()
        
        if is_video_file(file.filename):
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
            
            frame_detections, fps = process_video_frame_by_frame(temp_path, model)
            results = model.predict(source=temp_path, save=True, conf=CONF_THRESHOLD)
            
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
    with open(file_path, 'rb') as video_file:
        while True:
            chunk = video_file.read(CHUNK_SIZE)
            if not chunk:
                break
            yield chunk
