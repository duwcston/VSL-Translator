import torch
from ultralytics import YOLO
from functools import lru_cache

from app.core.config import DEFAULT_MODEL_PATH


@lru_cache(maxsize=1)
def get_model(model_path: str = None):
    """
    Load and cache the YOLO model
    
    Args:
        model_path: Path to the YOLO model file. If None, uses the default path.
        
    Returns:
        YOLO model instance
    """
    if model_path is None:
        model_path = DEFAULT_MODEL_PATH
        
    model = YOLO(model_path)
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[Model Service] Using device: {device}")
    
    if device == "cuda":
        model.to(device).half()  # Use half precision for better performance
        # Warm up the model with a dummy input
        dummy_input = torch.zeros(1, 3, 640, 640).to(self.device).half()
        self.model(dummy_input)
        
    # Set model to eval mode for inference
    self.model.eval()
        
    return model
