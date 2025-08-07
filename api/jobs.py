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
    """
    if limit < 1 or limit > 1000:
        return JSONResponse(
            status_code=400,
            content={"error": "Limit must be between 1 and 1000"},
        )
    if status not in [None, "pending", "running", "success", "error"]:
        return JSONResponse(
            status_code=400,
            content={
                "error": "Invalid status. Must be one of: pending, running, done, error"
            },
        )
    if job_type and job_type not in ["poster", "border", "cleanarr", "gdrive", "sync"]:
        return JSONResponse(
            status_code=400,
            content={
                "error": "Invalid job type. Must be one of: poster, border, cleanarr, gdrive, sync"
            },
        )
    logger = logger.get_adapter("ListJobs")
    db = DapsDB(logger=logger)
    logger.debug(
        f"Listing jobs with status={status}, job_type={job_type}, limit={limit}"
    )
    jobs = db.worker.list_jobs(status, limit)
    if job_type:
        jobs["jobs"] = [job for job in jobs["jobs"] if job.get("type") == job_type]
    return jobs


@router.get("/api/jobs/{job_id}")
async def get_job_detail(
    job_id: int,
    logger: Any = Depends(get_logger),
):
    """Retrieves details of a specific job by its ID."""
    if job_id < 1:
        return JSONResponse(
            status_code=400,
            content={"error": "Job ID must be a positive integer"},
        )

    logger = logger.get_adapter("GetJobDetail")
    logger.debug(f"Serving GET /api/jobs/{job_id}")
    db = DapsDB(logger=logger)
    job = db.worker.get_job_by_id("jobs", job_id)
    if job:
        return job
    else:
        logger.warning(f"Job {job_id} not found")
        return JSONResponse(status_code=404, content={"error": "Job not found"})


@router.post("/api/jobs/cleanup")
async def cleanup_jobs(
    days: int = 30,
    logger: Any = Depends(get_logger),
):
    """
    Cleans up jobs older than the specified number of days.
    """
    logger.debug(f"Serving POST /api/jobs/cleanup with days={days}")
    if days < 1:
        return JSONResponse(
            status_code=400,
            content={"error": "Days must be at least 1"},
        )
    if days > 365:
        return JSONResponse(
            status_code=400,
            content={"error": "Days cannot exceed 365"},
        )
    # Initialize the database connection
    logger = logger.get_adapter("CleanupJobs")
    logger.debug(f"Initializing DapsDB for cleanup with days={days}")
    db = DapsDB(logger=logger)
    logger.info(f"Cleaning up jobs older than {days} days")
    deleted = db.worker.cleanup_jobs("jobs", days=days)
    logger.info(f"Cleaned up {deleted} jobs older than {days} days")
    return {"deleted": deleted, "days": days}


@router.post("/api/jobs/{job_id}/retry")
async def retry_job(
    job_id: int,
    logger: Any = Depends(get_logger),
):
    db = DapsDB(logger=logger)
    logger.debug(f"Serving POST /api/jobs/{job_id}/retry")
    if job_id < 1:
        return JSONResponse(
            status_code=400,
            content={"error": "Job ID must be a positive integer"},
        )
    # Reset the job to pending state
    logger.info(f"Retrying job {job_id}")
    reset_result = db.worker.reset_job_to_pending("jobs", job_id)
    if reset_result is None:
        return JSONResponse(status_code=404, content={"error": "Job not found"})
    if reset_result is False:
        return JSONResponse(
            status_code=400,
            content={"error": "Only error/done jobs can be retried"},
        )
    logger.info(f"Job {job_id} reset to pending by API")
    return {"status": "reset", "job_id": job_id}
