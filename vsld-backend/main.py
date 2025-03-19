from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from ultralytics import YOLO
import cv2
import numpy as np
from fastapi import UploadFile

origins = [
    "http://localhost:5173"
]

model = YOLO("models/yolo11s.pt")

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
    results = model.predict(source=image, save=True, conf=0.6)

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
