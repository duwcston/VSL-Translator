# VSL Detection Backend

A FastAPI-based backend for Vietnamese Sign Language (VSL) detection using YOLO models with ONNX support.

## Features

-   **Real-time Detection**: WebSocket-based real-time sign language detection
-   **File Processing**: Support for image and video file uploads
-   **ONNX Support**: Optimized inference using ONNX models
-   **Sentence Generation**: Automatic conversion of detected signs to readable sentences
-   **Cross-platform**: Compatible with Windows, macOS, and Linux

## Project Structure

The project follows a clean, modular architecture:

```
backend/
├── app/
│   ├── __init__.py            # Main application package
│   ├── main.py                # FastAPI app definition and startup
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes/
│   │       ├── __init__.py    # API router configuration
│   │       ├── detection.py   # File upload and processing endpoints
│   │       ├── system.py      # System health and status endpoints
│   │       └── websocket.py   # Real-time WebSocket detection
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py          # Application configuration and settings
│   ├── services/
│   │   ├── __init__.py
│   │   ├── detector.py        # Core sign language detection service
│   │   ├── sentence_generator.py  # Text generation from detections
│   │   ├── paraphraser.py     # Vietnamese text paraphrasing
│   │   └── video_processor.py # Video processing utilities
│   └── utils/
│       ├── __init__.py
│       └── file_utils.py      # File validation and utilities
├── fonts/                     # Font files for text rendering
│   └── arial.ttf
├── models/                    # YOLO model files (.pt, .onnx)
│   ├── best.pt                # PyTorch model (optional)
│   └── best.onnx              # ONNX model (recommended)
├── temp_files/                # Temporary file storage
├── run.py                     # Application entry point
├── requirements.txt           # Project dependencies
```

## Setup Instructions

### 1. Navigate to the backend directory

```bash
cd E:\IU\Thesis\demo\backend
```

### 2. Create virtual environment

```bash
python -m venv .venv
```

### 3. Activate virtual environment

```bash
.venv\Scripts\activate
```
You should see `(.venv)` in your command prompt

### 4. Install dependencies

```bash
pip install -r requirements.txt
```

### 5. Run the server

```bash
python run.py
```

## API Endpoints

-   `GET /v1/status` - Check system status
-   `POST /v1/detections` - Upload and process images or videos
-   `GET /v1/detections/result` - Get the latest detection results
-   `WebSocket /v1/detections/stream` - Real-time detection via WebSocket

## Next Steps

1. **Add unit tests** for the new service classes
2. **Consider dependency injection** for better testability
3. **Add logging** to replace print statements
4. **Consider async/await** patterns where appropriate
