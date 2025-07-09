from pathlib import Path
from typing import List, Set
import os

# Environment-based configuration
ENV = os.getenv("ENV", "development")
DEBUG = ENV == "development"

# Base paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
TEMP_DIR = BASE_DIR / "temp_files"
FONT_DIR = BASE_DIR / "fonts"
FONT_PATH = FONT_DIR / "arial.ttf"
PREDICTION_DIR = Path("runs/detect/predict") or Path("runs/detect/predict2")
MODELS_DIR = BASE_DIR / "models"

# File extensions
ALLOWED_IMAGE_EXTENSIONS: Set[str] = {".jpg", ".jpeg", ".png"}
ALLOWED_VIDEO_EXTENSIONS: Set[str] = {".mp4", ".mov"}
ALLOWED_EXTENSIONS: Set[str] = ALLOWED_IMAGE_EXTENSIONS.union(ALLOWED_VIDEO_EXTENSIONS)

# Detection settings
CONF_THRESHOLD: float = 0.75
WEBSOCKET_CONF_THRESHOLD: float = 0.7

# Streaming settings
CHUNK_SIZE: int = 1024 * 1024  # 1MB chunks for streaming

# CORS settings
CORS_ORIGINS: List[str] = [
    "http://localhost:5173",
]

# App settings
APP_TITLE: str = "VSL Detection Backend"
APP_DESCRIPTION: str = "API for visual sign language detection using YOLO models"
APP_VERSION: str = "1.0.0"

# Models
DEFAULT_MODEL_PATH: str = str(MODELS_DIR / "best.pt")

# Create necessary directories
TEMP_DIR.mkdir(exist_ok=True)
FONT_DIR.mkdir(exist_ok=True)

# Initialize font if needed
def setup_fonts() -> None:
    """Set up fonts for text rendering"""
    if not FONT_PATH.exists():
        try:
            # Check if font exists in system fonts (Windows path)
            windows_font = Path("C:/Windows/Fonts/arial.ttf")
            if windows_font.exists():
                # Copy from system fonts
                import shutil
                shutil.copy(windows_font, FONT_PATH)
                print(f"Copied Arial font from system fonts to {FONT_PATH}")
            else:
                print(f"Arial font not found. Please place arial.ttf in the {FONT_DIR} directory.")
        except Exception as e:
            print(f"Error setting up font: {e}")

# Call font setup
setup_fonts()
