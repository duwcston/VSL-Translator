from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.core.config import (
    CORS_ORIGINS, 
    APP_TITLE, 
    APP_DESCRIPTION, 
    APP_VERSION
)
from app.api.routes import api_router
from app.api.routes.websocket import handle_websocket_detection
from app.services.detector import get_detector


def create_application() -> FastAPI:
    """
    Create and configure the FastAPI application
    
    Returns:
        Configured FastAPI application
    """
    # Create FastAPI app
    app = FastAPI(
        title=APP_TITLE,
        description=APP_DESCRIPTION,
        version=APP_VERSION,
    )
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include API routes
    app.include_router(api_router)
    
    # Add WebSocket endpoint
    app.add_api_websocket_route("/v1/detections/stream", handle_websocket_detection)
    
    return app


app = create_application()


# Initialize model on startup
@app.on_event("startup")
async def startup_db_client():
    print("Initializing sign language detection model...")
    _ = get_detector()
    print("Model initialization complete!")


if __name__ == "__main__":
    # Run the application with uvicorn when script is executed directly
    uvicorn.run("app.main:app", host="localhost", port=8000, reload=True)
