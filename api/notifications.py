from typing import Any, Dict

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from util.notification import NotificationManager

router = APIRouter()


class NotificationPayload(BaseModel):
    """Request schema for test notification."""

    module: str
    notifications: Dict[str, Any]


def get_logger(request: Request, source: str = "WEB") -> Any:
    """Get logger adapter from app state."""
    return request.app.state.logger.get_adapter(source)


@router.post("/api/test-notification")
async def test_notification(
    payload: NotificationPayload, logger: Any = Depends(get_logger)
) -> Dict[str, Any]:
    """
    Test notification configuration for a module.

    Sends a test notification using the provided configuration to verify
    that notification settings are working correctly.
    """
    try:
        logger.debug(
            "Serving POST /api/test-notification for module: %s", payload.module
        )
        logger.debug("Payload: %s", payload.dict())

        config = payload.dict()
        manager = NotificationManager(config, logger, module_name=payload.module)
        result = manager.send_test_notification()

        # Check if the result is already in our standard format
        if isinstance(result, dict) and "success" in result:
            return result

        # Assume success if no exception was raised and we got a result
        return {
            "success": True,
            "message": f"Test notification sent successfully for module '{payload.module}'",
            "data": result if result else {},
        }

    except ValueError as e:
        logger.error(f"Invalid notification configuration: {e}")
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "message": f"Invalid notification configuration: {str(e)}",
                "error_code": "NOTIFICATION_CONFIG_INVALID",
            },
        )
    except ConnectionError as e:
        logger.error(f"Notification service connection failed: {e}")
        return JSONResponse(
            status_code=502,
            content={
                "success": False,
                "message": f"Failed to connect to notification service: {str(e)}",
                "error_code": "NOTIFICATION_CONNECTION_FAILED",
            },
        )
    except Exception as e:
        logger.error(f"Test notification failed: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Test notification failed: {str(e)}",
                "error_code": "NOTIFICATION_TEST_ERROR",
            },
        )
