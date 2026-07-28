import moviepy.editor as moviepy
from pathlib import Path
from fastapi import HTTPException, status
from starlette.concurrency import run_in_threadpool


async def convert_avi_to_mp4(input_path: Path, output_path: Path) -> None:
    def _convert():
        clip = moviepy.VideoFileClip(str(input_path))
        try:
            clip.write_videofile(
                str(output_path), codec="libx264", audio_codec="aac", logger=None
            )
        finally:
            clip.close()

    try:
        await run_in_threadpool(_convert)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error converting video: {str(e)}",
        )


async def stream_video_file(file_path: Path, chunk_size: int = 1024 * 1024):
    with open(file_path, "rb") as video_file:
        while True:
            chunk = await run_in_threadpool(video_file.read, chunk_size)
            if not chunk:
                break
            yield chunk
