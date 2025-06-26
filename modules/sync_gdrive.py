import json
import os
import re
import shlex
import subprocess
import sys
from shutil import which
from types import SimpleNamespace
from typing import List, Optional

from util.logger import Logger
from util.utility import print_settings

# Load environment variables from .env file if available
try:
    from dotenv import load_dotenv

    load_dotenv(override=True)
except ImportError:
    pass


def get_rclone_path() -> str:
    """Find the full path to the rclone binary, checking RCLONE_PATH env var first."""
    # Allow override via environment variable
    env_path = os.getenv("RCLONE_PATH")
    if env_path:
        if os.path.isfile(env_path) and os.access(env_path, os.X_OK):
            return env_path
        else:
            raise FileNotFoundError(
                f"RCLONE_PATH is set to '{env_path}', but it is not an executable file."
            )
    # Fallback to searching in PATH
    rclone_path = which("rclone")
    if rclone_path is None:
        raise FileNotFoundError(
            "rclone binary not found in PATH. Ensure it is installed and accessible, or set RCLONE_PATH."
        )
    return rclone_path


def run_rclone(config: SimpleNamespace, logger: Logger) -> None:
    """Run rclone sync for each configured Google Drive folder and log output."""
    sync_list: List[dict] = (
        config.gdrive_list
        if isinstance(config.gdrive_list, list)
        else [config.gdrive_list]
    )
    rclone_path = get_rclone_path()
    logger.debug(f"Using rclone binary at: {rclone_path}")

    if config.gdrive_sa_location and not os.path.isfile(config.gdrive_sa_location):
        logger.warning(
            f"\nGoogle service account file '{config.gdrive_sa_location}' does not exist\n"
            "Please verify the path or remove it from config\n"
        )
        config.gdrive_sa_location = None

    # Ensure rclone remote 'posters' exists by creating it if missing
    try:
        logger.debug("Ensuring rclone remote 'posters' exists")
        subprocess.run(
            [
                rclone_path,
                "config",
                "create",
                "posters",
                "drive",
                "config_is_local=false",
            ],
            check=False,
        )
    except Exception as e:
        logger.error(f"Error ensuring rclone remote 'posters' exists: {e}")

    for sync_item in sync_list:
        sync_location: Optional[str] = sync_item.get("location")
        sync_id: Optional[str] = sync_item.get("id")

        if not sync_location or not sync_id:
            logger.error("Sync location or GDrive folder ID not provided.")
            continue

        # Ensure local sync directory exists
        try:
            os.makedirs(sync_location, exist_ok=True)
            logger.info(f"Ensured sync location exists: {sync_location}")
        except OSError as e:
            logger.error(f"Could not create sync location '{sync_location}': {e}")
            continue

        # Build rclone command with necessary flags and credentials
        cmd = [
            rclone_path,
            "sync",
            "--drive-client-id",
            config.client_id or "",
            "--drive-client-secret",
            config.client_secret or "",
            "--drive-token",
            json.dumps(config.token) if config.token else "",
            "--drive-root-folder-id",
            sync_id,
            "--fast-list",
            "--tpslimit=5",
            "--no-update-modtime",
            "--drive-use-trash=false",
            "--drive-chunk-size=512M",
            "--exclude=**.partial",
            "--check-first",
            "--bwlimit=80M",
            "--size-only",
            "--delete-after",
            "-v",
        ]

        if config.gdrive_sa_location:
            cmd.extend(["--drive-service-account-file", config.gdrive_sa_location])

        cmd.extend(["posters:", sync_location])

        try:
            logger.debug("Running rclone command:")
            logger.debug("\n" + " \\\n    ".join(shlex.quote(arg) for arg in cmd))
            process = subprocess.Popen(
                cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
            )
            for line in process.stdout:
                # Clean rclone output by removing timestamp and log level prefixes
                cleaned_line = re.sub(
                    r"^\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2} (INFO|ERROR|DEBUG) *:?",
                    "",
                    line,
                ).strip()
                if cleaned_line:
                    logger.info(cleaned_line)
            process.wait()
            if process.returncode == 0:
                logger.info("✅ RClone sync completed successfully.")
            else:
                logger.error(
                    f"❌ RClone sync failed with return code {process.returncode}"
                )
        except Exception as e:
            logger.error(f"Exception occurred while running rclone: {e}")


def main(config: SimpleNamespace, logger: Optional[Logger] = None) -> None:
    """Initialize logger, optionally print config in debug mode, and run rclone sync."""
    logger = Logger(config.log_level, config.module_name)
    try:
        if config.log_level.lower() == "debug":
            print_settings(logger, config)
        run_rclone(config, logger)
    except KeyboardInterrupt:
        print("Keyboard Interrupt detected. Exiting...")
        sys.exit()
    except Exception:
        logger.error("\n\nAn error occurred:\n", exc_info=True)
        logger.error("\n\n")
    finally:
        # Log outro message with run time
        logger.log_outro()
