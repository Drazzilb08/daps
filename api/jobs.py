from typing import Any

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from util.database import DapsDB


def get_logger(request: Request, source="JOBS") -> Any:
    return request.app.state.logger.get_adapter(source)


router = APIRouter()


@router.get("/api/jobs")
async def list_jobs(
    status: str = None,
    job_type: str = None,
    limit: int = 50,
    logger: Any = Depends(get_logger),
):
    """
    Lists jobs with optional filtering by status and job type.
    FIXED: Standardized response format.
    """
    if limit < 1 or limit > 1000:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "message": "Limit must be between 1 and 1000",
                "error_code": "INVALID_LIMIT",
            },
        )
    if status not in [None, "pending", "running", "success", "error"]:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "message": "Invalid status. Must be one of: pending, running, success, error",
                "error_code": "INVALID_STATUS",
            },
        )
    if job_type and job_type not in [
        "webhook_process",
        "poster_rename",
        "sync_gdrive",
        "upload_posters",
    ]:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "message": "Invalid job type. Must be one of: webhook_process, poster_rename, sync_gdrive, upload_posters",
                "error_code": "INVALID_JOB_TYPE",
            },
        )

    log = logger.get_adapter("ListJobs")

    try:
        with DapsDB(logger=logger) as db:
            log.debug(
                f"Listing jobs with status={status}, job_type={job_type}, limit={limit}"
            )
            result = db.worker.list_jobs(status, limit)

        if not result["success"]:
            return JSONResponse(status_code=500, content=result)

        jobs = result["data"]["jobs"]

        # Filter by job type if specified
        if job_type:
            jobs = [job for job in jobs if job.get("type") == job_type]

        return {
            "success": True,
            "message": f"Retrieved {len(jobs)} jobs",
            "data": {"jobs": jobs},
        }

    except Exception as e:
        log.error(f"Error listing jobs: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error listing jobs: {str(e)}",
                "error_code": "LIST_JOBS_ERROR",
            },
        )


@router.get("/api/jobs/{job_id}")
async def get_job_detail(
    job_id: int,
    logger: Any = Depends(get_logger),
):
    """
    Retrieves details of a specific job by its ID.
    FIXED: Standardized response format.
    """
    if job_id < 1:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "message": "Job ID must be a positive integer",
                "error_code": "INVALID_JOB_ID",
            },
        )

    log = logger.get_adapter("GetJobDetail")
    log.debug(f"Serving GET /api/jobs/{job_id}")

    try:
        with DapsDB(logger=logger) as db:
            job = db.worker.get_job_by_id("jobs", job_id)

        if job:
            return {
                "success": True,
                "message": f"Job {job_id} retrieved",
                "data": {"job": job},
            }
        else:
            log.warning(f"Job {job_id} not found")
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "message": f"Job {job_id} not found",
                    "error_code": "JOB_NOT_FOUND",
                },
            )

    except Exception as e:
        log.error(f"Error getting job {job_id}: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error retrieving job: {str(e)}",
                "error_code": "GET_JOB_ERROR",
            },
        )


@router.post("/api/jobs/cleanup")
async def cleanup_jobs(
    days: int = 30,
    logger: Any = Depends(get_logger),
):
    """
    Cleans up jobs older than the specified number of days.
    FIXED: Standardized response format.
    """
    if days < 1:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "message": "Days must be at least 1",
                "error_code": "INVALID_DAYS_MIN",
            },
        )
    if days > 365:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "message": "Days cannot exceed 365",
                "error_code": "INVALID_DAYS_MAX",
            },
        )

    log = logger.get_adapter("CleanupJobs")
    log.debug(f"Serving POST /api/jobs/cleanup with days={days}")

    try:
        with DapsDB(logger=logger) as db:
            log.debug(f"Cleaning up jobs older than {days} days")
            result = db.worker.cleanup_jobs("jobs", days=days)

        if result["success"]:
            deleted_count = result["data"]["deleted"]
            log.info(f"Cleaned up {deleted_count} jobs older than {days} days")
            return result
        else:
            return JSONResponse(status_code=500, content=result)

    except Exception as e:
        log.error(f"Error during cleanup: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error during cleanup: {str(e)}",
                "error_code": "CLEANUP_ERROR",
            },
        )


@router.post("/api/jobs/{job_id}/retry")
async def retry_job(
    job_id: int,
    logger: Any = Depends(get_logger),
):
    """
    Retry a failed or completed job.
    FIXED: Standardized response format.
    """
    if job_id < 1:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "message": "Job ID must be a positive integer",
                "error_code": "INVALID_JOB_ID",
            },
        )

    log = logger.get_adapter("RetryJob")
    log.debug(f"Serving POST /api/jobs/{job_id}/retry")

    try:
        with DapsDB(logger=logger) as db:
            reset_result = db.worker.reset_job_to_pending("jobs", job_id)

        if reset_result is None:
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "message": f"Job {job_id} not found",
                    "error_code": "JOB_NOT_FOUND",
                },
            )

        if reset_result is False:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": "Only error/success jobs can be retried",
                    "error_code": "JOB_NOT_RETRYABLE",
                },
            )

        log.info(f"Job {job_id} reset to pending by API")
        return {
            "success": True,
            "message": f"Job {job_id} reset to pending",
            "data": {"job_id": job_id, "status": "pending"},
        }

    except Exception as e:
        log.error(f"Error retrying job {job_id}: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error retrying job: {str(e)}",
                "error_code": "RETRY_JOB_ERROR",
            },
        )


@router.get("/api/jobs/stats")
async def get_job_stats(
    error_limit: int = 10,
    logger: Any = Depends(get_logger),
):
    """
    Get job statistics.
    ADDED: New endpoint for job statistics with standardized response.
    """
    if error_limit < 1 or error_limit > 100:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "message": "Error limit must be between 1 and 100",
                "error_code": "INVALID_ERROR_LIMIT",
            },
        )

    log = logger.get_adapter("JobStats")

    try:
        with DapsDB(logger=logger) as db:
            result = db.worker.job_stats("jobs", error_limit=error_limit)

        return result

    except Exception as e:
        log.error(f"Error getting job stats: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error getting job stats: {str(e)}",
                "error_code": "JOB_STATS_ERROR",
            },
        )
