from fastapi import WebSocket, WebSocketDisconnect
from typing import List, Dict, Any
import json
import cv2
import numpy as np
import base64
from PIL import Image, ImageDraw, ImageFont

from app.core.config import FONT_PATH, WEBSOCKET_CONF_THRESHOLD
from app.utils.file_utils import decode_base64_image, encode_image_to_base64
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
    frame_count = 0
    skip_frames = 0
    resize_factor = 1.0
    input_size = 320
    
    try:
        while True:
            # Wait for data from client
            data = await websocket.receive_text()
            
            try:
                # Parse JSON data
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
                
                # Process the frame with detector model
                results = detector.model.predict(
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
                        class_name = detector.model.names[class_id]
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
                
                # Send response back to client
                await websocket.send_json(response)
                
            except json.JSONDecodeError:
                await websocket.send_json({"error": "Invalid JSON data"})
            except Exception as e:
                await websocket.send_json({"error": f"Processing error: {str(e)}"})
                
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)
