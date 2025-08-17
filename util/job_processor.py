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
        elif job_type == "cache_refresh":
            return _process_cache_refresh_job(payload, logger, job_id)
        elif job_type == "labelarr_sync":
            return _process_labelarr_sync_job(payload, logger, job_id)
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
    Process webhook job by fetching ONLY the specific media item and updating it.

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
        from util.arr import create_arr_client
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

        # Connect directly to ARR and fetch ONLY the specific item
        with DapsDB(logger=logger) as db:
            arr_logger = logger.get_adapter(
                f"{instance_info['type']}:{instance_info['name']}"
            )

            # Create direct ARR client connection
            client = create_arr_client(
                instance_info["url"], instance_info["api"], arr_logger
            )

            if not client or not client.is_connected():
                return {
                    "success": False,
                    "message": f"Failed to connect to {instance_info['type']} instance",
                    "error_code": "ARR_CONNECTION_FAILED",
                }

            try:
                # Fetch ONLY the specific media item that triggered the webhook
                if instance_info["type"] == "radarr":
                    media = client.get_movie(media_id)
                    asset_type = "movie"
                else:
                    media = client.get_show(media_id)
                    asset_type = "show"

                if not media:
                    return {
                        "success": False,
                        "message": f"Media item {media_id} not found in {instance_info['name']}",
                        "error_code": "MEDIA_NOT_FOUND",
                    }

                log.debug(
                    f"[JOB:{job_id}] Fetched {media['title']} from {instance_info['name']}"
                )

                # Process the single media item for database storage
                processed_media = _process_media_record(media, asset_type)

                # Update only this specific media item in the database
                _update_media_record(
                    db, instance_info, asset_type, processed_media, log
                )

                # Get stored media records for poster processing
                stored_media = db.media.get_by_title_year_instance(
                    media["title"], media.get("year"), instance_info["name"]
                )

                if not stored_media:
                    return {
                        "success": False,
                        "message": "Failed to retrieve stored media from database",
                        "error_code": "MEDIA_RETRIEVAL_FAILED",
                    }

            finally:
                # Clean up the ARR client connection
                if hasattr(client, "session") and client.session:
                    client.session.close()

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


def _process_media_record(media: dict, asset_type: str) -> list:
    """
    Process a single media item into the format expected by the database.
    This replaces the heavy connector logic for single-item processing.

    Args:
        media: Single media item from ARR API
        asset_type: 'movie' or 'show'

    Returns:
        list: Processed media items ready for database storage
    """
    processed_items = []

    if asset_type == "show":
        # For shows, create entries for the main show and each season
        # Main show entry (no season)
        show_entry = dict(media)
        show_entry["season_number"] = None
        processed_items.append(show_entry)

        # Individual season entries
        for season in media.get("seasons", []):
            season_entry = dict(media)
            season_entry["season_number"] = season.get("season_number")
            processed_items.append(season_entry)
    else:
        # For movies, just add the single item
        processed_items.append(media)

    return processed_items


def _update_media_record(
    db: DapsDB, instance_info: dict, asset_type: str, processed_media: list, logger
) -> None:
    """
    Update only the specific media records for the webhook item.
    This prevents affecting other media in the instance.

    Args:
        db: Database connection
        instance_info: ARR instance information
        asset_type: 'movie' or 'show'
        processed_media: List of processed media items to update
        logger: Logger instance
    """
    instance_name = instance_info["name"]
    instance_type = instance_info["type"].capitalize()

    for item in processed_media:
        try:
            # Use upsert to add or update the individual record
            db.media.upsert(item, asset_type, instance_type, instance_name)

            # Log the action
            season = item.get("season_number")
            season_str = f" Season: {season}," if season is not None else ""
            logger.info(
                f"[ADD] Title: {item.get('title')} ({item.get('year')}) ({asset_type}),{season_str} from {instance_name}"
            )

        except Exception as e:
            logger.error(f"Failed to update media record for {item.get('title')}: {e}")

    logger.debug(
        f"[SYNC] Media cache for {instance_name} ({asset_type}) synchronized. {len(processed_media)} items present."
    )


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
    log = logger.get_adapter("UPLOAD_POSTERS")

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


def _process_labelarr_sync_job(
    payload: Dict[str, Any], logger, job_id: int
) -> Dict[str, Any]:
    """
    Process labelarr sync job using the existing labelarr module.

    Args:
        payload: Job payload containing sync request data
        logger: Logger instance
        job_id: Job ID for tracking

    Returns:
        dict: Processing result
    """
    log = logger.get_adapter("LABELARR_SYNC")
    log.info(f"[JOB:{job_id}] Starting labelarr sync")

    try:
        from modules.labelarr import Labelarr

        # Extract sync parameters from payload
        source_instance = payload.get("source_instance")
        media_cache_id = payload.get("media_cache_id")
        plex_mapping_id = payload.get("plex_mapping_id")
        tag_actions = payload.get("tag_actions", {})
        plex_instance = payload.get("plex_instance", "plex_1")
        dry_run = payload.get("dry_run", False)

        if not source_instance or not media_cache_id:
            return {
                "status": 400,
                "success": False,
                "message": "Missing required parameters: source_instance or media_cache_id",
                "error_code": "MISSING_PARAMETERS",
            }

        log.info(
            f"[JOB:{job_id}] Syncing tags for media {media_cache_id} from {source_instance} to {plex_instance}"
        )

        # Create labelarr instance
        labelarr = Labelarr(logger=logger)

        # Execute sync using labelarr module's adhoc method - keeps all business logic in the module
        result = labelarr.labelarr_sync_adhoc(
            source_instance=source_instance,
            media_cache_id=media_cache_id,
            tag_actions=tag_actions,
            plex_instance=plex_instance,
            plex_mapping_id=plex_mapping_id,
            dry_run=dry_run,
        )

        # Convert to job processor format
        if result["success"]:
            return {
                "status": 200,
                "success": True,
                "message": result["message"],
                "data": result.get("data", {}),
            }
        else:
            # Map error codes to appropriate HTTP status codes
            status_code = 500  # Default
            if result.get("error_code") in ["MEDIA_NOT_FOUND", "PLEX_ITEM_NOT_FOUND"]:
                status_code = 404
            elif result.get("error_code") == "PLEX_CONNECTION_FAILED":
                status_code = 503

            return {
                "status": status_code,
                "success": False,
                "message": result["message"],
                "error_code": result.get("error_code", "LABELARR_SYNC_FAILED"),
            }

    except Exception as e:
        log.error(f"[JOB:{job_id}] Labelarr sync failed: {e}", exc_info=True)
        return {
            "status": 500,
            "success": False,
            "message": f"Labelarr sync failed: {str(e)}",
            "error_code": "LABELARR_SYNC_FAILED",
        }


def _process_cache_refresh_job(
    payload: Dict[str, Any], logger, job_id: int
) -> Dict[str, Any]:
    """
    Process cache refresh job by syncing ARR and Plex databases.

    Args:
        payload: Job payload containing refresh configuration
        logger: Logger instance
        job_id: Job ID for tracking

    Returns:
        dict: Processing result
    """
    log = logger.get_adapter("CACHE_REFRESH")
    log.info(f"[JOB:{job_id}] Starting cache refresh")

    try:
        from util.connector import Connector

        # Extract refresh configuration from payload
        arr_instances = payload.get("arr_instances", [])
        plex_instances = payload.get("plex_instances", [])
        libraries = payload.get("libraries", [])
        update_mappings = payload.get("update_mappings", False)

        log.info(
            f"[JOB:{job_id}] Refresh config - ARR: {len(arr_instances)}, Plex: {len(plex_instances)}, Libraries: {len(libraries)}, Mappings: {update_mappings}"
        )

        # Construct instance_map from payload data for Connector
        # Expected format: {'arrs': ['Radarr Test'], 'plex': {'plex_1': ['Test Movies']}}
        instance_map = {}

        # Add ARR instances to map
        if arr_instances:
            instance_map["arrs"] = arr_instances

        # Add Plex instances with libraries to map
        if plex_instances:
            plex_map = {}
            for plex_instance in plex_instances:
                # Use libraries if specified, otherwise use empty list (all libraries)
                plex_map[plex_instance] = libraries if libraries else []
            instance_map["plex"] = plex_map

        # Initialize connector with proper instance_map and database
        with DapsDB(logger=logger) as db:
            with Connector(
                db=db, instance_map=instance_map, logger=logger
            ) as connector:
                results = connector.sync_all_databases()

                # Log results
                arr_results = results.get("arr", [])
                plex_results = results.get("plex", [])
                collections_results = results.get("collections", [])
                mapping_results = results.get("mappings", {})

                arr_success = len([r for r in arr_results if r.success])
                plex_success = len([r for r in plex_results if r.success])
                collections_success = len([r for r in collections_results if r.success])

                log.info(
                    f"[JOB:{job_id}] Sync results - ARR: {arr_success}/{len(arr_results)}, Plex: {plex_success}/{len(plex_results)}, Collections: {collections_success}/{len(collections_results)}"
                )

                if isinstance(mapping_results, dict) and "updated" in mapping_results:
                    log.info(
                        f"[JOB:{job_id}] Plex mappings - Updated: {mapping_results['updated']}, No match: {mapping_results['no_match']}"
                    )

                # Determine overall success
                total_attempted = (
                    len(arr_results) + len(plex_results) + len(collections_results)
                )
                total_successful = arr_success + plex_success + collections_success

                success = total_successful == total_attempted and total_attempted > 0

                # Convert SyncResult objects to dictionaries for JSON serialization
                serializable_results = {}
                for key, value in results.items():
                    if key == "mappings":
                        serializable_results[key] = value  # Already a dict
                    else:
                        # Convert SyncResult objects to dicts
                        serializable_results[key] = [
                            {
                                "instance_name": r.instance_name,
                                "instance_type": r.instance_type,
                                "success": r.success,
                                "items_processed": r.items_processed,
                                "error_message": r.error_message,
                                "duration": r.duration,
                            }
                            for r in value
                        ]

                return {
                    "status": 200,
                    "success": success,
                    "message": f"Cache refresh completed: {total_successful}/{total_attempted} instances successful",
                    "data": {
                        "arr_synced": len(arr_results),
                        "plex_synced": len(plex_results),
                        "collections_synced": len(collections_results),
                        "mappings_updated": (
                            mapping_results.get("updated", 0)
                            if isinstance(mapping_results, dict)
                            else 0
                        ),
                        "results": serializable_results,
                    },
                }

    except Exception as e:
        log.error(f"[JOB:{job_id}] Cache refresh failed: {e}", exc_info=True)
        return {
            "status": 500,
            "success": False,
            "message": f"Cache refresh failed: {str(e)}",
            "error_code": "CACHE_REFRESH_FAILED",
        }
