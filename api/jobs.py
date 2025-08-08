# api/jobs.py
from typing import Any

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from util.database import DapsDB

router = APIRouter()


def get_web_logger(request: Request) -> Any:
    return request.app.state.logger.get_adapter("WEB")


@router.get("/api/jobs/{job_id}")
async def get_job_detail(job_id: int, logger: Any = Depends(get_web_logger)):
    """
    Get job details by ID - FIXED: Uses quiet mode to reduce verbose logging
    for polled operations like checking job status.
    """
    try:

        with DapsDB(logger=logger, quiet=True) as db:
            job = db.worker.get_job_by_id("jobs", job_id)

        if not job:
            return JSONResponse(
                status_code=404, content={"success": False, "error": "Job not found"}
            )

        return {"success": True, "job": job}
    except Exception as e:
        logger.error(f"Error fetching job {job_id}: {e}")
        return JSONResponse(
            status_code=500, content={"success": False, "error": str(e)}
        )


@router.get("/api/jobs")
async def list_jobs(
    status: str = None, limit: int = 50, logger: Any = Depends(get_web_logger)
):
    """
    List jobs with optional status filter.
    """
    try:

        with DapsDB(logger=logger, quiet=True) as db:
            result = db.worker.list_jobs(status=status, limit=limit)

        return result
    except Exception as e:
        logger.error(f"Error listing jobs: {e}")
        return JSONResponse(
            status_code=500, content={"success": False, "error": str(e)}
        )


@router.get("/api/jobs/stats")
async def get_job_stats(logger: Any = Depends(get_web_logger)):
    """
    Get job statistics - also uses quiet mode.
    """
    try:

        with DapsDB(logger=logger, quiet=True) as db:
            result = db.worker.job_stats("jobs", error_limit=10)

        return result
    except Exception as e:
        logger.error(f"Error fetching job stats: {e}")
        return JSONResponse(
            status_code=500, content={"success": False, "error": str(e)}
        )


@router.post("/api/job/{job_id}/retry")
async def retry_job(job_id: int, logger: Any = Depends(get_web_logger)):
    """
    Retry a failed job by resetting it to pending status.
    """
    try:
        with DapsDB(logger=logger) as db:
            success = db.worker.reset_job_to_pending("jobs", job_id)

        if success is None:
            return JSONResponse(
                status_code=404, content={"success": False, "error": "Job not found"}
            )
        elif success is False:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Job cannot be retried (not in error/success state)",
                },
            )
        else:
            logger.info(f"Job {job_id} reset to pending for retry")
            return {
                "success": True,
                "message": f"Job {job_id} reset to pending for retry",
            }
    except Exception as e:
        logger.error(f"Error retrying job {job_id}: {e}")
        return JSONResponse(
            status_code=500, content={"success": False, "error": str(e)}
        )
