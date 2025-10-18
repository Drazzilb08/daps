import os
import pathlib
import sys
from typing import Any, Dict, List, Optional, Union

import yaml
from pydantic import BaseModel, Field, ValidationError

# ==== SECTION: MODELS FOR CONFIG STRUCTURE ====


class GDriveListEntry(BaseModel):
    id: Optional[str] = ""
    location: Optional[str] = ""
    name: Optional[str] = ""


class SyncGDriveToken(BaseModel):
    access_token: Optional[str] = ""
    token_type: Optional[str] = ""
    refresh_token: Optional[str] = ""
    expiry: Optional[str] = ""


class SyncGDriveConfig(BaseModel):
    log_level: str = "info"
    client_id: str = ""
    client_secret: str = ""
    token: Union[str, SyncGDriveToken, None] = ""
    gdrive_sa_location: Optional[str] = Field(default=None)
    gdrive_list: List[GDriveListEntry] = Field(default_factory=list)


class InstanceDetail(BaseModel):
    url: Optional[str] = ""
    api: Optional[str] = ""


class InstancesConfig(BaseModel):
    radarr: Dict[str, InstanceDetail] = Field(default_factory=dict)
    sonarr: Dict[str, InstanceDetail] = Field(default_factory=dict)
    plex: Dict[str, InstanceDetail] = Field(default_factory=dict)


class PosterRenamerrPlexInstance(BaseModel):
    library_names: List[str] = Field(default_factory=list)
    add_posters: Optional[bool] = False


class PosterRenamerrConfig(BaseModel):
    log_level: str = "info"
    dry_run: bool = False
    sync_posters: bool = False
    action_type: str = "copy"
    asset_folders: bool = False
    print_only_renames: bool = False
    run_border_replacerr: bool = False
    incremental_border_replacerr: bool = False
    run_cleanarr: bool = False
    report_unmatched_assets: bool = False
    source_dirs: List[str] = Field(default_factory=list)
    destination_dir: str = ""
    instances: List[Union[str, Dict[str, PosterRenamerrPlexInstance]]] = Field(
        default_factory=list
    )


class BorderHoliday(BaseModel):
    name: str
    schedule: str
    colors: List[str] = Field(default_factory=list)


class BorderReplacerrConfig(BaseModel):
    log_level: str = "info"
    dry_run: bool = False
    source_dirs: List[str] = Field(default_factory=list)
    destination_dir: str = ""
    border_width: int = 26
    skip: bool = False
    exclusion_list: Optional[List[str]] = None
    border_colors: List[str] = Field(default_factory=list)
    holidays: List[BorderHoliday] = Field(default_factory=list)


class UpgradinatorrInstance(BaseModel):
    instance: str = ""
    count: int = 0
    tag_name: str = ""
    ignore_tag: str = ""
    unattended: bool = False
    season_monitored_threshold: Optional[float] = None


class UpgradinatorrConfig(BaseModel):
    log_level: str = "info"
    dry_run: bool = False
    instances_list: List[UpgradinatorrInstance] = Field(default_factory=list)


class RenameinatorrConfig(BaseModel):
    log_level: str = "info"
    dry_run: bool = False
    rename_folders: bool = True
    count: Union[int, str] = 100
    radarr_count: int = 0
    sonarr_count: int = 0
    tag_name: str = ""
    ignore_tags: str = ""
    enable_batching: bool = False
    instances: List[str] = Field(default_factory=list)


class NohlSourceDir(BaseModel):
    path: str
    mode: str


class NohlConfig(BaseModel):
    log_level: str = "info"
    dry_run: bool = False
    searches: int = 10
    print_files: bool = False
    source_dirs: List[Union[str, NohlSourceDir]] = Field(default_factory=list)
    exclude_profiles: List[str] = Field(default_factory=list)
    exclude_movies: List[str] = Field(default_factory=list)
    exclude_series: List[str] = Field(default_factory=list)
    instances: List[str] = Field(default_factory=list)


class LabelarrPlexInstance(BaseModel):
    instance: str = ""
    library_names: List[str] = Field(default_factory=list)


class LabelarrMapping(BaseModel):
    app_instance: str = ""
    labels: Union[List[str], str] = Field(default_factory=list)
    plex_instances: List[LabelarrPlexInstance] = Field(default_factory=list)


class LabelarrConfig(BaseModel):
    log_level: str = "info"
    dry_run: bool = False
    mappings: List[LabelarrMapping] = Field(default_factory=list)


class HealthCheckarrConfig(BaseModel):
    log_level: str = "info"
    dry_run: bool = False
    instances: Optional[List[str]] = None


class JduparrConfig(BaseModel):
    log_level: str = "info"
    dry_run: bool = False
    source_dirs: Optional[List[str]] = None


class UserInterfaceConfig(BaseModel):
    theme: str = "dark"


class GeneralConfig(BaseModel):
    log_level: str = "info"
    update_notifications: bool = False
    max_logs: int = 9


class UnmatchedAssetsConfig(BaseModel):
    log_level: str = "info"
    dry_run: bool = False
    ignore_folders: List[str] = Field(default_factory=list)
    ignore_profles: List[str] = Field(default_factory=list)
    ignore_titles: List[str] = Field(default_factory=list)
    ignore_tags: List[str] = Field(default_factory=list)
    instances: List[str] = Field(default_factory=list)


# Notifications is a dict of module_name to dicts (arbitrary structure, so keep Any)
class ConfigNotifications(BaseModel):
    poster_renamerr: Optional[Dict[str, Any]] = Field(default_factory=dict)
    poster_cleanarr: Optional[Dict[str, Any]] = Field(default_factory=dict)
    unmatched_assets: Optional[Dict[str, Any]] = Field(default_factory=dict)
    health_checkarr: Optional[Dict[str, Any]] = Field(default_factory=dict)
    labelarr: Optional[Dict[str, Any]] = Field(default_factory=dict)
    upgradinatorr: Optional[Dict[str, Any]] = Field(default_factory=dict)
    renameinatorr: Optional[Dict[str, Any]] = Field(default_factory=dict)
    nohl: Optional[Dict[str, Any]] = Field(default_factory=dict)
    jduparr: Optional[Dict[str, Any]] = Field(default_factory=dict)
    main: Optional[Dict[str, Any]] = Field(default_factory=dict)


# ==== ROOT CONFIG MODEL ====


class DapsConfig(BaseModel):
    schedule: Dict[str, Any] = Field(default_factory=dict)
    instances: InstancesConfig = Field(default_factory=InstancesConfig)
    notifications: ConfigNotifications = Field(default_factory=ConfigNotifications)
    sync_gdrive: SyncGDriveConfig = Field(default_factory=SyncGDriveConfig)
    unmatched_assets: UnmatchedAssetsConfig = Field(
        default_factory=UnmatchedAssetsConfig
    )
    poster_renamerr: PosterRenamerrConfig = Field(default_factory=PosterRenamerrConfig)
    border_replacerr: BorderReplacerrConfig = Field(
        default_factory=BorderReplacerrConfig
    )
    upgradinatorr: UpgradinatorrConfig = Field(default_factory=UpgradinatorrConfig)
    renameinatorr: RenameinatorrConfig = Field(default_factory=RenameinatorrConfig)
    nohl: NohlConfig = Field(default_factory=NohlConfig)
    labelarr: LabelarrConfig = Field(default_factory=LabelarrConfig)
    health_checkarr: HealthCheckarrConfig = Field(default_factory=HealthCheckarrConfig)
    jduparr: JduparrConfig = Field(default_factory=JduparrConfig)
    user_interface: UserInterfaceConfig = Field(default_factory=UserInterfaceConfig)
    general: GeneralConfig = Field(default_factory=GeneralConfig)


# ==== CONFIG LOADER ====


def get_config_path() -> str:
    """Get configuration file path from environment or default location."""
    config_dir = os.environ.get("CONFIG_DIR") or str(
        pathlib.Path(__file__).parent.parent.parent / "config"
    )
    config_file_path = os.path.join(config_dir, "config.yml")
    return config_file_path


def _print_cli_validation_errors(validation_error: ValidationError) -> None:
    """Print simplified validation errors for CLI users."""
    print("❌ Configuration validation failed:")
    for error in validation_error.errors():
        location = " -> ".join(str(loc) for loc in error["loc"])
        msg = error["msg"]

        # Simplify common error messages
        if "field required" in msg:
            msg = "missing required field"
        elif "not a valid integer" in msg:
            msg = "must be a number"
        elif "not a valid boolean" in msg:
            msg = "must be true or false"
        elif "not a valid string" in msg:
            msg = "must be text"
        elif "invalid or missing URL scheme" in msg:
            msg = "must be a valid URL (http:// or https://)"

        print(f"   • {location}: {msg}")
    print("💡 Check your config.yml file and fix the issues above")


def load_config(path: Optional[str] = None) -> DapsConfig:
    """
    Load configuration with CLI-focused validation.
    GUI users get validation in the UI layer.
    """
    config_path = path or get_config_path()

    # Check if file exists
    if not os.path.exists(config_path):
        print(f"❌ Configuration file not found: {config_path}")
        print("💡 Create a config.yml file in the config directory")
        sys.exit(1)

    try:
        with open(config_path, "r") as f:
            raw = yaml.safe_load(f)
    except yaml.YAMLError as e:
        print(f"❌ Invalid YAML syntax in {config_path}")
        print(f"💡 Check your YAML formatting: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Failed to read {config_path}: {e}")
        sys.exit(1)

    if raw is None:
        print(f"❌ Configuration file is empty: {config_path}")
        print(f"💡 Add your configuration settings to {config_path}")
        sys.exit(1)

    try:
        # Pydantic v2
        return DapsConfig.model_validate(raw)
    except ValidationError as e:
        _print_cli_validation_errors(e)
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected configuration error: {e}")
        sys.exit(1)


def save_config(config: DapsConfig, path: Optional[str] = None) -> None:
    """Save configuration to YAML file."""
    config_path = path or get_config_path()
    try:
        with open(config_path, "w") as f:
            yaml.safe_dump(config.model_dump(mode="python"), f, sort_keys=False)
    except Exception as e:
        print(f"❌ Failed to save configuration: {e}")
        raise
