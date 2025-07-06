from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Any, Dict

router = APIRouter()

class NotificationPayload(BaseModel):
    """Request schema for test notification."""
    module: str
    notifications: Dict[str, Any]

def get_logger(request: Request) -> Any:
    return request.app.state.logger

@router.post("/api/test-notification")
async def test_notification(
    payload: NotificationPayload,
    logger: Any = Depends(get_logger)
) -> Any:
    """Sends a test notification and returns the result."""
    logger.debug(
        "[WEB] Serving POST /api/test-notification for module: %s", payload.module
    )
    from util.notification import send_test_notification

    try:
        results = send_test_notification(payload.dict(), logger)
        logger.debug("[WEB] Test notification results: %s", results)
        return results
    except Exception as e:
        logger.error("[WEB] Test notification failed: %s", e)
        return JSONResponse(status_code=500, content={"error": str(e)})