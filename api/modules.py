# api/modules.py

from typing import Any

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from api.utils import error, get_database, get_logger, ok
from util.database import DapsDB


class RunRequest(BaseModel):
    module: str


class CancelRequest(BaseModel):
    module: str


router = APIRouter()


def get_module_orchestrator(request: Request):
    """Dependency injection for module orchestrator"""
    orchestrator = getattr(request.app.state, "module_orchestrator", None)
    if orchestrator is None:
        raise RuntimeError("ModuleOrchestrator not available in app state")
    return orchestrator


@router.post("/api/run")
async def run_module(
    request: Request,
    data: RunRequest,
    logger: Any = Depends(get_logger),
    orchestrator=Depends(get_module_orchestrator),
):
    """Run a module immediately via job queue with polling"""
    module = data.module
    logger.debug("Serving POST /api/run for module: %s", module)

    try:
        # Check if module is already running
        status = orchestrator.get_module_status(module)
        if status["running"]:
            logger.warning(f"Module {module} is already running")
            return error(
                f"Module {module} is already running",
                code="MODULE_ALREADY_RUNNING",
                status_code=400,
            )

        # Run module immediately (will wait for completion)
        result = orchestrator.run_module_immediate(module, origin="web")

        if result["success"]:
            logger.info(f"Successfully completed module: {module}")
            return ok(
                f"Module {module} completed successfully",
                data=result.get("data", {"module": module, "status": "completed"}),
            )
        else:
            logger.error(f"Module {module} failed: {result['message']}")
            return error(
                result["message"],
                code=result.get("error_code", "MODULE_EXECUTION_FAILED"),
                status_code=500,
            )

    except Exception as e:
        logger.error(f"Error running module {module}: {e}", exc_info=True)
        return error(
            f"Error running module: {str(e)}",
            code="MODULE_START_ERROR",
            status_code=500,
        )


@router.get("/api/status")
async def module_status(
    request: Request,
    module: str,
    logger: Any = Depends(get_logger),
    orchestrator=Depends(get_module_orchestrator),
):
    """Get module status via job queue"""
    try:
        status = orchestrator.get_module_status(module)

        return ok(f"Status retrieved for module {module}", data=status)

    except Exception as e:
        logger.error(f"Error getting status for module {module}: {e}")
        return error(
            f"Error getting module status: {str(e)}",
            code="MODULE_STATUS_ERROR",
            status_code=500,
        )


@router.post("/api/cancel")
async def cancel_module(
    request: Request,
    data: CancelRequest,
    logger: Any = Depends(get_logger),
    orchestrator=Depends(get_module_orchestrator),
):
    """Cancel a running module via job queue"""
    module = data.module

    try:
        result = orchestrator.cancel_module(module)

        if result["success"]:
            logger.info(f"Successfully cancelled module: {module}")
            return ok(
                result["message"],
                data=result.get("data", {"module": module, "status": "cancelled"}),
            )
        else:
            return error(
                result["message"],
                code=result.get("error_code", "MODULE_CANCEL_FAILED"),
                status_code=400,
            )

    except Exception as e:
        logger.error(f"Error cancelling module {module}: {e}")
        return error(
            f"Error cancelling module: {str(e)}",
            code="MODULE_CANCEL_ERROR",
            status_code=500,
        )


@router.get("/api/run_state")
async def get_all_run_states(
    request: Request,
    logger: Any = Depends(get_logger),
    db: DapsDB = Depends(get_database),
):
    """Get all run states from database"""
    try:
        run_states = db.run_state.get_all()

        return ok(
            f"Retrieved {len(run_states)} run states", data={"run_states": run_states}
        )

    except Exception as e:
        logger.error(f"Error getting run states: {e}")
        return error(
            f"Error getting run states: {str(e)}",
            code="RUN_STATE_ERROR",
            status_code=500,
        )


# Additional job-related endpoints for monitoring
@router.get("/api/job/{job_id}")
async def get_job_status(
    request: Request,
    job_id: int,
    logger: Any = Depends(get_logger),
    db: DapsDB = Depends(get_database),
):
    """Get status of a specific job"""
    try:
        job = db.worker.get_job_by_id("jobs", job_id)

        if not job:
            return error(
                f"Job {job_id} not found", code="JOB_NOT_FOUND", status_code=404
            )

        return ok(f"Job {job_id} status retrieved", data={"job": job})

    except Exception as e:
        logger.error(f"Error getting job {job_id}: {e}")
        return error(
            f"Error getting job status: {str(e)}",
            code="JOB_STATUS_ERROR",
            status_code=500,
        )


@router.get("/api/jobs")
async def list_jobs(
    request: Request,
    status: str = None,
    limit: int = 50,
    logger: Any = Depends(get_logger),
    db: DapsDB = Depends(get_database),
):
    """List recent jobs with optional filtering"""
    try:
        result = db.worker.list_jobs(status=status, limit=limit)

        if result["success"]:
            return ok(result["message"], data=result["data"])
        else:
            return error(
                result["message"],
                code=result.get("error_code", "LIST_JOBS_ERROR"),
                status_code=500,
            )

    except Exception as e:
        logger.error(f"Error listing jobs: {e}")
        return error(
            f"Error listing jobs: {str(e)}", code="LIST_JOBS_ERROR", status_code=500
        )


@router.get("/api/jobs/stats")
async def get_job_stats(
    request: Request,
    logger: Any = Depends(get_logger),
    db: DapsDB = Depends(get_database),
):
    """Get job queue statistics"""
    try:
        result = db.worker.job_stats("jobs")

        if result["success"]:
            return ok(result["message"], data={"stats": result["data"]})
        else:
            return error(
                result["message"],
                code=result.get("error_code", "JOB_STATS_ERROR"),
                status_code=500,
            )

    except Exception as e:
        logger.error(f"Error getting job stats: {e}")
        return error(
            f"Error getting job stats: {str(e)}",
            code="JOB_STATS_ERROR",
            status_code=500,
        )


@router.post("/api/job/{job_id}/retry")
async def retry_job(
    request: Request,
    job_id: int,
    logger: Any = Depends(get_logger),
    db: DapsDB = Depends(get_database),
):
    """Retry a failed job"""
    try:
        success = db.worker.reset_job_to_pending("jobs", job_id)

        if success is None:
            return error(
                f"Job {job_id} not found", code="JOB_NOT_FOUND", status_code=404
            )
        elif success is False:
            return error(
                f"Job {job_id} cannot be retried (not in error/success state)",
                code="JOB_NOT_RETRYABLE",
                status_code=400,
            )
        else:
            logger.info(f"Job {job_id} reset to pending for retry")
            return ok(f"Job {job_id} queued for retry", data={"job_id": job_id})

    except Exception as e:
        logger.error(f"Error retrying job {job_id}: {e}")
        return error(
            f"Error retrying job: {str(e)}", code="JOB_RETRY_ERROR", status_code=500
        )
