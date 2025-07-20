import os
from pathlib import Path
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import PlainTextResponse


def get_logger(request: Request) -> Any:
    return request.app.state.logger


if os.environ.get("DOCKER_ENV"):
    LOG_BASE_DIR = "/config/logs"
else:
    LOG_BASE_DIR = str((Path(__file__).parents[2] / "logs").resolve())

router = APIRouter()


@router.get("/api/logs")
async def list_logs(logger=Depends(get_logger)) -> List[str]:
    logger.debug(f"[WEB] Listing log modules in {LOG_BASE_DIR}")
    modules = [
        module
        for module in os.listdir(LOG_BASE_DIR)
        if os.path.isdir(os.path.join(LOG_BASE_DIR, module)) and module != "debug"
    ]
    logger.debug("[WEB] Log modules listed: %s", modules)
    return modules


@router.get("/api/logs/{module_name}")
async def list_logs_for_module(
    module_name: str, logger=Depends(get_logger)
) -> List[str]:
    logger.debug(f"[WEB] Listing logs for module: {module_name}")
    module_path = os.path.join(LOG_BASE_DIR, module_name)
    if not os.path.isdir(module_path):
        logger.error(f"[WEB] Module {module_name} not found")
        raise HTTPException(status_code=404, detail="Module not found.")
    files = sorted(
        f
        for f in os.listdir(module_path)
        if os.path.isfile(os.path.join(module_path, f))
    )
    return files


@router.get("/api/logs/{module}/{filename}", response_class=PlainTextResponse)
async def read_log(module: str, filename: str, logger=Depends(get_logger)) -> str:
    safe_module = os.path.basename(module)
    safe_filename = os.path.basename(filename)
    if safe_module == "debug":
        raise HTTPException(status_code=404, detail="Log file not found.")
    log_path = os.path.join(LOG_BASE_DIR, safe_module, safe_filename)
    if "debug" in os.path.relpath(log_path, LOG_BASE_DIR).split(os.sep):
        raise HTTPException(status_code=404, detail="Log file not found.")
    if not os.path.exists(log_path):
        raise HTTPException(status_code=404, detail="Log file not found.")
    with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    return content
