import subprocess
from pathlib import Path

import imageio_ffmpeg
from fastapi import HTTPException, status
from starlette.concurrency import run_in_threadpool


async def convert_avi_to_mp4(input_path: Path, output_path: Path) -> None:
    # Transcode with ffmpeg directly instead of decoding frames in Python
    # (moviepy): much faster, and +faststart puts the moov atom up front so the
    # browser can start playback before the whole file has downloaded.
    command = [
        imageio_ffmpeg.get_ffmpeg_exe(),
        "-y",
        "-loglevel", "error",
        "-i", str(input_path),
        "-an",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        str(output_path),
    ]  # fmt: skip

    try:
        await run_in_threadpool(
            subprocess.run, command, check=True, capture_output=True
        )
    except subprocess.CalledProcessError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error converting video: {e.stderr.decode(errors='ignore').strip()}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error converting video: {str(e)}",
        )
