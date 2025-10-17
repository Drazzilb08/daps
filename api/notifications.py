"""
Notification testing API endpoints for DAPS.

Provides notification system testing functionality for validating
configuration of various notification services, as well as CRUD
operations for managing notification configurations.
"""

from typing import Any

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from api.utils import error, ok
from modules import MODULES
from util.config import DapsConfig, load_config, save_config
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


class NotificationUpdateRequest(BaseModel):
    """Request schema for creating/updating notification configuration."""

    module: str
    service_type: str  # "discord" | "notifiarr" | "email"
    config: dict  # Service-specific configuration


def get_logger(request: Request, source: str = "WEB") -> Any:
    """Get logger adapter from app state."""
    return request.app.state.logger.get_adapter(source)


def get_config() -> DapsConfig:
    """Load current configuration."""
    return load_config()


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


@router.get(
    "/notifications",
    summary="Get all module notifications",
    description="Retrieve all configured module notifications from configuration.",
    responses={
        200: {
            "description": "Notifications retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Notifications retrieved successfully",
                        "data": {
                            "notifications": {
                                "sync_gdrive": {
                                    "discord": {
                                        "bot_name": "DAPS",
                                        "color": "#ff7300",
                                        "webhook": "https://discord.com/api/webhooks/...",
                                    }
                                }
                            }
                        },
                    }
                }
            },
        }
    },
)
async def get_all_notifications(
    config: DapsConfig = Depends(get_config), logger: Any = Depends(get_logger)
) -> JSONResponse:
    """
    Retrieve all configured module notifications.

    Returns the complete notification configuration for all modules.
    Used by the UI for notification management interface.

    Returns:
        Complete notification configuration dictionary
    """
    try:
        logger.debug("Serving GET /api/notifications")
        notifications_data = config.notifications.model_dump()

        return ok(
            "Notifications retrieved successfully",
            {"notifications": notifications_data},
        )

    except Exception as e:
        logger.error(f"Error retrieving notifications: {e}")
        return error(
            f"Error retrieving notifications: {str(e)}",
            code="NOTIFICATIONS_RETRIEVAL_ERROR",
            status_code=500,
        )


@router.get(
    "/notifications/{module_id}",
    summary="Get module notifications",
    description="Retrieve the notifications for a specific module.",
    responses={
        200: {
            "description": "Module notifications retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Notifications for 'sync_gdrive' retrieved successfully",
                        "data": {
                            "module": "sync_gdrive",
                            "notifications": {
                                "discord": {
                                    "bot_name": "DAPS",
                                    "color": "#ff7300",
                                    "webhook": "https://discord.com/api/webhooks/...",
                                }
                            },
                        },
                    }
                }
            },
        },
        404: {"description": "Module notifications not found"},
    },
)
async def get_module_notifications(
    module_id: str,
    config: DapsConfig = Depends(get_config),
    logger: Any = Depends(get_logger),
) -> JSONResponse:
    """
    Retrieve the notifications for a specific module.

    Returns the notification configuration for the requested module, or null
    if no notifications are configured.

    Args:
        module_id: Module name (e.g., "sync_gdrive", "poster_renamerr")

    Returns:
        Module notification configuration
    """
    try:
        logger.debug(f"Serving GET /api/notifications/{module_id}")

        # Get notifications for the module (may be None)
        module_notifications = getattr(config.notifications, module_id, None)

        # Convert to dict if it exists (it's a dict already per the Pydantic model)
        # ConfigNotifications fields are already Dict[str, Any]
        if module_notifications is None:
            module_notifications = {}

        return ok(
            f"Notifications for '{module_id}' retrieved successfully",
            {"module": module_id, "notifications": module_notifications},
        )

    except Exception as e:
        logger.error(f"Error retrieving notifications for module {module_id}: {e}")
        return error(
            f"Error retrieving notifications: {str(e)}",
            code="NOTIFICATIONS_RETRIEVAL_ERROR",
            status_code=500,
        )


@router.post(
    "/notifications",
    summary="Create or update module notification",
    description="Create or update the notification configuration for a specific module and service type.",
    responses={
        200: {
            "description": "Notification created/updated successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Notification for 'sync_gdrive' (discord) updated successfully",
                        "data": {
                            "module": "sync_gdrive",
                            "service_type": "discord",
                            "config": {
                                "bot_name": "DAPS",
                                "color": "#ff7300",
                                "webhook": "https://discord.com/api/webhooks/...",
                            },
                        },
                    }
                }
            },
        },
        400: {"description": "Invalid module name or service type"},
        500: {"description": "Configuration save failed"},
    },
)
async def update_module_notification(
    data: NotificationUpdateRequest, logger: Any = Depends(get_logger)
) -> JSONResponse:
    """
    Create or update a module notification configuration.

    Validates that the module name exists in the available modules list
    and that the service type is valid, then updates the notification
    configuration and persists to config.yml.

    Args:
        data: Module name, service type, and notification configuration

    Returns:
        Success confirmation with updated notification details
    """
    try:
        module_name = data.module
        service_type = data.service_type
        notification_config = data.config

        logger.info(
            f"Updating notification for module: {module_name}, service: {service_type}"
        )

        # Validate module exists in MODULES registry
        if module_name not in MODULES:
            available_modules = ", ".join(sorted(MODULES.keys()))
            return error(
                f"Invalid module name: '{module_name}'. "
                f"Available modules: {available_modules}",
                code="INVALID_MODULE_NAME",
                status_code=400,
            )

        # Validate service type
        allowed_service_types = ["discord", "notifiarr", "email"]
        if service_type not in allowed_service_types:
            return error(
                f"Invalid service type: '{service_type}'. "
                f"Allowed types: {', '.join(allowed_service_types)}",
                code="INVALID_SERVICE_TYPE",
                status_code=400,
            )

        # Load current config
        config = load_config()

        # Ensure notifications structure exists
        if not hasattr(config, "notifications") or config.notifications is None:
            config.notifications = {}

        # Ensure module entry exists
        if module_name not in config.notifications:
            config.notifications[module_name] = {}

        # Update notification for the module and service type
        config.notifications[module_name][service_type] = notification_config

        # Save updated configuration
        save_config(config)

        logger.info(
            f"Successfully updated notification for module: {module_name}, service: {service_type}"
        )
        return ok(
            f"Notification for '{module_name}' ({service_type}) updated successfully",
            {
                "module": module_name,
                "service_type": service_type,
                "config": notification_config,
            },
        )

    except Exception as e:
        logger.error(
            f"Failed to update notification for module {data.module}, service {data.service_type}: {e}"
        )
        return error(
            f"Failed to update notification: {str(e)}",
            code="NOTIFICATION_UPDATE_ERROR",
            status_code=500,
        )


@router.delete(
    "/notifications/{module_id}/{service_type}",
    summary="Delete module notification",
    description="Remove the notification configuration for a specific module and service type from configuration.",
    responses={
        200: {
            "description": "Notification deleted successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Notification for 'sync_gdrive' (discord) deleted successfully",
                        "data": {"module": "sync_gdrive", "service_type": "discord"},
                    }
                }
            },
        },
        404: {"description": "Module notification not found"},
        500: {"description": "Configuration save failed"},
    },
)
async def delete_module_notification(
    module_id: str, service_type: str, logger: Any = Depends(get_logger)
) -> JSONResponse:
    """
    Delete a module notification configuration.

    Removes the notification entry for the specified module and service type
    from config.yml. This operation is permanent. If the module has no other
    notifications after deletion, the module key is also removed.

    Args:
        module_id: Module name to remove notification for
        service_type: Service type to remove (discord, notifiarr, email)

    Returns:
        Success confirmation with deleted module name and service type
    """
    try:
        logger.info(
            f"Deleting notification for module: {module_id}, service: {service_type}"
        )

        # Load current config
        config = load_config()

        # Check if module has any notifications configured
        if module_id not in config.notifications:
            return error(
                f"No notifications found for module '{module_id}'",
                code="NOTIFICATION_NOT_FOUND",
                status_code=404,
            )

        # Check if service type exists for this module
        if service_type not in config.notifications[module_id]:
            return error(
                f"No '{service_type}' notification found for module '{module_id}'",
                code="NOTIFICATION_NOT_FOUND",
                status_code=404,
            )

        # Remove the notification
        del config.notifications[module_id][service_type]

        # Clean up empty module key if no other services remain
        if not config.notifications[module_id]:
            del config.notifications[module_id]

        # Save updated configuration
        save_config(config)

        logger.info(
            f"Successfully deleted notification for module: {module_id}, service: {service_type}"
        )
        return ok(
            f"Notification for '{module_id}' ({service_type}) deleted successfully",
            {"module": module_id, "service_type": service_type},
        )

    except Exception as e:
        logger.error(
            f"Failed to delete notification for module {module_id}, service {service_type}: {e}"
        )
        return error(
            f"Failed to delete notification: {str(e)}",
            code="NOTIFICATION_DELETE_ERROR",
            status_code=500,
        )
