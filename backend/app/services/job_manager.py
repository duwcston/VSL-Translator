import threading
import uuid
from enum import Enum
from typing import Any, Dict, Optional


class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    DONE = "done"
    ERROR = "error"


class JobManager:
    def __init__(self):
        self._jobs: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()

    def create_job(self) -> str:
        job_id = uuid.uuid4().hex
        with self._lock:
            self._jobs[job_id] = {
                "status": JobStatus.PENDING,
                "progress": 0,
                "result": None,
                "error": None,
            }
        return job_id

    def set_progress(self, job_id: str, progress: int) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is not None:
                job["status"] = JobStatus.PROCESSING
                job["progress"] = max(0, min(100, progress))

    def set_result(self, job_id: str, result: Dict[str, Any]) -> None:
        with self._lock:
            self._jobs[job_id] = {
                "status": JobStatus.DONE,
                "progress": 100,
                "result": result,
                "error": None,
            }

    def set_error(self, job_id: str, error: str) -> None:
        with self._lock:
            self._jobs[job_id] = {
                "status": JobStatus.ERROR,
                "progress": 0,
                "result": None,
                "error": error,
            }

    def get(self, job_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            job = self._jobs.get(job_id)
            return dict(job) if job is not None else None


job_manager = JobManager()
