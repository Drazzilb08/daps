# util/job_processor.py

import json
import time
from typing import Any, Dict

from util.database import DapsDB


def process_job(job: Dict[str, Any], logger) -> Dict[str, Any]:
    """
    Route jobs to appropriate handlers.

    Args:
        job: Job data from the database
        logger: Logger instance

    Returns:
        dict: Job processing result
    """
    job_id = job.get("id")
    job_type = job.get("type")
    payload = json.loads(job.get("payload", "{}"))

    log = logger.get_adapter("JOB_PROCESSOR")
    log.debug(f"[JOB:{job_id}] Processing {job_type}")

    start_time = time.time()

    try:
        if job_type == "webhook":
            return _process_webhook_job(payload, logger, job_id)
        elif job_type == "poster_rename":
            return _process_poster_rename_job(payload, logger, job_id)
        elif job_type == "sync_gdrive":
            return _process_sync_gdrive_job(payload, logger, job_id)
        elif job_type == "upload_posters":
            return _process_upload_posters_job(payload, logger, job_id)
        elif job_type == "module_run":
            return _process_module_run_job(payload, logger, job_id)
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


def _process_webhook_job(
    payload: Dict[str, Any], logger, job_id: int
) -> Dict[str, Any]:
    """
    Process webhook job by fetching media from ARR and running poster rename.

    Args:
        payload: Job payload containing webhook data
        logger: Logger instance
        job_id: Job ID for tracking

    Returns:
        dict: Processing result
    """
    log = logger.get_adapter("WEBHOOK_PROCESSOR")
    log.info(f"[JOB:{job_id}] Starting webhook processing")

    try:
        from modules.poster_renamerr import PosterRenamerr
        from util.connector import Connector
        from util.webhook_processor import WebhookProcessor

        webhook_data = payload.get("webhook_data", {})
        client_info = payload.get("client_info")

        # Validate webhook and get instance info
        processor = WebhookProcessor(logger)
        validation_result = processor._validate_webhook(webhook_data, client_info)
        if not validation_result["success"]:
            log.error(
                f"[JOB:{job_id}] Webhook validation failed: {validation_result['message']}"
            )
            return validation_result

        instance_info = validation_result["instance_info"]
        media_id = validation_result["media_id"]

        # Use Connector to fetch and store media data
        with DapsDB(logger=logger) as db:
            instance_map = {"arrs": [instance_info["name"]]}

            with Connector(
                db=db, logger=logger, instance_map=instance_map
            ) as connector:
                # Get the ARR client and fetch media
                arr_instances = connector.parsed_instances.get("arr", [])
                if not arr_instances:
                    return {
                        "success": False,
                        "message": "No matching ARR instance found in connector",
                        "error_code": "NO_ARR_INSTANCE",
                    }

                arr_instance = arr_instances[0]  # Should be our target instance

                with connector.connection_manager.get_arr_client(
                    arr_instance
                ) as client:
                    # Fetch the specific media item
                    if instance_info["type"] == "radarr":
                        media = client.get_movie(media_id)
                        asset_type = "movie"
                    else:
                        media = client.get_show(media_id)
                        asset_type = "show"

                    log.debug(
                        f"[JOB:{job_id}] Fetched {media['title']} from {instance_info['name']}"
                    )

                    # Process and store media
                    fresh_media = connector._process_arr_media([media], asset_type)

                    # Sync to database
                    db.media.sync_for_instance(
                        instance_info["name"],
                        instance_info["type"].capitalize(),
                        asset_type,
                        fresh_media,
                        log,
                    )

                    # Get stored media records
                    stored_media = db.media.get_by_title_year_instance(
                        media["title"], media.get("year"), instance_info["name"]
                    )

                    if not stored_media:
                        return {
                            "success": False,
                            "message": "Failed to retrieve stored media from database",
                            "error_code": "MEDIA_RETRIEVAL_FAILED",
                        }

        # Run poster rename on the stored media
        media_items = stored_media if isinstance(stored_media, list) else [stored_media]
        renamer = PosterRenamerr(logger=logger)
        rename_result = renamer.run_poster_rename_adhoc(media_items)

        if rename_result["success"]:
            log.info(f"[JOB:{job_id}] Webhook processing successful")

            if rename_result.get("output"):
                _handle_post_rename_actions(rename_result, renamer, logger, job_id)

            return {
                "success": True,
                "message": f"Webhook processed successfully: {media['title']}",
                "data": {"media": media, "rename_result": rename_result},
            }
        else:
            log.error(
                f"[JOB:{job_id}] Poster rename failed: {rename_result.get('message')}"
            )
            return {
                "success": False,
                "message": f"Poster rename failed: {rename_result.get('message')}",
                "error_code": "POSTER_RENAME_FAILED",
            }

    except Exception as e:
        log.error(
            f"[JOB:{job_id}] Exception during webhook processing: {e}", exc_info=True
        )
        return {
            "success": False,
            "message": f"Webhook processing failed: {str(e)}",
            "error_code": "WEBHOOK_PROCESSING_EXCEPTION",
        }


def _process_poster_rename_job(
    payload: Dict[str, Any], logger, job_id: int
) -> Dict[str, Any]:
    """
    Process poster rename job.

    Args:
        payload: Job payload containing media items
        logger: Logger instance
        job_id: Job ID for tracking

    Returns:
        dict: Processing result
    """
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

    if result["success"] and result.get("output"):
        _handle_post_rename_actions(result, renamer, logger, job_id)

    return result


def _process_sync_gdrive_job(
    payload: Dict[str, Any], logger, job_id: int
) -> Dict[str, Any]:
    """
    Process GDrive sync job with progress tracking.

    Args:
        payload: Job payload containing gdrive_name
        logger: Logger instance
        job_id: Job ID for progress tracking

    Returns:
        dict: Processing result
    """
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

    def progress_callback(pct: int) -> None:
        logger.get_adapter("SYNC_GDRIVE").debug(f"[JOB:{job_id}] Sync progress: {pct}%")

    success = syncer.sync_folder_adhoc(
        gdrive_name, progress_cb=progress_callback, job_id=job_id
    )

    if success:
        return {
            "status": 200,
            "success": True,
            "message": f"GDrive sync completed for {gdrive_name}",
        }
    else:
        return {
            "status": 500,
            "success": False,
            "message": f"GDrive sync failed for {gdrive_name}",
            "error_code": "SYNC_FAILED",
        }


def _process_upload_posters_job(
    payload: Dict[str, Any], logger, job_id: int
) -> Dict[str, Any]:
    """
    Process poster upload job.

    Args:
        payload: Job payload containing manifest
        logger: Logger instance
        job_id: Job ID for tracking

    Returns:
        dict: Processing result
    """
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
        result = uploader.run()

    if result.get("success"):
        return {
            "status": 200,
            "success": True,
            "message": "Poster upload completed successfully",
        }
    else:
        return {
            "status": 500,
            "success": False,
            "message": f"Poster upload failed: {result.get('message')}",
            "error_code": "UPLOAD_FAILED",
        }


def _handle_post_rename_actions(
    rename_result: Dict[str, Any], renamer, logger, job_id: int
) -> None:
    """
    Handle notifications and uploads after successful rename.

    Args:
        rename_result: Result from poster rename operation
        renamer: PosterRenamerr instance
        logger: Logger instance
        job_id: Job ID for tracking
    """
    log = logger.get_adapter("POST_RENAME")

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
            log.info(f"[JOB:{job_id}] Notifications sent")

        # Handle border replacer if enabled
        if getattr(renamer.config, "run_border_replacerr", False) and manifest:
            renamer.run_border_replacerr(manifest)
            log.info(f"[JOB:{job_id}] Border replacer completed")

        # Queue upload job if Plex instances are enabled
        plex_enabled = _check_plex_upload_enabled(renamer.config)
        if plex_enabled and manifest:
            _queue_upload_job(manifest, logger, job_id)
        else:
            log.info(
                f"[JOB:{job_id}] Plex upload not enabled or no manifest - task complete"
            )

    except Exception as e:
        log.error(f"[JOB:{job_id}] Error in post-rename actions: {e}")


def _check_plex_upload_enabled(config) -> bool:
    """
    Check if any Plex instances have poster upload enabled.

    Args:
        config: Application configuration

    Returns:
        bool: True if upload is enabled for any Plex instance
    """
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


def _process_module_run_job(
    payload: Dict[str, Any], logger, job_id: int
) -> Dict[str, Any]:
    """
    Process module run job - executes a DAPS module.

    Args:
        payload: Job payload containing module info
        logger: Logger instance
        job_id: Job ID for tracking

    Returns:
        dict: Processing result
    """
    log = logger.get_adapter("MODULE_PROCESSOR")

    module_name = payload.get("module_name")
    origin = payload.get("origin", "job")
    # The immediate flag was intended to potentially adjust behavior (like priority or timeout), but it's not currently used in the job processing logic.
    # immediate = payload.get("immediate", False)

    if not module_name:
        return {
            "status": 400,
            "success": False,
            "message": "No module_name provided for module run",
            "error_code": "MISSING_MODULE_NAME",
        }

    log.info(f"[JOB:{job_id}] Running module {module_name} (origin={origin})")

    try:
        from modules import MODULES

        if module_name not in MODULES:
            return {
                "status": 400,
                "success": False,
                "message": f"Unknown module: {module_name}",
                "error_code": "UNKNOWN_MODULE",
            }

        module_class = MODULES[module_name]

        # Create module instance with fresh logger
        module_instance = module_class(logger=logger)

        # Record run start in database
        with DapsDB(logger=logger) as db:
            db.run_state.record_run_start(module_name, run_by=origin)

        start_time = time.time()

        try:
            # Execute the module
            module_instance.run()

            duration = int(time.time() - start_time)

            # Record successful completion
            with DapsDB(logger=logger) as db:
                db.run_state.record_run_finish(
                    module_name,
                    success=True,
                    status="success",
                    message="Completed successfully",
                    duration=duration,
                    run_by=origin,
                )

            log.info(
                f"[JOB:{job_id}] Module {module_name} completed successfully in {duration}s"
            )

            return {
                "status": 200,
                "success": True,
                "message": f"Module {module_name} completed successfully",
                "data": {"module": module_name, "duration": duration, "origin": origin},
            }

        except Exception as e:
            duration = int(time.time() - start_time)
            error_msg = str(e)

            # Record failure
            with DapsDB(logger=logger) as db:
                db.run_state.record_run_finish(
                    module_name,
                    success=False,
                    status="error",
                    message=error_msg,
                    duration=duration,
                    run_by=origin,
                )

            log.error(f"[JOB:{job_id}] Module {module_name} failed: {error_msg}")

            return {
                "status": 500,
                "success": False,
                "message": f"Module {module_name} failed: {error_msg}",
                "error_code": "MODULE_EXECUTION_FAILED",
                "data": {
                    "module": module_name,
                    "duration": duration,
                    "origin": origin,
                    "error": error_msg,
                },
            }

    except Exception as e:
        log.error(f"[JOB:{job_id}] Exception in module run job: {e}", exc_info=True)
        return {
            "status": 500,
            "success": False,
            "message": f"Module run job failed: {str(e)}",
            "error_code": "MODULE_JOB_EXCEPTION",
        }


def _queue_upload_job(manifest: Dict[str, Any], logger, job_id: int) -> None:
    """
    Queue a poster upload job.

    Args:
        manifest: Upload manifest data
        logger: Logger instance
        job_id: Current job ID for tracking
    """
    log = logger.get_adapter("POST_RENAME")

    try:
        upload_payload = {"manifest": manifest}

        with DapsDB(logger=logger) as db:
            result = db.worker.enqueue_job(
                table_name="jobs", payload=upload_payload, job_type="upload_posters"
            )

        if result["success"]:
            upload_job_id = result["data"]["job_id"]
            log.info(f"[JOB:{job_id}] Upload job queued: {upload_job_id}")
        else:
            log.error(f"[JOB:{job_id}] Failed to queue upload job: {result['message']}")

    except Exception as e:
        log.error(f"[JOB:{job_id}] Error queueing upload job: {e}")


def simple_job_processor(job: Dict[str, Any], logger) -> Dict[str, Any]:
    """
    Simplified job processor for basic job types.

    Args:
        job: Job data from database
        logger: Logger instance

    Returns:
        dict: Processing result
    """
    job_type = job.get("type")
    job_id = job.get("id")
    payload = json.loads(job.get("payload", "{}"))

    if job_type == "sync_gdrive":
        from modules.sync_gdrive import SyncGDrive

        gdrive_name = payload.get("gdrive_name")
        if not gdrive_name:
            return {"success": False, "message": "No gdrive_name provided"}

        syncer = SyncGDrive(logger=logger)
        success = syncer.sync_folder_adhoc(gdrive_name, job_id=job_id)

        return {"success": success, "message": f"Sync completed for {gdrive_name}"}

    elif job_type == "poster_rename":
        from modules.poster_renamerr import PosterRenamerr

        media_items = payload.get("media_items", [])
        if not media_items:
            return {"success": False, "message": "No media items provided"}

        renamer = PosterRenamerr(logger=logger)
        return renamer.run_poster_rename_adhoc(media_items)

    elif job_type == "module_run":
        # Delegate to the main processor
        return _process_module_run_job(payload, logger, job_id)

    else:
        return {"success": False, "message": f"Unknown job type: {job_type}"}
