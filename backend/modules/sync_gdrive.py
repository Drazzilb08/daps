# modules/sync_gdrive.py

import json
import os
import re
import shlex
import subprocess
import sys
import time
from shutil import which
from typing import List, Optional

from backend.util.base_module import DapsModule
from backend.util.database import DapsDB
from backend.util.helper import print_settings
from backend.util.logger import Logger

try:
    from dotenv import load_dotenv

    load_dotenv(override=True)
except ImportError:
    pass


class SyncGDrive(DapsModule):
    def __init__(self, logger: Optional[Logger] = None) -> None:
        super().__init__(logger)
        self.rclone_path = self.get_rclone_path()
        self.db = None
        # Track current job ID for progress updates
        self.current_job_id = None

    def set_job_id(self, job_id):
        """Set the current job ID for progress tracking"""
        self.current_job_id = job_id

    def parse_rclone_progress(self, line):
        """
        Extract percent progress from rclone --stats output line.
        Returns integer percent or None.
        """
        # Typical: Transferred:    1.234 GiB / 8.000 GiB, 15%, 1.23 MiB/s, ETA 01:36:20
        match = re.search(
            r"Transferred:.*?([\d.]+\s\w+) / ([\d.]+\s\w+),\s*(\d+)%", line
        )
        if match:
            return int(match.group(3))
        # Alternate: Transferred:  14 / 100, 14%
        match2 = re.search(r"Transferred:\s+\d+ / \d+,\s*(\d+)%", line)
        if match2:
            return int(match2.group(1))
        return None

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

    def sync_folder(self, sync_location, sync_id, progress_cb=lambda pct: None):
        """Run rclone sync for a single folder."""
        if not sync_location or not sync_id:
            self.logger.error("Sync location or GDrive folder ID not provided.")
            progress_cb(100)
            return

        try:
            os.makedirs(sync_location, exist_ok=True)
            self.logger.info(f"Ensured sync location exists: {sync_location}")
        except OSError as e:
            self.logger.error(f"Could not create sync location '{sync_location}': {e}")
            progress_cb(100)
            return

        # Starting sync
        progress_cb(10)
        # FIXED: Direct call to update_progress, no redundant wrapper
        if self.current_job_id and self.db:
            try:
                self.db.worker.update_progress("jobs", self.current_job_id, 10)
            except Exception as e:
                self.logger.debug(f"Failed to update progress: {e}")

        last_pct = [10]

        def guarded_progress_cb(pct):
            if pct > last_pct[0]:
                progress_cb(pct)
                # FIXED: Direct call to update_progress, no redundant wrapper
                if self.current_job_id and self.db:
                    try:
                        self.db.worker.update_progress("jobs", self.current_job_id, pct)
                    except Exception as e:
                        self.logger.debug(f"Failed to update progress: {e}")
                last_pct[0] = pct

        cmd = [
            self.rclone_path,
            "sync",
            "--drive-client-id",
            self.config.client_id or "",
            "--drive-client-secret",
            self.config.client_secret or "",
            "--drive-token",
            (
                json.dumps(
                    self.config.token.model_dump()
                    if hasattr(self.config.token, "model_dump")
                    else dict(self.config.token)
                )
                if self.config.token
                else ""
            ),
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
            "--stats=1s",
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
                    pct = self.parse_rclone_progress(cleaned_line)
                    if pct is not None:
                        guarded_progress_cb(pct)
            process.wait()
            if process.returncode == 0:
                self.logger.info("✅ RClone sync completed successfully.")
                progress_cb(95)
                if self.current_job_id and self.db:
                    try:
                        self.db.worker.update_progress("jobs", self.current_job_id, 95)
                    except Exception as e:
                        self.logger.debug(f"Failed to update progress: {e}")
            else:
                self.logger.error(
                    f"❌ RClone sync failed with return code {process.returncode}"
                )
                progress_cb(100)
                if self.current_job_id and self.db:
                    try:
                        self.db.worker.update_progress("jobs", self.current_job_id, 100)
                    except Exception as e:
                        self.logger.debug(f"Failed to update progress: {e}")
        except Exception as e:
            self.logger.error(f"Exception occurred while running rclone: {e}")
            progress_cb(100)
            if self.current_job_id and self.db:
                try:
                    self.db.worker.update_progress("jobs", self.current_job_id, 100)
                except Exception as e:
                    self.logger.debug(f"Failed to update progress: {e}")

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
        # Use quiet mode for stats gathering
        with DapsDB(logger=self.logger, quiet=True) as db:
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
                db.stats.upsert_gdrive_stat(
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

    def sync_folder_adhoc(
        self, gdrive_name: str, progress_cb=lambda pct: None, job_id=None
    ):
        """
        Sync a single GDrive folder (by its config 'name') on demand.

        Args:
            gdrive_name: Name of the GDrive folder to sync
            progress_cb: Progress callback function
            job_id: Job ID for progress tracking

        Returns:
            bool: Success status
        """
        try:
            # Set job ID for progress tracking
            if job_id:
                self.set_job_id(job_id)

            with DapsDB(logger=self.logger) as self.db:
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

                        progress_cb(5)  # Starting ad-hoc sync
                        if self.current_job_id and self.db:
                            try:
                                self.db.worker.update_progress(
                                    "jobs", self.current_job_id, 5
                                )
                            except Exception as e:
                                self.logger.debug(f"Failed to update progress: {e}")

                        self.sync_folder(
                            sync_location, sync_id, progress_cb=progress_cb
                        )

                        # GATHER STATS AND UPSERT
                        progress_cb(90)
                        if self.current_job_id and self.db:
                            try:
                                self.db.worker.update_progress(
                                    "jobs", self.current_job_id, 90
                                )
                            except Exception as e:
                                self.logger.debug(f"Failed to update progress: {e}")

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
                        progress_cb(100)
                        if self.current_job_id and self.db:
                            try:
                                self.db.worker.update_progress(
                                    "jobs", self.current_job_id, 100
                                )
                            except Exception as e:
                                self.logger.debug(f"Failed to update progress: {e}")
                        return True
                self.logger.error(
                    f"GDrive name '{gdrive_name}' not found in config.gdrive_list."
                )
                progress_cb(100)
                if self.current_job_id and self.db:
                    try:
                        self.db.worker.update_progress("jobs", self.current_job_id, 100)
                    except Exception as e:
                        self.logger.debug(f"Failed to update progress: {e}")
                return False
        except KeyboardInterrupt:
            print("Keyboard Interrupt detected. Exiting...")
            sys.exit()
        except Exception as exc:
            self.logger.error(f"\n\nAn error occurred: {exc}\n", exc_info=True)
            progress_cb(100)
            if self.current_job_id and self.db:
                try:
                    self.db.worker.update_progress("jobs", self.current_job_id, 100)
                except Exception as e:
                    self.logger.debug(f"Failed to update progress: {e}")

    def run(self, progress_cb=lambda pct: None):
        try:
            with DapsDB(logger=self.logger) as self.db:
                if self.config.log_level.lower() == "debug":
                    print_settings(self.logger, self.config)

                sync_list: List[dict] = (
                    self.config.gdrive_list
                    if isinstance(self.config.gdrive_list, list)
                    else [self.config.gdrive_list]
                )

                if getattr(
                    self.config, "gdrive_sa_location", None
                ) and not os.path.isfile(self.config.gdrive_sa_location):
                    self.logger.warning(
                        f"\nGoogle service account file '{self.config.gdrive_sa_location}' does not exist\n"
                        "Please verify the path or remove it from config\n"
                    )
                    self.config.gdrive_sa_location = None

                self.ensure_remote()
                total = len(sync_list)

                for idx, sync_item in enumerate(sync_list, 1):
                    progress_pct = int(10 + 80 * (idx - 1) / total)
                    progress_cb(progress_pct)  # Start for each
                    if self.current_job_id and self.db:
                        try:
                            self.db.worker.update_progress(
                                "jobs", self.current_job_id, progress_pct
                            )
                        except Exception as e:
                            self.logger.debug(f"Failed to update progress: {e}")

                    sync_location = sync_item.location
                    sync_id = sync_item.id
                    self.sync_folder(sync_location, sync_id, progress_cb=progress_cb)

                    # GATHER STATS AND UPSERT
                    progress_pct = int(10 + 80 * (idx - 0.5) / total)
                    progress_cb(progress_pct)
                    if self.current_job_id and self.db:
                        try:
                            self.db.worker.update_progress(
                                "jobs", self.current_job_id, progress_pct
                            )
                        except Exception as e:
                            self.logger.debug(f"Failed to update progress: {e}")

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

                    progress_pct = int(10 + 80 * idx / total)
                    progress_cb(progress_pct)  # Step up after folder done
                    if self.current_job_id and self.db:
                        try:
                            self.db.worker.update_progress(
                                "jobs", self.current_job_id, progress_pct
                            )
                        except Exception as e:
                            self.logger.debug(f"Failed to update progress: {e}")

                progress_cb(100)
                if self.current_job_id and self.db:
                    try:
                        self.db.worker.update_progress("jobs", self.current_job_id, 100)
                    except Exception as e:
                        self.logger.debug(f"Failed to update progress: {e}")
        except KeyboardInterrupt:
            print("Keyboard Interrupt detected. Exiting...")
            sys.exit()
        except Exception as exc:
            self.logger.error(f"\n\nAn error occurred: {exc}\n", exc_info=True)
            progress_cb(100)
            if self.current_job_id and self.db:
                try:
                    self.db.worker.update_progress("jobs", self.current_job_id, 100)
                except Exception as e:
                    self.logger.debug(f"Failed to update progress: {e}")
