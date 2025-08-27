"""
Poster management API endpoints for DAPS.

Provides poster operations including statistics, file management,
upload operations, and directory analysis functionality.
"""

import os
from pathlib import Path
from typing import Any, List

from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse, JSONResponse

from api.utils import error, get_database, get_logger, ok
from modules.sync_gdrive import SyncGDrive
from modules.unmatched_assets import UnmatchedAssets
from util.database import DapsDB

router = APIRouter(
    prefix="/api/posters",
    tags=["Posters"],
    responses={
        500: {"description": "Internal server error"},
        404: {"description": "Poster or resource not found"},
    },
)


@router.get(
    "/matched/stats",
    summary="Get matched poster statistics",
    description="Retrieve aggregated statistics for matched poster operations.",
    responses={
        200: {
            "description": "Matched poster statistics retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Matched posters statistics retrieved",
                        "data": {
                            "matched_posters_stats": {
                                "total_matched": 150,
                                "uploaded": 120,
                                "pending": 30,
                            }
                        },
                    }
                }
            },
        }
    },
)
async def get_matched_poster_stats(
    logger: Any = Depends(get_logger), db: DapsDB = Depends(get_database)
) -> JSONResponse:
    """
    Retrieve statistics for matched poster operations.

    Returns aggregated data about poster matching success rates,
    upload status, and processing metrics for monitoring purposes.

    Returns:
        Matched poster statistics and metrics
    """
    try:
        logger.debug("Serving GET /api/posters/matched/stats")

        stats = db.stats.get_matched_posters_stats()

        return ok(
            "Matched posters statistics retrieved",
            {"matched_posters_stats": stats},
        )

    except Exception as e:
        logger.error(f"Error retrieving matched posters stats: {e}")
        return error(
            f"Error retrieving matched posters statistics: {str(e)}",
            code="MATCHED_POSTERS_STATS_ERROR",
            status_code=500,
        )


@router.get(
    "/unmatched/stats",
    summary="Get unmatched assets statistics",
    description="Retrieve statistics for unmatched poster assets and analyze processing needs.",
    responses={
        200: {
            "description": "Unmatched assets statistics retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Unmatched assets statistics retrieved",
                        "data": {
                            "summary": {
                                "total_unmatched": 25,
                                "needs_review": 15,
                                "auto_processable": 10,
                            }
                        },
                    }
                }
            },
        }
    },
)
async def get_unmatched_assets_stats(logger: Any = Depends(get_logger)) -> JSONResponse:
    """
    Retrieve statistics for unmatched poster assets.

    Analyzes unmatched assets to provide summary statistics
    about files that need manual review or can be automatically
    processed for poster matching.

    Returns:
        Unmatched assets summary and processing recommendations
    """
    try:
        logger.debug("Serving GET /api/posters/unmatched/stats")
        unmatched_logger = logger.get_adapter("UnmatchedStats")

        unmatched = UnmatchedAssets(logger=unmatched_logger)
        stats = unmatched.get_stats_adhoc()

        return ok(
            "Unmatched assets statistics retrieved",
            {"summary": stats.get("summary", {})},
        )

    except Exception as e:
        logger.error(f"Error retrieving unmatched stats: {e}")
        return error(
            f"Error retrieving unmatched assets statistics: {str(e)}",
            code="UNMATCHED_STATS_ERROR",
            status_code=500,
        )


@router.get(
    "/gdrive/stats",
    summary="Get GDrive synchronization statistics",
    description="Retrieve and refresh GDrive sync statistics and poster data.",
    responses={
        200: {
            "description": "GDrive statistics retrieved and refreshed successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "GDrive statistics retrieved and refreshed",
                        "data": {
                            "gdrive_stats": {
                                "total_folders": 5,
                                "synced_posters": 500,
                                "pending_sync": 25,
                            }
                        },
                    }
                }
            },
        }
    },
)
async def get_gdrive_stats(
    logger: Any = Depends(get_logger), db: DapsDB = Depends(get_database)
) -> JSONResponse:
    """
    Retrieve GDrive synchronization statistics.

    Refreshes poster statistics from GDrive and returns current
    sync status, folder counts, and transfer metrics for monitoring
    GDrive integration health.

    Returns:
        Current GDrive sync statistics and folder information
    """
    try:
        logger.debug("Serving GET /api/posters/gdrive/stats")
        gdrive_logger = logger.get_adapter("GDriveStats")

        syncer = SyncGDrive(logger=gdrive_logger)
        syncer.refresh_all_poster_stats()

        stats = db.stats.get_gdrive_stats()

        return ok(
            "GDrive statistics retrieved and refreshed",
            {"gdrive_stats": stats},
        )

    except Exception as e:
        logger.error(f"Error retrieving GDrive stats: {e}")
        return error(
            f"Error retrieving GDrive statistics: {str(e)}",
            code="GDRIVE_STATS_ERROR",
            status_code=500,
        )


@router.post(
    "/gdrive/sync",
    summary="Sync GDrive folders",
    description="Enqueue GDrive synchronization jobs for selected folders.",
    responses={
        200: {
            "description": "GDrive sync jobs created successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "GDrive sync started for 2 folders: Movies, TV Shows",
                        "data": {
                            "jobs": [
                                {"name": "Movies", "job_id": 123},
                                {"name": "TV Shows", "job_id": 124},
                            ]
                        },
                    }
                }
            },
        },
        400: {"description": "No GDrive folder names provided"},
    },
)
async def sync_gdrive_folders(
    gdrive_names: List[str] = Query(
        ..., description="Names of the GDrive folders to sync"
    ),
    logger: Any = Depends(get_logger),
    db: DapsDB = Depends(get_database),
) -> JSONResponse:
    """
    Enqueue GDrive synchronization jobs for selected folders.

    Creates background sync jobs for each specified GDrive folder
    to download and organize poster assets. Jobs can be monitored
    through the job management endpoints.

    Args:
        gdrive_names: List of GDrive folder names to synchronize

    Returns:
        Job IDs and status for tracking sync operations
    """
    try:
        gdrive_logger = logger.get_adapter("GDriveFolder")
        gdrive_logger.debug(
            f"Serving POST /api/posters/gdrive/sync with names: {gdrive_names}"
        )

        if not gdrive_names:
            return error(
                "At least one GDrive folder name is required",
                code="GDRIVE_NAMES_REQUIRED",
                status_code=400,
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
            return ok(
                f"GDrive sync started for '{started[0]}'",
                {"job_id": job_ids[0]["job_id"], "name": job_ids[0]["name"]},
            )

        return ok(
            f"GDrive sync started for {len(started)} folders: {', '.join(started)}",
            {"jobs": job_ids},
        )

    except Exception as e:
        logger.error(f"Error starting GDrive sync: {e}")
        return error(
            f"Error starting GDrive synchronization: {str(e)}",
            code="GDRIVE_SYNC_START_ERROR",
            status_code=500,
        )


@router.get(
    "/analyze",
    summary="Analyze poster directory",
    description="Analyze a directory for poster files and return statistics.",
    responses={
        200: {
            "description": "Directory analysis completed successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Analyzed location '/path/to/posters' - found 150 files",
                        "data": {
                            "file_count": 150,
                            "size_bytes": 52428800,
                            "files": ["movie1-poster.jpg", "movie2-poster.png"],
                        },
                    }
                }
            },
        },
        400: {"description": "Invalid location or location parameter missing"},
    },
)
async def analyze_poster_directory(
    location: str = None, logger: Any = Depends(get_logger)
) -> JSONResponse:
    """
    Analyze a directory for poster files and statistics.

    Recursively scans the specified directory to count files,
    calculate total size, and generate a file listing. Excludes
    temporary files and provides detailed analysis for management.

    Args:
        location: Directory path to analyze for poster files

    Returns:
        Directory analysis with file count, size, and file listing
    """
    try:
        logger.debug(f"Serving GET /api/posters/analyze for location: {location}")

        if not location:
            return error(
                "Location parameter is required",
                code="LOCATION_REQUIRED",
                status_code=400,
            )

        if not os.path.isdir(location):
            return error(
                f"Invalid location: '{location}' is not a directory",
                code="INVALID_LOCATION",
                status_code=400,
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

        return ok(
            f"Analyzed location '{location}' - found {len(poster_files)} files",
            {
                "file_count": len(poster_files),
                "size_bytes": total_size,
                "files": sorted(poster_files),
            },
        )

    except Exception as e:
        logger.error(f"Error analyzing poster location: {e}")
        return error(
            f"Error analyzing poster location: {str(e)}",
            code="POSTER_ANALYSIS_ERROR",
            status_code=500,
        )


@router.get(
    "/preview",
    summary="Preview poster file",
    description="Return a poster image file for preview with security validation.",
    responses={
        200: {
            "description": "Poster file served successfully",
            "content": {"image/*": {"example": "Binary image data"}},
        },
        400: {"description": "Missing file path parameters"},
        403: {"description": "Access denied - path outside allowed directory"},
        404: {"description": "Poster file not found"},
        415: {"description": "Unsupported file type"},
    },
)
async def preview_poster_file(
    location: str = "", path: str = "", logger: Any = Depends(get_logger)
) -> FileResponse:
    """
    Return a poster image file for preview.

    Supports both absolute paths and location + relative path combinations.
    Includes comprehensive security checks to prevent directory traversal
    attacks and validates file types.

    Args:
        location: Base directory path (optional if using absolute path)
        path: File path (can be absolute or relative to location)

    Returns:
        Image file response for browser display
    """
    try:
        logger.debug(
            f"Serving GET /api/posters/preview for location: {location}, path: {path}"
        )

        if path and os.path.isabs(path):
            file_path = Path(path).resolve()
        elif location and path:
            base_dir = Path(location).resolve()
            file_path = (base_dir / path).resolve()

            # Security check: ensure resolved path is within base directory
            if not str(file_path).startswith(str(base_dir)):
                return error(
                    "Access denied - path outside allowed directory",
                    code="PATH_TRAVERSAL_DENIED",
                    status_code=403,
                )
        else:
            return error(
                "Either absolute path or location + relative path required",
                code="MISSING_FILE_PATH",
                status_code=400,
            )

        if not file_path.exists() or not file_path.is_file():
            return error(
                "Poster file not found",
                code="POSTER_FILE_NOT_FOUND",
                status_code=404,
            )

        allowed_extensions = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
        if file_path.suffix.lower() not in allowed_extensions:
            return error(
                f"Unsupported file type: {file_path.suffix}",
                code="UNSUPPORTED_FILE_TYPE",
                status_code=415,
            )

        return FileResponse(str(file_path))

    except Exception as e:
        logger.error(f"Error serving poster preview: {e}")
        return error(
            f"Error serving poster preview: {str(e)}",
            code="POSTER_PREVIEW_ERROR",
            status_code=500,
        )


@router.get(
    "/list",
    summary="List available poster files",
    description="List available poster files from the templates/posters directory.",
    responses={
        200: {
            "description": "Poster files listed successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Found 25 poster files",
                        "data": {"files": ["default-movie.jpg", "default-tv.png"]},
                    }
                }
            },
        }
    },
)
async def list_poster_files(logger: Any = Depends(get_logger)) -> JSONResponse:
    """
    List available poster files from templates/posters directory.

    Returns just the filenames for dynamic discovery by the frontend.
    Used for default poster selection and asset management.

    Returns:
        List of available poster filenames
    """
    try:
        logger.debug("Serving GET /api/posters/list")

        posters_dir = Path(__file__).parents[1] / "templates" / "posters"
        allowed_extensions = {".jpg", ".jpeg", ".png", ".webp"}

        if not posters_dir.exists():
            return ok(
                "Posters directory not found",
                {"files": []},
            )

        files = [
            f.name
            for f in posters_dir.iterdir()
            if f.is_file() and f.suffix.lower() in allowed_extensions
        ]

        return ok(
            f"Found {len(files)} poster files",
            {"files": sorted(files)},
        )

    except Exception as e:
        logger.error(f"Error listing poster files: {e}")
        return error(
            f"Error listing poster files: {str(e)}",
            code="POSTER_LIST_ERROR",
            status_code=500,
        )


@router.post(
    "/upload/media/{media_id}",
    summary="Upload posters for media item",
    description="Trigger poster upload operation for a specific media cache item.",
    responses={
        200: {
            "description": "Upload triggered successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Upload triggered for media cache item 123",
                        "data": {"uploaded": 1, "skipped": 0},
                    }
                }
            },
        }
    },
)
async def upload_media_posters(
    media_id: int, logger: Any = Depends(get_logger), db: DapsDB = Depends(get_database)
) -> JSONResponse:
    """
    Trigger poster upload for a specific media cache item.

    Forces upload of posters for the specified media cache entry
    using the poster uploader system. Useful for manual poster
    management and troubleshooting upload issues.

    Args:
        media_id: The media cache item ID to upload posters for

    Returns:
        Upload operation results with success/failure counts
    """
    try:
        logger.debug(f"Serving POST /api/posters/upload/media/{media_id}")

        manifest = {"media_cache": [media_id]}

        from util.upload_posters import PosterUploader

        result = PosterUploader(
            db=db, logger=logger, manifest=manifest, force=True
        ).run()

        if result.get("success"):
            return ok(
                f"Upload triggered for media cache item {media_id}",
                result.get("data", {}),
            )
        else:
            return error(
                f"Upload failed for media cache item {media_id}: {result.get('message', 'Unknown error')}",
                code="MEDIA_UPLOAD_FAILED",
                status_code=500,
            )

    except Exception as e:
        logger.error(f"Error uploading media cache item {media_id}: {e}")
        return error(
            f"Error triggering upload: {str(e)}",
            code="MEDIA_UPLOAD_ERROR",
            status_code=500,
        )


@router.post(
    "/upload/collection/{collection_id}",
    summary="Upload posters for collection item",
    description="Trigger poster upload operation for a specific collection cache item.",
    responses={
        200: {
            "description": "Upload triggered successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Upload triggered for collection cache item 123",
                        "data": {"uploaded": 1, "skipped": 0},
                    }
                }
            },
        }
    },
)
async def upload_collection_posters(
    collection_id: int,
    logger: Any = Depends(get_logger),
    db: DapsDB = Depends(get_database),
) -> JSONResponse:
    """
    Trigger poster upload for a specific collection cache item.

    Forces upload of posters for the specified collection cache entry
    using the poster uploader system. Useful for manual poster
    management and collection artwork updates.

    Args:
        collection_id: The collection cache item ID to upload posters for

    Returns:
        Upload operation results with success/failure counts
    """
    try:
        logger.debug(f"Serving POST /api/posters/upload/collection/{collection_id}")

        manifest = {"collections_cache": [collection_id]}

        from util.upload_posters import PosterUploader

        result = PosterUploader(
            db=db, logger=logger, manifest=manifest, force=True
        ).run()

        if result.get("success"):
            return ok(
                f"Upload triggered for collection cache item {collection_id}",
                result.get("data", {}),
            )
        else:
            return error(
                f"Upload failed for collection cache item {collection_id}: {result.get('message', 'Unknown error')}",
                code="COLLECTION_UPLOAD_FAILED",
                status_code=500,
            )

    except Exception as e:
        logger.error(f"Error uploading collection cache item {collection_id}: {e}")
        return error(
            f"Error triggering upload: {str(e)}",
            code="COLLECTION_UPLOAD_ERROR",
            status_code=500,
        )
