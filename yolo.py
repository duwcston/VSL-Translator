from ultralytics import YOLO

model = YOLO("best.pt")  # Load model

results = model.predict(source="0", show=True, conf=0.5, max_det=1, imgsz=320)  # Run inference on webcam