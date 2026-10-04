from pathlib import Path
import os

ENV = os.getenv("ENV", "development")
DEBUG = ENV == "development"

BASE_DIR = Path(__file__).resolve().parent.parent.parent
TEMP_DIR = BASE_DIR / "temp_files"
FONT_DIR = BASE_DIR / "fonts"
FONT_PATH = FONT_DIR / "arial.ttf"
# Pinned (with exist_ok=True at predict time) so Ultralytics never writes to
# predict2/predict3/... and the result endpoint always knows where to look.
PREDICTION_DIR = BASE_DIR / "runs" / "detect" / "predict"
MODELS_DIR = BASE_DIR / "models"

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov"}
ALLOWED_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS.union(ALLOWED_VIDEO_EXTENSIONS)

CONF_THRESHOLD = 0.76
WEBSOCKET_CONF_THRESHOLD = 0.7
# The model was trained/exported at 320x320; larger inputs only add latency.
REALTIME_INPUT_SIZE = 320
CHUNK_SIZE = 1024 * 1024

# Gloss segmentation for uploaded videos (see services/gloss_segmenter.py):
# signs shorter than this are dropped as misdetections...
GLOSS_MIN_DURATION_SECONDS = 0.3
# ...and the same sign interrupted by at most this much is counted once.
GLOSS_MAX_GAP_SECONDS = 0.25

CORS_ORIGINS = ["http://localhost:5173"]

APP_TITLE = "ASL Detection Backend"
APP_DESCRIPTION = "API for ASL Recognition System"
APP_VERSION = "1.0.0"

DEFAULT_MODEL_PATH = str(MODELS_DIR / "ASL_A.onnx")

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
                print(
                    f"Arial font not found. Please place arial.ttf in the {FONT_DIR} directory."
                )
        except Exception as e:
            print(f"Error setting up font: {e}")


setup_fonts()
