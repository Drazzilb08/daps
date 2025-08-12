# util/module_orchestrator.py
import time
from typing import Any, Dict

from modules import MODULES
from util.database import DapsDB
from util.logger import Logger


class ModuleOrchestrator:
    """Centralized module execution through job queue"""

    def __init__(self, logger: Logger, db: DapsDB = None):
        self.logger = logger
        self.db = db  # Optional shared database instance

    def _get_database(self):
        """Get database instance - use shared if available, otherwise create new context"""
        if self.db:
            return self.db
        else:
            return DapsDB(self.logger)

    def _log(
        self, level: str, msg: str, source: str = "orchestrator", exc_info: bool = False
    ):
        """Helper for consistent logging"""
        if self.logger:
            adapter = self.logger.get_adapter(source)
            log_func = getattr(adapter, level, None)
            if log_func:
                log_func(msg, exc_info=exc_info)
            else:
                print(f"[{source.upper()}] {msg}")
        else:
            print(f"[{source.upper()}] {msg}")

    def run_module_immediate(
        self, module_name: str, origin: str = "web"
    ) -> Dict[str, Any]:
        """
        Run a module immediately and wait for completion.
        Used for API endpoints that need synchronous behavior.
        """
        try:
            # Enqueue job with high priority
            with DapsDB(self.logger) as db:
                result = db.worker.enqueue_job(
                    table_name="jobs",
                    payload={
                        "module_name": module_name,
                        "origin": origin,
                        "immediate": True,
                    },
                    job_type="module_run",
                    extra_fields={"priority": 10},  # High priority for immediate runs
                )

            if not result["success"]:
                return {
                    "success": False,
                    "message": f"Failed to enqueue module: {result['message']}",
                    "error_code": "ENQUEUE_FAILED",
                }

            job_id = result["data"]["job_id"]
            self._log(
                "info",
                f"Enqueued immediate module run: {module_name} (job {job_id})",
                origin,
            )

            # Poll for completion (timeout after 5 minutes)
            return self._wait_for_job_completion(job_id, timeout=300)

        except Exception as e:
            self._log(
                "error", f"Error in run_module_immediate: {e}", origin, exc_info=True
            )
            return {
                "success": False,
                "message": f"Error running module: {str(e)}",
                "error_code": "EXECUTION_ERROR",
            }

    def run_module_async(
        self, module_name: str, origin: str = "scheduled"
    ) -> Dict[str, Any]:
        """
        Run a module asynchronously via job queue.
        Used for scheduled runs and fire-and-forget execution.
        """
        try:
            with DapsDB(self.logger) as db:
                result = db.worker.enqueue_job(
                    table_name="jobs",
                    payload={
                        "module_name": module_name,
                        "origin": origin,
                        "immediate": False,
                    },
                    job_type="module_run",
                    extra_fields={"priority": 0},  # Normal priority
                )

            if result["success"]:
                job_id = result["data"]["job_id"]
                self._log(
                    "info",
                    f"Enqueued async module run: {module_name} (job {job_id})",
                    origin,
                )

            return result

        except Exception as e:
            self._log("error", f"Error in run_module_async: {e}", origin, exc_info=True)
            return {
                "success": False,
                "message": f"Error queueing module: {str(e)}",
                "error_code": "ENQUEUE_ERROR",
            }

    def run_module_cli(self, module_names: list) -> None:
        """
        Simple CLI execution without job queue overhead.
        Runs modules directly for command-line usage.
        """
        self._log("info", f"CLI mode: Running modules {module_names}", "cli")

        try:
            for name in module_names:
                if name not in MODULES:
                    self._log("error", f"Unknown module: {name}", "cli")
                    continue

                module_class = MODULES[name]
                self._log("info", f"Running CLI module '{name}'...", "cli")

                try:
                    mod = module_class()
                    mod.run()
                    print(f"Module '{name}' completed successfully")
                except Exception as e:
                    print(f"[ERROR] Module '{name}' failed: {e}")
                    raise

            self._log("info", "All CLI modules completed.", "cli")

        except Exception as e:
            self._log("error", f"Error in run_modules_cli: {e}", "cli", exc_info=True)
            raise

    def get_module_status(self, module_name: str) -> Dict[str, Any]:
        """
        Get current status of a module by checking active jobs.
        """
        try:
            if self.db:
                # Use shared database directly
                running_job = self.db.worker.get_running_module_job(module_name)
            else:
                # Create own context
                with DapsDB(self.logger) as db:
                    running_job = db.worker.get_running_module_job(module_name)

            if running_job:
                return {
                    "module": module_name,
                    "running": True,
                    "job_id": running_job["job_id"],
                    "origin": running_job["origin"],
                }

            return {
                "module": module_name,
                "running": False,
                "job_id": None,
                "origin": None,
            }

        except Exception as e:
            self._log("error", f"Error getting module status: {e}", exc_info=True)
            return {
                "module": module_name,
                "running": False,
                "job_id": None,
                "origin": None,
            }

    def cancel_module(self, module_name: str) -> Dict[str, Any]:
        """
        Cancel a running module by terminating its job.
        """
        try:
            status = self.get_module_status(module_name)

            if not status["running"]:
                return {
                    "success": False,
                    "message": "Module not running",
                    "error_code": "MODULE_NOT_RUNNING",
                }

            job_id = status["job_id"]
            # For now, we'll mark the job as failed to stop it
            # In a more sophisticated implementation, we could send signals
            with DapsDB(self.logger) as db:
                db.worker.mark_job_failed("jobs", job_id, "Cancelled by user")

            self._log("info", f"Cancelled module {module_name} (job {job_id})")

            return {
                "success": True,
                "message": f"Module {module_name} cancelled successfully",
                "data": {"module": module_name, "job_id": job_id},
            }

        except Exception as e:
            self._log("error", f"Error cancelling module: {e}", exc_info=True)
            return {
                "success": False,
                "message": f"Error cancelling module: {str(e)}",
                "error_code": "CANCEL_ERROR",
            }

    def _wait_for_job_completion(
        self, job_id: int, timeout: int = 300
    ) -> Dict[str, Any]:
        """
        Wait for a job to complete and return its result.
        Used for synchronous API responses.
        """
        start_time = time.time()

        while (time.time() - start_time) < timeout:
            try:
                with DapsDB(self.logger) as db:
                    job = db.worker.get_job_by_id("jobs", job_id)

                    if not job:
                        return {
                            "success": False,
                            "message": "Job not found",
                            "error_code": "JOB_NOT_FOUND",
                        }

                    status = job["status"]

                    if status == "success":
                        import json

                        result = json.loads(job.get("result", "{}"))
                        return {
                            "success": True,
                            "message": "Module completed successfully",
                            "data": {
                                "job_id": job_id,
                                "status": "completed",
                                "result": result,
                            },
                        }

                    elif status == "error":
                        return {
                            "success": False,
                            "message": f"Module failed: {job.get('error', 'Unknown error')}",
                            "error_code": "MODULE_EXECUTION_FAILED",
                            "data": {"job_id": job_id},
                        }

                    elif status in ("pending", "running"):
                        # Still processing, continue waiting
                        time.sleep(1)
                        continue

                    else:
                        return {
                            "success": False,
                            "message": f"Unexpected job status: {status}",
                            "error_code": "UNEXPECTED_STATUS",
                        }

            except Exception as e:
                self._log("error", f"Error polling job {job_id}: {e}", exc_info=True)
                time.sleep(1)

        # Timeout reached
        return {
            "success": False,
            "message": f"Module execution timed out after {timeout} seconds",
            "error_code": "EXECUTION_TIMEOUT",
            "data": {"job_id": job_id},
        }
