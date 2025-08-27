"""
Notification testing API endpoints for DAPS.

Provides notification system testing functionality for validating
configuration of various notification services.
"""

from typing import Any

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from api.utils import error, ok
from util.notification import NotificationManager

router = APIRouter(
    prefix="/api",
    tags=["Notifications"],
    responses={
        500: {"description": "Internal server error"},
        400: {"description": "Invalid notification configuration"},
        502: {"description": "Notification service connection failed"},
    },
)


class NotificationPayload(BaseModel):
    """Request schema for test notification."""

    module: str
    notifications: dict


def get_logger(request: Request, source: str = "WEB") -> Any:
    """Get logger adapter from app state."""
    return request.app.state.logger.get_adapter(source)


@router.post(
    "/notifications/test",
    summary="Test notification configuration",
    description="Send a test notification to validate notification service configuration.",
    responses={
        200: {
            "description": "Test notification sent successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Test notification sent successfully for module 'sync_gdrive'",
                        "data": {"sent": True, "service": "discord"},
                    }
                }
            },
        },
        400: {"description": "Invalid notification configuration"},
        502: {"description": "Notification service connection failed"},
    },
)
async def test_notification(
    payload: NotificationPayload, logger: Any = Depends(get_logger)
) -> JSONResponse:
    """
    Test notification configuration for a module.

    Sends a test notification using the provided configuration to verify
    that notification settings are working correctly. Supports various
    notification services like Discord, Slack, email, etc.

    Args:
        payload: Module name and notification configuration to test

    Returns:
        Test result indicating success or failure with error details
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
            return JSONResponse(
                status_code=200 if result["success"] else 400, content=result
            )

        # Assume success if no exception was raised and we got a result
        return ok(
            f"Test notification sent successfully for module '{payload.module}'",
            result if result else {},
        )

    except ValueError as e:
        logger.error(f"Invalid notification configuration: {e}")
        return error(
            f"Invalid notification configuration: {str(e)}",
            code="NOTIFICATION_CONFIG_INVALID",
            status_code=400,
        )
    except ConnectionError as e:
        logger.error(f"Notification service connection failed: {e}")
        return error(
            f"Failed to connect to notification service: {str(e)}",
            code="NOTIFICATION_CONNECTION_FAILED",
            status_code=502,
        )
    except Exception as e:
        logger.error(f"Test notification failed: {e}")
        return error(
            f"Test notification failed: {str(e)}",
            code="NOTIFICATION_TEST_ERROR",
            status_code=500,
        )
