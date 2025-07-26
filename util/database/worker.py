import json
import threading
import time
from datetime import datetime
from typing import Any, Callable, Dict

from util.database.db_base import DatabaseBase


class DBWorker(DatabaseBase):
    """
    General-purpose DB-backed job worker for tables like webhook_jobs.
    Includes background periodic cleanup of completed jobs.
    """

    def __init__(self, db_path=None, logger=None, poll_interval: int = 2):
        super().__init__(db_path)
        self.logger = logger
        self.poll_interval = poll_interval
        self.running = False
        self._thread = None
        self._cleanup_running = False
        self._cleanup_thread = None

    def process_pending_jobs(
        self, table_name: str, process_fn: Callable[[Dict[str, Any]], None]
    ):
        """
        Polls the job table for pending jobs, processes, supports retries, and stores result/error/status.
        """
        while self.running:
            log = self.logger.get_adapter({"source": "WORKER"}) if self.logger else None
            try:
                with self.conn:
                    cur = self.conn.execute(
                        f"""SELECT * FROM {table_name}
                            WHERE status='pending'
                            AND (attempts < max_attempts OR max_attempts IS NULL)
                            AND (scheduled_at IS NULL OR scheduled_at <= ?)
                            ORDER BY received_at ASC""",
                        (datetime.utcnow().isoformat(),),
                    )
                    jobs = cur.fetchall()
                for job in jobs:
                    job_dict = dict(job)
                    job_id = job_dict["id"]
                    if log:
                        log.info(f"Processing {table_name} job ID {job_id}")
                    try:

                        with self.conn:
                            self.conn.execute(
                                f"UPDATE {table_name} SET attempts=attempts+1, status='running' WHERE id=?",
                                (job_id,),
                            )
                        result = process_fn(job_dict)

                        with self.conn:
                            self.conn.execute(
                                f"UPDATE {table_name} SET status='done', result=? WHERE id=?",
                                (json.dumps(result) if result else None, job_id),
                            )
                        if log:
                            log.info(f"Job {job_id} processed.")
                    except Exception as ex:

                        with self.conn:
                            cur = self.conn.execute(
                                f"SELECT attempts, max_attempts FROM {table_name} WHERE id=?",
                                (job_id,),
                            )
                            row = cur.fetchone()
                        attempts = row["attempts"]
                        max_attempts = row["max_attempts"]
                        if attempts < max_attempts:

                            with self.conn:
                                self.conn.execute(
                                    f"UPDATE {table_name} SET status='pending', error=? WHERE id=?",
                                    (str(ex), job_id),
                                )
                            if log:
                                log.error(
                                    f"Error processing job {job_id}: {ex} (will retry)",
                                    exc_info=True,
                                )
                        else:

                            with self.conn:
                                self.conn.execute(
                                    f"UPDATE {table_name} SET status='error', error=? WHERE id=?",
                                    (str(ex), job_id),
                                )
                            if log:
                                log.error(
                                    f"Job {job_id} failed permanently after {attempts} attempts: {ex}",
                                    exc_info=True,
                                )
                time.sleep(self.poll_interval)
            except Exception as ex:
                if log:
                    log.error(f"Loop error: {ex}", exc_info=True)
                time.sleep(self.poll_interval)

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
        now = datetime.utcnow().isoformat()
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
            with self.conn:
                self.conn.execute(
                    f"INSERT INTO {table_name} ({keys}) VALUES ({qs})",
                    tuple(fields.values()),
                )
            return {
                "status": 200,
                "success": True,
                "error_code": None,
                "message": "Job enqueued successfully",
            }
        except Exception as e:
            return {
                "status": 500,
                "success": False,
                "error_code": "ENQUEUE_JOB_ERROR",
                "message": f"Error enqueuing job: {e}",
            }

    def start(self, table_name: str, process_fn: Callable[[Dict[str, Any]], None]):
        log = self.logger.get_adapter({"source": "WORKER"}) if self.logger else None
        with self.conn:
            reset = self.conn.execute(
                f"UPDATE {table_name} SET status='pending' WHERE status='running'"
            ).rowcount
        if log and reset:
            log.info(f"Reset {reset} 'running' jobs to 'pending' on startup.")
        if self._thread and self._thread.is_alive():
            if log:
                log.info("Already running.")
            return
        self.running = True
        self._thread = threading.Thread(
            target=self.process_pending_jobs, args=(table_name, process_fn), daemon=True
        )
        self._thread.start()
        self._cleanup_running = True
        self._cleanup_thread = threading.Thread(
            target=self._periodic_cleanup, args=(table_name,), daemon=True
        )
        self._cleanup_thread.start()
        if log:
            log.info(f"Started for table: {table_name}")
            log.info(f"Cleanup thread started for table: {table_name}")

    def stop(self):
        """Stop the worker loop and join the thread."""
        log = self.logger.get_adapter({"source": "WORKER"}) if self.logger else None
        self.running = False
        self._cleanup_running = False
        if self._thread:
            self._thread.join(timeout=2)
            self._thread = None
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
                datetime.datetime.utcnow() - datetime.timedelta(days=days)
            ).isoformat()
            with self.conn:
                deleted = self.conn.execute(
                    f"DELETE FROM {table_name} WHERE status IN ('done', 'error') AND received_at < ?",
                    (cutoff,),
                ).rowcount
            log = self.logger.get_adapter({"source": "WORKER"}) if self.logger else None
            if log:
                log.info(f"Cleaned up {deleted} old jobs (>{days}d) from {table_name}")
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
            log = self.logger.get_adapter({"source": "WORKER"}) if self.logger else None
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

    log = logger.get_adapter({"source": "WORKER"}) if logger else None
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
