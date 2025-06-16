import sys
from typing import List, Dict, Optional
from types import SimpleNamespace
from collections import defaultdict

from util.logger import Logger
from util.arrpy import create_arr_client, BaseARRClient
from util.notification import send_notification
from util.normalization import normalize_titles
from util.utility import progress, create_table, print_settings

try:
    from plexapi.server import PlexServer
    from plexapi.exceptions import BadRequest
except ImportError as e:
    print(f"ImportError: {e}")
    print("Please install the required modules with 'pip install -r requirements.txt'")
    exit(1)


def sync_to_plex(
    plex: PlexServer,
    labels: List[str],
    media_dict: List[Dict],
    app: BaseARRClient,
    logger: Logger,
    library_names: List[str],
    config: SimpleNamespace,
) -> List[Dict]:
    """
    Synchronize label metadata between an ARR client and Plex libraries.

    Args:
        plex (PlexServer): Plex server instance.
        labels (List[str]): List of label names to sync.
        media_dict (List[Dict]): List of media entries from ARR.
        app (BaseARRClient): ARR client instance (Radarr or Sonarr).
        logger (Logger): Logger instance.
        library_names (List[str]): Names of Plex libraries to process.
        config (SimpleNamespace): Configuration object.

    Returns:
        List[Dict]: List of label changes applied or identified.
    """
    tag_ids: Dict[str, Optional[int]] = {}
    # Map label names to their corresponding tag IDs in ARR
    for label in labels:
        tag_id = app.get_tag_id_from_name(label)
        if tag_id:
            tag_ids[label] = tag_id

    # Create lookup dictionaries for media items based on different IDs
    tmdb_lookup = {
        media["tmdb_id"]: media
        for media in media_dict
        if media.get("tmdb_id") is not None
    }
    tvdb_lookup = {
        media["tvdb_id"]: media
        for media in media_dict
        if media.get("tvdb_id") is not None
    }
    imdb_lookup = {
        media["imdb_id"]: media
        for media in media_dict
        if media.get("imdb_id") is not None
    }
    fallback_lookup = {
        (media["normalized_title"], media["year"]): media for media in media_dict
    }

    data_dict: List[Dict] = []

    with progress(
        library_names,
        desc="Processing Libraries",
        unit="items",
        logger=logger,
        leave=True,
    ) as outer_pbar:
        for library in outer_pbar:
            library_data = plex.library.section(library).all()

            with progress(
                library_data,
                desc=f"Syncing labels between {app.instance_name.capitalize()} and {library}",
                unit="items",
                logger=logger,
                leave=True,
            ) as inner_pbar:
                for library_item in inner_pbar:
                    try:
                        plex_item_labels = [
                            label.tag.lower() for label in library_item.labels
                        ]
                    except AttributeError:
                        logger.error(
                            f"Error fetching labels for {library_item.title} ({library_item.year})"
                        )
                        continue

                    ids: Dict[str, Optional[str]] = {
                        "tmdb": None,
                        "tvdb": None,
                        "imdb": None,
                    }
                    # Extract IDs from Plex item's GUIDs for matching
                    for guid in getattr(library_item, "guids", []):
                        guid_str = getattr(guid, "id", "")
                        if guid_str.startswith("tmdb://"):
                            ids["tmdb"] = guid_str.split("tmdb://")[1]
                        elif guid_str.startswith("tvdb://"):
                            ids["tvdb"] = guid_str.split("tvdb://")[1]
                        elif guid_str.startswith("imdb://"):
                            ids["imdb"] = guid_str.split("imdb://")[1]

                    media_item: Optional[Dict] = None
                    match_type: str = "unknown"

                    # Attempt to find media item by TMDB ID if valid
                    if ids["tmdb"] and ids["tmdb"].isdigit():
                        media_item = tmdb_lookup.get(int(ids["tmdb"]))
                        if media_item:
                            media_id = media_item["tmdb_id"]
                            plex_id = ids["tmdb"]
                            match_type = (
                                f"TMDB Media ID: {media_id} - Plex ID {plex_id}"
                            )

                    # Fallback to TVDB ID if no TMDB match found
                    if not media_item and ids["tvdb"] and ids["tvdb"].isdigit():
                        media_item = tvdb_lookup.get(int(ids["tvdb"]))
                        if media_item:
                            media_id = media_item["tvdb_id"]
                            plex_id = ids["tvdb"]
                            match_type = (
                                f"TVDB Media ID: {media_id} - Plex ID {plex_id}"
                            )

                    # Fallback to IMDB ID if no TMDB or TVDB match found
                    if not media_item and ids["imdb"]:
                        media_item = imdb_lookup.get(ids["imdb"])
                        if media_item:
                            media_id = media_item["imdb_id"]
                            plex_id = ids["imdb"]
                            match_type = (
                                f"IMDB Media ID: {media_id} - Plex ID {plex_id}"
                            )

                    # Final fallback to normalized title and year matching
                    if not media_item:
                        key = (normalize_titles(library_item.title), library_item.year)
                        media_item = fallback_lookup.get(key)
                        if media_item:
                            match_type = "TITLE/YEAR MATCH"

                    if media_item:
                        logger.debug(
                            f"Matched '{library_item.title}' ({library_item.year}) using {match_type} lookup to '{media_item['title']}' ({media_item['year']})"
                        )
                        add_remove: Dict[str, str] = {}

                        # Determine which labels to add or remove based on ARR tags and Plex labels
                        for tag, id in tag_ids.items():
                            if tag not in plex_item_labels and id in media_item["tags"]:
                                add_remove[tag] = "add"
                                if not config.dry_run:
                                    library_item.addLabel(tag)
                            elif (
                                tag in plex_item_labels and id not in media_item["tags"]
                            ):
                                add_remove[tag] = "remove"
                                if not config.dry_run:
                                    library_item.removeLabel(tag)

                        if add_remove:
                            data_dict.append(
                                {
                                    "title": library_item.title,
                                    "year": library_item.year,
                                    "add_remove": add_remove,
                                }
                            )

    return data_dict


def handle_messages(data_dict: List[Dict], logger: Logger) -> None:
    """
    Log label changes from sync results in a grouped, readable format.

    Args:
        data_dict (List[Dict]): List of dictionaries containing sync results.
        logger (Logger): Logger instance for output.
    """

    table: List[List[str]] = [["Results"]]
    logger.info(create_table(table))

    label_changes: Dict[tuple, List[str]] = defaultdict(list)

    # Group media titles by label and action (add/remove)
    for item in data_dict:
        for label, action in item["add_remove"].items():
            key = (label, action)
            label_changes[key].append(f"{item['title']} ({item['year']})")

    # Log grouped label changes
    for (label, action), items in label_changes.items():
        verb = "added to" if action == "add" else "removed from"
        logger.info(f"\nLabel: {label} has been {verb}:")
        for entry in items:
            logger.info(f"  - {entry}")


def main(config: SimpleNamespace) -> None:
    """
    Main function to sync labels between Plex and Radarr/Sonarr based on configuration.

    Args:
        config (SimpleNamespace): Configuration object loaded from user settings.
    """
    logger = Logger(config.log_level, config.module_name)
    try:
        # Print detailed settings if debug logging is enabled
        if config.log_level.lower() == "debug":
            print_settings(logger, config)

        # Notify user if running in dry run mode (no actual changes will be made)
        if config.dry_run:
            table = [["Dry Run"], ["NO CHANGES WILL BE MADE"]]
            logger.info(create_table(table))

        output: List[Dict] = []

        # Iterate over each mapping configured for syncing
        for mapping in config.mappings:
            app_type: str = mapping["app_type"]
            app_instance: Optional[str] = mapping.get("app_instance")
            labels: List[str] = mapping["labels"]
            plex_instances: List[Dict] = mapping["plex_instances"]
            app: Optional[BaseARRClient] = None
            media_dict: List[Dict] = []

            # Connect to the ARR client (Radarr or Sonarr) if specified
            if app_type in ["radarr", "sonarr"] and app_instance:
                app_config: Optional[Dict] = config.instances_config[app_type].get(
                    app_instance
                )
                if not app_config:
                    logger.error(
                        f"No config found for {app_type} instance '{app_instance}'"
                    )
                    continue

                app = create_arr_client(app_config["url"], app_config["api"], logger)
                if not app or not app.connect_status:
                    logger.error(
                        f"Failed to connect to {app_type} instance {app_instance}"
                    )
                    continue

                # Fetch parsed media list from ARR client, excluding episodes for Sonarr
                if (
                    hasattr(app, "instance_type")
                    and app.instance_type.lower() == "sonarr"
                ):
                    media_dict = app.get_parsed_media(include_episode=False)
                else:
                    media_dict = app.get_parsed_media()

                if not media_dict:
                    logger.info(f"No media found for {app_instance}")
                    continue

            # Process each Plex instance and library associated with the mapping
            if plex_instances:
                for mapping_block in plex_instances:
                    plex_instance: Optional[str] = mapping_block.get("instance")
                    library_names: List[str] = mapping_block.get("library_names", [])

                    if plex_instance not in config.instances_config.get("plex", {}):
                        logger.error(
                            f"No Plex instance found for {plex_instance}. Skipping...\n"
                        )
                        continue

                    try:
                        plex = PlexServer(
                            config.instances_config["plex"][plex_instance]["url"],
                            config.instances_config["plex"][plex_instance]["api"],
                            timeout=180,
                        )
                        logger.info(f"Connected to Plex instance '{plex.friendlyName}'")

                    except BadRequest:
                        logger.error(
                            f"Error connecting to Plex instance: {plex_instance}"
                        )
                        continue

                    if library_names:
                        label_str = ", ".join(labels)
                        logger.info(
                            f"Syncing labels [{label_str}] from {app_type.capitalize()} instance '{app_instance}' to Plex instance '{plex_instance}'"
                        )
                        # Collect changes from sync_to_plex and accumulate in output list
                        data_dict = sync_to_plex(
                            plex, labels, media_dict, app, logger, library_names, config
                        )
                        output.extend(data_dict)
                    else:
                        logger.error(
                            f"No library names provided for {plex_instance}. Skipping..."
                        )
                        continue

        # Log and send notifications if any label changes were found
        if output:
            handle_messages(output, logger)
            # Only send notifications if not in dry run mode
            send_notification(
                logger=logger,
                module_name=config.module_name,
                config=config,
                output=output,
            )
        else:
            logger.info("No labels to sync to Plex")

    except KeyboardInterrupt:
        print("Keyboard Interrupt detected. Exiting...")
        sys.exit()
    except Exception:
        logger.error(f"\n\nAn error occurred:\n", exc_info=True)
        logger.error(f"\n\n")
    finally:
        # Log outro message with run time
        logger.log_outro()
