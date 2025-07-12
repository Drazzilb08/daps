import sys
from types import SimpleNamespace
from typing import Any, Dict, List, Optional

from util.arrpy import BaseARRClient, create_arr_client
from util.logger import Logger
from util.notification import send_notification
from util.utility import create_table, print_settings

VALID_STATUSES = {"continuing", "airing", "ended", "canceled", "released"}


def filter_media(
    media_dict: List[Dict[str, Any]],
    checked_tag_id: int,
    ignore_tag_id: int,
    count: int,
    season_monitored_threshold: int,
    logger: Logger,
) -> List[Dict[str, Any]]:
    """
    Filter and return media entries that are eligible for processing.

    Args:
        media_dict: List of media entries.
        checked_tag_id: Tag ID for already-processed items.
        ignore_tag_id: Tag ID for ignored items.
        count: Max number of entries to process.
        season_monitored_threshold: Minimum monitored episode percentage.
        logger: Logger instance.
    Returns:
        Filtered list of media entries to process.
    """
    filtered_media_dict: List[Dict[str, Any]] = []
    filter_count: int = 0
    for item in media_dict:
        if filter_count == count:
            break
        # Filter out media that is tagged, ignored, unmonitored, or not in valid status
        if (
            checked_tag_id in item["tags"]
            or ignore_tag_id in item["tags"]
            or not item["monitored"]
            or item["status"] not in VALID_STATUSES
        ):
            reasons = []
            if checked_tag_id in item["tags"]:
                reasons.append("tagged")
            if ignore_tag_id in item["tags"]:
                reasons.append("ignore")
            if not item["monitored"]:
                reasons.append("unmonitored")
            if item["status"] not in VALID_STATUSES:
                reasons.append(f"status={item['status']}")
            logger.debug(
                f"Skipping {item['title']} ({item['year']}), Reason: {', '.join(reasons)}"
            )
            continue
        # Disable season if monitored percentage falls below threshold
        if item["seasons"]:
            series_monitored = False
            for i, season in enumerate(item["seasons"]):
                monitored_count = 0
                for episode in season["episode_data"]:
                    if episode["monitored"]:
                        monitored_count += 1
                if len(season["episode_data"]) > 0:
                    monitored_percentage = (
                        monitored_count / len(season["episode_data"])
                    ) * 100
                else:
                    logger.debug(
                        f"Skipping {item['title']} ({item['year']}), Season {i} unmonitored. Reason: No episodes in season."
                    )
                    continue
                if (
                    season_monitored_threshold is not None
                    and monitored_percentage < season_monitored_threshold
                ):
                    item["seasons"][i]["monitored"] = False
                    logger.debug(
                        f"{item['title']}, Season {i} unmonitored. Reason: monitored percentage {int(monitored_percentage)}% less than season_monitored_threshold {int(season_monitored_threshold)}%"
                    )
                if item["seasons"][i]["monitored"]:
                    series_monitored = True
            if not series_monitored:
                logger.debug(
                    f"Skipping {item['title']} ({item['year']}), Status: {item['status']}, Monitored: {item['monitored']}, Tags: {item['tags']}"
                )
                continue
        filtered_media_dict.append(item)
        logger.info(
            f"Queued for upgrade: {item['title']} ({item['year']}) [ID: {item['media_id']}]"
        )
        filter_count += 1
    return filtered_media_dict


def process_search_response(
    search_response: Optional[Dict[str, Any]],
    media_id: int,
    app: BaseARRClient,
    logger: Logger,
) -> None:
    """
    Wait for search command to complete and log the result.

    Args:
        search_response: API response from initiating a search.
        media_id: ID of the media being searched.
        app: ARR client instance.
        logger: Logger instance.
    Returns:
        None
    """
    if search_response:
        logger.debug(
            f"    [CMD] Waiting for command to complete for search response ID: {search_response['id']}"
        )
        ready = app.wait_for_command(search_response["id"])
        if ready:
            logger.debug(
                f"    [CMD] Command completed successfully for search response ID: {search_response['id']}"
            )
        else:
            logger.debug(
                f"    [CMD] Command did not complete successfully for search response ID: {search_response['id']}"
            )
    else:
        logger.warning(f"No search response for media ID: {media_id}")


def process_queue(
    queue: Dict[str, Any], instance_type: str, media_ids: List[int]
) -> List[Dict[str, Any]]:
    """
    Extract download records for matching media IDs from the queue.

    Args:
        queue: Queue data from the API.
        instance_type: "radarr" or "sonarr".
        media_ids: List of media IDs to filter.
    Returns:
        List of dicts with download info for matching media IDs.
    """
    id_type = "movieId" if instance_type == "radarr" else "seriesId"
    queue_dict: List[Dict[str, Any]] = []
    records = queue.get("records", [])
    for item in records:
        media_id = item.get(id_type)
        if media_id not in media_ids:
            continue
        # Only add if 'downloadId' exists in the item
        if "downloadId" not in item:
            continue
        queue_dict.append(
            {
                "download_id": item["downloadId"],
                "media_id": media_id,
                "download": item.get("title"),
                "torrent_custom_format_score": item.get("customFormatScore"),
            }
        )
    # Remove duplicate download records
    queue_dict = [dict(t) for t in {tuple(d.items()) for d in queue_dict}]
    return queue_dict


def process_instance(
    instance_type: str,
    instance_settings: Dict[str, Any],
    app: BaseARRClient,
    logger: Logger,
    config: SimpleNamespace,
) -> Optional[Dict[str, Any]]:
    """
    Process a single instance: filter media, trigger searches, tag media, and gather results.

    Args:
        instance_type: "radarr" or "sonarr".
        instance_settings: Instance-specific settings from config.
        app: ARR client instance.
        logger: Logger instance.
        config: Global config.
    Returns:
        Dictionary of summary and media results, or None.
    """
    tagged_count: int = 0
    untagged_count: int = 0
    total_count: int = 0
    count: int = instance_settings.get("count", 2)
    checked_tag_name: str = instance_settings.get("tag_name", "checked")
    ignore_tag_name: str = instance_settings.get("ignore_tag", "ignore")
    unattended: bool = instance_settings.get("unattended", False)
    season_monitored_threshold: int = instance_settings.get(
        "season_monitored_threshold", 0
    )

    logger.info(f"Gathering media from {app.instance_name} ({instance_type})")
    # Set default for season_monitored_threshold to 1 if not provided
    if season_monitored_threshold is None:
        logger.warning(
            f"No 'season_monitored_threshold' provided for {app.instance_name}. Defaulting to 1."
        )
        season_monitored_threshold = 1
    media_dict: List[Dict[str, Any]] = (
        app.get_parsed_media(include_episode=True)
        if app.instance_type.lower() == "sonarr"
        else app.get_parsed_media()
    )
    ignore_tag_id = None
    checked_tag_id: int = app.get_tag_id_from_name(checked_tag_name)
    if ignore_tag_name:
        ignore_tag_id: int = app.get_tag_id_from_name(ignore_tag_name)

    filtered_media_dict: List[Dict[str, Any]] = filter_media(
        media_dict,
        checked_tag_id,
        ignore_tag_id,
        count,
        season_monitored_threshold,
        logger,
    )
    if not filtered_media_dict and unattended:
        logger.info(
            f"All media for {app.instance_name} is already tagged—removing tags for unattended operation."
        )
        media_ids = [item["media_id"] for item in media_dict]
        logger.info("All media is tagged. Removing tags...")
        app.remove_tags(media_ids, checked_tag_id)
        media_dict = (
            app.get_parsed_media(include_episode=True)
            if app.instance_type.lower() == "sonarr"
            else app.get_parsed_media()
        )
        filtered_media_dict = filter_media(
            media_dict,
            checked_tag_id,
            ignore_tag_id,
            count,
            season_monitored_threshold,
            logger,
        )

    if not filtered_media_dict and not unattended:
        logger.info(f"No media left to process for {app.instance_name}.")
        logger.warning(
            f"No media found for {app.instance_name}. Reason: nothing left to tag."
        )
        return None

    logger.debug(f"Filtered media count: {len(filtered_media_dict)}")
    if media_dict:
        total_count = len(media_dict)
        for item in media_dict:
            if checked_tag_id in item["tags"]:
                tagged_count += 1
            else:
                untagged_count += 1

    output_dict: Dict[str, Any] = {
        "server_name": app.instance_name,
        "tagged_count": tagged_count,
        "untagged_count": untagged_count,
        "total_count": total_count,
        "data": [],
    }

    if not config.dry_run:
        search_count: int = 0
        media_ids: List[int] = [item["media_id"] for item in filtered_media_dict]
        # Search logic: trigger searches and tag after search
        for item in filtered_media_dict:
            logger.debug("")  # Blank line before block
            logger.debug("═" * 70)
            logger.debug(
                f"[PROCESSING] {item['title']} ({item['year']}) | ID: {item['media_id']}"
            )
            logger.debug("═" * 70)

            if item["seasons"] is None:
                logger.debug(
                    f"Searching media without seasons for media ID: {item['media_id']}"
                )
                search_response = app.search_media(item["media_id"])
                process_search_response(search_response, item["media_id"], app, logger)
                logger.debug(
                    f"  [TAG] Adding tag {checked_tag_id} to media ID: {item['media_id']}"
                )
                app.add_tags(item["media_id"], checked_tag_id)
                search_count += 1
                if search_count >= count:
                    logger.debug(
                        f"🔁 Reached search count limit after non-season search ({search_count} >= {count}), breaking."
                    )
                    logger.debug("─" * 70)
                    logger.debug(f"[END] Finished: {item['title']} ({item['year']}) | ID: {item['media_id']}")
                    logger.debug("─" * 70)
                    logger.debug("")
                    break
            else:
                searched = False
                for season in item["seasons"]:
                    if season["monitored"]:
                        logger.debug(
                            f"  [SEASON] {season['season_number']}: Searching..."
                        )
                        search_response = app.search_season(
                            item["media_id"], season["season_number"]
                        )
                        process_search_response(
                            search_response, item["media_id"], app, logger
                        )
                        searched = True

                if searched:
                    logger.debug(
                        f"  [TAG] Adding tag {checked_tag_id} to media ID: {item['media_id']}"
                    )
                    app.add_tags(item["media_id"], checked_tag_id)
                    search_count += 1
                    if search_count >= count:
                        logger.debug(
                            f"🔁 Reached series-based search count limit ({search_count} >= {count}), breaking."
                        )
                        logger.debug("─" * 70)
                        logger.debug(f"[END] Finished: {item['title']} ({item['year']}) | ID: {item['media_id']}")
                        logger.debug("─" * 70)
                        logger.debug("")
                        break

            logger.debug("─" * 70)
            logger.debug(f"[END] Finished: {item['title']} ({item['year']}) | ID: {item['media_id']}")
            logger.debug("─" * 70)
            logger.debug("")  # Blank line after block
            logger.info(f"Finished processing: {item['title']} ({item['year']})")

        logger.info(
            f"Completed upgrade operations for {app.instance_name}. Now retrieving download queue..."
        )
        queue = app.get_queue()
        logger.debug(f"Queue item count: {len(queue.get('records', []))}")
        queue_dict: List[Dict[str, Any]] = process_queue(
            queue, instance_type, media_ids
        )
        logger.debug(f"Queue dict item count: {len(queue_dict)}")

        queue_map: Dict[int, List[Dict[str, Any]]] = {}
        for q in queue_dict:
            queue_map.setdefault(q["media_id"], []).append(q)

        for item in filtered_media_dict:
            # Downloads are processed per media_id from the queue
            downloads = {
                q["download"]: q["torrent_custom_format_score"]
                for q in queue_map.get(item["media_id"], [])
            }
            output_dict["data"].append(
                {
                    "media_id": item["media_id"],
                    "title": item["title"],
                    "year": item["year"],
                    "download": downloads,
                }
            )
    else:
        for item in filtered_media_dict:
            output_dict["data"].append(
                {
                    "media_id": item["media_id"],
                    "title": item["title"],
                    "year": item["year"],
                    "download": None,
                    "torrent_custom_format_score": None,
                }
            )
    return output_dict


def print_output(output_dict: Dict[str, Any], logger: Logger) -> None:
    """
    Print a human-readable summary of upgrade results for each instance.

    Args:
        output_dict: Mapping of instance name to media results.
        logger: Logger instance.
    Returns:
        None
    """
    for instance, run_data in output_dict.items():
        if run_data:
            instance_data = run_data.get("data", None)
            if instance_data:
                table = [[f"{run_data['server_name']}"]]
                logger.info(create_table(table))
                logger.info(
                    f"Upgrade summary for {run_data['server_name']}: {run_data.get('untagged_count', 0)} untagged, {run_data.get('tagged_count', 0)} tagged, {run_data.get('total_count', 0)} total."
                )
                for item in instance_data:
                    logger.info(f"{item['title']} ({item['year']})")
                    if item["download"]:
                        for download, format_score in item["download"].items():
                            logger.info(f"\t{download}\tScore: {format_score}")
                    else:
                        logger.info("\tNo upgrades found for this item.")
                    logger.info("")
            else:
                logger.info(f"No items found for {instance}.")


def main(config: SimpleNamespace) -> None:
    """
    Entrypoint for upgradinatorr. Loads config, processes instances, prints results, and sends notifications.

    Args:
        config: Loaded configuration object.
    Returns:
        None
    """
    logger = Logger(config.log_level, config.module_name)
    try:
        if config.log_level.lower() == "debug":
            print_settings(logger, config)
        if config.dry_run:
            table = [["Dry Run"], ["NO CHANGES WILL BE MADE"]]
            logger.info(create_table(table))
        if not getattr(config, "instances_list", None):
            logger.error("No instances found in config file.")
            sys.exit()
        final_output_dict: Dict[str, Any] = {}
        for instance_entry in config.instances_list:
            instance_name = instance_entry.get("instance")
            if not instance_name:
                continue
            for instance_type, instance_data in config.instances_config.items():
                if instance_name in instance_data:
                    url = instance_data[instance_name]["url"]
                    api = instance_data[instance_name]["api"]
                    app = create_arr_client(url, api, logger)
                    if app and app.connect_status:
                        output = process_instance(
                            instance_type, instance_entry, app, logger, config
                        )
                        final_output_dict.setdefault(instance_name, {}).update(
                            output or {}
                        )
        logger.debug(f"Processed instances: {list(final_output_dict.keys())}")
        if final_output_dict:
            print_output(final_output_dict, logger)
            send_notification(
                logger=logger,
                module_name=config.module_name,
                config=config,
                output=final_output_dict,
            )
    except KeyboardInterrupt:
        print("Keyboard Interrupt detected. Exiting...")
        sys.exit()
    except Exception:
        logger.error("\n\nAn error occurred:\n", exc_info=True)
        logger.error("\n\n")
    finally:
        # Log outro message with run time
        logger.log_outro()
