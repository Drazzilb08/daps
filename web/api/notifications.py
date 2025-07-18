from typing import Any, Dict

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from util.notification import NotificationManager

router = APIRouter()

class NotificationPayload(BaseModel):
    """Request schema for test notification."""
    module: str
    notifications: Dict[str, Any]   # Or Dict[str, NotificationConfig] if you want stricter typing

def get_logger(request: Request) -> Any:
    return request.app.state.logger

@router.post("/api/test-notification")
async def test_notification(
    payload: NotificationPayload,
    logger: Any = Depends(get_logger)
) -> Any:
    logger.debug("[WEB] Serving POST /api/test-notification for module: %s", payload.module)
    logger.debug("[WEB] Payload: %s", payload.dict())
    try:
        config = payload.dict()
        manager = NotificationManager(config, logger, module_name=payload.module)
        result = manager.send_test_notification()
        return JSONResponse(status_code=200, content=result)
    except Exception as e:
        logger.error("[WEB] Test notification failed: %s", e)
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})