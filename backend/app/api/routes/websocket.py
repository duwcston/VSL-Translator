import asyncio
import json
import cv2
import numpy as np
import base64
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
from fastapi import WebSocket, WebSocketDisconnect
from PIL import Image, ImageDraw, ImageFont

from app.config.config import FONT_PATH, REALTIME_INPUT_SIZE, WEBSOCKET_CONF_THRESHOLD
from app.services.detector import get_detector

executor = ThreadPoolExecutor(max_workers=4)


@lru_cache(maxsize=1)
def _label_font():
    # Loading a TrueType font from disk is slow; do it once, not per frame.
    if not FONT_PATH.exists():
        return None
    return ImageFont.truetype(str(FONT_PATH), 16)


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

    def decode_frame(self, image_data: str) -> np.ndarray:
        # Accept both a data URL ("data:image/jpeg;base64,...") and bare base64.
        img_data = base64.b64decode(image_data.split(",")[-1])
        img_array = np.frombuffer(img_data, dtype=np.uint8)
        return cv2.imdecode(img_array, cv2.IMREAD_COLOR)

    def detect_and_process(
        self, frame: np.ndarray, return_image: bool = False, timestamp=None
    ) -> dict:
        results = self.detector.predict(
            frame,
            conf=WEBSOCKET_CONF_THRESHOLD,
            imgsz=REALTIME_INPUT_SIZE,
            max_det=1,
        )
        detections = self.detector._extract_detections(
            results, conf_threshold=WEBSOCKET_CONF_THRESHOLD
        )

        h, w = frame.shape[:2]
        # Frame size lets clients map bbox coordinates onto their own display.
        response = {
            "timestamp": timestamp,
            "detections": detections,
            "frame_size": [w, h],
        }

        if return_image:
            annotated_frame = self._add_annotations(frame, detections)
            _, buffer = cv2.imencode(
                ".jpg", annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 80]
            )
            img_str = base64.b64encode(buffer).decode("utf-8")
            response["image"] = f"data:image/jpeg;base64,{img_str}"

        return response

    def _add_annotations(self, frame: np.ndarray, detections: list) -> np.ndarray:
        for det in detections:
            x1, y1, x2, y2 = map(int, det["bbox"])
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            label = f"{det['class_name']}: {det['confidence']:.2f}"
            frame = self._draw_text_with_font(frame, label, (x1, y1))

        return frame

    def _draw_text_with_font(
        self, frame: np.ndarray, text: str, position: tuple
    ) -> np.ndarray:
        font = _label_font()
        if font is None:
            x1, y1 = position
            cv2.putText(
                frame, text, (x1, max(y1 - 5, 12)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1, cv2.LINE_AA,
            )  # fmt: skip
            return frame

        try:
            x1, y1 = position
            pil_img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            draw = ImageDraw.Draw(pil_img)

            text_width, text_height = draw.textbbox((0, 0), text, font=font)[2:]

            draw.rectangle(
                [(x1, y1 - text_height - 4), (x1 + text_width, y1)], fill=(0, 255, 0)
            )
            draw.text((x1, y1 - text_height - 2), text, font=font, fill=(0, 0, 0))

            return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
        except Exception as e:
            print(f"Error using PIL for text: {e}")
            return frame


async def handle_websocket_detection(websocket: WebSocket):
    manager = WebSocketManager()
    handler = RealtimeDetectionHandler()
    processing_lock = asyncio.Lock()

    await manager.connect(websocket)

    async def process_and_send(data_json: dict):
        # Serializes processing/sends per connection: WebSocket.send is not
        # safe to call concurrently, and this doubles as backpressure so a
        # slow model doesn't let unbounded frames pile up in flight.
        async with processing_lock:
            try:
                if "image" not in data_json:
                    await websocket.send_json({"error": "No image data received"})
                    return

                loop = asyncio.get_running_loop()
                frame = await loop.run_in_executor(
                    executor, handler.decode_frame, data_json["image"]
                )
                if frame is None:
                    await websocket.send_json({"error": "Invalid image data"})
                    return

                response = await loop.run_in_executor(
                    executor,
                    handler.detect_and_process,
                    frame,
                    data_json.get("return_image", False),
                    data_json.get("timestamp", None),
                )

                await websocket.send_json(response)
            except Exception as e:
                try:
                    await websocket.send_json({"error": f"Processing error: {str(e)}"})
                except Exception:
                    print(
                        f"WebSocket connection closed during error handling: {str(e)}"
                    )

    try:
        while True:
            data = await websocket.receive_text()

            try:
                data_json = json.loads(data)
            except json.JSONDecodeError:
                try:
                    await websocket.send_json({"error": "Invalid JSON data"})
                    continue
                except Exception:
                    break

            if processing_lock.locked():
                # A previous frame is still being processed: drop this one
                # instead of queueing, so results stay close to real-time.
                continue

            asyncio.create_task(process_and_send(data_json))

    except WebSocketDisconnect:
        print("WebSocket client disconnected")
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
    finally:
        manager.disconnect(websocket)
