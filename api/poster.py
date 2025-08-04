import os
from pathlib import Path
from typing import Any, List

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request
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
    db = DapsDB()
    stats = db.stats.get_matched_posters_stats()
    return {"success": True, "matched_posters_stats": stats}


@router.get("/api/gdrive-stats")
async def get_gdrive_stats(logger: Any = Depends(get_web_logger)):
    logger = logger.get_adapter("GDriveStats")
    syncer = SyncGDrive(logger=logger)
    syncer.refresh_all_poster_stats()
    db = DapsDB()
    stats = db.stats.get_gdrive_stats()
    return {"success": True, "gdrive_stats": stats}


@router.get("/api/unmatched-stats")
async def get_unmatched_stats(logger: Any = Depends(get_web_logger)):
    logger = logger.get_adapter("UnmatchedStats")
    unmatched = UnmatchedAssets(logger=logger)
    stats = unmatched.get_stats_adhoc()
    return {"success": True, "summary": stats["summary"]}
    # Maybe will build this out later
    # return {"success": True, "summary": stats["summary"], "unmatched": stats["unmatched"]}


@router.post("/api/gdrive-folder")
async def gdrive_folder(
    background_tasks: BackgroundTasks,
    gdrive_names: List[str] = Query(..., description="Names of the GDrive folders"),
    logger: Any = Depends(get_web_logger),
):
    syncer = SyncGDrive(logger=logger)
    started = []
    for name in gdrive_names:
        background_tasks.add_task(syncer.sync_folder_adhoc, name)
        started.append(name)
    return {
        "success": True,
        "message": f"Sync for {', '.join(started)} has started.",
        "gdrive_names": started,
    }


@router.get("/api/get-media-cache")
async def get_media_cache(logger: Any = Depends(get_web_logger)):
    db = DapsDB()
    media_cache = db.media.get_all()
    # Convert rows to dict if not already; assuming get_all() returns list[dict]
    return {"success": True, "media_cache": media_cache}


@router.get("/api/get-collection-cache")
async def get_collection_cache(logger: Any = Depends(get_web_logger)):
    db = DapsDB()
    collection_cache = db.collection.get_all()
    return {"success": True, "collection_cache": collection_cache}


@router.delete("/api/delete-media-cache/{id}")
async def delete_media_cache_by_id(id: int, logger: Any = Depends(get_web_logger)):
    db = DapsDB()
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
    logger.info(f"DELETE /api/delete-collection-cache/{id}")
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
    import os

    try:
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


@router.put("/api/run/upload/{id}/{instance}")
async def put_run_upload_by_id(logger: Any = Depends(get_web_logger)):
    logger.info("PUT /api/run/upload")
    return {"success": True}


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
