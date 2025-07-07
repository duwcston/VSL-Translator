from fastapi import APIRouter
from app.api.routes.system import router as system_router
from app.api.routes.detection import router as detection_router

api_router = APIRouter(prefix="/v1")

api_router.include_router(system_router)
api_router.include_router(detection_router)