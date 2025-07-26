import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, Request
from fastapi.responses import FileResponse, JSONResponse

router = APIRouter()

ASSET_DIR = "web/static/assets"


def get_webhook_logger(request: Request) -> Any:
    return request.app.state.logger.get_adapter({"source": "WEBHOOK"})


def get_web_logger(request: Request) -> Any:
    return request.app.state.logger.get_adapter({"source": "WEB"})


@router.post("/api/poster-search-stats")
async def poster_search_stats(request: Request, logger: Any = Depends(get_web_logger)):
    """Returns stats and file list for a given poster location directory."""
    try:
        data = await request.json()
        location = data.get("location")
        logger.debug(f"Serving POST /api/poster-search-stats for location: {location}")
        if not location or not os.path.isdir(location):
            return JSONResponse(status_code=400, content={"error": "Invalid location"})
        total_size = 0
        poster_files = []
        for root, dirs, files in os.walk(location):
            for f in files:
                fp = os.path.join(root, f)
                try:
                    stat = os.stat(fp)
                    total_size += stat.st_size
                    rel_path = os.path.relpath(fp, location)
                    if rel_path.startswith("tmp" + os.sep) or rel_path.startswith(
                        "tmp/"
                    ):
                        continue
                    poster_files.append(rel_path)
                except Exception as e:
                    logger.error(f"SKIPPED FILE: {fp} | ERROR: {e}")
                    continue
        return {
            "file_count": len(poster_files),
            "size_bytes": total_size,
            "files": sorted(poster_files),
        }
    except Exception as e:
        logger.error(f"poster-search-stats error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/api/preview-poster")
async def preview_poster(
    location: str, path: str, logger: Any = Depends(get_web_logger)
):
    """
    Returns the requested poster image file as a response if it exists within location.
    """
    try:
        base_dir = Path(location).resolve()
        file_path = (base_dir / path).resolve()

        if not str(file_path).startswith(str(base_dir)):
            return JSONResponse(status_code=403, content={"error": "Invalid path"})
        if not file_path.exists() or not file_path.is_file():
            return JSONResponse(status_code=404, content={"error": "File not found"})

        if file_path.suffix.lower() not in [".jpg", ".jpeg", ".png", ".webp", ".bmp"]:
            return JSONResponse(
                status_code=415, content={"error": "Unsupported file type"}
            )
        logger.debug(f"Serving image preview: {file_path}")
        return FileResponse(str(file_path))
    except Exception as e:
        logger.error(f"Preview poster error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/api/poster_assets")
def list_poster_assets():

    allowed_ext = {".jpg", ".jpeg", ".png", ".webp"}
    try:
        files = [
            f
            for f in os.listdir(ASSET_DIR)
            if os.path.isfile(os.path.join(ASSET_DIR, f))
            and os.path.splitext(f)[1].lower() in allowed_ext
        ]
        return JSONResponse(files)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/api/arr-webhook")
async def add_media(request: Request, logger: Any = Depends(get_webhook_logger)):
    try:
        client_info = {
            "client_host": request.client.host if request.client else None,
            "client_port": request.headers.get("X-Service-Port"),
            "headers": dict(request.headers),
            "scheme": getattr(request.url, "scheme", "http"),
        }
        data = await request.json()
        if is_test(data):
            logger.info(
                f"Test event received from {client_info['scheme']}://{client_info['client_host']}:{client_info['client_port']}"
            )
            return {
                "status": 200,
                "success": True,
            }
        job_data = dict(data)
        job_data["_client"] = client_info

        db = request.app.state.db
        result = db.worker.enqueue_job("jobs", job_data, job_type="webhook")

        if not result.get("success"):
            logger.error(
                f"Error persisting webhook: {result.get('message')}", exc_info=True
            )
            return JSONResponse(
                status_code=result.get("status", 500),
                content=result,
            )

        logger.info("Webhook job persisted for async processing.")
        return JSONResponse(
            status_code=200,
            content=result,
        )
    except Exception as e:
        logger.error(f"Exception in webhook enqueue: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error_code": "ENQUEUE_FAIL",
                "message": str(e),
            },
        )


def is_test(data):
    event_type = data.get("eventType", "")
    return isinstance(event_type, str) and "test" in event_type.lower()
