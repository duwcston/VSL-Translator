from pathlib import Path
import shutil
import os
from typing import Set

from app.core.config import PREDICTION_DIR


def get_file_extension(filename: str) -> str:
    return Path(filename).suffix.lower()

def is_valid_file(filename: str, allowed_extensions: Set[str]) -> bool:
    return get_file_extension(filename) in allowed_extensions

def is_video_file(filename: str, video_extensions: Set[str]) -> bool:
    return get_file_extension(filename) in video_extensions

def is_image_file(filename: str, image_extensions: Set[str]) -> bool:
    return get_file_extension(filename) in image_extensions

def cleanup_runs_directory() -> None:
    if PREDICTION_DIR.exists():
        try:
            shutil.rmtree(PREDICTION_DIR.parent.parent)
            print(f"Successfully cleaned up {PREDICTION_DIR.parent.parent}")
        except Exception as e:
            print(f"Error cleaning up directory: {e}")

def safe_remove_file(file_path: Path) -> None:
    try:
        if file_path.exists():
            os.remove(file_path)
    except Exception as e:
        print(f"Error removing file {file_path}: {e}")