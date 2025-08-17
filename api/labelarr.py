from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from api.utils import error, get_database, get_logger, ok
from util.config import DapsConfig, load_config

router = APIRouter()


class TagActions(BaseModel):
    """Tag actions schema for explicit add/remove operations."""

    add: List[str] = []
    remove: List[str] = []


class SyncTagsRequest(BaseModel):
    """Request schema for syncing tags from ARR to Plex."""

    source_instance: str
    media_cache_id: int
    plex_mapping_id: Optional[int] = None
    tag_actions: TagActions = TagActions()
    plex_instance: Optional[str] = None  # Let backend determine if not provided
    dry_run: bool = False


def get_config() -> DapsConfig:
    """Load and return the current configuration."""
    return load_config()


@router.post("/api/labelarr/sync")
async def sync_tags_to_plex(
    request_data: SyncTagsRequest,
    request: Request,
    config: DapsConfig = Depends(get_config),
    logger: Any = Depends(get_logger),
) -> Dict[str, Any]:
    """
    Sync tags from ARR instance to Plex labels.

    Creates a background job to handle the sync operation using the labelarr module.

    Args:
        request_data: Sync request containing media IDs, tags, and target Plex instance
        request: FastAPI request object for database access
        config: Application configuration
        logger: Logger instance

    Returns:
        Dict containing job_id for tracking sync progress
    """
    try:
        logger.info(
            f"Creating labelarr sync job for media_cache_id {request_data.media_cache_id}"
        )

        # Determine Plex instance - use first available if not specified
        plex_instance = request_data.plex_instance
        if not plex_instance:
            if hasattr(config.instances, "plex") and config.instances.plex:
                plex_instance = list(config.instances.plex.keys())[0]
                logger.info(
                    f"No plex_instance specified, using first available: {plex_instance}"
                )
            else:
                return error(
                    "No Plex instances available",
                    code="NO_PLEX_INSTANCES",
                    status_code=404,
                )

        # Validate the determined Plex instance exists in config
        if (
            not hasattr(config.instances, "plex")
            or plex_instance not in config.instances.plex
        ):
            return error(
                f"Plex instance '{plex_instance}' not found",
                code="PLEX_INSTANCE_NOT_FOUND",
                status_code=404,
            )

        # Check if ARR instance exists (Radarr or Sonarr)
        arr_found = False
        if (
            hasattr(config.instances, "radarr")
            and request_data.source_instance in config.instances.radarr
        ):
            arr_found = True
        elif (
            hasattr(config.instances, "sonarr")
            and request_data.source_instance in config.instances.sonarr
        ):
            arr_found = True

        if not arr_found:
            return error(
                f"ARR instance '{request_data.source_instance}' not found",
                code="ARR_INSTANCE_NOT_FOUND",
                status_code=404,
            )

        # Get database from app state
        db = get_database(request)
        if not db:
            return error(
                "Database not available",
                code="DATABASE_NOT_AVAILABLE",
                status_code=500,
            )

        # Create job payload for labelarr sync
        job_payload = {
            "source_instance": request_data.source_instance,
            "media_cache_id": request_data.media_cache_id,
            "plex_mapping_id": request_data.plex_mapping_id,
            "tag_actions": request_data.tag_actions.model_dump(),
            "plex_instance": plex_instance,  # Use determined plex_instance
            "dry_run": request_data.dry_run,
        }

        # Queue the labelarr sync job
        result = db.worker.enqueue_job(
            table_name="jobs", payload=job_payload, job_type="labelarr_sync"
        )

        if result["success"]:
            job_id = result["data"]["job_id"]
            logger.info(f"Labelarr sync job {job_id} queued successfully")

            return ok(
                "Labelarr sync job created successfully",
                {
                    "job_id": job_id,
                    "status": "queued",
                    "media_cache_id": request_data.media_cache_id,
                    "source_instance": request_data.source_instance,
                    "plex_instance": plex_instance,  # Use determined plex_instance
                },
            )
        else:
            return error(
                f"Failed to create labelarr sync job: {result['message']}",
                code="JOB_CREATION_FAILED",
                status_code=500,
            )

    except Exception as e:
        logger.error(f"Error creating labelarr sync job: {e}", exc_info=True)
        return error(
            f"Failed to create sync job: {str(e)}",
            code="SYNC_JOB_ERROR",
            status_code=500,
        )
