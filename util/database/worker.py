import datetime
import json
import signal
import threading
import time
from dataclasses import dataclass
from enum import Enum
from typing import Any, Callable, Dict, Optional

# FIXED: Only import non-circular dependencies at module level
# Modules that import util.database must be imported inside functions to avoid circular imports
from .db_base import DatabaseBase


class JobStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    ERROR = "error"


@dataclass
class JobResult:
    status: int
    success: bool
    message: str
    error_code: Optional[str] = None
    data: Optional[Dict] = None


class DBWorker(DatabaseBase):
    """
    Simplified DB-backed job worker
    """

    def __init__(
        self,
        db_path,
        logger,
        poll_interval: int = 2,
        num_workers: int = 3,
        worker_name: str = "UNNAMED",
        job_type_filter: str = None,
        cleanup_interval: int = 3600,
        job_deletion_days: int = 30,
        max_retry_delay: int = 300,
    ):
        super().__init__(logger, db_path)
        self.logger = logger
        self.worker_name = worker_name
        self.job_type_filter = job_type_filter
        self.poll_interval = poll_interval
        self.running = False
        self.max_retry_delay = max_retry_delay

        # Threading
        self._threads = []
        self._cleanup_thread = None
        self._cleanup_running = False
        self.num_workers = num_workers

        # Cleanup settings
        self.cleanup_interval = cleanup_interval
        self.job_deletion_days = job_deletion_days

        # Basic stats
        self._jobs_processed = 0
        self._jobs_failed = 0

        # Shutdown handling
        self._shutdown_event = threading.Event()
        self._shutdown_requested = False

        # Simple signal handling
        if threading.current_thread() is threading.main_thread():
            if not hasattr(DBWorker, "_signal_handlers_set"):
                self._setup_signal_handlers()
                DBWorker._signal_handlers_set = True

    def _setup_signal_handlers(self):
        """Simple signal handling"""

        def signal_handler(signum, frame):
            log = self.logger.get_adapter("SIGNAL")
            log.info(f"Received signal {signum}, shutting down...")
            self._shutdown_requested = True
            self._shutdown_event.set()
            self.stop()

        try:
            signal.signal(signal.SIGINT, signal_handler)
            signal.signal(signal.SIGTERM, signal_handler)
        except ValueError:
            pass

    def _calculate_retry_delay(self, attempt: int) -> int:
        """Simple exponential backoff"""
        return min(2**attempt, self.max_retry_delay)

    def process_pending_jobs(self, table_name: str, process_fn: Callable):
        """Main job processing loop"""
        log = self.logger.get_adapter(f"WORKER:{self.worker_name}")

        while self.running and not self._shutdown_event.is_set():
            try:
                if self._shutdown_requested:
                    log.info("Shutdown requested, stopping job processing...")
                    break

                job = self.claim_next_job(table_name, self.job_type_filter)
                if not job:
                    sleep_time = 0.5 if self._shutdown_requested else self.poll_interval
                    time.sleep(sleep_time)
                    continue

                job_id = job["id"]
                job_type = job.get("type", "unknown")

                log.info(f"Processing {table_name} job ID {job_id} (type={job_type})")

                start_time = time.time()
                try:
                    result = process_fn(job, self.logger)
                    duration = time.time() - start_time

                    # Handle different result types
                    if isinstance(result, JobResult):
                        if result.success:
                            self.mark_job_complete(table_name, job_id, result.__dict__)
                            self._jobs_processed += 1
                            log.info(
                                f"Job {job_id} completed successfully in {duration:.2f}s"
                            )
                        else:
                            raise Exception(f"Job failed: {result.message}")
                    elif isinstance(result, dict) and result.get("success"):
                        self.mark_job_complete(table_name, job_id, result)
                        self._jobs_processed += 1
                        log.info(
                            f"Job {job_id} completed successfully in {duration:.2f}s"
                        )
                    else:
                        raise Exception(
                            f"Job failed: {result.get('message', 'Unknown error') if isinstance(result, dict) else str(result)}"
                        )

                except Exception as ex:
                    duration = time.time() - start_time
                    self._handle_job_error(table_name, job_id, ex, duration, log)

            except Exception as ex:
                log.error(f"Loop error: {ex}", exc_info=True)
                sleep_time = 0.5 if self._shutdown_requested else self.poll_interval
                time.sleep(sleep_time)

        log.info(f"Worker {self.worker_name} finished processing jobs")

    def _handle_job_error(
        self, table_name: str, job_id: int, error: Exception, duration: float, log
    ):
        """Simple error handling with retry"""
        try:
            row = self.get_attempts(table_name, job_id)
            attempts = row["attempts"]
            max_attempts = row["max_attempts"]

            if attempts < max_attempts:
                delay = self._calculate_retry_delay(attempts)
                scheduled_at = (
                    datetime.datetime.now(datetime.timezone.utc)
                    + datetime.timedelta(seconds=delay)
                ).isoformat()

                self.mark_job_pending_with_error(
                    table_name, job_id, error, scheduled_at
                )
                log.warning(
                    f"Job {job_id} failed (attempt {attempts}/{max_attempts}) in {duration:.2f}s: {error}. "
                    f"Will retry in {delay}s"
                )
            else:
                self.mark_job_failed(table_name, job_id, error)
                self._jobs_failed += 1
                log.error(
                    f"Job {job_id} failed permanently after {attempts} attempts in {duration:.2f}s: {error}",
                    exc_info=True,
                )
        except Exception as meta_error:
            log.error(
                f"Error handling job error for job {job_id}: {meta_error}",
                exc_info=True,
            )

    def get_pending_jobs(self, table_name: str, job_type_filter: str = None):
        query = f"""SELECT * FROM {table_name}
                    WHERE status='pending'
                    AND (attempts < max_attempts OR max_attempts IS NULL)
                    AND (scheduled_at IS NULL OR scheduled_at <= ?)
                """
        params = [datetime.datetime.now(datetime.timezone.utc).isoformat()]
        if job_type_filter:
            query += " AND type=?"
            params.append(job_type_filter)
        query += " ORDER BY received_at ASC"
        return self.execute_query(query, tuple(params), fetch_all=True)

    def mark_job_complete(self, table_name: str, job_id: int, result):
        self.execute_query(
            f"UPDATE {table_name} SET status='success', result=? WHERE id=?",
            (json.dumps(result) if result else None, job_id),
        )

    def get_attempts(self, table_name: str, job_id: int):
        return self.execute_query(
            f"SELECT attempts, max_attempts FROM {table_name} WHERE id=?",
            (job_id,),
            fetch_one=True,
        )

    def mark_job_pending_with_error(
        self, table_name: str, job_id: int, error, scheduled_at: str = None
    ):
        if scheduled_at:
            self.execute_query(
                f"UPDATE {table_name} SET status='pending', error=?, scheduled_at=? WHERE id=?",
                (str(error), scheduled_at, job_id),
            )
        else:
            self.execute_query(
                f"UPDATE {table_name} SET status='pending', error=? WHERE id=?",
                (str(error), job_id),
            )

    def mark_job_failed(self, table_name: str, job_id: int, error):
        self.execute_query(
            f"UPDATE {table_name} SET status='error', error=? WHERE id=?",
            (str(error), job_id),
        )

    def reset_job_to_pending(self, table_name: str, job_id: int):
        """Reset a job to 'pending' status"""
        row = self.execute_query(
            f"SELECT * FROM {table_name} WHERE id=?", (job_id,), fetch_one=True
        )
        if not row:
            return None
        if row["status"] not in ("error", "success"):
            return False
        self.execute_query(
            f"UPDATE {table_name} SET status='pending', attempts=0, scheduled_at=NULL, error=NULL, result=NULL WHERE id=?",
            (job_id,),
        )
        return True

    def claim_next_job(self, table_name: str, job_type_filter: str = None):
        """Claim the next available job"""
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        query = f"""SELECT * FROM {table_name}
                    WHERE status='pending'
                    AND (attempts < max_attempts OR max_attempts IS NULL)
                    AND (scheduled_at IS NULL OR scheduled_at <= ?)
                """
        params = [now]

        if job_type_filter == "webhook":
            query += " AND type=?"
            params.append("webhook")
        elif job_type_filter is None:
            query += " AND type!=?"
            params.append("webhook")

        query += " ORDER BY COALESCE(priority, 0) DESC, received_at ASC LIMIT 1"

        row = self.execute_query(query, tuple(params), fetch_one=True)
        if not row:
            return None

        job_id = row["id"]
        updated = self.execute_query(
            f"UPDATE {table_name} SET status='running', attempts=attempts+1 WHERE id=? AND status='pending'",
            (job_id,),
        )
        if updated == 1:
            return dict(row)
        else:
            return None

    def get_worker_stats(self):
        """Get basic worker stats"""
        return {
            "worker_name": self.worker_name,
            "status": "running" if self.running else "stopped",
            "jobs_processed": self._jobs_processed,
            "jobs_failed": self._jobs_failed,
            "active_threads": len([t for t in self._threads if t.is_alive()]),
            "num_workers": self.num_workers,
        }

    def start(self, table_name: str, process_fn: Callable, job_type_filter: str = None):
        """Start the worker"""
        log = self.logger.get_adapter("WORKER")

        # Reset any stuck running jobs
        reset = self.execute_query(
            f"UPDATE {table_name} SET status='pending' WHERE status='running'"
        )
        if reset:
            log.info(f"Reset {reset} 'running' jobs to 'pending' on startup.")

        if self._threads and all(t.is_alive() for t in self._threads):
            log.info("Already running.")
            return

        self.running = True
        self._shutdown_event.clear()
        self._shutdown_requested = False
        self._threads = []

        # Start worker threads
        for i in range(self.num_workers):
            t = threading.Thread(
                target=self.process_pending_jobs,
                args=(table_name, process_fn),
                daemon=True,
                name=f"{self.worker_name}-Worker-{i+1}",
            )
            t.start()
            self._threads.append(t)

        # Start cleanup thread
        if not self._cleanup_thread or not self._cleanup_thread.is_alive():
            self._cleanup_running = True
            self._cleanup_thread = threading.Thread(
                target=self._periodic_cleanup,
                args=(table_name,),
                daemon=True,
                name=f"{self.worker_name}-Cleanup",
            )
            self._cleanup_thread.start()

        log.info(
            f"Starting '{self.num_workers}' worker(s) for '{job_type_filter if job_type_filter is not None else 'Any'}' jobs..."
        )
        log.debug(
            f"(poll_interval={self.poll_interval}s, job_type_filter='{self.job_type_filter}')"
        )

    def stop(self, timeout: int = 10):
        """Stop the worker gracefully"""
        log = self.logger.get_adapter("WORKER")
        log.info(f"Initiating graceful shutdown of '{self.worker_name}'...")

        # Set shutdown flags
        self.running = False
        self._cleanup_running = False
        self._shutdown_event.set()
        self._shutdown_requested = True

        # Stop worker threads
        alive_threads = [t for t in self._threads if t.is_alive()]

        if alive_threads:
            log.info(f"Waiting for {len(alive_threads)} worker threads to stop...")
            for thread in alive_threads:
                thread.join(timeout=2)

        # Stop cleanup thread
        if self._cleanup_thread and self._cleanup_thread.is_alive():
            self._cleanup_thread.join(timeout=2)

        # Clear thread references
        self._threads.clear()
        self._cleanup_thread = None

        log.info("Worker stopped")

    def close(self):
        """Close the worker and database connection"""
        try:
            self.stop(timeout=5)
        except Exception as e:
            if hasattr(self, "logger") and self.logger:
                self.logger.get_adapter("WORKER").error(
                    f"Error during worker close: {e}", exc_info=True
                )

    def job_stats(self, table_name: str = "jobs", error_limit: int = 10):
        try:
            status_rows = self.execute_query(
                f"SELECT status, COUNT(*) AS count FROM {table_name} GROUP BY status",
                fetch_all=True,
            )
            status_counts = (
                {row["status"]: row["count"] for row in status_rows}
                if status_rows
                else {}
            )

            total_row = self.execute_query(
                f"SELECT COUNT(*) as total FROM {table_name}", fetch_one=True
            )
            total = total_row["total"] if total_row else 0

            error_rows = self.execute_query(
                f"SELECT id, type, received_at, error FROM {table_name} WHERE status='error' ORDER BY received_at DESC LIMIT ?",
                (error_limit,),
                fetch_all=True,
            )
            recent_errors = [dict(row) for row in error_rows] if error_rows else []

            last_row = self.execute_query(
                f"SELECT id, type, status, received_at FROM {table_name} ORDER BY received_at DESC LIMIT 1",
                fetch_one=True,
            )

            return {
                "success": True,
                "message": "Job stats fetched",
                "data": {
                    "total": total,
                    "status_counts": status_counts,
                    "recent_errors": recent_errors,
                    "last_job": dict(last_row) if last_row else None,
                },
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Error fetching job stats: {e}",
                "error_code": "DB_JOB_STATS_ERROR",
            }

    def update_progress(self, table_name: str, job_id: int, progress: int):
        self.execute_query(
            f"UPDATE {table_name} SET progress=? WHERE id=?",
            (progress, job_id),
        )

    def enqueue_job(
        self,
        table_name: str,
        payload: dict,
        job_type: str,
        extra_fields: dict = None,
        scheduled_at: str = None,
    ):
        """Add a new job to the specified table"""
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        fields = {
            "type": job_type,
            "received_at": now,
            "payload": json.dumps(payload),
            "status": "pending",
        }
        if scheduled_at:
            fields["scheduled_at"] = scheduled_at
        if extra_fields:
            fields.update(extra_fields)
        keys = ",".join(fields.keys())
        qs = ",".join("?" for _ in fields)

        try:
            with self.get_connection() as conn:
                cursor = conn.execute(
                    f"INSERT INTO {table_name} ({keys}) VALUES ({qs})",
                    tuple(fields.values()),
                )
                job_id = cursor.lastrowid
                conn.commit()

            return {
                "success": True,
                "message": "Job enqueued successfully",
                "data": {"job_id": job_id},
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Error enqueuing job: {e}",
                "error_code": "ENQUEUE_JOB_ERROR",
            }

    def get_job_by_id(self, table_name: str, job_id: int):
        row = self.execute_query(
            f"SELECT * FROM {table_name} WHERE id=?", (job_id,), fetch_one=True
        )
        return dict(row) if row else None

    def cleanup_jobs(self, table_name: str = "jobs", days: int = 30):
        """Delete old completed/failed jobs"""
        try:
            cutoff = (
                datetime.datetime.now(datetime.timezone.utc)
                - datetime.timedelta(days=days)
            ).isoformat()
            deleted = self.execute_query(
                f"DELETE FROM {table_name} WHERE status IN ('success', 'error') AND received_at < ?",
                (cutoff,),
            )

            if deleted > 0:
                log = self.logger.get_adapter("WORKER")
                log.info(
                    f"Removed {deleted} jobs from '{table_name}' older than {days} days"
                )

            return {
                "success": True,
                "message": f"Deleted {deleted} old jobs (> {days}d)",
                "data": {"deleted": deleted, "days": days},
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Error cleaning up jobs: {e}",
                "error_code": "DB_CLEANUP_JOBS_ERROR",
            }

    def _periodic_cleanup(self, table_name: str):
        """Run cleanup periodically"""
        while self._cleanup_running and not self._shutdown_event.is_set():
            try:
                self.cleanup_jobs(table_name, days=self.job_deletion_days)
            except Exception as ex:
                log = self.logger.get_adapter("WORKER")
                log.error(f"Periodic cleanup error: {ex}", exc_info=True)

            sleep_time = 10 if self._shutdown_requested else self.cleanup_interval
            if self._shutdown_event.wait(timeout=sleep_time):
                break

    def list_jobs(self, status: str = None, limit: int = 50):
        """List jobs, optionally filtered by status"""
        try:
            if status:
                rows = self.execute_query(
                    "SELECT * FROM jobs WHERE status=? ORDER BY received_at DESC LIMIT ?",
                    (status, limit),
                    fetch_all=True,
                )
            else:
                rows = self.execute_query(
                    "SELECT * FROM jobs ORDER BY received_at DESC LIMIT ?",
                    (limit,),
                    fetch_all=True,
                )
            jobs = [dict(row) for row in rows] if rows else []
            return {
                "success": True,
                "message": f"Returned {len(jobs)} job(s)",
                "data": {"jobs": jobs},
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Error listing jobs: {e}",
                "error_code": "DB_LIST_JOBS_ERROR",
            }


# SINGLE UNIFIED JOB PROCESSOR - No more duplicates!
def process_job(job: Dict[str, Any], logger) -> Dict[str, Any]:
    """
    Single unified job processor that handles all job types.
    FIXED: Strategic imports to avoid circular dependencies.
    """
    job_id = job.get("id")
    job_type = job.get("type")
    payload = json.loads(job.get("payload", "{}"))

    log = logger.get_adapter("JOB_PROCESSOR")
    log.debug(f"[JOB:{job_id}] Processing {job_type}")

    try:
        if job_type == "webhook_process":
            # Webhook processing - import here to avoid circular dependency
            from util.webhook_processor import WebhookProcessor

            processor = WebhookProcessor(logger)
            result = processor.process_webhook_adhoc(
                payload.get("webhook_data", {}), payload.get("client_info")
            )
            return result

        elif job_type == "sync_gdrive":
            # GDrive sync - import here to avoid circular dependency
            from modules.sync_gdrive import SyncGDrive

            gdrive_name = payload.get("gdrive_name")
            if not gdrive_name:
                return {
                    "success": False,
                    "message": "No gdrive_name provided",
                    "error_code": "MISSING_GDRIVE_NAME",
                }

            syncer = SyncGDrive(logger=logger)
            syncer.sync_folder_adhoc(gdrive_name)

            return {
                "success": True,
                "message": f"Sync completed for {gdrive_name}",
            }

        elif job_type == "poster_rename":
            # Poster rename - import here to avoid circular dependency
            from modules.poster_renamerr import PosterRenamerr

            media_items = payload.get("media_items", [])
            if not media_items:
                return {
                    "success": False,
                    "message": "No media items provided",
                    "error_code": "MISSING_MEDIA_ITEMS",
                }

            renamer = PosterRenamerr(logger=logger)
            result = renamer.run_poster_rename_adhoc(media_items)

            # Handle notifications and uploads if successful
            if result["success"] and result.get("output"):
                _handle_post_rename_actions(result, renamer, logger)

            return result

        elif job_type == "upload_posters":
            # Poster upload - import here to avoid circular dependency
            from util.database import DapsDB
            from util.upload_posters import PosterUploader

            manifest = payload.get("manifest")
            if not manifest:
                return {
                    "success": False,
                    "message": "No manifest provided",
                    "error_code": "MISSING_MANIFEST",
                }

            with DapsDB(logger=logger) as db:
                uploader = PosterUploader(db=db, logger=logger, manifest=manifest)
                result = uploader.upload_posters()

            if result.get("success"):
                return {
                    "success": True,
                    "message": "Upload completed",
                }
            else:
                return {
                    "success": False,
                    "message": f"Upload failed: {result.get('message')}",
                    "error_code": "UPLOAD_FAILED",
                }

        else:
            return {
                "success": False,
                "message": f"Unknown job type: {job_type}",
                "error_code": "UNKNOWN_JOB_TYPE",
            }

    except Exception as e:
        log.error(f"[JOB:{job_id}] Error: {e}", exc_info=True)
        return {
            "success": False,
            "message": f"Job failed: {str(e)}",
            "error_code": "JOB_EXCEPTION",
        }


def _handle_post_rename_actions(rename_result: Dict[str, Any], renamer, logger):
    """Handle notifications and uploads after successful rename."""
    try:
        output = rename_result.get("output", {})
        manifest = rename_result.get("manifest", {})

        # Send notifications if there are results
        if any(output.values()):
            from util.notification import NotificationManager

            manager = NotificationManager(
                renamer.config, logger, module_name="poster_renamerr"
            )
            manager.send_notification(output)
            logger.get_adapter("POST_RENAME").info("Notifications sent")

        # Handle border replacer if enabled
        if getattr(renamer.config, "run_border_replacerr", False) and manifest:
            renamer.run_border_replacerr(manifest)
            logger.get_adapter("POST_RENAME").info("Border replacer completed")

        # Queue upload job if Plex instances are enabled
        plex_enabled = _check_plex_upload_enabled(renamer.config)
        if plex_enabled and manifest:
            _queue_upload_job(manifest, logger)

    except Exception as e:
        logger.get_adapter("POST_RENAME").error(f"Error in post-rename actions: {e}")


def _check_plex_upload_enabled(config) -> bool:
    """Check if any Plex instances have poster upload enabled."""
    try:
        if not hasattr(config, "instances"):
            return False

        for inst in config.instances:
            if isinstance(inst, dict):
                for instance_name, params in inst.items():
                    if getattr(params, "add_posters", False):
                        return True
        return False
    except Exception:
        return False


def _queue_upload_job(manifest: Dict[str, Any], logger):
    """Queue a poster upload job."""
    try:
        # Import here to avoid circular dependency
        from util.database import DapsDB

        upload_payload = {"manifest": manifest}

        with DapsDB(logger=logger) as db:
            result = db.worker.enqueue_job(
                table_name="jobs", payload=upload_payload, job_type="upload_posters"
            )

        if result["success"]:
            logger.get_adapter("POST_RENAME").info(
                f"Upload job queued: {result['data']['job_id']}"
            )
        else:
            logger.get_adapter("POST_RENAME").error(
                f"Failed to queue upload job: {result['message']}"
            )

    except Exception as e:
        logger.get_adapter("POST_RENAME").error(f"Error queueing upload job: {e}")
