import os
from pathlib import Path
from typing import Any, List

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import FileResponse, JSONResponse

from modules.sync_gdrive import SyncGDrive
from modules.unmatched_assets import UnmatchedAssets
from util.database import DapsDB

router = APIRouter()

ASSET_DIR = "web/static/assets"


def get_webhook_logger(request: Request) -> Any:
    return request.app.state.logger.get_adapter("WEBHOOK")


def get_web_logger(request: Request) -> Any:
    return request.app.state.logger.get_adapter("WEB")


@router.get("/api/matched-posters-stats")
async def matched_posters_stats(logger: Any = Depends(get_web_logger)):
    """
    Returns stats for matched posters.
    """
    logger.debug("Serving GET /api/matched-posters-stats")
    db = DapsDB()
    stats = db.stats.get_matched_posters_stats()
    return {"success": True, "matched_posters_stats": stats}


@router.get("/api/gdrive-stats")
async def get_gdrive_stats(logger: Any = Depends(get_web_logger)):
    """
    Returns GDrive sync stats.
    """
    logger.debug("Serving GET /api/gdrive-stats")
    logger = logger.get_adapter("GDriveStats")
    syncer = SyncGDrive(logger=logger)
    syncer.refresh_all_poster_stats()
    db = DapsDB()
    stats = db.stats.get_gdrive_stats()
    return {"success": True, "gdrive_stats": stats}


@router.get("/api/unmatched-stats")
async def get_unmatched_stats(logger: Any = Depends(get_web_logger)):
    """
    Returns stats for unmatched assets.
    """
    logger.debug("Serving GET /api/unmatched-stats")
    logger = logger.get_adapter("UnmatchedStats")
    unmatched = UnmatchedAssets(logger=logger)
    stats = unmatched.get_stats_adhoc()
    return {"success": True, "summary": stats["summary"]}
    # Maybe will build this out later
    # return {"success": True, "summary": stats["summary"], "unmatched": stats["unmatched"]}


@router.post("/api/gdrive-folder")
async def gdrive_folder(
    gdrive_names: List[str] = Query(..., description="Names of the GDrive folders"),
    logger: Any = Depends(get_web_logger),
    request: Request = None,
):
    """
    Enqueue a sync_gdrive job for each selected GDrive.
    Returns job IDs per drive.
    """
    logger = logger.get_adapter("GDriveFolder")
    logger.debug(f"Serving POST /api/gdrive-folder with names: {gdrive_names}")

    db = request.app.state.db
    started = []
    job_ids = []

    for name in gdrive_names:
        job_result = db.worker.enqueue_job(
            "jobs", payload={"gdrive_name": name}, job_type="sync_gdrive"
        )
        job_id = job_result.get("job_id")
        started.append(name)
        job_ids.append({"name": name, "job_id": job_id})

    # CHANGE: Return single job if only one was enqueued
    if len(job_ids) == 1:
        return {
            "success": True,
            "message": f"Sync for {started[0]} has started.",
            "job_id": job_ids[0]["job_id"],
            "name": job_ids[0]["name"],
        }

    # Otherwise, multi-job result
    return {
        "success": True,
        "message": f"Sync for {', '.join(started)} has started.",
        "jobs": job_ids,
    }


@router.get("/api/get-media-cache")
async def get_media_cache(logger: Any = Depends(get_web_logger)):
    """
    Returns the media cache from the database.
    """
    logger.debug("Serving GET /api/get-media-cache")
    db = DapsDB()
    media_cache = db.media.get_all()
    # Convert rows to dict if not already; assuming get_all() returns list[dict]
    return {"success": True, "media_cache": media_cache}


@router.get("/api/get-collection-cache")
async def get_collection_cache(logger: Any = Depends(get_web_logger)):
    """ "
    Returns the collection cache from the database.
    """
    logger.debug("Serving GET /api/get-collection-cache")
    db = DapsDB()
    collection_cache = db.collection.get_all()
    return {"success": True, "collection_cache": collection_cache}


@router.delete("/api/delete-media-cache/{id}")
async def delete_media_cache_by_id(id: int, logger: Any = Depends(get_web_logger)):
    db = DapsDB()
    logger.debug(f"Serving DELETE /api/delete-media-cache/{id}")
    if not db.media.get_by_id(id):
        return JSONResponse(
            status_code=404,
            content={"success": False, "error": "Media cache not found"},
        )
    db.media.delete_by_id(id)
    logger.info(f"Deleted media_cache id={id}")
    return {"success": True, "deleted_id": id}


@router.delete("/api/delete-collection-cache/{id}")
async def delete_collection_cache_by_id(id: int, logger: Any = Depends(get_web_logger)):
    logger.debug(f"Serving DELETE /api/delete-collection-cache/{id}")
    db = DapsDB()
    if not db.collection.get_by_id(id):
        return JSONResponse(
            status_code=404,
            content={"success": False, "error": "Collection cache not found"},
        )
    db.collection.delete_by_id(id)
    logger.info(f"Deleted collections_cache id={id}")
    return {"success": True, "deleted_id": id}


@router.get("/api/posters")
async def poster_search_stats(
    location: str = None, logger: Any = Depends(get_web_logger)
):
    """Returns stats and file list for a given poster location directory."""
    try:
        logger.debug(f"Serving GET /api/poster-search for location: {location}")
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
    location: str = "", path: str = "", logger: Any = Depends(get_web_logger)
):
    """
    Returns the requested poster image file as a response if it exists.
    Supports both (location + relative path) and absolute path.
    """

    try:
        logger.debug(
            f"Serving GET /api/preview-poster for location: {location}, path: {path}"
        )
        # If path is absolute, serve it directly (but validate allowed location if you want!)
        if path and os.path.isabs(path):
            file_path = Path(path).resolve()
        elif location and path:
            base_dir = Path(location).resolve()
            file_path = (base_dir / path).resolve()
            if not str(file_path).startswith(str(base_dir)):
                return JSONResponse(status_code=403, content={"error": "Invalid path"})
        else:
            return JSONResponse(status_code=400, content={"error": "Missing file path"})

        if not file_path.exists() or not file_path.is_file():
            return JSONResponse(status_code=404, content={"error": "File not found"})

        if file_path.suffix.lower() not in [".jpg", ".jpeg", ".png", ".webp", ".bmp"]:
            return JSONResponse(
                status_code=415, content={"error": "Unsupported file type"}
            )
        return FileResponse(str(file_path))
    except Exception as e:
        logger.error(f"Preview poster error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/api/poster_assets")
def list_poster_assets(logger: Any = Depends(get_web_logger)):
    allowed_ext = {".jpg", ".jpeg", ".png", ".webp"}
    try:
        logger.debug("Serving GET /api/poster_assets")
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
        logger.debug("Serving POST /api/arr-webhook")
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

        result = request.app.state.db.worker.enqueue_job(
            "jobs", job_data, job_type="webhook"
        )

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


@router.post("/api/run/upload/media/{id}")
async def run_upload_by_media_id(
    id: int,
    logger: Any = Depends(get_web_logger),
):
    """
    Triggers upload for a single media cache item by ID.
    """
    logger.debug(f"Serving POST /api/run/upload/media/{id}")
    manifest = {
        "media_cache": [id],
    }
    from util.upload_posters import PosterUploader

    result = PosterUploader(logger=logger, manifest=manifest, force=True).run()
    status_code = 200 if result.get("success") else 500
    return JSONResponse(status_code=status_code, content=result)


@router.post("/api/run/upload/collection/{id}")
async def run_upload_by_collection_id(
    id: int,
    logger: Any = Depends(get_web_logger),
):
    """
    Triggers upload for a single media cache item by ID.
    """
    logger.debug(f"Serving POST /api/run/upload/collection/{id}")
    manifest = {
        "collections_cache": [id],
    }
    from util.upload_posters import PosterUploader

    result = PosterUploader(logger=logger, manifest=manifest, force=True).run()
    status_code = 200 if result.get("success") else 500
    return JSONResponse(status_code=status_code, content=result)


@router.get("/api/run/unmatched")
async def get_run_unmatched(logger: Any = Depends(get_web_logger)):
    pass


@router.post("/api/run/unmatched")
async def run_unmatched(logger: Any = Depends(get_web_logger)):
    pass


@router.post("/api/run/cleanarr")
async def run_cleanarr(logger: Any = Depends(get_web_logger)):
    pass


@router.get("/api/cleanarr")
async def get_cleanarr(logger: Any = Depends(get_web_logger)):
    pass
