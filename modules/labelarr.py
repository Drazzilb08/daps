import json
import sys
from collections import defaultdict
from typing import Dict, List

from util.config import Config
from util.connector import update_client_databases, update_plex_database
from util.database import DapsDB
from util.helper import create_table, print_settings
from util.logger import Logger
from util.normalization import normalize_titles
from util.notification import NotificationManager
from util.plex import PlexClient


def sync_to_plex(plex_client, arr_data, plex_data, logger, labels, config, db):
    """
    Synchronize pre-defined labels from ARR data to Plex libraries.
    For each matched item in plex_data, ensures Plex labels match ARR.
    Prefers TMDB+IMDB for movies, TVDB+IMDB for shows, falls back to TMDB, TVDB, IMDB, then title+year.
    Also updates the plex_media_cache table with the new label state.
    """
    import json

    def get_id(val):
        return str(val) if val not in (None, "null", "") else None

    labels_lower = {label.lower(): label for label in labels}

    # Build ARR lookup tables for dual and single IDs
    arr_dual_ids = {
        "tmdb_imdb": {},
        "tvdb_imdb": {},
    }
    id_maps = {
        "tmdb": {},
        "tvdb": {},
        "imdb": {},
        "title_year": {},
    }

    for item in arr_data:
        # Parse ARR tags
        arr_tags = []
        tags_val = item.get("tags")
        if isinstance(tags_val, str):
            try:
                arr_tags = json.loads(tags_val)
            except Exception:
                arr_tags = []
        elif isinstance(tags_val, list):
            arr_tags = tags_val

        arr_item = dict(item)
        arr_item["tags"] = arr_tags

        tid_tmdb = get_id(item.get("tmdb_id"))
        tid_tvdb = get_id(item.get("tvdb_id"))
        tid_imdb = get_id(item.get("imdb_id"))
        if tid_tmdb and tid_imdb:
            arr_dual_ids["tmdb_imdb"][(tid_tmdb, tid_imdb)] = arr_item
        if tid_tvdb and tid_imdb:
            arr_dual_ids["tvdb_imdb"][(tid_tvdb, tid_imdb)] = arr_item
        if tid_tmdb:
            id_maps["tmdb"][tid_tmdb] = arr_item
        if tid_tvdb:
            id_maps["tvdb"][tid_tvdb] = arr_item
        if tid_imdb:
            id_maps["imdb"][tid_imdb] = arr_item
        key = (normalize_titles(item.get("title", "")), str(item.get("year", "") or ""))
        id_maps["title_year"][key] = arr_item

    output = []

    for plex_item in plex_data:
        # Parse Plex fields
        plex_labels = []
        guids = {}
        try:
            plex_labels = (
                json.loads(plex_item["labels"])
                if isinstance(plex_item.get("labels"), str)
                else (plex_item.get("labels") or [])
            )
        except Exception:
            plex_labels = []
        try:
            guids = (
                json.loads(plex_item["guids"])
                if isinstance(plex_item.get("guids"), str)
                else (plex_item.get("guids") or {})
            )
        except Exception:
            guids = {}

        new_labels = list(plex_labels)

        # Get all possible IDs from plex
        plex_ids = {
            "tmdb": get_id(guids.get("tmdb") or plex_item.get("tmdb_id")),
            "tvdb": get_id(guids.get("tvdb") or plex_item.get("tvdb_id")),
            "imdb": get_id(guids.get("imdb") or plex_item.get("imdb_id")),
        }
        key = (
            normalize_titles(plex_item.get("title", "")),
            str(plex_item.get("year", "") or ""),
        )

        arr_item = None
        match_type = "NO MATCH"

        # 1. Prefer TMDB+IMDB dual ID
        if plex_ids["tmdb"] and plex_ids["imdb"]:
            arr_item = arr_dual_ids["tmdb_imdb"].get(
                (plex_ids["tmdb"], plex_ids["imdb"])
            )
            if arr_item:
                match_type = "TMDB+IMDB"
        # 2. Prefer TVDB+IMDB dual ID
        if not arr_item and plex_ids["tvdb"] and plex_ids["imdb"]:
            arr_item = arr_dual_ids["tvdb_imdb"].get(
                (plex_ids["tvdb"], plex_ids["imdb"])
            )
            if arr_item:
                match_type = "TVDB+IMDB"
        # 3. Fallback to single IDs
        if not arr_item and plex_ids["tmdb"]:
            arr_item = id_maps["tmdb"].get(plex_ids["tmdb"])
            if arr_item:
                match_type = "TMDB"
        if not arr_item and plex_ids["tvdb"]:
            arr_item = id_maps["tvdb"].get(plex_ids["tvdb"])
            if arr_item:
                match_type = "TVDB"
        if not arr_item and plex_ids["imdb"]:
            arr_item = id_maps["imdb"].get(plex_ids["imdb"])
            if arr_item:
                match_type = "IMDB"
        # 4. Last-resort fallback: title+year
        if not arr_item:
            arr_item = id_maps["title_year"].get(key)
            if arr_item:
                match_type = "TITLE/YEAR"

        plex_label_set = set(
            label.lower() for label in plex_labels if isinstance(label, str)
        )
        add_remove = {}

        if arr_item:
            arr_label_set = set(
                tag.lower() for tag in arr_item["tags"] if isinstance(tag, str)
            )
            for label_lc, label in labels_lower.items():
                in_arr = label_lc in arr_label_set
                in_plex = label_lc in plex_label_set
                if in_arr and not in_plex:
                    add_remove[label] = "add"
                    plex_client.add_label(plex_item, label, config.dry_run)
                    new_labels.append(label)
                elif in_plex and not in_arr:
                    add_remove[label] = "remove"
                    plex_client.remove_label(plex_item, label, config.dry_run)
                    new_labels = [
                        label_item
                        for label_item in new_labels
                        if label_item.lower() != label_lc
                    ]
        else:
            # No ARR match: remove any matching label in Plex
            for label_lc, label in labels_lower.items():
                if label_lc in plex_label_set:
                    add_remove[label] = "remove"
                    plex_client.remove_label(plex_item, label, config.dry_run)
                    new_labels = [
                        label_item
                        for label_item in new_labels
                        if label_item.lower() != label_lc
                    ]

        # If any label changed, update DB
        if add_remove:
            output.append(
                {
                    "title": plex_item.get("title"),
                    "year": plex_item.get("year"),
                    "add_remove": add_remove,
                }
            )
            logger.debug(
                f"Sync '{plex_item.get('title')}' ({plex_item.get('year')}) [{match_type}]: {add_remove}"
            )
            if not config.dry_run:
                db.update_plex_media_cache_item(
                    title=plex_item.get("title"),
                    year=plex_item.get("year"),
                    library_name=plex_item.get("library_name"),
                    instance_name=plex_item.get("instance_name"),
                    plex_id=plex_item.get("plex_id"),
                    labels=new_labels,
                )

    return output


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


def main() -> None:
    """
    Main function to sync labels between Plex and Radarr/Sonarr based on configuration.

    Args:
        config (SimpleNamespace): Configuration object loaded from user settings.
    """
    config = Config("labelarr")
    logger = Logger(config.log_level, config.module_name)
    db = DapsDB()
    try:
        # Print detailed settings if debug logging is enabled
        if config.log_level.lower() == "debug":
            print_settings(logger, config)

        # Notify user if running in dry run mode (no actual changes will be made)
        if config.dry_run:
            table = [["Dry Run"], ["NO CHANGES WILL BE MADE"]]
            logger.info(create_table(table))

        output: List[Dict] = []

        update_client_databases(db, config, logger)
        update_plex_database(db, config, logger)

        arr_data = []
        for mapping in config.mappings:
            app_instance = mapping["app_instance"]  # Radarr/Sonarr's Friendly Name
            labels = mapping["labels"]
            arr_data.extend(
                row
                for row in db.get_media_cache_by_instance(app_instance) or []
                if (
                    any(
                        label
                        in (
                            json.loads(row["tags"])
                            if isinstance(row["tags"], str)
                            else row["tags"]
                        )
                        for label in labels
                    )
                    and (
                        row.get("asset_type") != "show"
                        or row.get("season_number") in (None, "", "None")
                    )
                )
            )
            plex_instances = mapping["plex_instances"]
            for plex_instance in plex_instances:
                plex_connection_data = config.instances_config["plex"][
                    plex_instance["instance"]
                ]
                instance_name = plex_instance["instance"]
                library_names = plex_instance["library_names"]
                plex_client = PlexClient(
                    plex_connection_data["url"], plex_connection_data["api"], logger
                )
                plex_data = []
                if plex_client.is_connected():
                    for library in library_names:
                        plex_data.extend(
                            db.get_plex_media_cache_by_instance_and_library(
                                instance_name, library
                            )
                        )
                    output += sync_to_plex(
                        plex_client, arr_data, plex_data, logger, labels, config, db
                    )

        # Log and send notifications if any label changes were found
        if output:
            handle_messages(output, logger)
            # Only send notifications if not in dry run mode
            manager = NotificationManager(config, logger, module_name="labelarr")
            manager.send_notification(output)
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
