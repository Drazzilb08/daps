"""
Schedule management API endpoints for DAPS.

Provides CRUD operations for module scheduling configuration.
Follows the same pattern as instances.py for consistency.
"""

from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.api.utils import error, get_logger, ok
from backend.modules import MODULES
from backend.util.config import DapsConfig, load_config, save_config

router = APIRouter(
    prefix="/api",
    tags=["Schedule Management"],
    responses={
        500: {"description": "Internal server error"},
    },
)


class ScheduleUpdateRequest(BaseModel):
    """Request schema for creating or updating a module schedule."""

    module: str
    schedule: str


def get_config() -> DapsConfig:
    """Load and return the current configuration."""
    return load_config()


@router.get(
    "/schedule",
    summary="Get all module schedules",
    description="Retrieve all configured module schedules from configuration.",
    responses={
        200: {
            "description": "Schedules retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Schedules retrieved successfully",
                        "data": {
                            "schedule": {
                                "health_checkarr": "daily(02:00)",
                                "poster_renamerr": "weekly(Mon,03:00)",
                            }
                        },
                    }
                }
            },
        }
    },
)
async def get_all_schedules(
    config: DapsConfig = Depends(get_config), logger: Any = Depends(get_logger)
) -> JSONResponse:
    """
    Retrieve all configured module schedules.

    Returns the complete schedule configuration for all modules.
    Used by the UI for schedule management interface.

    Returns:
        Complete schedule configuration dictionary
    """
    try:
        logger.debug("Serving GET /api/schedule")
        schedule_data = config.schedule

        return ok(
            "Schedules retrieved successfully",
            {"schedule": schedule_data},
        )

    except Exception as e:
        logger.error(f"Error retrieving schedules: {e}")
        return error(
            f"Error retrieving schedules: {str(e)}",
            code="SCHEDULES_RETRIEVAL_ERROR",
            status_code=500,
        )


@router.get(
    "/schedule/{module_id}",
    summary="Get module schedule",
    description="Retrieve the schedule for a specific module.",
    responses={
        200: {
            "description": "Module schedule retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Schedule for 'health_checkarr' retrieved successfully",
                        "data": {
                            "module": "health_checkarr",
                            "schedule": "daily(02:00)",
                        },
                    }
                }
            },
        },
        404: {"description": "Module schedule not found"},
    },
)
async def get_module_schedule(
    module_id: str,
    config: DapsConfig = Depends(get_config),
    logger: Any = Depends(get_logger),
) -> JSONResponse:
    """
    Retrieve the schedule for a specific module.

    Returns the schedule string for the requested module, or null
    if no schedule is configured.

    Args:
        module_id: Module name (e.g., "health_checkarr", "poster_renamerr")

    Returns:
        Module schedule configuration
    """
    try:
        logger.debug(f"Serving GET /api/schedule/{module_id}")

        # Get schedule for the module (may be None)
        module_schedule = config.schedule.get(module_id)

        return ok(
            f"Schedule for '{module_id}' retrieved successfully",
            {"module": module_id, "schedule": module_schedule},
        )

    except Exception as e:
        logger.error(f"Error retrieving schedule for module {module_id}: {e}")
        return error(
            f"Error retrieving schedule: {str(e)}",
            code="SCHEDULE_RETRIEVAL_ERROR",
            status_code=500,
        )


@router.post(
    "/schedule",
    summary="Create or update module schedule",
    description="Create or update the schedule for a specific module.",
    responses={
        200: {
            "description": "Schedule created/updated successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Schedule for 'health_checkarr' updated successfully",
                        "data": {
                            "module": "health_checkarr",
                            "schedule": "daily(02:00)",
                        },
                    }
                }
            },
        },
        400: {"description": "Invalid module name"},
        500: {"description": "Configuration save failed"},
    },
)
async def update_module_schedule(
    data: ScheduleUpdateRequest, logger: Any = Depends(get_logger)
) -> JSONResponse:
    """
    Create or update a module schedule.

    Validates that the module name exists in the available modules list,
    then updates the schedule configuration and persists to config.yml.

    Args:
        data: Module name and schedule string

    Returns:
        Success confirmation with updated schedule details
    """
    try:
        module_name = data.module
        schedule_string = data.schedule

        logger.info(f"Updating schedule for module: {module_name}")

        # Validate module exists in MODULES registry
        if module_name not in MODULES:
            available_modules = ", ".join(sorted(MODULES.keys()))
            return error(
                f"Invalid module name: '{module_name}'. "
                f"Available modules: {available_modules}",
                code="INVALID_MODULE_NAME",
                status_code=400,
            )

        # Load current config
        config = load_config()

        # Update schedule for the module
        config.schedule[module_name] = schedule_string

        # Save updated configuration
        save_config(config)

        logger.info(f"Successfully updated schedule for module: {module_name}")
        return ok(
            f"Schedule for '{module_name}' updated successfully",
            {"module": module_name, "schedule": schedule_string},
        )

    except Exception as e:
        logger.error(f"Failed to update schedule for module {data.module}: {e}")
        return error(
            f"Failed to update schedule: {str(e)}",
            code="SCHEDULE_UPDATE_ERROR",
            status_code=500,
        )


@router.delete(
    "/schedule/{module_id}",
    summary="Delete module schedule",
    description="Remove the schedule for a specific module from configuration.",
    responses={
        200: {
            "description": "Schedule deleted successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Schedule for 'health_checkarr' deleted successfully",
                        "data": {"module": "health_checkarr"},
                    }
                }
            },
        },
        404: {"description": "Module schedule not found"},
        500: {"description": "Configuration save failed"},
    },
)
async def delete_module_schedule(
    module_id: str, logger: Any = Depends(get_logger)
) -> JSONResponse:
    """
    Delete a module schedule from configuration.

    Removes the schedule entry for the specified module from config.yml.
    This operation is permanent.

    Args:
        module_id: Module name to remove schedule for

    Returns:
        Success confirmation with deleted module name
    """
    try:
        logger.info(f"Deleting schedule for module: {module_id}")

        # Load current config
        config = load_config()

        # Check if module has a schedule configured
        if module_id not in config.schedule:
            return error(
                f"No schedule found for module '{module_id}'",
                code="SCHEDULE_NOT_FOUND",
                status_code=404,
            )

        # Remove the schedule
        del config.schedule[module_id]

        # Save updated configuration
        save_config(config)

        logger.info(f"Successfully deleted schedule for module: {module_id}")
        return ok(
            f"Schedule for '{module_id}' deleted successfully",
            {"module": module_id},
        )

    except Exception as e:
        logger.error(f"Failed to delete schedule for module {module_id}: {e}")
        return error(
            f"Failed to delete schedule: {str(e)}",
            code="SCHEDULE_DELETE_ERROR",
            status_code=500,
        )
