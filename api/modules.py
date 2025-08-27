"""
Module execution API endpoints for DAPS.

Provides module orchestration functionality including execution,
status monitoring, cancellation, and run state management.
"""

from typing import Any

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from api.utils import error, get_database, get_logger, ok
from util.database import DapsDB


class RunRequest(BaseModel):
    """Request model for running a module."""

    module: str


class CancelRequest(BaseModel):
    """Request model for canceling a module."""

    module: str


router = APIRouter(
    prefix="/api",
    tags=["Modules"],
    responses={
        500: {"description": "Internal server error"},
        400: {"description": "Bad request or invalid module state"},
    },
)


def get_module_orchestrator(request: Request) -> Any:
    """Dependency injection for module orchestrator"""
    orchestrator = getattr(request.app.state, "module_orchestrator", None)
    if orchestrator is None:
        raise RuntimeError("ModuleOrchestrator not available in app state")
    return orchestrator


@router.post(
    "/modules/run",
    summary="Execute module",
    description="Execute a DAPS module immediately with real-time status monitoring.",
    responses={
        200: {
            "description": "Module executed successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Module sync_gdrive completed successfully",
                        "data": {"module": "sync_gdrive", "status": "completed"},
                    }
                }
            },
        },
        400: {"description": "Module already running or invalid module name"},
    },
)
async def run_module(
    request: Request,
    data: RunRequest,
    logger: Any = Depends(get_logger),
    orchestrator: Any = Depends(get_module_orchestrator),
) -> JSONResponse:
    """
    Execute a DAPS module immediately.

    Runs the specified module through the job queue system with
    real-time monitoring. Prevents duplicate executions of the
    same module and provides immediate feedback on completion.

    Args:
        data: Request containing the module name to execute

    Returns:
        Module execution result with status and any output data
    """
    module = data.module
    logger.debug("Serving POST /api/run for module: %s", module)

    try:
        # Check if module is already running
        status = orchestrator.get_module_status(module)
        if status["running"]:
            logger.warning(f"Module {module} is already running")
            return error(
                f"Module {module} is already running",
                code="MODULE_ALREADY_RUNNING",
                status_code=400,
            )

        # Run module immediately (will wait for completion)
        result = orchestrator.run_module_immediate(module, origin="web")

        if result["success"]:
            logger.info(f"Successfully completed module: {module}")
            return ok(
                f"Module {module} completed successfully",
                data=result.get("data", {"module": module, "status": "completed"}),
            )
        else:
            logger.error(f"Module {module} failed: {result['message']}")
            return error(
                result["message"],
                code=result.get("error_code", "MODULE_EXECUTION_FAILED"),
                status_code=500,
            )

    except Exception as e:
        logger.error(f"Error running module {module}: {e}", exc_info=True)
        return error(
            f"Error running module: {str(e)}",
            code="MODULE_START_ERROR",
            status_code=500,
        )


@router.get(
    "/modules/status",
    summary="Get module status",
    description="Retrieve the current execution status of a specific module.",
    responses={
        200: {
            "description": "Module status retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Status retrieved for module sync_gdrive",
                        "data": {
                            "running": False,
                            "last_run": "2024-01-01T12:00:00Z",
                            "status": "completed",
                        },
                    }
                }
            },
        }
    },
)
async def module_status(
    request: Request,
    module: str,
    logger: Any = Depends(get_logger),
    orchestrator: Any = Depends(get_module_orchestrator),
) -> JSONResponse:
    """
    Get the current execution status of a module.

    Returns detailed status information including whether the
    module is currently running, last execution time, and
    current state for monitoring purposes.

    Args:
        module: Name of the module to check status for

    Returns:
        Module status with execution state and timestamps
    """
    try:
        status = orchestrator.get_module_status(module)

        return ok(f"Status retrieved for module {module}", data=status)

    except Exception as e:
        logger.error(f"Error getting status for module {module}: {e}")
        return error(
            f"Error getting module status: {str(e)}",
            code="MODULE_STATUS_ERROR",
            status_code=500,
        )


@router.post(
    "/modules/cancel",
    summary="Cancel module execution",
    description="Cancel a currently running module and terminate its execution.",
    responses={
        200: {
            "description": "Module cancelled successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Module sync_gdrive cancelled successfully",
                        "data": {"module": "sync_gdrive", "status": "cancelled"},
                    }
                }
            },
        },
        400: {"description": "Module not running or cannot be cancelled"},
    },
)
async def cancel_module(
    request: Request,
    data: CancelRequest,
    logger: Any = Depends(get_logger),
    orchestrator: Any = Depends(get_module_orchestrator),
) -> JSONResponse:
    """
    Cancel a currently running module.

    Attempts to gracefully terminate a running module execution.
    The module will be marked as cancelled and any cleanup
    operations will be performed.

    Args:
        data: Request containing the module name to cancel

    Returns:
        Cancellation confirmation with updated module status
    """
    module = data.module

    try:
        result = orchestrator.cancel_module(module)

        if result["success"]:
            logger.info(f"Successfully cancelled module: {module}")
            return ok(
                result["message"],
                data=result.get("data", {"module": module, "status": "cancelled"}),
            )
        else:
            return error(
                result["message"],
                code=result.get("error_code", "MODULE_CANCEL_FAILED"),
                status_code=400,
            )

    except Exception as e:
        logger.error(f"Error cancelling module {module}: {e}")
        return error(
            f"Error cancelling module: {str(e)}",
            code="MODULE_CANCEL_ERROR",
            status_code=500,
        )


@router.get(
    "/modules/run-states",
    summary="Get all module run states",
    description="Retrieve run state information for all registered modules.",
    responses={
        200: {
            "description": "Run states retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Retrieved 5 run states",
                        "data": {
                            "run_states": [
                                {
                                    "module": "sync_gdrive",
                                    "last_run": "2024-01-01T12:00:00Z",
                                    "status": "completed",
                                    "duration": 120,
                                }
                            ]
                        },
                    }
                }
            },
        }
    },
)
async def get_all_run_states(
    request: Request,
    logger: Any = Depends(get_logger),
    db: DapsDB = Depends(get_database),
) -> JSONResponse:
    """
    Retrieve run state information for all modules.

    Returns execution history and current state for all
    registered DAPS modules including timestamps, durations,
    and execution results.

    Returns:
        Complete run state information for all modules
    """
    try:
        run_states = db.run_state.get_all()

        return ok(
            f"Retrieved {len(run_states)} run states", data={"run_states": run_states}
        )

    except Exception as e:
        logger.error(f"Error getting run states: {e}")
        return error(
            f"Error getting run states: {str(e)}",
            code="RUN_STATE_ERROR",
            status_code=500,
        )
