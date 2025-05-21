from fastapi import APIRouter

router = APIRouter(tags=["System"])


@router.get("/status")
def get_system_status():
    """
    Get the status of the VSL Detection Backend system
    
    Returns:
        Dictionary with status information
    """
    return {
        "status": "online", 
        "message": "VSL Detection Backend running"
    }
