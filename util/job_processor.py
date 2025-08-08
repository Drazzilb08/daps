"""
Clean Job Processor

Simple job routing that delegates to appropriate components.
No embedded business logic - just routes jobs to the right handlers.
"""

import json
import time
from typing import Any, Dict

from util.database import DapsDB


def process_job(job: Dict[str, Any], logger) -> Dict[str, Any]:
    """
    Clean job processor that routes jobs to appropriate handlers.

    Args:
        job: Job data from the database
        logger: Logger instance

    Returns:
        dict: Job result
    """
    job_id = job.get("id")
    job_type = job.get("type")
    payload = json.loads(job.get("payload", "{}"))

    log = logger.get_adapter("JOB_PROCESSOR")
    log.debug(f"[JOB:{job_id}] Processing {job_type}")

    start_time = time.time()

    try:
        if job_type == "webhook_process":
            return _process_webhook_job(payload, logger)

        elif job_type == "poster_rename":
            return _process_poster_rename_job(payload, logger)

        elif job_type == "sync_gdrive":
            return _process_sync_gdrive_job(payload, logger)

        elif job_type == "upload_posters":
            return _process_upload_posters_job(payload, logger)

        else:
            return {
                "status": 400,
                "success": False,
                "message": f"Unknown job type: {job_type}",
                "error_code": "UNKNOWN_JOB_TYPE",
            }

    except Exception as e:
        log.error(f"[JOB:{job_id}] Error processing {job_type}: {e}", exc_info=True)
        return {
            "status": 500,
            "success": False,
            "message": f"Job failed: {str(e)}",
            "error_code": "JOB_EXCEPTION",
        }
    finally:
        duration = time.time() - start_time
        log.debug(f"[JOB:{job_id}] Completed in {duration:.2f}s")


def _process_webhook_job(payload: Dict[str, Any], logger) -> Dict[str, Any]:
    """Process webhook job by delegating to WebhookProcessor."""
    from util.webhook_processor import WebhookProcessor

    processor = WebhookProcessor(logger)
    result = processor.process_webhook_adhoc(
        payload.get("webhook_data", {}), payload.get("client_info")
    )

    return result


def _process_poster_rename_job(payload: Dict[str, Any], logger) -> Dict[str, Any]:
    """Process poster rename job by delegating to PosterRenamerr."""
    from modules.poster_renamerr import PosterRenamerr

    media_items = payload.get("media_items", [])
    if not media_items:
        return {
            "status": 400,
            "success": False,
            "message": "No media items provided for poster rename",
            "error_code": "MISSING_MEDIA_ITEMS",
        }

    renamer = PosterRenamerr(logger=logger)
    result = renamer.run_poster_rename_adhoc(media_items)

    # Handle notifications and uploads if successful
    if result["success"] and result.get("output"):
        _handle_post_rename_actions(result, renamer, logger)

    return result


def _process_sync_gdrive_job(payload: Dict[str, Any], logger) -> Dict[str, Any]:
    """Process GDrive sync job by delegating to SyncGDrive."""
    from modules.sync_gdrive import SyncGDrive

    gdrive_name = payload.get("gdrive_name")
    if not gdrive_name:
        return {
            "status": 400,
            "success": False,
            "message": "No gdrive_name provided for sync",
            "error_code": "MISSING_GDRIVE_NAME",
        }

    syncer = SyncGDrive(logger=logger)

    # Use adhoc method with progress callback if available
    def progress_callback(pct):
        logger.get_adapter("SYNC_GDRIVE").debug(f"Sync progress: {pct}%")

    syncer.sync_folder_adhoc(gdrive_name, progress_cb=progress_callback)

    return {
        "status": 200,
        "success": True,
        "message": f"GDrive sync completed for {gdrive_name}",
        "error_code": None,
    }


def _process_upload_posters_job(payload: Dict[str, Any], logger) -> Dict[str, Any]:
    """Process poster upload job by delegating to PosterUploader."""
    from util.upload_posters import PosterUploader

    manifest = payload.get("manifest")
    if not manifest:
        return {
            "status": 400,
            "success": False,
            "message": "No manifest provided for poster upload",
            "error_code": "MISSING_MANIFEST",
        }

    with DapsDB(logger=logger) as db:
        uploader = PosterUploader(db=db, logger=logger, manifest=manifest)
        result = uploader.upload_posters()

    if result.get("success"):
        return {
            "status": 200,
            "success": True,
            "message": "Poster upload completed successfully",
            "error_code": None,
        }
    else:
        return {
            "status": 500,
            "success": False,
            "message": f"Poster upload failed: {result.get('message')}",
            "error_code": "UPLOAD_FAILED",
        }


def _handle_post_rename_actions(rename_result: Dict[str, Any], renamer, logger):
    """Handle notifications and uploads after successful rename."""
    try:
        output = rename_result.get("output", {})
        manifest = rename_result.get("manifest", {})

        # Send notifications if there are results
        if any(output.values()):
            from util.notification import NotificationManager

            manager = NotificationManager(
                renamer.config, logger, module_name="poster_renamerr"
            )
            manager.send_notification(output)
            logger.get_adapter("POST_RENAME").info("Notifications sent")

        # Handle border replacer if enabled
        if getattr(renamer.config, "run_border_replacerr", False) and manifest:
            renamer.run_border_replacerr(manifest)
            logger.get_adapter("POST_RENAME").info("Border replacer completed")

        # Queue upload job if Plex instances are enabled
        plex_enabled = _check_plex_upload_enabled(renamer.config)
        if plex_enabled and manifest:
            _queue_upload_job(manifest, logger)

    except Exception as e:
        logger.get_adapter("POST_RENAME").error(f"Error in post-rename actions: {e}")


def _check_plex_upload_enabled(config) -> bool:
    """Check if any Plex instances have poster upload enabled."""
    try:
        if not hasattr(config, "instances"):
            return False

        for inst in config.instances:
            if isinstance(inst, dict):
                for instance_name, params in inst.items():
                    if getattr(params, "add_posters", False):
                        return True
        return False
    except Exception:
        return False


def _queue_upload_job(manifest: Dict[str, Any], logger):
    """Queue a poster upload job."""
    try:
        upload_payload = {"manifest": manifest}

        with DapsDB(logger=logger) as db:
            result = db.worker.enqueue_job(
                table_name="jobs", payload=upload_payload, job_type="upload_posters"
            )

        if result["success"]:
            logger.get_adapter("POST_RENAME").info(
                f"Upload job queued: {result['job_id']}"
            )
        else:
            logger.get_adapter("POST_RENAME").error(
                f"Failed to queue upload job: {result['message']}"
            )

    except Exception as e:
        logger.get_adapter("POST_RENAME").error(f"Error queueing upload job: {e}")


# Alternative simplified processor for basic setups
def simple_job_processor(job: Dict[str, Any], logger) -> Dict[str, Any]:
    """
    Simplified job processor for basic job types.
    Use this if you don't need the full post-processing features.
    """
    job_type = job.get("type")
    payload = json.loads(job.get("payload", "{}"))

    if job_type == "sync_gdrive":
        from modules.sync_gdrive import SyncGDrive

        gdrive_name = payload.get("gdrive_name")
        if not gdrive_name:
            return {"success": False, "message": "No gdrive_name provided"}

        syncer = SyncGDrive(logger=logger)
        syncer.sync_folder_adhoc(gdrive_name)

        return {"success": True, "message": f"Sync completed for {gdrive_name}"}

    elif job_type == "poster_rename":
        from modules.poster_renamerr import PosterRenamerr

        media_items = payload.get("media_items", [])
        if not media_items:
            return {"success": False, "message": "No media items provided"}

        renamer = PosterRenamerr(logger=logger)
        return renamer.run_poster_rename_adhoc(media_items)

    else:
        return {"success": False, "message": f"Unknown job type: {job_type}"}
