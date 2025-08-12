from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends

from api.utils import error, get_database, get_logger, ok
from util.database import DapsDB

router = APIRouter()


@router.get("/api/jobs/{job_id}")
async def get_job_detail(
    job_id: int, logger: Any = Depends(get_logger), db: DapsDB = Depends(get_database)
) -> Dict[str, Any]:
    """Retrieve job details by ID."""
    try:
        job = db.worker.get_job_by_id("jobs", job_id)

        if not job:
            return error(f"Job {job_id} not found", "JOB_NOT_FOUND", status_code=404)

        return ok(f"Job {job_id} details retrieved", {"job": job})

    except Exception as e:
        logger.error(f"Error fetching job {job_id}: {e}")
        return error(
            f"Error retrieving job details: {str(e)}",
            "JOB_RETRIEVAL_ERROR",
            status_code=500,
        )


@router.get("/api/jobs")
async def list_jobs(
    status: Optional[str] = None,
    limit: int = 50,
    logger: Any = Depends(get_logger),
    db: DapsDB = Depends(get_database),
) -> Dict[str, Any]:
    """List jobs with optional status filter."""
    try:
        result = db.worker.list_jobs(status=status, limit=limit)

        if isinstance(result, dict) and "success" in result:
            return result
        else:
            return ok(
                f"Retrieved jobs list (limit: {limit})",
                result if result else {"jobs": []},
            )

    except Exception as e:
        logger.error(f"Error listing jobs: {e}")
        return error(
            f"Error listing jobs: {str(e)}", "JOBS_LIST_ERROR", status_code=500
        )


@router.get("/api/jobs/stats")
async def get_job_stats(
    logger: Any = Depends(get_logger), db: DapsDB = Depends(get_database)
) -> Dict[str, Any]:
    """Retrieve job statistics."""
    try:
        result = db.worker.job_stats("jobs", error_limit=10)

        if isinstance(result, dict) and "success" in result:
            return result
        else:
            return ok("Job statistics retrieved", result if result else {"stats": {}})

    except Exception as e:
        logger.error(f"Error fetching job stats: {e}")
        return error(
            f"Error retrieving job statistics: {str(e)}",
            "JOB_STATS_ERROR",
            status_code=500,
        )


@router.post("/api/job/{job_id}/retry")
async def retry_job(
    job_id: int, logger: Any = Depends(get_logger), db: DapsDB = Depends(get_database)
) -> Dict[str, Any]:
    """Retry a failed job by resetting it to pending status."""
    try:
        success = db.worker.reset_job_to_pending("jobs", job_id)

        if success is None:
            return error(f"Job {job_id} not found", "JOB_NOT_FOUND", status_code=404)
        elif success is False:
            return error(
                "Job cannot be retried (not in error/success state)",
                "JOB_RETRY_INVALID_STATE",
                status_code=400,
            )
        else:
            logger.info(f"Job {job_id} reset to pending for retry")
            return ok(
                f"Job {job_id} queued for retry",
                {"job_id": job_id, "status": "pending"},
            )

    except Exception as e:
        logger.error(f"Error retrying job {job_id}: {e}")
        return error(
            f"Error retrying job: {str(e)}", "JOB_RETRY_ERROR", status_code=500
        )
