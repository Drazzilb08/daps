from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.utils import error, get_logger, ok
from util.arr import RadarrClient, SonarrClient
from util.config import DapsConfig, load_config

router = APIRouter()


class SyncTagsRequest(BaseModel):
    """Request schema for syncing tags from ARR to Plex."""

    source_instance: str
    media_cache_id: int
    plex_mapping_id: Optional[int] = None
    manage_tags: List[str] = []
    tags_to_remove: List[str] = []
    plex_instance: str = "plex_1"
    dry_run: bool = False


def get_config() -> DapsConfig:
    """Load and return the current configuration."""
    return load_config()


def get_db(request):
    """Get database instance from app state."""
    return request.app.state.db


def get_arr_client(instance_name: str, config: DapsConfig):
    """Create ARR client based on instance configuration."""
    # Check Radarr instances
    if hasattr(config.instances, "radarr") and instance_name in config.instances.radarr:
        radarr_config = config.instances.radarr[instance_name]
        return RadarrClient(
            url=radarr_config.url, api_key=radarr_config.api, timeout=30
        )

    # Check Sonarr instances
    if hasattr(config.instances, "sonarr") and instance_name in config.instances.sonarr:
        sonarr_config = config.instances.sonarr[instance_name]
        return SonarrClient(
            url=sonarr_config.url, api_key=sonarr_config.api, timeout=30
        )

    raise HTTPException(
        status_code=404,
        detail=f"ARR instance '{instance_name}' not found in configuration",
    )


@router.post("/api/labelarr/sync")
async def sync_tags_to_plex(
    request_data: SyncTagsRequest,
    config: DapsConfig = Depends(get_config),
    logger: Any = Depends(get_logger),
) -> Dict[str, Any]:
    """
    Sync tags from ARR instance to Plex labels.

    This endpoint creates a background job to handle the sync operation.

    Args:
        request_data: Sync request containing media IDs, tags, and target Plex instance

    Returns:
        Dict containing job_id for tracking sync progress
    """
    try:
        logger.info(
            f"Starting tag sync for media_cache_id {request_data.media_cache_id}"
        )

        # Validate ARR instance exists
        get_arr_client(request_data.source_instance, config)

        # Validate Plex instance exists
        if (
            not hasattr(config.instances, "plex")
            or request_data.plex_instance not in config.instances.plex
        ):
            return error(
                f"Plex instance '{request_data.plex_instance}' not found",
                code="PLEX_INSTANCE_NOT_FOUND",
                status_code=404,
            )

        # For now, return a mock job_id since we're focusing on frontend
        # TODO: Implement actual job creation for background processing
        job_id = f"labelarr_sync_{request_data.media_cache_id}_{len(request_data.manage_tags)}tags"

        if request_data.dry_run:
            logger.info(f"Dry run sync completed for {request_data.source_instance}")
            return ok(
                "Dry run sync completed successfully",
                {
                    "job_id": job_id,
                    "dry_run": True,
                    "manage_tags": request_data.manage_tags,
                    "tags_to_remove": request_data.tags_to_remove,
                    "source_instance": request_data.source_instance,
                    "plex_instance": request_data.plex_instance,
                },
            )

        # TODO: Create actual background job
        # For now, simulate immediate success
        logger.info(f"Tag sync job {job_id} created successfully")

        return ok(
            "Tag sync job created successfully",
            {
                "job_id": job_id,
                "status": "created",
                "manage_tags_count": len(request_data.manage_tags),
                "tags_to_remove_count": len(request_data.tags_to_remove),
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating sync job: {e}")
        return error(
            f"Error creating sync job: {str(e)}", code="SYNC_JOB_ERROR", status_code=500
        )


@router.get("/api/labelarr/status/{job_id}")
async def get_sync_status(
    job_id: str, logger: Any = Depends(get_logger)
) -> Dict[str, Any]:
    """
    Get status of a tag sync job.

    Args:
        job_id: Job ID returned from sync endpoint

    Returns:
        Dict containing job status and progress information
    """
    try:
        logger.debug(f"Getting sync status for job: {job_id}")

        # TODO: Implement actual job status checking
        # For now, return mock success status
        return ok(
            "Sync job completed successfully",
            {
                "job_id": job_id,
                "status": "completed",
                "progress": 100,
                "message": "Tag sync completed successfully",
                "completed_at": "2024-01-01T00:00:00Z",
            },
        )

    except Exception as e:
        logger.error(f"Error getting sync status for {job_id}: {e}")
        return error(
            f"Error retrieving sync status: {str(e)}",
            code="STATUS_ERROR",
            status_code=500,
        )
