import copy
from typing import Any

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import JSONResponse

from util.config import DapsConfig, load_config, save_config
from util.helper import dict_diff


def get_config() -> DapsConfig:
    return load_config()


def save_config_model(cfg: DapsConfig) -> None:
    save_config(cfg)


def get_logger(request: Request, source="WEB") -> Any:
    return request.app.state.logger.get_adapter(source)


router = APIRouter()


@router.get("/api/config")
async def get_config_route(
    config: DapsConfig = Depends(get_config),
    logger: Any = Depends(get_logger),
    section: str = Query(None, description="Optional config section"),
):
    if logger:
        logger.debug(f"Serving GET /api/config section={section!r}")
    if section:
        data = config.model_dump(mode="python")
        if section in data:
            return {section: data[section]}
        return JSONResponse(
            status_code=404, content={"error": f"Section '{section}' not found"}
        )
    return config.model_dump(mode="python")


@router.post("/api/config")
async def update_config_route(
    request: Request, logger: Any = Depends(get_logger)
) -> Any:
    try:
        incoming = await request.json()
        incoming_copy = copy.deepcopy(incoming)
        logger.debug("Serving POST /api/config with payload: %s", incoming_copy)

        current_config = load_config()
        config_dict = current_config.model_dump(mode="python")

        for k, v in incoming.items():
            config_dict[k] = v

        old_config = current_config.model_dump(mode="python")
        new_config = config_dict

        diffs = dict_diff(old_config, new_config)
        for path, old, new in diffs:
            logger = logger.get_adapter("CONFIG_UPDATE")
            logger.debug(f"Updated: {path} | old={old!r} | new={new!r}")

        updated_config = DapsConfig.model_validate(config_dict)
        save_config(updated_config)
        if logger:
            logger.info("Config entries updated")
        return {"status": "success"}
    except Exception as e:
        if logger:
            logger.error("Config update failed: %s", e)
        return JSONResponse(status_code=500, content={"error": str(e)})
