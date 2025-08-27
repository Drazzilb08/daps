"""
Media cache management API endpoints for DAPS.

Provides media cache operations including retrieval, deletion,
and cache refresh functionality for media, collections, and Plex data.
"""

from typing import Any

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from api.utils import error, get_database, get_logger, ok
from util.database import DapsDB

router = APIRouter(
    prefix="/api/cache",
    tags=["Media Cache"],
    responses={
        500: {"description": "Internal server error"},
        404: {"description": "Cache item not found"},
    },
)


@router.get(
    "/media",
    summary="Get media cache",
    description="Retrieve all cached media items from the database.",
    responses={
        200: {
            "description": "Media cache retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Retrieved 150 media cache items",
                        "data": {
                            "media_cache": [
                                {
                                    "id": 1,
                                    "title": "The Matrix",
                                    "year": 1999,
                                    "imdb_id": "tt0133093",
                                }
                            ]
                        },
                    }
                }
            },
        }
    },
)
async def get_media_cache(
    logger: Any = Depends(get_logger), db: DapsDB = Depends(get_database)
) -> JSONResponse:
    """
    Retrieve the complete media cache from the database.

    Returns all cached media items including metadata, identifiers,
    and poster information for display and management purposes.

    Returns:
        Complete list of cached media items
    """
    try:
        logger.debug("Serving GET /api/cache/media")

        media_cache = db.media.get_all()

        return ok(
            f"Retrieved {len(media_cache) if media_cache else 0} media cache items",
            {"media_cache": media_cache or []},
        )

    except Exception as e:
        logger.error(f"Error retrieving media cache: {e}")
        return error(
            f"Error retrieving media cache: {str(e)}",
            code="MEDIA_CACHE_RETRIEVAL_ERROR",
            status_code=500,
        )


@router.get(
    "/collection",
    summary="Get collection cache",
    description="Retrieve all cached collection items from the database.",
    responses={
        200: {
            "description": "Collection cache retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Retrieved 25 collection cache items",
                        "data": {
                            "collection_cache": [
                                {
                                    "id": 1,
                                    "title": "Marvel Cinematic Universe",
                                    "tmdb_id": "1399",
                                }
                            ]
                        },
                    }
                }
            },
        }
    },
)
async def get_collection_cache(
    logger: Any = Depends(get_logger), db: DapsDB = Depends(get_database)
) -> JSONResponse:
    """
    Retrieve the complete collection cache from the database.

    Returns all cached collection items including metadata and
    identifiers for display and management purposes.

    Returns:
        Complete list of cached collection items
    """
    try:
        logger.debug("Serving GET /api/cache/collection")

        collection_cache = db.collection.get_all()

        return ok(
            f"Retrieved {len(collection_cache) if collection_cache else 0} collection cache items",
            {"collection_cache": collection_cache or []},
        )

    except Exception as e:
        logger.error(f"Error retrieving collection cache: {e}")
        return error(
            f"Error retrieving collection cache: {str(e)}",
            code="COLLECTION_CACHE_RETRIEVAL_ERROR",
            status_code=500,
        )


@router.get(
    "/plex",
    summary="Get Plex cache",
    description="Retrieve all cached Plex media items from the database.",
    responses={
        200: {
            "description": "Plex cache retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Retrieved 200 plex cache items",
                        "data": {
                            "plex_media_cache": [
                                {
                                    "id": 1,
                                    "title": "The Matrix",
                                    "plex_key": "12345",
                                    "library": "Movies",
                                }
                            ]
                        },
                    }
                }
            },
        }
    },
)
async def get_plex_cache(
    logger: Any = Depends(get_logger), db: DapsDB = Depends(get_database)
) -> JSONResponse:
    """
    Retrieve the complete Plex media cache from the database.

    Returns all cached Plex media items including Plex-specific
    identifiers and library information.

    Returns:
        Complete list of cached Plex media items
    """
    try:
        logger.debug("Serving GET /api/cache/plex")

        plex_cache = db.plex.get_all()

        return ok(
            f"Retrieved {len(plex_cache) if plex_cache else 0} plex cache items",
            {"plex_media_cache": plex_cache or []},
        )

    except Exception as e:
        logger.error(f"Error retrieving plex cache: {e}")
        return error(
            f"Error retrieving plex cache: {str(e)}",
            code="PLEX_CACHE_RETRIEVAL_ERROR",
            status_code=500,
        )


@router.post(
    "/refresh",
    summary="Refresh cache",
    description="Trigger background cache refresh for specified instances and libraries.",
    responses={
        200: {
            "description": "Cache refresh initiated successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Cache refresh initiated",
                        "data": {"job_id": 123},
                    }
                }
            },
        }
    },
)
async def refresh_cache(
    request: Request,
    logger: Any = Depends(get_logger),
    db: DapsDB = Depends(get_database),
) -> JSONResponse:
    """
    Initiate background cache refresh for specified services.

    Creates a background job to refresh media cache data from
    configured Radarr, Sonarr, and Plex instances with optional
    library filtering and mapping updates.

    Request body should contain:
    - arr_instances: List of Radarr/Sonarr instances to refresh
    - plex_instances: List of Plex instances to refresh
    - libraries: List of specific libraries to refresh
    - update_mappings: Whether to update media mappings

    Returns:
        Job ID for tracking the refresh operation
    """
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
            return ok(
                "Cache refresh initiated",
                {"job_id": job_id},
            )
        else:
            return error(
                f"Error enqueuing cache refresh: {result.get('message', 'Unknown error')}",
                code="CACHE_REFRESH_ENQUEUE_ERROR",
                status_code=500,
            )

    except Exception as e:
        logger.error(f"Error serving POST /api/cache/refresh: {e}")
        return error(
            f"Error initiating cache refresh: {str(e)}",
            code="CACHE_REFRESH_ERROR",
            status_code=500,
        )


@router.delete(
    "/media/{item_id}",
    summary="Delete media cache item",
    description="Delete a specific media cache item by ID.",
    responses={
        200: {
            "description": "Media cache item deleted successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Media cache item 123 deleted successfully",
                        "data": {"deleted_id": 123},
                    }
                }
            },
        },
        404: {"description": "Media cache item not found"},
    },
)
async def delete_media_cache_item(
    item_id: int, logger: Any = Depends(get_logger), db: DapsDB = Depends(get_database)
) -> JSONResponse:
    """
    Delete a media cache item by its ID.

    Permanently removes the specified media cache entry from the
    database. This operation cannot be undone.

    Args:
        item_id: The unique identifier of the media cache item to delete

    Returns:
        Confirmation of deletion with the deleted item ID
    """
    try:
        logger.debug(f"Serving DELETE /api/cache/media/{item_id}")

        if not db.media.get_by_id(item_id):
            return error(
                f"Media cache item {item_id} not found",
                code="MEDIA_CACHE_NOT_FOUND",
                status_code=404,
            )

        db.media.delete_by_id(item_id)

        logger.info(f"Deleted media cache item id={item_id}")
        return ok(
            f"Media cache item {item_id} deleted successfully",
            {"deleted_id": item_id},
        )

    except Exception as e:
        logger.error(f"Error deleting media cache item {item_id}: {e}")
        return error(
            f"Error deleting media cache item: {str(e)}",
            code="MEDIA_CACHE_DELETE_ERROR",
            status_code=500,
        )


@router.delete(
    "/collection/{item_id}",
    summary="Delete collection cache item",
    description="Delete a specific collection cache item by ID.",
    responses={
        200: {
            "description": "Collection cache item deleted successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Collection cache item 123 deleted successfully",
                        "data": {"deleted_id": 123},
                    }
                }
            },
        },
        404: {"description": "Collection cache item not found"},
    },
)
async def delete_collection_cache_item(
    item_id: int, logger: Any = Depends(get_logger), db: DapsDB = Depends(get_database)
) -> JSONResponse:
    """
    Delete a collection cache item by its ID.

    Permanently removes the specified collection cache entry from the
    database. This operation cannot be undone.

    Args:
        item_id: The unique identifier of the collection cache item to delete

    Returns:
        Confirmation of deletion with the deleted item ID
    """
    try:
        logger.debug(f"Serving DELETE /api/cache/collection/{item_id}")

        if not db.collection.get_by_id(item_id):
            return error(
                f"Collection cache item {item_id} not found",
                code="COLLECTION_CACHE_NOT_FOUND",
                status_code=404,
            )

        db.collection.delete_by_id(item_id)

        logger.info(f"Deleted collection cache item id={item_id}")
        return ok(
            f"Collection cache item {item_id} deleted successfully",
            {"deleted_id": item_id},
        )

    except Exception as e:
        logger.error(f"Error deleting collection cache item {item_id}: {e}")
        return error(
            f"Error deleting collection cache item: {str(e)}",
            code="COLLECTION_CACHE_DELETE_ERROR",
            status_code=500,
        )
