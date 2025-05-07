import os
from pathlib import Path
import shutil
from typing import Dict, List, Optional
from functools import lru_cache
import moviepy.editor as moviepy
import base64
import numpy as np
import json
from PIL import Image, ImageDraw, ImageFont
import io

from fastapi import FastAPI, File, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from ultralytics import YOLO
import cv2
from fastapi import UploadFile
import torch

# Constants
ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png'}
ALLOWED_VIDEO_EXTENSIONS = {'.mp4', '.mov'}
ALLOWED_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS.union(ALLOWED_VIDEO_EXTENSIONS)
CONF_THRESHOLD = 0.6
TEMP_DIR = Path("temp_files")
PREDICTION_DIR = Path("runs/detect/predict")
CHUNK_SIZE = 1024 * 1024  # 1MB chunks for streaming
WEBSOCKET_CONF_THRESHOLD = 0.6  # Lower threshold for real-time detection to be more sensitive
FONT_DIR = Path("fonts")
FONT_DIR.mkdir(exist_ok=True)
FONT_PATH = FONT_DIR / "arial.ttf"

# Download Arial font if it doesn't exist
if not FONT_PATH.exists():
    try:
        # Check if font exists in system fonts (Windows path)
        windows_font = Path("C:/Windows/Fonts/arial.ttf")
        if windows_font.exists():
            # Copy from system fonts
            shutil.copy(windows_font, FONT_PATH)
            print(f"Copied Arial font from system fonts to {FONT_PATH}")
        else:
            print(f"Arial font not found. Please place arial.ttf in the {FONT_DIR} directory.")
    except Exception as e:
        print(f"Error setting up font: {e}")

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
    model = YOLO("models/20words.pt")
    # Enable GPU if available for faster inference
    device = "cuda" if torch.cuda.is_available() else "cpu"
    if device == "cuda":
        model.to(device).half()
    return model

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
        
        # Process the results and get detections
        detections = []
        if results and results[0].boxes:
            for box in results[0].boxes:
                class_id = int(box.cls[0])
                class_name = model.names[class_id]
                confidence = float(box.conf[0])
                
                if confidence >= CONF_THRESHOLD:
                    coords = box.xyxy[0].tolist()  # x1, y1, x2, y2
                    detections.append({
                        "class_name": class_name,
                        "confidence": confidence,
                        "bbox": coords
                    })
            
            # Draw predictions on the frame for visualization
            for det in detections:
                x1, y1, x2, y2 = map(int, det["bbox"])
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                label = f"{det['class_name']}: {det['confidence']:.2f}"
                
                # Use PIL for better Vietnamese text rendering
                if FONT_PATH.exists():
                    # Convert OpenCV image to PIL format
                    pil_img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                    draw = ImageDraw.Draw(pil_img)
                    
                    # Load Arial font
                    try:
                        font_size = 16
                        font = ImageFont.truetype(str(FONT_PATH), font_size)
                        
                        # Calculate background box for text
                        text_width, text_height = draw.textbbox((0, 0), label, font=font)[2:]
                        
                        # Draw background rectangle
                        draw.rectangle(
                            [(x1, y1 - text_height - 4), (x1 + text_width, y1)], 
                            fill=(0, 255, 0)
                        )
                        
                        # Draw text with proper Vietnamese support
                        draw.text((x1, y1 - text_height - 2), label, font=font, fill=(0, 0, 0))
                        
                        # Convert back to OpenCV format
                        frame = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
                    except Exception as e:
                        print(f"Error using PIL for text: {e}")
                        # Fallback to OpenCV
                        text_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_DUPLEX, 0.6, 1)[0]
                        cv2.rectangle(frame, (x1, y1 - 20), (x1 + text_size[0], y1), (0, 255, 0), -1)
                        cv2.putText(frame, label, (x1, y1 - 5), cv2.FONT_HERSHEY_DUPLEX, 0.6, (0, 0, 0), 1)
                else:
                    # Fallback to OpenCV
                    text_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_DUPLEX, 0.6, 1)[0]
                    cv2.rectangle(frame, (x1, y1 - 20), (x1 + text_size[0], y1), (0, 255, 0), -1)
                    cv2.putText(frame, label, (x1, y1 - 5), cv2.FONT_HERSHEY_DUPLEX, 0.6, (0, 0, 0), 1)
                    
        # Add the processed frame to our results
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

async def stream_video_file(file_path: Path):
    """Async generator to stream video files in chunks"""
    with open(file_path, 'rb') as video_file:
        while True:
            chunk = video_file.read(CHUNK_SIZE)
            if not chunk:
                break
            yield chunk

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
            results = model.predict(source=temp_path, save=True, conf=CONF_THRESHOLD, verbose=False)
            
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
                
            results = model.predict(source=image, save=True, conf=CONF_THRESHOLD, verbose=False)
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

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

manager = ConnectionManager()

@app.websocket("/ws/detect")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    model = get_model()
    
    # Default settings
    frame_count = 0
    skip_frames = 0
    resize_factor = 1.0
    input_size = 320
    
    try:
        while True:
            data = await websocket.receive_text()
            try:
                data_json = json.loads(data)
                if "image" not in data_json:
                    await websocket.send_json({"error": "No image data received"})
                    continue
                
                # Update processing parameters if provided
                if "skip_frames" in data_json:
                    skip_frames = int(data_json["skip_frames"])
                if "resize_factor" in data_json:
                    resize_factor = float(data_json["resize_factor"])
                if "input_size" in data_json:
                    input_size = int(data_json["input_size"])
                
                # Frame skipping logic
                frame_count += 1
                if skip_frames > 0 and frame_count % (skip_frames + 1) != 0:
                    await websocket.send_json({
                        "timestamp": data_json.get("timestamp", None),
                        "detections": [],
                        "skipped": True
                    })
                    continue
                
                # Decode the base64 image
                img_data = base64.b64decode(data_json["image"].split(",")[1])
                img_array = np.frombuffer(img_data, dtype=np.uint8)
                frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
                
                if frame is None:
                    await websocket.send_json({"error": "Invalid image data"})
                    continue
                
                # Resize image if resize_factor is not 1.0
                if resize_factor != 1.0:
                    h, w = frame.shape[:2]
                    new_h, new_w = int(h * resize_factor), int(w * resize_factor)
                    frame = cv2.resize(frame, (new_w, new_h))
                
                # Process the frame with YOLO - use optimized parameters
                results = model.predict(
                    source=frame, 
                    conf=WEBSOCKET_CONF_THRESHOLD, 
                    verbose=False,
                    imgsz=input_size,
                    augment=False,
                    retina_masks=False,
                )
                
                # Process detections
                detections = []
                if results and results[0].boxes:
                    for box in results[0].boxes:
                        class_id = int(box.cls[0])
                        class_name = model.names[class_id]
                        confidence = float(box.conf[0])
                        
                        # Only include detections above threshold
                        if confidence >= WEBSOCKET_CONF_THRESHOLD:
                            coords = box.xyxy[0].tolist()  # x1, y1, x2, y2
                            
                            # Scale bbox coordinates if image was resized
                            if resize_factor != 1.0:
                                coords = [c / resize_factor for c in coords]
                                
                            detections.append({
                                "class_name": class_name,
                                "confidence": confidence,
                                "bbox": coords
                            })
                
                # Return the processed results
                response = {
                    "timestamp": data_json.get("timestamp", None),
                    "detections": detections
                }
                
                # Optionally return the annotated image
                if data_json.get("return_image", False):
                    # If image was resized, we need to use original size for visualization
                    if resize_factor != 1.0:
                        h, w = frame.shape[:2]
                        frame = cv2.resize(frame, (int(w / resize_factor), int(h / resize_factor)))
                    
                    # Draw predictions on the frame
                    for det in detections:
                        x1, y1, x2, y2 = map(int, det["bbox"])
                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                        label = f"{det['class_name']}: {det['confidence']:.2f}"
                        
                        # Use PIL for better Vietnamese text rendering with Arial font
                        if FONT_PATH.exists():
                            # Convert OpenCV image to PIL format
                            pil_img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                            draw = ImageDraw.Draw(pil_img)
                            
                            # Load Arial font
                            try:
                                font_size = 16
                                font = ImageFont.truetype(str(FONT_PATH), font_size)
                                
                                # Calculate background box for text
                                text_width, text_height = draw.textbbox((0, 0), label, font=font)[2:]
                                
                                # Draw background rectangle
                                draw.rectangle(
                                    [(x1, y1 - text_height - 4), (x1 + text_width, y1)], 
                                    fill=(0, 255, 0)
                                )
                                
                                # Draw text with proper Vietnamese support
                                draw.text((x1, y1 - text_height - 2), label, font=font, fill=(0, 0, 0))
                                
                                # Convert back to OpenCV format
                                frame = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
                            except Exception as e:
                                print(f"Error using PIL for text: {e}")
                                # Fallback to OpenCV if PIL fails
                                text_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_DUPLEX, 0.6, 1)[0]
                                cv2.rectangle(frame, (x1, y1 - 20), (x1 + text_size[0], y1), (0, 255, 0), -1)
                                cv2.putText(frame, label, (x1, y1 - 5), cv2.FONT_HERSHEY_DUPLEX, 0.6, (0, 0, 0), 1)
                        else:
                            # Fallback to OpenCV if font file doesn't exist
                            text_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_DUPLEX, 0.6, 1)[0]
                            cv2.rectangle(frame, (x1, y1 - 20), (x1 + text_size[0], y1), (0, 255, 0), -1)
                            cv2.putText(frame, label, (x1, y1 - 5), cv2.FONT_HERSHEY_DUPLEX, 0.6, (0, 0, 0), 1)
                    
                    # Encode the annotated frame to send back
                    _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])  # Lower quality for faster transfer
                    img_str = base64.b64encode(buffer).decode('utf-8')
                    response["image"] = f"data:image/jpeg;base64,{img_str}"
                
                await websocket.send_json(response)
                
            except json.JSONDecodeError:
                await websocket.send_json({"error": "Invalid JSON data"})
            except Exception as e:
                await websocket.send_json({"error": f"Processing error: {str(e)}"})
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)

