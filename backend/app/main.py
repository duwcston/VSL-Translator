from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import CORS_ORIGINS, APP_TITLE, APP_DESCRIPTION, APP_VERSION
from app.api.routes import api_router
from app.api.routes.websocket import handle_websocket_detection
from app.services.detector import initialize_detector

def create_application() -> FastAPI:
    app = FastAPI(
        title=APP_TITLE,
        description=APP_DESCRIPTION,
        version=APP_VERSION,
    )
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    app.include_router(api_router)
    app.add_api_websocket_route("/v1/detections/stream", handle_websocket_detection)
    return app

app = create_application()

@app.on_event("startup")
async def startup():
    print("Initializing sign language detection model...")
    initialize_detector()
    print("Model initialization complete!")
