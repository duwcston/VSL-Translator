from fastapi import WebSocket, WebSocketDisconnect
from typing import List
import json
import cv2
import numpy as np
import base64
from PIL import Image, ImageDraw, ImageFont

from app.core.config import FONT_PATH, WEBSOCKET_CONF_THRESHOLD
from app.services.detector import get_detector


class ConnectionManager:
    """Class to manage WebSocket connections"""
    
    def __init__(self):
        """Initialize the connection manager"""
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        """
        Connect a new WebSocket client
        
        Args:
            websocket: The WebSocket connection
        """
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        """
        Disconnect a WebSocket client
        
        Args:
            websocket: The WebSocket connection
        """
        self.active_connections.remove(websocket)


async def handle_websocket_detection(websocket: WebSocket):
    """
    Handle WebSocket connections for real-time sign language detection
    
    Args:
        websocket: The WebSocket connection
    """
    connection_manager = ConnectionManager()
    await connection_manager.connect(websocket)
    detector = get_detector()
    
    # Default settings
    FRAME_COUNT = 0
    SKIP_FRAMES = 0
    RESIZE_FACTOR = 1.0
    INPUT_SIZE = 320
    
    try:
        while True:
            # Wait for data from client
            data = await websocket.receive_text()
            
            try:
                data_json = json.loads(data)
                if "image" not in data_json:
                    await websocket.send_json({"error": "No image data received"})
                    continue
                
                if "skip_frames" in data_json:
                    SKIP_FRAMES = int(data_json["skip_frames"])
                if "resize_factor" in data_json:
                    RESIZE_FACTOR = float(data_json["resize_factor"])
                
                # Frame skipping logic
                FRAME_COUNT += 1
                if SKIP_FRAMES > 0 and FRAME_COUNT % (SKIP_FRAMES + 1) != 0:
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
                
                # Resize image if RESIZE_FACTOR is not 1.0
                if RESIZE_FACTOR != 1.0:
                    h, w = frame.shape[:2]
                    new_h, new_w = int(h * RESIZE_FACTOR), int(w * RESIZE_FACTOR)
                    frame = cv2.resize(frame, (new_w, new_h))

                results = detector.model.predict(
                    source=frame, 
                    conf=WEBSOCKET_CONF_THRESHOLD, 
                    verbose=False,
                    imgsz=INPUT_SIZE,
                    # augment=False,
                    # retina_masks=False,
                    max_det=1
                )

                detections = []
                if results and results[0].boxes:
                    for box in results[0].boxes:
                        class_id = int(box.cls[0])
                        class_name = detector.model.names[class_id]
                        confidence = float(box.conf[0])
                          # Only include detections above threshold
                        if confidence >= WEBSOCKET_CONF_THRESHOLD:
                            coords = box.xyxy[0].tolist()  # x1, y1, x2, y2
                            
                            # Scale bbox coordinates if image was resized
                            if RESIZE_FACTOR != 1.0:
                                coords = [c / RESIZE_FACTOR for c in coords]
                                
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
                
                if data_json.get("return_image", False):
                    # If image was resized, we need to use original size for visualization
                    if RESIZE_FACTOR != 1.0:
                        h, w = frame.shape[:2]
                        frame = cv2.resize(frame, (int(w / RESIZE_FACTOR), int(h / RESIZE_FACTOR)))
                    for det in detections:
                        x1, y1, x2, y2 = map(int, det["bbox"])
                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                        label = f"{det['class_name']}: {det['confidence']:.2f}"
                        
                        # Use PIL for better Vietnamese text rendering with Arial font
                        if FONT_PATH.exists():
                            pil_img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                            draw = ImageDraw.Draw(pil_img)
                            
                            try:
                                font_size = 16
                                font = ImageFont.truetype(str(FONT_PATH), font_size)
                                text_width, text_height = draw.textbbox((0, 0), label, font=font)[2:]
                                draw.rectangle(
                                    [(x1, y1 - text_height - 4), (x1 + text_width, y1)], 
                                    fill=(0, 255, 0)
                                )
                                
                                draw.text((x1, y1 - text_height - 2), label, font=font, fill=(0, 0, 0))
                                
                                frame = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
                            except Exception as e:
                                print(f"Error using PIL for text: {e}")
                        else:
                            print(f"Font file not found: {FONT_PATH}.")

                    # Encode the annotated frame to send back
                    _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])  # Lower quality for faster transfer
                    img_str = base64.b64encode(buffer).decode('utf-8')
                    response["image"] = f"data:image/jpeg;base64,{img_str}"
                
                await websocket.send_json(response)
                
            except json.JSONDecodeError:
                try:
                    await websocket.send_json({"error": "Invalid JSON data"})
                except:
                    # Connection is closed, break the loop
                    break
            except Exception as e:
                try:
                    await websocket.send_json({"error": f"Processing error: {str(e)}"})
                except:
                    # Connection is closed, break the loop
                    print(f"WebSocket connection closed during error handling: {str(e)}")
                    break
                
    except WebSocketDisconnect:
        print("WebSocket client disconnected")
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
    finally:
        connection_manager.disconnect(websocket)
