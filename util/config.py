import os
import sys
import json
import pathlib
from copy import deepcopy
from types import SimpleNamespace
from typing import Any, Dict, List, Tuple

import yaml

from util.logger import Logger


class Config:
    """Manages loading and accessing configuration for a given module."""

    def __init__(self, module_name: str) -> None:
        """
        Initialize Config with module name.

        Args:
            module_name (str): Name of the module requesting configuration.
        """
        self.config_path: str = config_file_path
        self.module_name: str = module_name
        self.load_config()

    def load_config(self) -> None:
        """
        Load the YAML configuration and set attributes for scheduler, discord,
        notifications, instances, and module config.
        """
        try:
            config = load_user_config(self.config_path)
        except Exception:
            return

        self._config = config

        if "schedule" not in config:
            print(
                "[CONFIG] Warning: 'schedule' key missing in config; defaulting to empty schedule"
            )
        self.scheduler = config.get("schedule", {})
        self.discord = config.get("discord", {})
        self.notifications = config.get("notifications", [])
        if "instances" not in config:
            sys.stderr.write(
                f"[CONFIG] Missing 'instances' key! Config keys: {list(config.keys())}\n"
            )
        self.instances_config = config.get("instances", {})

        if self.module_name:
            self.module_config = self._config.get(self.module_name, {})
            self.module_config = SimpleNamespace(**self.module_config)
            self.module_config.module_name = self.module_name
            module_notifications = self._config.get("notifications", {}).get(
                self.module_name, {}
            )
            setattr(self.module_config, "notifications", module_notifications)
            return


def load_user_config(path: str) -> Dict[str, Any]:
    """
    Load YAML configuration from the specified file path.

    Args:
        path (str): Path to the YAML configuration file.

    Returns:
        dict: Parsed configuration dictionary, or empty dict if file is missing or invalid.
    """
    try:
        with open(path, "r") as f:
            raw = f.read()
        data = yaml.safe_load(raw)
        return data or {}
    except FileNotFoundError:
        sys.stderr.write("[CONFIG] config file not found\n")
        return {}
    except yaml.YAMLError as e:
        sys.stderr.write(f"[CONFIG] Error parsing config file: {e}\n")
        print(f"Error parsing config file: {e}")
        return {}


TEMPLATE_PATH = pathlib.Path(__file__).parent / "template" / "config_template.json"
if os.environ.get("DOCKER_ENV"):
    config_dir = os.getenv("CONFIG_DIR", "/config")
    config_file_path = os.path.join(config_dir, "config.yml")
else:
    config_dir = pathlib.Path(__file__).parents[1] / "config"
    config_dir.mkdir(parents=True, exist_ok=True)
    config_file_path = config_dir / "config.yml"

if not os.path.exists(config_file_path):
    from json import load as _json_load

    with open(TEMPLATE_PATH, "r") as tf:
        default_cfg = _json_load(tf)
    with open(config_file_path, "w") as wf:
        yaml.safe_dump(default_cfg, wf, sort_keys=False)


def _reconcile_config_data(
    template_data: Dict[str, Any], user_data: Dict[str, Any]
) -> Tuple[Dict[str, Any], List[str], List[str]]:
    """
    Recursively reconcile user configuration with a template.

    Args:
        template_data (dict): Template configuration dictionary.
        user_data (dict): User configuration dictionary.

    Returns:
        Tuple containing reconciled dictionary, list of added keys, and list of removed keys.
    """
    reconciled_dict: Dict[str, Any] = {}
    added_keys: List[str] = []
    removed_keys: List[str] = []

    for key, template_value in template_data.items():
        if key in user_data:
            user_value = user_data[key]
            if isinstance(template_value, dict):
                if isinstance(user_value, dict):
                    if not template_value:
                        reconciled_dict[key] = deepcopy(user_value)
                    else:
                        rec, add, rem = _reconcile_config_data(
                            template_value, user_value
                        )
                        reconciled_dict[key] = rec
                        added_keys.extend([f"{key}.{k}" for k in add])
                        removed_keys.extend([f"{key}.{k}" for k in rem])
                else:
                    reconciled_dict[key] = deepcopy(template_value)
            else:
                reconciled_dict[key] = user_value
        else:
            reconciled_dict[key] = deepcopy(template_value)
            added_keys.append(key)

    for key in user_data.keys():
        if key not in template_data:
            removed_keys.append(key)
    return reconciled_dict, added_keys, removed_keys


def manage_config(logger: Logger) -> None:
    """
    Update user's config.yml based on config_template.json.

    Logs keys that are added or removed.

    Args:
        logger (Logger): Logger instance for logging messages.
    """
    global TEMPLATE_PATH, config_file_path
    try:
        with open(TEMPLATE_PATH, "r", encoding="utf-8") as f:
            template_data = json.load(f)
    except FileNotFoundError:
        logger.error(
            f"[CONFIG] Template configuration file not found at {TEMPLATE_PATH}"
        )
        return
    except json.JSONDecodeError as e:
        logger.error(
            f"[CONFIG] Could not parse template configuration file {TEMPLATE_PATH}: {e}"
        )
        return

    user_data: Dict[str, Any] = {}
    if os.path.exists(config_file_path):
        try:
            with open(config_file_path, "r", encoding="utf-8") as f:
                user_data = yaml.safe_load(f) or {}
        except yaml.YAMLError as e:
            logger.error(
                f"[CONFIG] Could not parse user configuration file {config_file_path}: {e}"
            )
            logger.warning(
                "[CONFIG] Proceeding with an empty user configuration for reconciliation."
            )
    if not isinstance(user_data, dict):
        logger.warning(
            f"User configuration at {config_file_path} is not a dictionary. Treating as empty."
        )
        user_data = {}

    reconciled_data, added_keys, removed_keys = _reconcile_config_data(
        template_data, user_data
    )

    try:
        with open(config_file_path, "w", encoding="utf-8") as f:
            yaml.safe_dump(
                reconciled_data,
                f,
                sort_keys=False,
                indent=2,
                default_flow_style=False,
                allow_unicode=True,
            )
        logger.info(
            f"[CONFIG] Configuration file {config_file_path} updated successfully based on template."
        )
        if added_keys:
            logger.info(f"[CONFIG] Keys ADDED to config: {added_keys}")
        if removed_keys:
            logger.info(f"[CONFIG] Keys REMOVED from config: {removed_keys}")
    except IOError as e:
        logger.error(
            f"[CONFIG] Could not write to configuration file {config_file_path}: {e}"
        )
