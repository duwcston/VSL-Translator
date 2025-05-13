from fastapi import APIRouter
from app.api.routes.system import router as system_router
from app.api.routes.detection import router as detection_router

# Create API router with prefix
api_router = APIRouter(prefix="/v1")

# Include all route modules
api_router.include_router(system_router)
api_router.include_router(detection_router)