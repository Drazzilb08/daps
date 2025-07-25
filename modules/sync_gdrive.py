import json
import os
import re
import shlex
import subprocess
import sys
from shutil import which
from typing import List

from util.config import Config
from util.helper import print_settings
from util.logger import Logger

# Load environment variables from .env file if available
try:
    from dotenv import load_dotenv

    load_dotenv(override=True)
except ImportError:
    pass


class SyncGDrive:
    def __init__(self, config: Config, logger: Logger = None):
        self.config = config
        self.logger = logger or Logger(
            getattr(config, "log_level", "INFO"), config.module_name
        )
        self.rclone_path = self.get_rclone_path()

    def get_rclone_path(self) -> str:
        env_path = os.getenv("RCLONE_PATH")
        if env_path:
            if os.path.isfile(env_path) and os.access(env_path, os.X_OK):
                return env_path
            else:
                raise FileNotFoundError(
                    f"RCLONE_PATH is set to '{env_path}', but it is not an executable file."
                )
        rclone_path = which("rclone")
        if rclone_path is None:
            raise FileNotFoundError(
                "rclone binary not found in PATH. Ensure it is installed and accessible, or set RCLONE_PATH."
            )
        return rclone_path

    def ensure_remote(self):
        """Ensure the rclone remote 'posters' exists by creating it if missing."""
        try:
            self.logger.debug("Ensuring rclone remote 'posters' exists")
            subprocess.run(
                [
                    self.rclone_path,
                    "config",
                    "create",
                    "posters",
                    "drive",
                    "config_is_local=false",
                ],
                check=False,
            )
        except Exception as e:
            self.logger.error(f"Error ensuring rclone remote 'posters' exists: {e}")

    def sync_folder(self, sync_location, sync_id):
        """Run rclone sync for a single folder."""
        if not sync_location or not sync_id:
            self.logger.error("Sync location or GDrive folder ID not provided.")
            return

        try:
            os.makedirs(sync_location, exist_ok=True)
            self.logger.info(f"Ensured sync location exists: {sync_location}")
        except OSError as e:
            self.logger.error(f"Could not create sync location '{sync_location}': {e}")
            return

        cmd = [
            self.rclone_path,
            "sync",
            "--drive-client-id",
            self.config.client_id or "",
            "--drive-client-secret",
            self.config.client_secret or "",
            "--drive-token",
            json.dumps(self.config.token) if self.config.token else "",
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

        if getattr(self.config, "gdrive_sa_location", None):
            cmd.extend(["--drive-service-account-file", self.config.gdrive_sa_location])

        cmd.extend(["posters:", sync_location])

        try:
            self.logger.debug("Running rclone command:")
            self.logger.debug("\n" + " \\\n    ".join(shlex.quote(arg) for arg in cmd))
            process = subprocess.Popen(
                cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
            )
            for line in process.stdout:
                cleaned_line = re.sub(
                    r"^\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2} (INFO|ERROR|DEBUG) *:?",
                    "",
                    line,
                ).strip()
                if cleaned_line:
                    self.logger.info(cleaned_line)
            process.wait()
            if process.returncode == 0:
                self.logger.info("✅ RClone sync completed successfully.")
            else:
                self.logger.error(
                    f"❌ RClone sync failed with return code {process.returncode}"
                )
        except Exception as e:
            self.logger.error(f"Exception occurred while running rclone: {e}")

    def run(self):
        try:
            if getattr(self.config, "log_level", "INFO").lower() == "debug":
                print_settings(self.logger, self.config)

            sync_list: List[dict] = (
                self.config.gdrive_list
                if isinstance(self.config.gdrive_list, list)
                else [self.config.gdrive_list]
            )

            if getattr(self.config, "gdrive_sa_location", None) and not os.path.isfile(
                self.config.gdrive_sa_location
            ):
                self.logger.warning(
                    f"\nGoogle service account file '{self.config.gdrive_sa_location}' does not exist\n"
                    "Please verify the path or remove it from config\n"
                )
                self.config.gdrive_sa_location = None

            self.ensure_remote()

            for sync_item in sync_list:
                sync_location = sync_item.get("location")
                sync_id = sync_item.get("id")
                self.sync_folder(sync_location, sync_id)

        except KeyboardInterrupt:
            print("Keyboard Interrupt detected. Exiting...")
            sys.exit()
        except Exception:
            self.logger.error("\n\nAn error occurred:\n", exc_info=True)
        finally:
            self.logger.log_outro()


def main():
    config = Config("sync_gdrive")
    logger = Logger(getattr(config, "log_level", "INFO"), config.module_name)
    syncer = SyncGDrive(config, logger)
    syncer.run()
