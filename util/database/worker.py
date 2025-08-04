import datetime
import json
import threading
import time
from typing import Any, Callable, Dict

from util.database.db_base import DatabaseBase


class DBWorker(DatabaseBase):
    """
    General-purpose DB-backed job worker for tables like webhook_jobs.
    Includes background periodic cleanup of completed jobs.
    """

    def __init__(
        self,
        db_path,
        logger=None,
        poll_interval: int = 2,
        num_workers: int = 3,
        worker_name: str = "UNNAMED",
        job_type_filter: str = None,
        cleanup_interval: int = 3600,
        job_deletion_days: int = 30,
    ):
        super().__init__(db_path)
        self.logger = logger
        self.worker_name = worker_name
        self.job_type_filter = job_type_filter
        self.poll_interval = poll_interval
        self.running = False
        self._thread = None
        self._cleanup_running = False
        self.cleanup_interval = cleanup_interval
        self.job_deletion_days = job_deletion_days
        self._cleanup_thread = None
        self.num_workers = num_workers
        self._threads = []

    def process_pending_jobs(
        self,
        table_name: str,
        process_fn: Callable[[Dict[str, Any]], None],
        job_type_filter: str = None,
    ):
        log = (
            self.logger.get_adapter(f"WORKER:{self.worker_name}")
            if self.logger
            else None
        )
        while self.running:
            try:
                job = self.claim_next_job(table_name, job_type_filter)
                if not job:
                    time.sleep(self.poll_interval)
                    continue
                job_id = job["id"]
                if log:
                    log.info(f"Processing {table_name} job ID {job_id}")
                try:
                    result = process_fn(job)
                    self.mark_job_done(table_name, job_id, result)
                    if log:
                        log.info(f"Job {job_id} processed.")
                except Exception as ex:
                    row = self.get_attempts(table_name, job_id)
                    attempts = row["attempts"]
                    max_attempts = row["max_attempts"]
                    if attempts < max_attempts:
                        self.mark_job_pending_with_error(table_name, job_id, ex)
                        if log:
                            log.error(
                                f"Error processing job {job_id}: {ex} (will retry)",
                                exc_info=True,
                            )
                    else:
                        self.mark_job_failed(table_name, job_id, ex)
                        if log:
                            log.error(
                                f"Job {job_id} failed permanently after {attempts} attempts: {ex}",
                                exc_info=True,
                            )
            except Exception as ex:
                if log:
                    log.error(f"Loop error: {ex}", exc_info=True)
                time.sleep(self.poll_interval)

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
        with self.conn:
            cur = self.conn.execute(query, tuple(params))
            return cur.fetchall()

    def mark_job_done(self, table_name: str, job_id: int, result):
        with self.conn:
            self.conn.execute(
                f"UPDATE {table_name} SET status='done', result=? WHERE id=?",
                (json.dumps(result) if result else None, job_id),
            )

    def get_attempts(self, table_name: str, job_id: int):
        with self.conn:
            cur = self.conn.execute(
                f"SELECT attempts, max_attempts FROM {table_name} WHERE id=?",
                (job_id,),
            )
            return cur.fetchone()

    def mark_job_pending_with_error(self, table_name: str, job_id: int, error):
        with self.conn:
            self.conn.execute(
                f"UPDATE {table_name} SET status='pending', error=? WHERE id=?",
                (str(error), job_id),
            )

    def mark_job_failed(self, table_name: str, job_id: int, error):
        with self.conn:
            self.conn.execute(
                f"UPDATE {table_name} SET status='error', error=? WHERE id=?",
                (str(error), job_id),
            )

        job_type = None
        try:
            with self.conn:
                cur = self.conn.execute(
                    f"SELECT type FROM {table_name} WHERE id=?",
                    (job_id,),
                )
                row = cur.fetchone()
                if row and "type" in row:
                    job_type = row["type"]
        except Exception:
            pass
        log = self.logger.get_adapter("WORKER") if self.logger else None
        warning_msg = (
            f"Job ID {job_id} (type={job_type}) marked as FAILED after max attempts. "
            "Manual intervention may be required."
        )
        if log:
            log.warning(warning_msg)
        else:
            print(f"[WORKER][WARNING] {warning_msg}")

    def claim_next_job(self, table_name: str, job_type_filter: str = None):
        """
        Atomically fetch and claim a single pending job for processing.
        Returns the job dict if successful, else None.
        """
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        with self.conn:

            query = f"""SELECT * FROM {table_name}
                        WHERE status='pending'
                        AND (attempts < max_attempts OR max_attempts IS NULL)
                        AND (scheduled_at IS NULL OR scheduled_at <= ?)
                    """
            params = [now]
            if job_type_filter:
                query += " AND type=?"
                params.append(job_type_filter)
            query += " ORDER BY received_at ASC LIMIT 1"
            cur = self.conn.execute(query, tuple(params))
            row = cur.fetchone()
            if not row:
                return None
            job_id = row["id"]

            updated = self.conn.execute(
                f"UPDATE {table_name} SET status='running', attempts=attempts+1 WHERE id=? AND status='pending'",
                (job_id,),
            ).rowcount
            if updated == 1:
                return dict(row)
            else:
                return None

    def job_stats(self, table_name: str = "jobs", error_limit: int = 10):
        """
        Get statistics for jobs in the queue.
        Returns count per status, total, recent errors, and last processed time.
        """
        try:
            with self.conn:

                cur = self.conn.execute(
                    f"SELECT status, COUNT(*) AS count FROM {table_name} GROUP BY status"
                )
                status_counts = {row["status"]: row["count"] for row in cur.fetchall()}

                cur = self.conn.execute(f"SELECT COUNT(*) as total FROM {table_name}")
                total = cur.fetchone()["total"]

                cur = self.conn.execute(
                    f"SELECT id, type, received_at, error FROM {table_name} WHERE status='error' ORDER BY received_at DESC LIMIT ?",
                    (error_limit,),
                )
                recent_errors = [dict(row) for row in cur.fetchall()]

                cur = self.conn.execute(
                    f"SELECT id, type, status, received_at FROM {table_name} ORDER BY received_at DESC LIMIT 1"
                )
                last = cur.fetchone()

            return {
                "status": 200,
                "success": True,
                "error_code": None,
                "message": "Job stats fetched",
                "total": total,
                "status_counts": status_counts,
                "recent_errors": recent_errors,
                "last_job": dict(last) if last else None,
            }
        except Exception as e:
            return {
                "status": 500,
                "success": False,
                "error_code": "DB_JOB_STATS_ERROR",
                "message": f"Error fetching job stats: {e}",
            }

    def enqueue_job(
        self,
        table_name: str,
        payload: dict,
        job_type: str,
        extra_fields: dict = None,
        scheduled_at: str = None,
    ):
        """
        Add a new job to the specified table. Optionally set scheduled_at (ISO timestamp string).
        """
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
        logger = self.logger.get_adapter("enqueue_job")

        try:
            with self.conn:
                self.conn.execute(
                    f"INSERT INTO {table_name} ({keys}) VALUES ({qs})",
                    tuple(fields.values()),
                )
            logger.debug(
                f"Successfully enqueued job: type={job_type}, table={table_name}, scheduled_at={scheduled_at}"
            )
            return {
                "status": 200,
                "success": True,
                "error_code": None,
                "message": "Job enqueued successfully",
            }
        except Exception as e:
            self.logger.debug(
                f"Failed to enqueue job: type={job_type}, table={table_name}, error={e}"
            )
            return {
                "status": 500,
                "success": False,
                "error_code": "ENQUEUE_JOB_ERROR",
                "message": f"Error enqueuing job: {e}",
            }

    def start(
        self,
        table_name: str,
        process_fn: Callable[[Dict[str, Any]], None],
        job_type_filter: str = None,
    ):
        log = self.logger.get_adapter("WORKER") if self.logger else None
        with self.conn:
            reset = self.conn.execute(
                f"UPDATE {table_name} SET status='pending' WHERE status='running'"
            ).rowcount
        if log and reset:
            log.info(f"Reset {reset} 'running' jobs to 'pending' on startup.")
        if self._threads and all(t.is_alive() for t in self._threads):
            if log:
                log.info("Already running.")
            return
        self.running = True
        self._threads = []
        for _ in range(self.num_workers):
            t = threading.Thread(
                target=self.process_pending_jobs,
                args=(table_name, process_fn, job_type_filter),
                daemon=True,
            )
            t.start()
            self._threads.append(t)

        if not self._cleanup_thread or not self._cleanup_thread.is_alive():
            self._cleanup_running = True
            self._cleanup_thread = threading.Thread(
                target=self._periodic_cleanup, args=(table_name,), daemon=True
            )
            self._cleanup_thread.start()
        if log:
            thread_info = (
                f"Started {self.num_workers} worker thread{'s' if self.num_workers > 1 else ''} "
                f"for table '{table_name}' (poll_interval={self.poll_interval}s)"
            )
            if self.job_type_filter:
                thread_info += f" [job type: '{self.job_type_filter}']"
            log.info(thread_info)
            log.info(
                f"Started cleanup thread for table '{table_name}' "
                f"(cleanup_interval={self.cleanup_interval}s, job_deletion_age={self.job_deletion_days}d)"
            )

    def stop(self):
        log = self.logger.get_adapter("WORKER") if self.logger else None
        self.running = False
        self._cleanup_running = False
        for t in self._threads:
            t.join(timeout=2)
        self._threads = []
        if self._cleanup_thread:
            self._cleanup_thread.join(timeout=2)
            self._cleanup_thread = None
        if log:
            log.info("Stopped.")

    def close(self):
        self.stop()
        super().close()

    def cleanup_jobs(self, table_name: str = "jobs", days: int = 30):
        """
        Delete jobs with status 'done' or 'error' older than N days.
        """
        import datetime

        try:
            cutoff = (
                datetime.datetime.now(datetime.timezone.utc)
                - datetime.timedelta(days=days)
            ).isoformat()
            with self.conn:
                deleted = self.conn.execute(
                    f"DELETE FROM {table_name} WHERE status IN ('done', 'error') AND received_at < ?",
                    (cutoff,),
                ).rowcount
            log = self.logger.get_adapter("WORKER") if self.logger else None
            if log:
                log.info(
                    f"Removed {deleted} jobs from '{table_name}' older than {days} days"
                )
            return {
                "status": 200,
                "success": True,
                "error_code": None,
                "message": f"Deleted {deleted} old jobs (> {days}d)",
                "deleted": deleted,
                "days": days,
            }
        except Exception as e:
            return {
                "status": 500,
                "success": False,
                "error_code": "DB_CLEANUP_JOBS_ERROR",
                "message": f"Error cleaning up jobs: {e}",
                "deleted": 0,
                "days": days,
            }

    def _periodic_cleanup(self, table_name: str, interval: int = 3600, days: int = 30):
        """
        Runs cleanup_jobs every `interval` seconds. Defaults to once per hour.
        """
        while getattr(self, "_cleanup_running", False):
            log = self.logger.get_adapter("WORKER") if self.logger else None
            try:
                deleted_result = self.cleanup_jobs(table_name, days=days)
                if log and deleted_result["success"] and deleted_result["deleted"] > 0:
                    log.info(
                        f"Periodic cleanup: {deleted_result['deleted']} jobs older than {days} days removed."
                    )
            except Exception as ex:
                if log:
                    log.error(f"Periodic cleanup error: {ex}", exc_info=True)
            time.sleep(interval)

    def list_jobs(self, status: str = None, limit: int = 50):
        """
        Return a list of jobs, optionally filtered by status.
        """
        try:
            with self.conn:
                if status:
                    cur = self.conn.execute(
                        "SELECT * FROM jobs WHERE status=? ORDER BY received_at DESC LIMIT ?",
                        (status, limit),
                    )
                else:
                    cur = self.conn.execute(
                        "SELECT * FROM jobs ORDER BY received_at DESC LIMIT ?", (limit,)
                    )
                jobs = [dict(row) for row in cur.fetchall()]
            return {
                "status": 200,
                "success": True,
                "error_code": None,
                "message": f"Returned {len(jobs)} job(s)",
                "jobs": jobs,
            }
        except Exception as e:
            return {
                "status": 500,
                "success": False,
                "error_code": "DB_LIST_JOBS_ERROR",
                "message": f"Error listing jobs: {e}",
                "jobs": [],
            }


def process_job(job, logger):
    job_id = job.get("id")
    job_type = job.get("type")
    payload = json.loads(job.get("payload", "{}"))
    start_time = time.time()

    log = logger.get_adapter("WORKER") if logger else None
    if log:
        log.debug(f"[JOB:{job_id}] Starting job type={job_type}")
    result = {"status": 500, "success": False, "message": "Unknown error"}

    try:
        if job_type == "webhook":
            try:
                from util.database import DapsDB
                from util.webhook_service import WebhookService

                db = DapsDB(logger=logger)
                job_service = WebhookService(
                    request=None, db=db, logger=logger, module_name="poster_renamerr"
                )
                res = job_service.process_arr_request(payload, logger)
                if res and res.get("success"):
                    job_service.run_renamerr_adhoc(res)
                    result = {
                        "status": 200,
                        "success": True,
                        "message": "Webhook job processed successfully",
                        "error_code": None,
                    }
                else:
                    result = {
                        "status": res.get("status", 500) if res else 500,
                        "success": False,
                        "message": f"WebhookService error: {res.get('error') if res else 'No result'}",
                        "error_code": (
                            res.get("error_code", "WEBHOOK_ERROR")
                            if res
                            else "WEBHOOK_ERROR"
                        ),
                    }
            except Exception as ex:
                if log:
                    log.error(
                        f"[JOB:{job_id}] Error in webhook job handler: {ex}",
                        exc_info=True,
                    )
                result = {
                    "status": 500,
                    "success": False,
                    "message": f"Exception in webhook handler: {str(ex)}",
                    "error_code": "WEBHOOK_EXCEPTION",
                }

        elif job_type == "sync_gdrive":
            try:

                result = {
                    "status": 200,
                    "success": True,
                    "message": "sync_gdrive completed",
                    "error_code": None,
                }
            except Exception as ex:
                if log:
                    log.error(
                        f"[JOB:{job_id}] Error in sync_gdrive handler: {ex}",
                        exc_info=True,
                    )
                result = {
                    "status": 500,
                    "success": False,
                    "message": f"Exception in sync_gdrive handler: {str(ex)}",
                    "error_code": "SYNC_GDRIVE_EXCEPTION",
                }
        elif job_type == "upload_posters":
            try:
                if "manifest" not in payload or not isinstance(
                    payload["manifest"], dict
                ):
                    error_msg = f"[JOB:{job_id}] upload_posters: missing/invalid manifest in payload"
                    if log:
                        log.error(error_msg)
                    result = {
                        "status": 400,
                        "success": False,
                        "message": error_msg,
                        "error_code": "PAYLOAD_SCHEMA_INVALID",
                    }
                    return result

                from util.database import DapsDB
                from util.upload_posters import PosterUploader

                db = DapsDB(logger=logger)
                manifest = payload.get("manifest")
                uploader = PosterUploader(logger=logger, manifest=manifest)
                upload_result = uploader.upload_posters()
                if upload_result.get("success"):
                    result = {
                        "status": 200,
                        "success": True,
                        "message": "Poster uploaded successfully (background)",
                        "error_code": None,
                    }
                else:
                    result = {
                        "status": 500,
                        "success": False,
                        "message": f"Upload failed: {upload_result.get('message')}",
                        "error_code": "UPLOAD_FAILED",
                    }
            except Exception as ex:
                if log:
                    log.error(
                        f"[JOB:{job_id}] Error in upload_posters handler: {ex}",
                        exc_info=True,
                    )
                result = {
                    "status": 500,
                    "success": False,
                    "message": f"Exception in upload_posters handler: {str(ex)}",
                    "error_code": "UPLOAD_EXCEPTION",
                }

        else:
            error_msg = f"Unknown job type: {job_type}"
            if log:
                log.error(f"[JOB:{job_id}] {error_msg}")
            result = {
                "status": 400,
                "success": False,
                "message": error_msg,
                "error_code": "UNKNOWN_JOB_TYPE",
            }

    except Exception as ex:
        if log:
            log.error(f"[JOB:{job_id}] Unhandled error: {ex}", exc_info=True)
        result = {
            "status": 500,
            "success": False,
            "message": f"Unhandled exception: {str(ex)}",
            "error_code": "UNHANDLED_EXCEPTION",
        }

    finally:
        duration = time.time() - start_time
        if log:
            log.debug(
                f"[JOB:{job_id}] Job type={job_type} finished in {duration:.2f}s with status={result['status']} success={result['success']}"
            )
        return result
