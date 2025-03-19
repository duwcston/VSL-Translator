import asyncio
import base64
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from ultralytics import YOLO
import cv2
import numpy as np
from fastapi import UploadFile

origins = [
    "http://localhost:5173"
]

model = YOLO("models/best11.pt")

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

async def stream_video(websocket: WebSocket):
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                # Restart video if it ends
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue

            results = model.predict(source=frame, conf=conf_thresh)

            # Get the annotated frame with bounding boxes
            annotated_frame = results[0].plot()

            for result in results[0].boxes:
                x1, y1, x2, y2 = result.xyxy[0]  # Get bounding box coordinates
                class_id = int(result.cls[0])  # Convert the class index to integer
                class_name = model.names[class_id]  # Retrieve class name from model.names

            # Encode frame to JPEG
            _, buffer = cv2.imencode(".jpg", annotated_frame)

            # Convert frame to base64
            frame_b64 = base64.b64encode(buffer).decode("utf-8")

            # Send frame to the client
            await websocket.send_text(frame_b64)

            # Introduce a small delay to reduce CPU usage
            await asyncio.sleep(0.03)  # ~30 FPS
    except WebSocketDisconnect:
        print("WebSocket disconnected.")
    finally:
        cap.release()

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.post("/yolo/predict")
async def predict_objects(file: UploadFile):
    # Process the uploaded image for object detection
    image_bytes = await file.read()
    image = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(image, cv2.IMREAD_COLOR)

    # Perform object detection with YOLO11
    results = model.predict(source=image, save=True, conf=conf_thresh)

    # Process the detection results and return a response
    detections = []
    for result in results[0].boxes:
        confidence = result.conf[0]
        class_id = result.cls[0]
        detections.append({
            "class_name": model.names[int(class_id)],
            "confidence": float(confidence),
            # "class_id": int(class_id),
        })
        print(detections)

    return {"detections": detections}

@app.get("/yolo/get_predict")
def detect_objects():
    runs_path = Path("runs/detect/")
    latest_folder = max(runs_path.glob("predict*"), key=lambda f: f.stat().st_mtime)
    image_path = latest_folder / "image0.jpg"

    if not image_path.is_file():
        return {"error": "Image not found"}

    return FileResponse(image_path, media_type="image/jpeg")

@app.websocket("/yolo/video")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    await stream_video(websocket)
