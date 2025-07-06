import os
from typing import Dict, List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse

def get_logger(request):
    return request.app.state.logger

# You may want to DRY this up with a helper, for now duplicate as in server.py
import os
from pathlib import Path

if os.environ.get("DOCKER_ENV"):
    LOG_BASE_DIR = "/config/logs"
else:
    LOG_BASE_DIR = str((Path(__file__).parent.parent.parent / "logs").resolve())

router = APIRouter()

@router.get("/api/logs")
async def list_logs(request, logger=Depends(get_logger)) -> Dict[str, List[str]]:
    logger.info("[WEB] Listing logs in %s", LOG_BASE_DIR)
    logs_data: Dict[str, List[str]] = {}
    if not os.path.exists(LOG_BASE_DIR):
        logger.error("[WEB] Log directory not found: %s", LOG_BASE_DIR)
        raise HTTPException(status_code=404, detail="Log directory not found.")
    for module in os.listdir(LOG_BASE_DIR):
        if module == "debug":
            logger.debug(f"[WEB] Skipping {module} folder")
            continue
        module_path = os.path.join(LOG_BASE_DIR, module)
        if os.path.isdir(module_path):
            files = sorted(
                f
                for f in os.listdir(module_path)
                if os.path.isfile(os.path.join(module_path, f))
            )
            logs_data[module] = files
    logger.info("[WEB] Logs listed: %s", list(logs_data.keys()))
    return logs_data

@router.get("/api/logs/{module}/{filename}", response_class=PlainTextResponse)
async def read_log(module: str, filename: str, request, logger=Depends(get_logger)) -> str:
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