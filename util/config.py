import pathlib
import yaml
import os
import json
from pathlib import Path
from util.utility import *
from copy import deepcopy
from types import SimpleNamespace
import sys


def load_user_config(path: str) -> dict:
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


def merge_with_template(path: str, config: dict) -> dict:
    """
    Merge missing keys from the JSON template into the user's config and save if changed.

    Args:
        path (str): Path to the user's YAML config file.
        config (dict): User's current configuration dictionary.

    Returns:
        dict: Merged configuration dictionary.
    """
    with open(TEMPLATE_PATH, "r") as tf:
        default_cfg = json.load(tf)
    original = deepcopy(config)
    merged = _deep_merge(default_cfg, config)
    if merged != original:
        with open(path, "w") as wf:
            yaml.safe_dump(merged, wf, sort_keys=False)
    return merged


TEMPLATE_PATH = Path(__file__).parent / "template" / "config_template.json"
  


def _deep_merge(default: dict, user: dict) -> dict:
    """
    Recursively merge missing keys from default into user dictionary.

    Args:
        default (dict): Default dictionary from template.
        user (dict): User's current configuration.

    Returns:
        dict: Updated user dictionary with defaults filled in.
    """
    for key, val in default.items():
        if key not in user:
            user[key] = val
        else:
            if isinstance(val, dict) and isinstance(user[key], dict):
                _deep_merge(val, user[key])
    return user


# Determine config file path depending on whether Docker is used
if os.environ.get('DOCKER_ENV'):
    # Use Docker config directory or default to /config
    config_path = os.getenv('CONFIG_DIR', '/config')
    config_file_path = os.path.join(config_path, "config.yml")
else:
    config_dir = pathlib.Path(__file__).parents[1] / "config"
    config_dir.mkdir(parents=True, exist_ok=True)
    config_file_path = config_dir / "config.yml"

# Bootstrap config file from JSON template if missing
if not os.path.exists(config_file_path):
    from json import load as _json_load
    with open(TEMPLATE_PATH, 'r') as tf:
        default_cfg = _json_load(tf)
    with open(config_file_path, 'w') as wf:
        yaml.safe_dump(default_cfg, wf, sort_keys=False)


class Config:
    """
    Manages loading and accessing configuration for a given module.
    Supports merging defaults and provides module-specific configuration access.
    """

    def __init__(self, module_name: str, merge_defaults: bool = False) -> None:
        """
        Initialize Config with module name and optional merging of default keys.

        Args:
            module_name (str): Name of the module requesting configuration.
            merge_defaults (bool): If True, merge missing keys from template and save.
        """
        self.config_path: str = config_file_path
        self.module_name: str = module_name
        self.merge_defaults: bool = merge_defaults
        self.load_config()

    def load_config(self) -> None:
        """
        Load the YAML configuration, optionally merging missing keys from template.
        Sets attributes for scheduler, discord, notifications, instances, and module config.
        """
        try:
            config = load_user_config(self.config_path)
            if self.merge_defaults:
                config = merge_with_template(self.config_path, config)
        except Exception:
            return

        self._config = config

        if 'schedule' not in config:
            print("[CONFIG] Warning: 'schedule' key missing in config; defaulting to empty schedule")
        self.scheduler = config.get('schedule', {})
        self.discord = config.get('discord', {})
        self.notifications = config.get('notifications', [])
        if 'instances' not in config:
            sys.stderr.write(f"[CONFIG] Missing 'instances' key! Config keys: {list(config.keys())}\n")
        self.instances_config = config.get('instances', {})

        if self.module_name:
            self.module_config = self._config.get(self.module_name, {})
            self.module_config = SimpleNamespace(**self.module_config)
            self.module_config.module_name = self.module_name
            module_notifications = self._config.get("notifications", {}).get(self.module_name, {})
            setattr(self.module_config, "notifications", module_notifications)
            return
