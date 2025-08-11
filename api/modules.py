# api/modules.py

from typing import Any

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from util.database import DapsDB


class RunRequest(BaseModel):
    module: str


class CancelRequest(BaseModel):
    module: str


router = APIRouter()


def get_logger(request: Request, source: str = "WEB") -> Any:
    """Get logger adapter from app state"""
    return request.app.state.logger.get_adapter(source)


def get_module_runner(request: Request):
    """Dependency injection for module runner"""
    module_runner = getattr(request.app.state, "module_runner", None)
    if module_runner is None:
        raise RuntimeError("ModuleRunner not available in app state")
    return module_runner


@router.post("/api/run")
async def run_module(
    request: Request,
    data: RunRequest,
    logger: Any = Depends(get_logger),
    module_runner=Depends(get_module_runner),
):
    """FIXED: Standardized response format and consistent dependency access"""
    module = data.module
    logger.debug("Serving POST /api/run for module: %s", module)

    try:
        running = module_runner.get_running()
        if (
            module in running
            and running[module] is not None
            and running[module]["proc"].is_alive()
        ):
            logger.warning(f"Module {module} is already running")
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": f"Module {module} is already running",
                    "error_code": "MODULE_ALREADY_RUNNING",
                },
            )

        proc_entry = module_runner.launch_module_tracked(module, origin="web")
        if proc_entry is None:
            logger.error(f"Failed to start module: {module}")
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "message": f"Failed to start module: {module}",
                    "error_code": "MODULE_START_FAILED",
                },
            )

        logger.info(f"Successfully started module: {module}")
        return {
            "success": True,
            "message": f"Module {module} started successfully",
            "data": {"module": module, "status": "starting"},
        }

    except Exception as e:
        logger.error(f"Error starting module {module}: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error starting module: {str(e)}",
                "error_code": "MODULE_START_ERROR",
            },
        )


@router.get("/api/status")
async def module_status(
    request: Request,
    module: str,
    logger: Any = Depends(get_logger),
    module_runner=Depends(get_module_runner),
):
    """FIXED: Standardized response format"""
    try:
        running = module_runner.get_running()
        entry = running.get(module)

        if entry is not None:
            proc = entry["proc"]
            origin = entry["origin"]
            alive = proc.is_alive()
        else:
            proc = None
            origin = None
            alive = False

        return {
            "success": True,
            "message": f"Status retrieved for module {module}",
            "data": {"module": module, "running": alive, "origin": origin},
        }

    except Exception as e:
        logger.error(f"Error getting status for module {module}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error getting module status: {str(e)}",
                "error_code": "MODULE_STATUS_ERROR",
            },
        )


@router.post("/api/cancel")
async def cancel_module(
    request: Request,
    data: CancelRequest,
    logger: Any = Depends(get_logger),
    module_runner=Depends(get_module_runner),
):
    """FIXED: Standardized response format"""
    module = data.module

    try:
        running = module_runner.get_running()
        entry = running.get(module)

        if not entry or not entry["proc"].is_alive():
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": "Module not running",
                    "error_code": "MODULE_NOT_RUNNING",
                },
            )

        entry["proc"].terminate()
        logger.info(f"Manually cancelled module: {module}")
        del module_runner.running[module]

        return {
            "success": True,
            "message": f"Module {module} cancelled successfully",
            "data": {"module": module, "status": "cancelled"},
        }

    except Exception as e:
        logger.error(f"Error cancelling module {module}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error cancelling module: {str(e)}",
                "error_code": "MODULE_CANCEL_ERROR",
            },
        )


@router.get("/api/run_state")
async def get_all_run_states(
    request: Request,
    logger: Any = Depends(get_logger),
):
    """FIXED: Standardized response format - removed orchestrator dependency"""
    try:
        with DapsDB(logger=logger) as db:
            run_states = db.run_state.get_all()

        return {
            "success": True,
            "message": f"Retrieved {len(run_states)} run states",
            "data": {"run_states": run_states},
        }

    except Exception as e:
        logger.error(f"Error getting run states: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error getting run states: {str(e)}",
                "error_code": "RUN_STATE_ERROR",
            },
        )
