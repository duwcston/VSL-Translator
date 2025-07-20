from pathlib import Path
import os

ENV = os.getenv("ENV", "development")
DEBUG = ENV == "development"

BASE_DIR = Path(__file__).resolve().parent.parent.parent
TEMP_DIR = BASE_DIR / "temp_files"
FONT_DIR = BASE_DIR / "fonts"
FONT_PATH = FONT_DIR / "arial.ttf"
PREDICTION_DIR = Path("runs/detect/predict") or Path("runs/detect/predict2")
MODELS_DIR = BASE_DIR / "models"

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov"}
ALLOWED_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS.union(ALLOWED_VIDEO_EXTENSIONS)

CONF_THRESHOLD = 0.75
WEBSOCKET_CONF_THRESHOLD = 0.7
CHUNK_SIZE = 1024 * 1024

CORS_ORIGINS = ["http://localhost:5173"]

APP_TITLE = "VSL Detection Backend"
APP_DESCRIPTION = "API for VSL Recognition System"
APP_VERSION = "1.0.0"

DEFAULT_MODEL_PATH = str(MODELS_DIR / "best.onnx")

TEMP_DIR.mkdir(exist_ok=True)
FONT_DIR.mkdir(exist_ok=True)

def setup_fonts() -> None:
    if not FONT_PATH.exists():
        try:
            windows_font = Path("C:/Windows/Fonts/arial.ttf")
            if windows_font.exists():
                import shutil
                shutil.copy(windows_font, FONT_PATH)
                print(f"Copied Arial font from system fonts to {FONT_PATH}")
            else:
                print(f"Arial font not found. Please place arial.ttf in the {FONT_DIR} directory.")
        except Exception as e:
            print(f"Error setting up font: {e}")

setup_fonts()
