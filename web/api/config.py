


from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from typing import Any, Dict
import copy

from util.config import Config
from util.helper import redact_apis

from util.config import config_file_path

def load_config_dict() -> Dict[str, Any]:
    import yaml
    with open(config_file_path, "r") as f:
        return yaml.safe_load(f)

def save_config_dict(cfg: Dict[str, Any]) -> None:
    import yaml
    with open(config_file_path, "w") as f:
        yaml.safe_dump(cfg, f, sort_keys=False)

def get_config() -> Dict[str, Any]:
    return load_config_dict()

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
    logger: Any = Depends(get_logger),
    config: Dict[str, Any] = Depends(get_config),
) -> Any:
    """Updates the configuration file with provided values."""
    try:
        incoming = await request.json()
        incoming_copy = copy.deepcopy(incoming)
        if "instances" in incoming_copy:
            redact_apis(incoming_copy["instances"])
        if logger:
            logger.debug("[WEB] Serving POST /api/config with payload: %s", incoming_copy)
        current_config = load_config_dict()
        new_schedule = incoming.get("schedule")
        new_instances = incoming.get("instances")
        new_notifications = incoming.get("notifications")
        if new_schedule is not None:
            if "schedule" not in current_config:
                current_config["schedule"] = {}
            for key, value in new_schedule.items():
                current_config["schedule"][key] = value
        if new_instances is not None:
            current_config["instances"] = new_instances
        if new_notifications is not None:
            current_config["notifications"] = new_notifications
        for mod_name, mod_payload in incoming.items():
            if mod_name in ("schedule", "instances", "notifications"):
                continue
            if (
                "bash_scripts" in current_config
                and mod_name in current_config["bash_scripts"]
            ):
                target = current_config["bash_scripts"][mod_name]
            else:
                target = current_config.setdefault(mod_name, {})
            for field, val in mod_payload.items():
                target[field] = val
        save_config_dict(current_config)
        if logger:
            logger.info("[WEB] Config entries updated")
        return {"status": "success"}
    except Exception as e:
        if logger:
            logger.error("[WEB] Config update failed: %s", e)
        return JSONResponse(status_code=500, content={"error": str(e)})