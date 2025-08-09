import os
from pathlib import Path
from typing import Any, Dict

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse, PlainTextResponse


def get_logger(request: Request, source: str = "WEB") -> Any:
    """Get logger adapter from app state."""
    return request.app.state.logger.get_adapter(source)


if os.environ.get("DOCKER_ENV"):
    LOG_BASE_DIR = "/config/logs"
else:
    LOG_BASE_DIR = str((Path(__file__).parents[1] / "logs").resolve())

router = APIRouter()


@router.get("/api/logs")
async def list_logs(logger: Any = Depends(get_logger)) -> Dict[str, Any]:
    """
    List all available log modules.

    Returns directories in the logs folder that contain module logs.
    """
    try:
        logger.debug(f"Listing log modules in {LOG_BASE_DIR}")

        if not os.path.exists(LOG_BASE_DIR):
            return {
                "success": True,
                "message": "No logs directory found",
                "data": {"modules": []},
            }

        modules = [
            module
            for module in os.listdir(LOG_BASE_DIR)
            if os.path.isdir(os.path.join(LOG_BASE_DIR, module)) and module != "debug"
        ]

        logger.debug("Log modules listed: %s", modules)
        return {
            "success": True,
            "message": f"Found {len(modules)} log modules",
            "data": {"modules": modules},
        }

    except Exception as e:
        logger.error(f"Error listing log modules: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error listing log modules: {str(e)}",
                "error_code": "LOG_MODULES_LIST_ERROR",
            },
        )


@router.get("/api/logs/{module_name}")
async def list_logs_for_module(
    module_name: str, logger: Any = Depends(get_logger)
) -> Dict[str, Any]:
    """
    List all log files for a specific module.

    Returns sorted list of log files in the module's log directory.
    """
    try:
        logger.debug(f"Listing logs for module: {module_name}")

        # Sanitize module name to prevent directory traversal
        safe_module = os.path.basename(module_name)
        module_path = os.path.join(LOG_BASE_DIR, safe_module)

        if not os.path.isdir(module_path):
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "message": f"Module '{module_name}' logs not found",
                    "error_code": "MODULE_LOGS_NOT_FOUND",
                },
            )

        files = sorted(
            f
            for f in os.listdir(module_path)
            if os.path.isfile(os.path.join(module_path, f))
        )

        return {
            "success": True,
            "message": f"Found {len(files)} log files for module '{module_name}'",
            "data": {"files": files},
        }

    except Exception as e:
        logger.error(f"Error listing logs for module {module_name}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error listing module logs: {str(e)}",
                "error_code": "MODULE_LOGS_LIST_ERROR",
            },
        )


@router.get("/api/logs/{module}/{filename}", response_class=PlainTextResponse)
async def read_log(
    module: str, filename: str, logger: Any = Depends(get_logger)
) -> PlainTextResponse:
    """
    Read and return the contents of a specific log file.

    Returns the raw log file content as plain text. Security measures prevent
    access to debug logs and directory traversal attacks.
    """
    try:
        # Sanitize inputs to prevent directory traversal
        safe_module = os.path.basename(module)
        safe_filename = os.path.basename(filename)

        # Prevent access to debug logs
        if safe_module == "debug":
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "message": "Log file not found",
                    "error_code": "LOG_FILE_NOT_FOUND",
                },
            )

        log_path = os.path.join(LOG_BASE_DIR, safe_module, safe_filename)

        # Additional security check for debug logs in path
        if "debug" in os.path.relpath(log_path, LOG_BASE_DIR).split(os.sep):
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "message": "Log file not found",
                    "error_code": "LOG_FILE_NOT_FOUND",
                },
            )

        if not os.path.exists(log_path):
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "message": "Log file not found",
                    "error_code": "LOG_FILE_NOT_FOUND",
                },
            )

        # Verify the file is within our allowed directory
        resolved_path = os.path.realpath(log_path)
        resolved_base = os.path.realpath(LOG_BASE_DIR)
        if not resolved_path.startswith(resolved_base):
            return JSONResponse(
                status_code=403,
                content={
                    "success": False,
                    "message": "Access denied",
                    "error_code": "LOG_ACCESS_DENIED",
                },
            )

        with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        logger.debug(f"Served log file: {safe_module}/{safe_filename}")
        return PlainTextResponse(content)

    except PermissionError:
        logger.error(f"Permission denied accessing log file: {module}/{filename}")
        return JSONResponse(
            status_code=403,
            content={
                "success": False,
                "message": "Permission denied accessing log file",
                "error_code": "LOG_PERMISSION_DENIED",
            },
        )
    except Exception as e:
        logger.error(f"Error reading log file {module}/{filename}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error reading log file: {str(e)}",
                "error_code": "LOG_READ_ERROR",
            },
        )
