import sys
from collections import defaultdict
from types import SimpleNamespace
from typing import Dict, List, Optional

from util.arrpy import BaseARRClient, create_arr_client
from util.logger import Logger
from util.normalization import normalize_titles
from util.notification import send_notification
from util.utility import create_table, print_settings, progress

try:
    from plexapi.exceptions import BadRequest
    from plexapi.server import PlexServer
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
    for label in labels:
        tag_id = app.get_tag_id_from_name(label)
        if tag_id:
            tag_ids[label] = tag_id

    # Create lookups
    tmdb_imdb_lookup = {
        (media.get("tmdb_id"), media.get("imdb_id")): media
        for media in media_dict
        if media.get("tmdb_id") is not None and media.get("imdb_id")
    }
    tvdb_imdb_lookup = {
        (media.get("tvdb_id"), media.get("imdb_id")): media
        for media in media_dict
        if media.get("tvdb_id") is not None and media.get("imdb_id")
    }
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
        (media["normalized_title"], media["year"]): media
        for media in media_dict
        if "normalized_title" in media and "year" in media
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
                            f"Error fetching labels for {getattr(library_item, 'title', str(library_item))} (no labels)"
                        )
                        continue

                    # Safely extract IDs
                    ids: Dict[str, Optional[str]] = {
                        "tmdb": None,
                        "tvdb": None,
                        "imdb": None,
                    }
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

                    # 1. Prefer TMDB+IMDB or TVDB+IMDB
                    tmdb_id = ids.get("tmdb")
                    imdb_id = ids.get("imdb")
                    tvdb_id = ids.get("tvdb")

                    # Prefer TMDB+IMDB
                    if tmdb_id and tmdb_id.isdigit() and imdb_id:
                        key = (int(tmdb_id), imdb_id)
                        media_item = tmdb_imdb_lookup.get(key)
                        if media_item:
                            match_type = f"TMDB+IMDB MATCH: TMDB {tmdb_id} & IMDB {imdb_id}"

                    # Next try TVDB+IMDB
                    if not media_item and tvdb_id and tvdb_id.isdigit() and imdb_id:
                        key = (int(tvdb_id), imdb_id)
                        media_item = tvdb_imdb_lookup.get(key)
                        if media_item:
                            match_type = f"TVDB+IMDB MATCH: TVDB {tvdb_id} & IMDB {imdb_id}"

                    # 2. Fallback to just TMDB, TVDB, IMDB
                    if not media_item and tmdb_id and tmdb_id.isdigit():
                        media_item = tmdb_lookup.get(int(tmdb_id))
                        if media_item:
                            match_type = f"TMDB MATCH: {tmdb_id}"

                    if not media_item and tvdb_id and tvdb_id.isdigit():
                        media_item = tvdb_lookup.get(int(tvdb_id))
                        if media_item:
                            match_type = f"TVDB MATCH: {tvdb_id}"

                    if not media_item and imdb_id:
                        media_item = imdb_lookup.get(imdb_id)
                        if media_item:
                            match_type = f"IMDB MATCH: {imdb_id}"

                    # 3. Final fallback to normalized title and year
                    if not media_item:
                        norm_title = normalize_titles(getattr(library_item, "title", ""))
                        item_year = getattr(library_item, "year", None)
                        if item_year is not None:
                            key = (norm_title, item_year)
                            media_item = fallback_lookup.get(key)
                            if media_item:
                                match_type = "TITLE/YEAR MATCH"
                        else:
                            logger.debug(
                                f"Skipping fallback match for '{getattr(library_item, 'title', str(library_item))}' as no 'year' attribute is present (likely not a movie/show item)"
                            )

                    # 4. Only proceed if a real match was found
                    if media_item:
                        logger.debug(
                            f"Matched '{getattr(library_item, 'title', str(library_item))}' ({getattr(library_item, 'year', '-')}) using {match_type} to '{media_item.get('title', '-')}' ({media_item.get('year', '-')})"
                        )
                        add_remove: Dict[str, str] = {}
                        # Decide add/remove per label
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
                                    "title": getattr(library_item, "title", str(library_item)),
                                    "year": getattr(library_item, "year", None),
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
        logger.error("\n\nAn error occurred:\n", exc_info=True)
        logger.error("\n\n")
    finally:
        # Log outro message with run time
        logger.log_outro()
