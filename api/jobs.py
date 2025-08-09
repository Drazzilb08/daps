from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from util.database import DapsDB

router = APIRouter()


def get_web_logger(request: Request) -> Any:
    """Get web logger adapter from app state."""
    return request.app.state.logger.get_adapter("WEB")


@router.get("/api/jobs/{job_id}")
async def get_job_detail(
    job_id: int, logger: Any = Depends(get_web_logger)
) -> Dict[str, Any]:
    """
    Retrieve job details by ID.

    Uses quiet mode to reduce verbose logging for polled operations.
    """
    try:
        with DapsDB(logger=logger, quiet=True) as db:
            job = db.worker.get_job_by_id("jobs", job_id)

        if not job:
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "message": f"Job {job_id} not found",
                    "error_code": "JOB_NOT_FOUND",
                },
            )

        return {
            "success": True,
            "message": f"Job {job_id} details retrieved",
            "data": {"job": job},
        }

    except Exception as e:
        logger.error(f"Error fetching job {job_id}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error retrieving job details: {str(e)}",
                "error_code": "JOB_RETRIEVAL_ERROR",
            },
        )


@router.get("/api/jobs")
async def list_jobs(
    status: Optional[str] = None, limit: int = 50, logger: Any = Depends(get_web_logger)
) -> Dict[str, Any]:
    """
    List jobs with optional status filter.

    Returns paginated list of jobs, optionally filtered by status.
    """
    try:
        with DapsDB(logger=logger, quiet=True) as db:
            result = db.worker.list_jobs(status=status, limit=limit)

        # Ensure the result follows our standard format
        if isinstance(result, dict) and "success" in result:
            return result
        else:
            return {
                "success": True,
                "message": f"Retrieved jobs list (limit: {limit})",
                "data": result if result else {"jobs": []},
            }

    except Exception as e:
        logger.error(f"Error listing jobs: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error listing jobs: {str(e)}",
                "error_code": "JOBS_LIST_ERROR",
            },
        )


@router.get("/api/jobs/stats")
async def get_job_stats(logger: Any = Depends(get_web_logger)) -> Dict[str, Any]:
    """
    Retrieve job statistics.

    Returns aggregated statistics about job status and recent errors.
    """
    try:
        with DapsDB(logger=logger, quiet=True) as db:
            result = db.worker.job_stats("jobs", error_limit=10)

        # Ensure the result follows our standard format
        if isinstance(result, dict) and "success" in result:
            return result
        else:
            return {
                "success": True,
                "message": "Job statistics retrieved",
                "data": result if result else {"stats": {}},
            }

    except Exception as e:
        logger.error(f"Error fetching job stats: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error retrieving job statistics: {str(e)}",
                "error_code": "JOB_STATS_ERROR",
            },
        )


@router.post("/api/job/{job_id}/retry")
async def retry_job(
    job_id: int, logger: Any = Depends(get_web_logger)
) -> Dict[str, Any]:
    """
    Retry a failed job by resetting it to pending status.

    Only jobs in error or success state can be retried.
    """
    try:
        with DapsDB(logger=logger) as db:
            success = db.worker.reset_job_to_pending("jobs", job_id)

        if success is None:
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "message": f"Job {job_id} not found",
                    "error_code": "JOB_NOT_FOUND",
                },
            )
        elif success is False:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": "Job cannot be retried (not in error/success state)",
                    "error_code": "JOB_RETRY_INVALID_STATE",
                },
            )
        else:
            logger.info(f"Job {job_id} reset to pending for retry")
            return {
                "success": True,
                "message": f"Job {job_id} queued for retry",
                "data": {"job_id": job_id, "status": "pending"},
            }

    except Exception as e:
        logger.error(f"Error retrying job {job_id}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error retrying job: {str(e)}",
                "error_code": "JOB_RETRY_ERROR",
            },
        )
