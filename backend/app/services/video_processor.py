import cv2
import moviepy.editor as moviepy
from pathlib import Path
from typing import Tuple, List, Dict
from fastapi import HTTPException, status

from app.services.detector import get_detector

async def convert_avi_to_mp4(input_path: Path, output_path: Path) -> None:
    try:
        clip = moviepy.VideoFileClip(str(input_path))
        clip.write_videofile(str(output_path), codec="libx264", audio_codec="aac")
        clip.close()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error converting video: {str(e)}"
        )

def process_video_frame_by_frame(video_path: Path) -> Tuple[List[Dict], float]:
    detector = get_detector()
    return detector.process_video_frames(str(video_path))

async def stream_video_file(file_path: Path, chunk_size: int = 1024 * 1024):
    with open(file_path, 'rb') as video_file:
        while True:
            chunk = video_file.read(chunk_size)
            if not chunk:
                break
            yield chunk
