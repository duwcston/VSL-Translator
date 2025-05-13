# VSL Detection Backend

A FastAPI-based backend for Vietnamese Sign Language (VSL) detection using YOLO models.

## Project Structure

The project follows a modular structure for better maintainability:

```
vsld-backend/
├── app/
│   ├── __init__.py           # Main application package
│   ├── main.py               # FastAPI app definition
│   ├── api/                  # API endpoints
│   │   ├── __init__.py
│   │   ├── routes/
│   │       ├── __init__.py
│   │       ├── detection.py  # Object detection routes
│   │       ├── system.py     # System status routes
│   │       └── websocket.py  # WebSocket handlers
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py         # Application configuration
│   ├── models/
│   │   └── __init__.py       # Model definitions
│   ├── services/
│   │   ├── __init__.py
│   │   ├── detector.py       # Sign language detection service
│   │   ├── model.py          # YOLO model service
│   │   └── video_processor.py # Video processing utilities
│   └── utils/
│       ├── __init__.py
│       └── file_utils.py     # File handling utilities
├── fonts/                    # Font files for text rendering
│   └── arial.ttf
├── models/                   # YOLO model files
│   └── 20words.pt
├── run.py                    # Application entry point
└── requirements.txt          # Project dependencies
```

## To run server, please run these commands:

### Create virtual environment
```bash
python -m venv .venv
```

### Access virtual environment
```bash
.\.venv\Scripts\activate
```

### Install all necessary modules
```bash
pip install -r requirements.txt
```

### Run the server on port 8000
```bash
python run.py
```

Alternatively, you can use uvicorn directly:
```bash
uvicorn app:app --host localhost --port 8000 --reload
```

## API Endpoints

- `GET /v1/status` - Check system status
- `POST /v1/detections` - Upload and process images or videos
- `GET /v1/detections/result` - Get the latest detection results
- `WebSocket /v1/detections/stream` - Real-time detection via WebSocket