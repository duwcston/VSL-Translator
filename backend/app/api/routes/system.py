from fastapi import APIRouter

router = APIRouter(tags=["System"])


@router.get("/status")
def get_system_status():
    """
    Get the status of the ASL Detection Backend system

    Returns:
        Dictionary with status information
    """
    return {"status": "online", "message": "ASL Detection Backend running"}
