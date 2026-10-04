import asyncio
import mimetypes
import shutil
import uuid
from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from starlette.concurrency import run_in_threadpool
import cv2
from pathlib import Path

from app.config.config import (
    ALLOWED_EXTENSIONS,
    ALLOWED_VIDEO_EXTENSIONS,
    ALLOWED_IMAGE_EXTENSIONS,
    TEMP_DIR,
    PREDICTION_DIR,
    CONF_THRESHOLD,
    CHUNK_SIZE,
)
from app.utils.file_utils import (
    is_valid_file,
    is_video_file,
    is_image_file,
    cleanup_runs_directory,
    safe_remove_file,
)
from app.services.detector import get_detector
from app.services.gloss_segmenter import segment_glosses
from app.services.job_manager import job_manager
from app.services.video_processor import convert_avi_to_mp4

# from app.services.sentence_generator import generate_sentence_from_detections

router = APIRouter(tags=["Detection"])

# Video frame-by-frame detection accounts for this share of a video job's
# progress; the remainder covers the avi->mp4 conversion that follows it.
VIDEO_DETECTION_PROGRESS_SHARE = 90

# Where Ultralytics writes annotated output; exist_ok stops it from creating
# predict2, predict3, ... so the result endpoint always reads the same folder.
SAVE_ARGS = {
    "save": True,
    "project": str(PREDICTION_DIR.parent),
    "name": PREDICTION_DIR.name,
    "exist_ok": True,
}


class DetectionHandler:
    def __init__(self):
        self.detector = get_detector()

    async def save_upload_file(self, file: UploadFile) -> Path:
        # Unique, path-free name: avoids collisions and "../" in client filenames.
        suffix = Path(file.filename).suffix.lower()
        temp_file = TEMP_DIR / f"temp_{uuid.uuid4().hex}{suffix}"

        def _write():
            # Stream to disk in chunks instead of loading the whole upload into memory.
            with temp_file.open("wb") as out:
                shutil.copyfileobj(file.file, out, CHUNK_SIZE)

        try:
            await run_in_threadpool(_write)
            return temp_file
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Could not save file: {str(e)}",
            )

    def validate_file(self, filename: str):
        if not filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="No filename provided"
            )

        if not is_valid_file(filename, ALLOWED_EXTENSIONS):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file format. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}",
            )

    def _run_video_detection(self, temp_path: Path, job_id: str):
        self._validate_video_file(temp_path)

        results = self.detector.predict(
            str(temp_path),
            conf=CONF_THRESHOLD,
            max_det=1,
            stream=True,
            **SAVE_ARGS,
        )

        def on_progress(done: int, total: int):
            if total:
                job_manager.set_progress(
                    job_id, int(done / total * VIDEO_DETECTION_PROGRESS_SHARE)
                )

        return self.detector.extract_video_detections(
            results, str(temp_path), on_progress=on_progress
        )

    async def process_video(self, temp_path: Path, job_id: str):
        frame_detections, fps = await run_in_threadpool(
            self._run_video_detection, temp_path, job_id
        )

        job_manager.set_progress(job_id, VIDEO_DETECTION_PROGRESS_SHARE)
        glosses = segment_glosses(frame_detections, fps)
        video_path = await self._handle_video_conversion()
        job_manager.set_progress(job_id, 99)
        # sentence = generate_sentence_from_detections(frame_detections)

        return {
            "detections": frame_detections,
            "video_path": video_path,
            "type": "video",
            "fps": fps,
            "glosses": glosses,
            # "sentence": sentence,
        }

    def _run_image_detection(self, temp_path: Path):
        image = cv2.imread(str(temp_path))
        if image is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to read image, it may be corrupted",
            )

        results = self.detector.predict(
            image, conf=CONF_THRESHOLD, max_det=1, **SAVE_ARGS
        )
        detections = self.detector.extract_detections(results)

        # sentence = generate_sentence_from_detections(detections)
        return {"detections": detections, "type": "image", "sentence": ""}

    async def process_image(self, temp_path: Path):
        return await run_in_threadpool(self._run_image_detection, temp_path)

    def _validate_video_file(self, temp_path: Path):
        cap = cv2.VideoCapture(str(temp_path))
        if not cap.isOpened():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to open video file, it may be corrupted",
            )

        ret, _ = cap.read()
        cap.release()

        if not ret:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to read video frames",
            )

    async def _handle_video_conversion(self):
        avi_files = list(PREDICTION_DIR.glob("*.avi"))
        if avi_files:
            avi_path = avi_files[0]
            mp4_path = avi_path.with_suffix(".mp4")
            await convert_avi_to_mp4(avi_path, mp4_path)

            if mp4_path.exists():
                safe_remove_file(avi_path)
                return f"runs/detect/predict/{mp4_path.name}"

        mp4_files = list(PREDICTION_DIR.glob("*.mp4"))
        if mp4_files:
            return f"runs/detect/predict/{mp4_files[0].name}"

        print("Warning: No video files found in prediction directory")
        return None

    async def run_job(self, job_id: str, temp_path: Path, filename: str):
        try:
            if is_video_file(filename, ALLOWED_VIDEO_EXTENSIONS):
                result = await self.process_video(temp_path, job_id)
            elif is_image_file(filename, ALLOWED_IMAGE_EXTENSIONS):
                result = await self.process_image(temp_path)
            else:
                raise ValueError("Unsupported file type")

            job_manager.set_result(job_id, result)
        except HTTPException as e:
            job_manager.set_error(job_id, str(e.detail))
        except Exception as e:
            job_manager.set_error(job_id, f"An error occurred during processing: {e}")
        finally:
            safe_remove_file(temp_path)


handler = DetectionHandler()


@router.post("/detections", status_code=status.HTTP_202_ACCEPTED)
async def predict_objects(file: UploadFile = File(...)):
    handler.validate_file(file.filename)
    await run_in_threadpool(cleanup_runs_directory)

    temp_path = await handler.save_upload_file(file)

    job_id = job_manager.create_job()
    asyncio.create_task(handler.run_job(job_id, temp_path, file.filename))

    return {"job_id": job_id}


@router.get("/detections/{job_id}/progress")
async def get_detection_progress(job_id: str):
    job = job_manager.get(job_id)
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job not found"
        )
    return job


@router.get("/detections/result")
async def get_prediction_result():
    if not PREDICTION_DIR.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No predictions available"
        )

    files = list(PREDICTION_DIR.glob("*"))
    if not files:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No prediction files found"
        )

    file_path = files[0]
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Prediction file not found"
        )

    # FileResponse honours HTTP Range requests, which browsers need to seek
    # within the result video.
    media_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    return FileResponse(
        path=file_path,
        media_type=media_type,
        content_disposition_type="inline",
        filename=file_path.name,
    )
