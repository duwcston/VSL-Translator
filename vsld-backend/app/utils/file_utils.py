"""
File utility functions for the VSL Detection Backend.

This module provides utility functions for working with files, including:
- Validating file extensions
- Cleaning up directories
- Converting between image formats
- Handling base64 encoded images
"""

from pathlib import Path
import shutil
import os
import cv2
import base64
import numpy as np
from typing import Tuple, Set, Union

from app.core.config import PREDICTION_DIR


def get_file_extension(filename: str) -> str:
    """
    Extract and return the file extension
    
    Args:
        filename: Name of the file
        
    Returns:
        The file extension with leading dot (e.g., '.jpg')
    """
    return Path(filename).suffix.lower()


def is_valid_file(filename: str, allowed_extensions: Set[str]) -> bool:
    """
    Check if the file has a valid extension
    
    Args:
        filename: Name of the file
        allowed_extensions: Set of allowed extensions
        
    Returns:
        True if the file extension is in the allowed extensions, False otherwise
    """
    return get_file_extension(filename) in allowed_extensions


def is_video_file(filename: str, video_extensions: Set[str]) -> bool:
    """
    Check if the file is a video
    
    Args:
        filename: Name of the file
        video_extensions: Set of video extensions
        
    Returns:
        True if the file is a video, False otherwise
    """
    return get_file_extension(filename) in video_extensions


def is_image_file(filename: str, image_extensions: Set[str]) -> bool:
    """
    Check if the file is an image
    
    Args:
        filename: Name of the file
        image_extensions: Set of image extensions
        
    Returns:
        True if the file is an image, False otherwise
    """
    return get_file_extension(filename) in image_extensions


def cleanup_runs_directory() -> None:
    """
    Clean up the runs directory before new predictions.
    
    This function removes the entire prediction directory tree to ensure
    clean slate before new predictions are generated.
    """
    if PREDICTION_DIR.exists():
        try:
            shutil.rmtree(PREDICTION_DIR.parent.parent)
            print(f"Successfully cleaned up {PREDICTION_DIR.parent.parent}")
        except Exception as e:
            print(f"Error cleaning up directory: {e}")


def create_directory_if_not_exists(directory_path: Union[str, Path]) -> None:
    """
    Create a directory if it doesn't exist
    
    Args:
        directory_path: Path to the directory to create
    """
    path = Path(directory_path)
    if not path.exists():
        path.mkdir(parents=True, exist_ok=True)
        print(f"Created directory: {path}")


def decode_base64_image(base64_string: str) -> Tuple[np.ndarray, bool]:
    """
    Decode a base64 image string to a numpy array
    
    Args:
        base64_string: Base64 encoded image string
        
    Returns:
        Tuple containing the decoded image as numpy array and a success flag
    """
    try:
        # Handle data URLs (e.g. "data:image/jpeg;base64,...")
        if "," in base64_string:
            base64_string = base64_string.split(",")[1]
            
        img_data = base64.b64decode(base64_string)
        img_array = np.frombuffer(img_data, dtype=np.uint8)
        image = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        
        if image is None:
            return np.array([]), False
        
        return image, True
    except Exception as e:
        print(f"Error decoding base64 image: {e}")
        return np.array([]), False


def encode_image_to_base64(image: np.ndarray, quality: int = 80) -> str:
    """
    Encode an image to base64 string
    
    Args:
        image: Image as numpy array
        quality: JPEG quality (1-100)
        
    Returns:
        Base64 encoded image string with MIME type
    """
    try:
        _, buffer = cv2.imencode('.jpg', image, [cv2.IMWRITE_JPEG_QUALITY, quality])
        img_str = base64.b64encode(buffer).decode('utf-8')
        return f"data:image/jpeg;base64,{img_str}"
    except Exception as e:
        print(f"Error encoding image to base64: {e}")
        return ""


def save_temp_file(content: bytes, filename: str, temp_dir: Path) -> Path:
    """
    Save content to a temporary file
    
    Args:
        content: Binary content to save
        filename: Original filename
        temp_dir: Directory to save the temporary file in
        
    Returns:
        Path to the saved temporary file
    """
    # Ensure temp directory exists
    create_directory_if_not_exists(temp_dir)
    
    # Create a unique filename
    temp_file = temp_dir / f"temp_{filename}"
    
    # Write content to file
    with open(temp_file, "wb") as f:
        f.write(content)
        
    return temp_file


def remove_file_if_exists(file_path: Union[str, Path]) -> bool:
    """
    Remove a file if it exists
    
    Args:
        file_path: Path to the file to remove
        
    Returns:
        True if the file was removed, False otherwise
    """
    path = Path(file_path)
    if path.exists() and path.is_file():
        try:
            os.remove(path)
            return True
        except Exception as e:
            print(f"Error removing file {path}: {e}")
            return False
    return False


def get_file_size(file_path: Union[str, Path]) -> int:
    """
    Get the size of a file in bytes
    
    Args:
        file_path: Path to the file
        
    Returns:
        Size of the file in bytes, or 0 if the file doesn't exist
    """
    path = Path(file_path)
    if path.exists() and path.is_file():
        return path.stat().st_size
    return 0