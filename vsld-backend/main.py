import asyncio
import base64
import os
from pathlib import Path
import shutil
from typing import Optional
from fastapi import FastAPI, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from ultralytics import YOLO
import cv2
import numpy as np
from fastapi import UploadFile

origins = [
    "http://localhost:5173"
]

model = YOLO("models/yolo11s.pt")

cap = cv2.VideoCapture(0)
conf_thresh = 0.6


app = FastAPI(
    title="VSL Detection Backend",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variable to store video capture state
class VideoState:
    def __init__(self):
        self.cap: Optional[cv2.VideoCapture] = None
        self.processing = False

video_state = VideoState()

def cleanup_runs_directory():
    """Clean up the runs directory before new predictions"""
    runs_path = Path("runs/detect/")
    if runs_path.exists():
        shutil.rmtree(runs_path)
    else:
        return
    
def convert_avi_to_mp4(input_path, output_path):
    """Convert an AVI video file to MP4 format using OpenCV."""
    cap = cv2.VideoCapture(input_path)
    
    # Get the video's properties (frame width, height, and FPS)
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # Define the codec and create a VideoWriter object for MP4 output
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')  # Codec for MP4 format
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    # Read and write each frame to the new video file
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        out.write(frame)
    
    # Release resources
    cap.release()
    out.release()
    print(f"Video saved as {output_path}")

# async def stream_video(websocket: WebSocket):
#     try:
#         while True:
#             ret, frame = cap.read()
#             if not ret:
#                 # Restart video if it ends
#                 cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
#                 continue

#             results = model.predict(source=frame, conf=conf_thresh)

#             # Get the annotated frame with bounding boxes
#             annotated_frame = results[0].plot()

#             for result in results[0].boxes:
#                 x1, y1, x2, y2 = result.xyxy[0]  # Get bounding box coordinates
#                 class_id = int(result.cls[0])  # Convert the class index to integer
#                 class_name = model.names[class_id]  # Retrieve class name from model.names

#             # Encode frame to JPEG
#             _, buffer = cv2.imencode(".jpg", annotated_frame)

#             # Convert frame to base64
#             frame_b64 = base64.b64encode(buffer).decode("utf-8")

#             # Send frame to the client
#             await websocket.send_text(frame_b64)

#             # Introduce a small delay to reduce CPU usage
#             await asyncio.sleep(0.03)  # ~30 FPS
#     except WebSocketDisconnect:
#         print("WebSocket disconnected.")
#     finally:
#         cap.release()

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.post("/yolo/predict")
async def predict_objects(file: UploadFile = File(...)):
    # """Handle video or image uploads for prediction"""
    filename = file.filename
    
    # Clean up previous predictions
    cleanup_runs_directory()
    
    # Save uploaded file temporarily
    temp_path = Path(f"temp_{filename}")
    print(filename)
    print(temp_path)
    if filename.endswith(('.mp4', '.mov')):
        with temp_path.open("wb") as buffer:
            content = await file.read()
            buffer.write(content)

    try:
        if filename.endswith(('.mp4', '.mov')):
            # Process video
            cap = cv2.VideoCapture(str(temp_path))
            if not cap.isOpened():
                return {"error": "Failed to open video file"}
            
            # Process first frame as sample
            ret, frame = cap.read()
            if not ret:
                return {"error": "Failed to read video"}
                
            results = model.predict(source=temp_path, save=True, conf=conf_thresh)

            detections = [
                {
                    "class_name": model.names[int(result.cls[0])],
                    "confidence": float(result.conf[0]),
                }
                for result in results[0].boxes
            ]
            
            cap.release()
            return {
                "detections": detections,
                "video_path": f"runs/detect/predict/{filename}",
            }
            
        elif filename.endswith(('.jpg', '.jpeg', '.png')):
            # Process image (existing functionality)
            image_bytes = await file.read()
            image = np.frombuffer(image_bytes, dtype=np.uint8)
            image = cv2.imdecode(image, cv2.IMREAD_COLOR)

            results = model.predict(source=image, save=True, conf=conf_thresh)

            detections = [
                {
                    "class_name": model.names[int(result.cls[0])],
                    "confidence": float(result.conf[0]),
                }
                for result in results[0].boxes
            ]
            return {"detections": detections}
            
        else:
            return {"error": "Unsupported file format"}
            
    finally:
        if temp_path.exists():
            os.remove(temp_path)

@app.get("/yolo/get_predict")
def get_prediction_result():
    """Serve the predicted video or image"""
    runs_path = Path("runs/detect/predict")
    # runs_path = Path("E:/IU/Thesis/demo/vsld-frontend/public")
    if not runs_path.exists():
        return {"error": "No predictions available"}
        
    files = list(runs_path.glob("*"))
    
    if not files:
        return {"error": "No prediction files found"}
        
    file_path = files[0]
    if file_path.suffix in ['.mp4', '.mov']:
        def stream_video_file():
            with open(file_path, 'rb') as video_file:
                while chunk := video_file.read(1024 * 1024):  # 1MB chunks
                    yield chunk
                    
        return StreamingResponse(
            stream_video_file(),
            media_type="video/mp4",
            headers={"Content-Disposition": f"inline; filename={file_path.name}"}
        )
    else:
        return FileResponse(file_path, media_type="image/jpeg")

# @app.websocket("/yolo/video")
# async def websocket_endpoint(websocket: WebSocket):
#     await websocket.accept()
#     await stream_video(websocket)
