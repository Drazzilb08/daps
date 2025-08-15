import os
from pathlib import Path
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import FileResponse, JSONResponse

from api.utils import get_database
from modules.sync_gdrive import SyncGDrive
from modules.unmatched_assets import UnmatchedAssets
from util.database import DapsDB

router = APIRouter()

# ASSET_DIR removed - posters now served from /posters/ static mount


def get_webhook_logger(request: Request) -> Any:
    """Get webhook logger adapter from app state."""
    return request.app.state.logger.get_adapter("WEBHOOK")


def get_web_logger(request: Request) -> Any:
    """Get web logger adapter from app state."""
    return request.app.state.logger.get_adapter("WEB")


@router.get("/api/posters/matched/stats")
async def matched_posters_stats(
    logger: Any = Depends(get_web_logger), db: DapsDB = Depends(get_database)
) -> Dict[str, Any]:
    """
    Retrieve statistics for matched posters.

    Returns aggregated statistics about matched poster operations.
    """
    try:
        logger.debug("Serving GET /api/posters/matched/stats")

        stats = db.stats.get_matched_posters_stats()

        return {
            "success": True,
            "message": "Matched posters statistics retrieved",
            "data": {"matched_posters_stats": stats},
        }

    except Exception as e:
        logger.error(f"Error retrieving matched posters stats: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error retrieving matched posters statistics: {str(e)}",
                "error_code": "MATCHED_POSTERS_STATS_ERROR",
            },
        )


@router.get("/api/gdrive/stats")
async def get_gdrive_stats(
    logger: Any = Depends(get_web_logger), db: DapsDB = Depends(get_database)
) -> Dict[str, Any]:
    """
    Retrieve GDrive synchronization statistics.

    Refreshes poster statistics and returns current GDrive sync data.
    """
    try:
        logger.debug("Serving GET /api/gdrive/stats")
        gdrive_logger = logger.get_adapter("GDriveStats")

        syncer = SyncGDrive(logger=gdrive_logger)
        syncer.refresh_all_poster_stats()

        stats = db.stats.get_gdrive_stats()

        return {
            "success": True,
            "message": "GDrive statistics retrieved and refreshed",
            "data": {"gdrive_stats": stats},
        }

    except Exception as e:
        logger.error(f"Error retrieving GDrive stats: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error retrieving GDrive statistics: {str(e)}",
                "error_code": "GDRIVE_STATS_ERROR",
            },
        )


@router.get("/api/posters/unmatched/stats")
async def get_unmatched_stats(logger: Any = Depends(get_web_logger)) -> Dict[str, Any]:
    """
    Retrieve statistics for unmatched assets.

    Analyzes unmatched assets and returns summary statistics.
    """
    try:
        logger.debug("Serving GET /api/posters/unmatched/stats")
        unmatched_logger = logger.get_adapter("UnmatchedStats")

        unmatched = UnmatchedAssets(logger=unmatched_logger)
        stats = unmatched.get_stats_adhoc()

        return {
            "success": True,
            "message": "Unmatched assets statistics retrieved",
            "data": {"summary": stats.get("summary", {})},
        }

    except Exception as e:
        logger.error(f"Error retrieving unmatched stats: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error retrieving unmatched assets statistics: {str(e)}",
                "error_code": "UNMATCHED_STATS_ERROR",
            },
        )


@router.post("/api/run/gdrive")
async def gdrive_folder(
    gdrive_names: List[str] = Query(..., description="Names of the GDrive folders"),
    logger: Any = Depends(get_web_logger),
    db: DapsDB = Depends(get_database),
) -> Dict[str, Any]:
    """
    Enqueue GDrive synchronization jobs for selected folders.

    Creates sync jobs for each specified GDrive folder and returns job information.
    """
    try:
        gdrive_logger = logger.get_adapter("GDriveFolder")
        gdrive_logger.debug(f"Serving POST /api/run/gdrive with names: {gdrive_names}")

        if not gdrive_names:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": "At least one GDrive folder name is required",
                    "error_code": "GDRIVE_NAMES_REQUIRED",
                },
            )

        started = []
        job_ids = []

        for name in gdrive_names:
            job_result = db.worker.enqueue_job(
                "jobs", payload={"gdrive_name": name}, job_type="sync_gdrive"
            )
            job_id = job_result.get("data", {}).get("job_id")
            started.append(name)
            job_ids.append({"name": name, "job_id": job_id})

        if len(job_ids) == 1:
            return {
                "success": True,
                "message": f"GDrive sync started for '{started[0]}'",
                "data": {"job_id": job_ids[0]["job_id"], "name": job_ids[0]["name"]},
            }

        return {
            "success": True,
            "message": f"GDrive sync started for {len(started)} folders: {', '.join(started)}",
            "data": {"jobs": job_ids},
        }

    except Exception as e:
        logger.error(f"Error starting GDrive sync: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error starting GDrive synchronization: {str(e)}",
                "error_code": "GDRIVE_SYNC_START_ERROR",
            },
        )


@router.get("/api/cache/media")
async def get_media_cache(
    logger: Any = Depends(get_web_logger), db: DapsDB = Depends(get_database)
) -> Dict[str, Any]:
    """
    Retrieve the media cache from the database.

    Returns all cached media items for display and management.
    """
    try:
        logger.debug("Serving GET /api/cache/media")

        media_cache = db.media.get_all()

        return {
            "success": True,
            "message": f"Retrieved {len(media_cache) if media_cache else 0} media cache items",
            "data": {"media_cache": media_cache or []},
        }

    except Exception as e:
        logger.error(f"Error retrieving media cache: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error retrieving media cache: {str(e)}",
                "error_code": "MEDIA_CACHE_RETRIEVAL_ERROR",
            },
        )


@router.get("/api/cache/collection")
async def get_collection_cache(
    logger: Any = Depends(get_web_logger), db: DapsDB = Depends(get_database)
) -> Dict[str, Any]:
    """
    Retrieve the collection cache from the database.

    Returns all cached collection items for display and management.
    """
    try:
        logger.debug("Serving GET /api/cache/collection")

        collection_cache = db.collection.get_all()

        return {
            "success": True,
            "message": f"Retrieved {len(collection_cache) if collection_cache else 0} collection cache items",
            "data": {"collection_cache": collection_cache or []},
        }

    except Exception as e:
        logger.error(f"Error retrieving collection cache: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error retrieving collection cache: {str(e)}",
                "error_code": "COLLECTION_CACHE_RETRIEVAL_ERROR",
            },
        )


@router.get("/api/cache/plex")
async def get_plex_cache(
    logger: Any = Depends(get_web_logger), db: DapsDB = Depends(get_database)
) -> Dict[str, Any]:
    """
    Retrieve the plex media cache from the database.

    Returns all cached plex media items for display and management.
    """
    try:
        logger.debug("Serving GET /api/cache/plex")

        plex_cache = db.plex.get_all()

        return {
            "success": True,
            "message": f"Retrieved {len(plex_cache) if plex_cache else 0} plex cache items",
            "data": {"plex_media_cache": plex_cache or []},
        }

    except Exception as e:
        logger.error(f"Error retrieving plex cache: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error retrieving plex cache: {str(e)}",
                "error_code": "PLEX_CACHE_RETRIEVAL_ERROR",
            },
        )


@router.post("/api/cache/refresh")
async def refresh_cache(
    request: Request,
    logger: Any = Depends(get_web_logger),
    db: DapsDB = Depends(get_database),
) -> Dict[str, Any]:
    """Refresh database caches based on payload configuration."""
    try:
        payload = await request.json()
        logger.debug(f"Serving POST /api/cache/refresh with payload: {payload}")

        # Extract refresh configuration
        arr_instances = payload.get("arr_instances", [])
        plex_instances = payload.get("plex_instances", [])
        libraries = payload.get("libraries", [])
        update_mappings = payload.get("update_mappings", False)

        # Create a background job for cache refresh
        job_payload = {
            "arr_instances": arr_instances,
            "plex_instances": plex_instances,
            "libraries": libraries,
            "update_mappings": update_mappings,
        }

        # Use existing job system
        result = db.worker.enqueue_job("jobs", job_payload, job_type="cache_refresh")

        if result.get("success"):
            job_id = result.get("data", {}).get("job_id")
            logger.info(f"Cache refresh job queued: {job_id}")
            return {
                "success": True,
                "message": "Cache refresh initiated",
                "data": {"job_id": job_id},
            }
        else:
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "message": f"Error enqueuing cache refresh: {result.get('message', 'Unknown error')}",
                    "error_code": "CACHE_REFRESH_ENQUEUE_ERROR",
                },
            )

    except Exception as e:
        logger.error(f"Error serving POST /api/cache/refresh: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error initiating cache refresh: {str(e)}",
                "error_code": "CACHE_REFRESH_ERROR",
            },
        )


@router.delete("/api/cache/media/{id}")
async def delete_media_cache_by_id(
    id: int, logger: Any = Depends(get_web_logger), db: DapsDB = Depends(get_database)
) -> Dict[str, Any]:
    """
    Delete a media cache item by ID.

    Removes the specified media cache entry from the database.
    """
    try:
        logger.debug(f"Serving DELETE /api/cache/media/{id}")

        if not db.media.get_by_id(id):
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "message": f"Media cache item {id} not found",
                    "error_code": "MEDIA_CACHE_NOT_FOUND",
                },
            )
        db.media.delete_by_id(id)

        logger.info(f"Deleted media cache item id={id}")
        return {
            "success": True,
            "message": f"Media cache item {id} deleted successfully",
            "data": {"deleted_id": id},
        }

    except Exception as e:
        logger.error(f"Error deleting media cache item {id}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error deleting media cache item: {str(e)}",
                "error_code": "MEDIA_CACHE_DELETE_ERROR",
            },
        )


@router.delete("/api/cache/collection/{id}")
async def delete_collection_cache_by_id(
    id: int, logger: Any = Depends(get_web_logger), db: DapsDB = Depends(get_database)
) -> Dict[str, Any]:
    """
    Delete a collection cache item by ID.

    Removes the specified collection cache entry from the database.
    """
    try:
        logger.debug(f"Serving DELETE /api/cache/collection/{id}")

        if not db.collection.get_by_id(id):
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "message": f"Collection cache item {id} not found",
                    "error_code": "COLLECTION_CACHE_NOT_FOUND",
                },
            )
        db.collection.delete_by_id(id)

        logger.info(f"Deleted collection cache item id={id}")
        return {
            "success": True,
            "message": f"Collection cache item {id} deleted successfully",
            "data": {"deleted_id": id},
        }

    except Exception as e:
        logger.error(f"Error deleting collection cache item {id}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error deleting collection cache item: {str(e)}",
                "error_code": "COLLECTION_CACHE_DELETE_ERROR",
            },
        )


@router.get("/api/posters")
async def poster_search_stats(
    location: str = None, logger: Any = Depends(get_web_logger)
) -> Dict[str, Any]:
    """
    Retrieve poster statistics and file listing for a directory.

    Analyzes the specified location and returns file count, total size, and file list.
    """
    try:
        logger.debug(f"Serving GET /api/posters for location: {location}")

        if not location:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": "Location parameter is required",
                    "error_code": "LOCATION_REQUIRED",
                },
            )

        if not os.path.isdir(location):
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": f"Invalid location: '{location}' is not a directory",
                    "error_code": "INVALID_LOCATION",
                },
            )

        total_size = 0
        poster_files = []

        for root, dirs, files in os.walk(location):
            for f in files:
                fp = os.path.join(root, f)
                try:
                    stat = os.stat(fp)
                    total_size += stat.st_size
                    rel_path = os.path.relpath(fp, location)

                    # Skip temporary files
                    if rel_path.startswith("tmp" + os.sep) or rel_path.startswith(
                        "tmp/"
                    ):
                        continue

                    poster_files.append(rel_path)
                except Exception as e:
                    logger.error(f"Skipped file {fp}: {e}")
                    continue

        return {
            "success": True,
            "message": f"Analyzed location '{location}' - found {len(poster_files)} files",
            "data": {
                "file_count": len(poster_files),
                "size_bytes": total_size,
                "files": sorted(poster_files),
            },
        }

    except Exception as e:
        logger.error(f"Error analyzing poster location: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error analyzing poster location: {str(e)}",
                "error_code": "POSTER_ANALYSIS_ERROR",
            },
        )


@router.get("/api/poster/preview")
async def preview_poster(
    location: str = "", path: str = "", logger: Any = Depends(get_web_logger)
) -> FileResponse:
    """
    Return poster image file for preview.

    Supports both absolute paths and location + relative path combinations.
    Includes security checks to prevent directory traversal attacks.
    """
    try:
        logger.debug(
            f"Serving GET /api/poster/preview for location: {location}, path: {path}"
        )

        if path and os.path.isabs(path):
            file_path = Path(path).resolve()
        elif location and path:
            base_dir = Path(location).resolve()
            file_path = (base_dir / path).resolve()

            # Security check: ensure resolved path is within base directory
            if not str(file_path).startswith(str(base_dir)):
                return JSONResponse(
                    status_code=403,
                    content={
                        "success": False,
                        "message": "Access denied - path outside allowed directory",
                        "error_code": "PATH_TRAVERSAL_DENIED",
                    },
                )
        else:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": "Either absolute path or location + relative path required",
                    "error_code": "MISSING_FILE_PATH",
                },
            )

        if not file_path.exists() or not file_path.is_file():
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "message": "Poster file not found",
                    "error_code": "POSTER_FILE_NOT_FOUND",
                },
            )

        allowed_extensions = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
        if file_path.suffix.lower() not in allowed_extensions:
            return JSONResponse(
                status_code=415,
                content={
                    "success": False,
                    "message": f"Unsupported file type: {file_path.suffix}",
                    "error_code": "UNSUPPORTED_FILE_TYPE",
                },
            )

        return FileResponse(str(file_path))

    except Exception as e:
        logger.error(f"Error serving poster preview: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error serving poster preview: {str(e)}",
                "error_code": "POSTER_PREVIEW_ERROR",
            },
        )


@router.get("/api/posters/list")
def list_poster_files(logger: Any = Depends(get_web_logger)) -> Dict[str, Any]:
    """
    List available poster files from templates/posters directory.

    Returns just the filenames for dynamic discovery by frontend.
    """
    try:
        logger.debug("Serving GET /api/posters/list")

        posters_dir = Path(__file__).parents[1] / "templates" / "posters"
        allowed_extensions = {".jpg", ".jpeg", ".png", ".webp"}

        if not posters_dir.exists():
            return {
                "success": True,
                "message": "Posters directory not found",
                "data": {"files": []},
            }

        files = [
            f.name
            for f in posters_dir.iterdir()
            if f.is_file() and f.suffix.lower() in allowed_extensions
        ]

        return {
            "success": True,
            "message": f"Found {len(files)} poster files",
            "data": {"files": sorted(files)},
        }

    except Exception as e:
        logger.error(f"Error listing poster files: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error listing poster files: {str(e)}",
                "error_code": "POSTER_LIST_ERROR",
            },
        )


@router.post("/api/poster/add")
async def add_media(
    request: Request,
    logger: Any = Depends(get_webhook_logger),
    db: DapsDB = Depends(get_database),
) -> Dict[str, Any]:
    """
    Webhook endpoint for media poster processing.

    Handles webhook events for automated poster renaming and upload processing.
    Creates background jobs for ADHOC poster processing workflow.
    """
    try:
        logger.debug("Serving POST /api/poster/add")

        client_info = {
            "client_host": request.client.host if request.client else None,
            "client_port": request.headers.get("X-Service-Port"),
            "headers": dict(request.headers),
            "scheme": getattr(request.url, "scheme", "http"),
        }

        data = await request.json()

        if _is_test_event(data):
            logger.info(
                f"Test event received from {client_info['scheme']}://{client_info['client_host']}:{client_info['client_port']}"
            )
            return {
                "success": True,
                "message": "Test webhook received successfully",
                "data": {"event_type": "test"},
            }

        job_data = {"webhook_data": data, "client_info": client_info}

        result = db.worker.enqueue_job("jobs", job_data, job_type="webhook")

        if not result.get("success"):
            logger.error(f"Error persisting webhook: {result.get('message')}")
            return JSONResponse(
                status_code=result.get("status", 500),
                content={
                    "success": False,
                    "message": f"Error enqueuing webhook: {result.get('message', 'Unknown error')}",
                    "error_code": "WEBHOOK_ENQUEUE_ERROR",
                },
            )

        job_id = result.get("data", {}).get("job_id")
        logger.info(f"Webhook job enqueued - processing job ID: {job_id}")

        return {
            "success": True,
            "message": "Webhook enqueued for processing",
            "data": {"job_id": job_id, "status": "enqueued"},
        }

    except Exception as e:
        logger.error(f"Exception in webhook processing: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Webhook processing error: {str(e)}",
                "error_code": "WEBHOOK_PROCESSING_ERROR",
            },
        )


def _is_test_event(data: Dict[str, Any]) -> bool:
    """Check if webhook data represents a test event."""
    event_type = data.get("eventType", "")
    return isinstance(event_type, str) and "test" in event_type.lower()


@router.post("/api/run/upload/media/{id}")
async def run_upload_by_media_id(
    id: int, logger: Any = Depends(get_web_logger), db: DapsDB = Depends(get_database)
) -> Dict[str, Any]:
    """
    Trigger poster upload for a specific media cache item.

    Forces upload of posters for the specified media cache entry.
    """
    try:
        logger.debug(f"Serving POST /api/run/upload/media/{id}")

        manifest = {"media_cache": [id]}

        from util.upload_posters import PosterUploader

        result = PosterUploader(
            db=db, logger=logger, manifest=manifest, force=True
        ).run()

        if result.get("success"):
            return {
                "success": True,
                "message": f"Upload triggered for media cache item {id}",
                "data": result.get("data", {}),
            }
        else:
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "message": f"Upload failed for media cache item {id}: {result.get('message', 'Unknown error')}",
                    "error_code": "MEDIA_UPLOAD_FAILED",
                },
            )

    except Exception as e:
        logger.error(f"Error uploading media cache item {id}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error triggering upload: {str(e)}",
                "error_code": "MEDIA_UPLOAD_ERROR",
            },
        )


@router.post("/api/run/upload/collection/{id}")
async def run_upload_by_collection_id(
    id: int, logger: Any = Depends(get_web_logger), db: DapsDB = Depends(get_database)
) -> Dict[str, Any]:
    """
    Trigger poster upload for a specific collection cache item.

    Forces upload of posters for the specified collection cache entry.
    """
    try:
        logger.debug(f"Serving POST /api/run/upload/collection/{id}")

        manifest = {"collections_cache": [id]}

        from util.upload_posters import PosterUploader

        result = PosterUploader(
            db=db, logger=logger, manifest=manifest, force=True
        ).run()

        if result.get("success"):
            return {
                "success": True,
                "message": f"Upload triggered for collection cache item {id}",
                "data": result.get("data", {}),
            }
        else:
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "message": f"Upload failed for collection cache item {id}: {result.get('message', 'Unknown error')}",
                    "error_code": "COLLECTION_UPLOAD_FAILED",
                },
            )

    except Exception as e:
        logger.error(f"Error uploading collection cache item {id}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error triggering upload: {str(e)}",
                "error_code": "COLLECTION_UPLOAD_ERROR",
            },
        )


@router.get("/api/run/unmatched")
async def get_run_unmatched(logger: Any = Depends(get_web_logger)) -> Dict[str, Any]:
    """
    Placeholder endpoint for unmatched assets operations.

    Future implementation for retrieving unmatched assets processing status.
    """
    return {
        "success": True,
        "message": "Unmatched assets endpoint - not yet implemented",
        "data": {"status": "not_implemented"},
    }


@router.post("/api/run/unmatched")
async def run_unmatched(logger: Any = Depends(get_web_logger)) -> Dict[str, Any]:
    """
    Placeholder endpoint for running unmatched assets processing.

    Future implementation for triggering unmatched assets operations.
    """
    return {
        "success": True,
        "message": "Unmatched assets processing - not yet implemented",
        "data": {"status": "not_implemented"},
    }


@router.post("/api/run/cleanarr")
async def run_cleanarr(logger: Any = Depends(get_web_logger)) -> Dict[str, Any]:
    """
    Placeholder endpoint for Cleanarr operations.

    Future implementation for triggering Cleanarr processing.
    """
    return {
        "success": True,
        "message": "Cleanarr processing - not yet implemented",
        "data": {"status": "not_implemented"},
    }


@router.get("/api/cleanarr")
async def get_cleanarr(logger: Any = Depends(get_web_logger)) -> Dict[str, Any]:
    """
    Placeholder endpoint for Cleanarr status.

    Future implementation for retrieving Cleanarr processing status.
    """
    return {
        "success": True,
        "message": "Cleanarr status - not yet implemented",
        "data": {"status": "not_implemented"},
    }
