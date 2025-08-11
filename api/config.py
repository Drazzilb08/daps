import copy
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Query, Request

from api.utils import error, get_logger, ok
from util.config import DapsConfig, load_config, save_config
from util.helper import dict_diff


def get_config() -> DapsConfig:
    """Load and return the current configuration."""
    return load_config()


def save_config_model(cfg: DapsConfig) -> None:
    """Save configuration model to disk."""
    save_config(cfg)


router = APIRouter()


@router.get("/api/config")
async def get_config_route(
    config: DapsConfig = Depends(get_config),
    logger: Any = Depends(get_logger),
    section: Optional[str] = Query(None, description="Optional config section"),
) -> Dict[str, Any]:
    """
    Retrieve configuration data, optionally filtered by section.

    Returns the full configuration or a specific section if requested.
    """
    logger.debug(f"Serving GET /api/config section={section!r}")

    try:
        data = config.model_dump(mode="python")

        if section:
            if section in data:
                return ok(
                    f"Configuration section '{section}' retrieved",
                    {section: data[section]},
                )
            else:
                return error(
                    f"Configuration section '{section}' not found",
                    "SECTION_NOT_FOUND",
                    status_code=404,
                )

        return ok("Configuration retrieved successfully", data)

    except Exception as e:
        logger.error(f"Error retrieving configuration: {e}")
        return error(
            f"Error retrieving configuration: {str(e)}",
            "CONFIG_RETRIEVAL_ERROR",
            status_code=500,
        )


@router.post("/api/config")
async def update_config_route(
    request: Request, logger: Any = Depends(get_logger)
) -> Dict[str, Any]:
    """
    Update configuration with provided data.

    Validates the incoming configuration and saves changes to disk.
    """
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
        config_logger = logger.get_adapter("CONFIG_UPDATE")
        for path, old, new in diffs:
            config_logger.debug(f"Updated: {path} | old={old!r} | new={new!r}")

        updated_config = DapsConfig.model_validate(config_dict)
        save_config(updated_config)

        logger.info("Configuration updated successfully")
        return ok(
            f"Configuration updated with {len(diffs)} changes",
            {"changes_count": len(diffs)},
        )

    except ValueError as e:
        logger.error(f"Configuration validation failed: {e}")
        return error(
            f"Configuration validation failed: {str(e)}",
            "CONFIG_VALIDATION_ERROR",
            status_code=400,
        )
    except Exception as e:
        logger.error(f"Configuration update failed: {e}")
        return error(
            f"Configuration update failed: {str(e)}",
            "CONFIG_UPDATE_ERROR",
            status_code=500,
        )
