import json
import os
import re
import shlex
import subprocess
import sys
import time
from shutil import which
from typing import List

from util.config import DapsConfig, load_config
from util.database import DapsDB
from util.helper import print_settings
from util.logger import Logger

# Load environment variables from .env file if available
try:
    from dotenv import load_dotenv

    load_dotenv(override=True)
except ImportError:
    pass


class SyncGDrive:
    def __init__(self, logger: Logger = None, config: DapsConfig = None):
        self.full_config = config or load_config()
        self.config = self.full_config.sync_gdrive
        self.logger = logger or Logger(self.config.log_level, "sync_gdrive")
        self.rclone_path = self.get_rclone_path()
        self.db = DapsDB()

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

    def gather_folder_stats(self, folder_path):
        """
        Returns (file_count, size_bytes, last_updated) for all files under folder_path.
        last_updated is the most recent mtime (as ISO string), or '' if no files.
        """
        file_count = 0
        size_bytes = 0
        latest_mtime = 0
        for root, dirs, files in os.walk(folder_path):
            for fname in files:
                try:
                    fpath = os.path.join(root, fname)
                    stat = os.stat(fpath)
                    file_count += 1
                    size_bytes += stat.st_size
                    if stat.st_mtime > latest_mtime:
                        latest_mtime = stat.st_mtime
                except Exception:
                    continue
        last_updated = (
            time.strftime("%Y%m%d", time.localtime(latest_mtime))
            if latest_mtime
            else ""
        )
        return file_count, size_bytes, last_updated

    def refresh_all_poster_stats(self):
        """
        Gather stats and upsert for all gdrive entries in config.gdrive_list.
        """
        sync_list = (
            self.config.gdrive_list
            if isinstance(self.config.gdrive_list, list)
            else [self.config.gdrive_list]
        )
        for sync_item in sync_list:
            owner = sync_item.name
            sync_location = sync_item.location
            file_count, size_bytes, last_updated = self.gather_folder_stats(
                sync_location
            )
            self.db.stats.upsert_gdrive_stat(
                location=sync_location,
                folder_name=owner,
                owner=owner,
                file_count=file_count,
                size_bytes=size_bytes,
                last_updated=last_updated,
            )
            self.logger.debug(
                f"Updated gdrive_stats for {sync_location}: "
                f"{file_count} files, {size_bytes} bytes, last updated {last_updated}"
            )

    def sync_folder_adhoc(self, gdrive_name: str):
        """
        Sync a single GDrive folder (by its config 'name') on demand.
        """
        try:
            sync_list = (
                self.config.gdrive_list
                if isinstance(self.config.gdrive_list, list)
                else [self.config.gdrive_list]
            )
            for sync_item in sync_list:
                owner = sync_item.name
                if owner == gdrive_name:
                    sync_location = sync_item.location
                    sync_id = sync_item.id
                    self.sync_folder(sync_location, sync_id)
                    file_count, size_bytes, last_updated = self.gather_folder_stats(
                        sync_location
                    )
                    self.db.stats.upsert_gdrive_stat(
                        location=sync_location,
                        folder_name=owner,
                        owner=owner,
                        file_count=file_count,
                        size_bytes=size_bytes,
                        last_updated=last_updated,
                    )
                    self.logger.info(
                        f"Synced and updated gdrive_stats for {sync_location}: "
                        f"{file_count} files, {size_bytes} bytes, last updated {last_updated}"
                    )
                    return True
            self.logger.error(
                f"GDrive name '{gdrive_name}' not found in config.gdrive_list."
            )
            return False
        except Exception as exc:
            self.logger.error(f"\n\nAn error occurred: {exc}\n", exc_info=True)

    def run(self):
        try:
            if self.config.log_level.lower() == "debug":
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
                sync_location = sync_item.location
                sync_id = sync_item.id
                self.sync_folder(sync_location, sync_id)

                # GATHER STATS AND UPSERT
                file_count, size_bytes, last_updated = self.gather_folder_stats(
                    sync_location
                )
                owner = sync_item.name
                self.db.stats.upsert_gdrive_stat(
                    location=sync_location,
                    folder_name=owner,
                    owner=owner,
                    file_count=file_count,
                    size_bytes=size_bytes,
                    last_updated=last_updated,
                )
                self.logger.info(
                    f"Updated gdrive_stats for {sync_location}: {file_count} files, {size_bytes} bytes, last updated {last_updated}"
                )

        except KeyboardInterrupt:
            print("Keyboard Interrupt detected. Exiting...")
            sys.exit()
        except Exception as exc:
            self.logger.error(f"\n\nAn error occurred: {exc}\n", exc_info=True)
        finally:
            self.db.close_all()
            self.logger.log_outro()
