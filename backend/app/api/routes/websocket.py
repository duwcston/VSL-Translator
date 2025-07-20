from fastapi import WebSocket, WebSocketDisconnect
import json
import cv2
import numpy as np
import base64
from PIL import Image, ImageDraw, ImageFont

from app.core.config import FONT_PATH, WEBSOCKET_CONF_THRESHOLD
from app.services.detector import get_detector

class WebSocketManager:
    def __init__(self):
        self.active_connections = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

class RealtimeDetectionHandler:
    def __init__(self):
        self.detector = get_detector()
        self.frame_count = 0
        self.skip_frames = 0
        self.resize_factor = 1.0
        self.input_size = 320
    
    def update_settings(self, data_json: dict):
        if "skip_frames" in data_json:
            self.skip_frames = int(data_json["skip_frames"])
        if "resize_factor" in data_json:
            self.resize_factor = float(data_json["resize_factor"])
    
    def should_skip_frame(self) -> bool:
        self.frame_count += 1
        return self.skip_frames > 0 and self.frame_count % (self.skip_frames + 1) != 0
    
    def decode_frame(self, image_data: str) -> np.ndarray:
        img_data = base64.b64decode(image_data.split(",")[1])
        img_array = np.frombuffer(img_data, dtype=np.uint8)
        frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        
        if frame is not None and self.resize_factor != 1.0:
            h, w = frame.shape[:2]
            new_h, new_w = int(h * self.resize_factor), int(w * self.resize_factor)
            frame = cv2.resize(frame, (new_w, new_h))
        
        return frame
    
    def detect_and_process(self, frame: np.ndarray, return_image: bool = False, timestamp=None) -> dict:
        results = self.detector.model.predict(
            source=frame, 
            conf=WEBSOCKET_CONF_THRESHOLD, 
            verbose=False,
            imgsz=self.input_size,
            max_det=1
        )

        detections = []
        if results and results[0].boxes:
            for box in results[0].boxes:
                class_id = int(box.cls[0])
                class_name = self.detector.model.names[class_id]
                confidence = float(box.conf[0])
                
                if confidence >= WEBSOCKET_CONF_THRESHOLD:
                    coords = box.xyxy[0].tolist()
                    
                    if self.resize_factor != 1.0:
                        coords = [c / self.resize_factor for c in coords]
                        
                    detections.append({
                        "class_name": class_name,
                        "confidence": confidence,
                        "bbox": coords
                    })
        
        response = {
            "timestamp": timestamp,
            "detections": detections
        }
        
        if return_image:
            annotated_frame = self._add_annotations(frame, detections)
            _, buffer = cv2.imencode('.jpg', annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            img_str = base64.b64encode(buffer).decode('utf-8')
            response["image"] = f"data:image/jpeg;base64,{img_str}"
        
        return response
    
    def _add_annotations(self, frame: np.ndarray, detections: list) -> np.ndarray:
        if self.resize_factor != 1.0:
            h, w = frame.shape[:2]
            frame = cv2.resize(frame, (int(w / self.resize_factor), int(h / self.resize_factor)))
        
        for det in detections:
            x1, y1, x2, y2 = map(int, det["bbox"])
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            label = f"{det['class_name']}: {det['confidence']:.2f}"
            
            if FONT_PATH.exists():
                frame = self._draw_text_with_font(frame, label, (x1, y1))
        
        return frame
    
    def _draw_text_with_font(self, frame: np.ndarray, text: str, position: tuple) -> np.ndarray:
        try:
            x1, y1 = position
            pil_img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            draw = ImageDraw.Draw(pil_img)
            
            font_size = 16
            font = ImageFont.truetype(str(FONT_PATH), font_size)
            text_width, text_height = draw.textbbox((0, 0), text, font=font)[2:]
            
            draw.rectangle(
                [(x1, y1 - text_height - 4), (x1 + text_width, y1)], 
                fill=(0, 255, 0)
            )
            draw.text((x1, y1 - text_height - 2), text, font=font, fill=(0, 0, 0))
            
            return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
        except Exception as e:
            print(f"Error using PIL for text: {e}")
            return frame

async def handle_websocket_detection(websocket: WebSocket):
    manager = WebSocketManager()
    handler = RealtimeDetectionHandler()
    
    await manager.connect(websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            
            try:
                data_json = json.loads(data)
                if "image" not in data_json:
                    await websocket.send_json({"error": "No image data received"})
                    continue
                
                handler.update_settings(data_json)
                
                if handler.should_skip_frame():
                    await websocket.send_json({
                        "timestamp": data_json.get("timestamp", None),
                        "detections": [],
                        "skipped": True
                    })
                    continue
                
                frame = handler.decode_frame(data_json["image"])
                if frame is None:
                    await websocket.send_json({"error": "Invalid image data"})
                    continue
                
                response = handler.detect_and_process(
                    frame, 
                    return_image=data_json.get("return_image", False),
                    timestamp=data_json.get("timestamp", None)
                )
                
                await websocket.send_json(response)
                
            except json.JSONDecodeError:
                try:
                    await websocket.send_json({"error": "Invalid JSON data"})
                except:
                    break
            except Exception as e:
                try:
                    await websocket.send_json({"error": f"Processing error: {str(e)}"})
                except:
                    print(f"WebSocket connection closed during error handling: {str(e)}")
                    break
                
    except WebSocketDisconnect:
        print("WebSocket client disconnected")
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
    finally:
        manager.disconnect(websocket)
