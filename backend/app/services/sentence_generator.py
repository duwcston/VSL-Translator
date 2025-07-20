from typing import List, Dict
from app.services.paraphraser import get_paraphraser

def generate_sentence_from_detections(detections: List[Dict]) -> str:
    if not detections:
        return ""
    
    words = _extract_unique_words(detections)
    if not words:
        return ""
        
    detected_text = " ".join(words)
    paraphraser = get_paraphraser()
    return paraphraser.paraphrase(detected_text)

def _extract_unique_words(detections: List[Dict]) -> List[str]:
    seen_words = set()
    words = []
    
    if _is_frame_based_detections(detections):
        for frame in detections:
            frame_detections = frame.get("detections", [])
            words.extend(_get_words_from_detections(frame_detections, seen_words))
    else:
        words.extend(_get_words_from_detections(detections, seen_words))
    
    return words

def _is_frame_based_detections(detections: List[Dict]) -> bool:
    return (detections and 
            isinstance(detections[0], dict) and 
            "frame_number" in detections[0])

def _get_words_from_detections(detections: List[Dict], seen_words: set) -> List[str]:
    words = []
    for detection in detections:
        class_name = detection.get("class_name")
        if class_name and class_name not in seen_words:
            words.append(class_name.strip().lower())
            seen_words.add(class_name)
    return words
