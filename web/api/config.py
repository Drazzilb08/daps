


import copy
from typing import Any, Dict

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from util.config import config_file_path
from util.helper import redact_apis


def get_config() -> Dict[str, Any]:
    import yaml
    with open(config_file_path, "r") as f:
        return yaml.safe_load(f)

def save_config_dict(cfg: Dict[str, Any]) -> None:
    import yaml
    with open(config_file_path, "w") as f:
        yaml.safe_dump(cfg, f, sort_keys=False)

def get_logger(request: Request) -> Any:
    return request.app.state.logger

router = APIRouter()

@router.get("/api/config")
async def get_config_route(
    config: Dict[str, Any] = Depends(get_config), logger: Any = Depends(get_logger)
) -> Dict[str, Any]:
    """Returns the current configuration as a dictionary."""
    if logger:
        logger.debug("[WEB] Serving GET /api/config")
    return config

@router.post("/api/config")
async def update_config_route(
    request: Request,
    logger: Any = Depends(get_logger)
) -> Any:
    """
    Updates the configuration file with provided values.
    Replaces whole sections as sent from frontend.
    """
    try:
        incoming = await request.json()
        incoming_copy = copy.deepcopy(incoming)
        if "instances" in incoming_copy:
            redact_apis(incoming_copy["instances"])
        logger.debug("[WEB] Serving POST /api/config with payload: %s", incoming_copy)

        current_config = get_config()

        # For each top-level section provided, overwrite it fully
        for section in ["schedule", "instances", "notifications"]:
            if section in incoming:
                current_config[section] = incoming[section]

        # Any other config sections (poster_renamerr, border_replacerr, etc)
        for k, v in incoming.items():
            if k not in ("schedule", "instances", "notifications"):
                current_config[k] = v

        save_config_dict(current_config)
        if logger:
            logger.info("[WEB] Config entries updated")
        return {"status": "success"}
    except Exception as e:
        if logger:
            logger.error("[WEB] Config update failed: %s", e)
        return JSONResponse(status_code=500, content={"error": str(e)})