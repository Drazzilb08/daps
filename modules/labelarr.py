import sys
from collections import defaultdict
from types import SimpleNamespace
from typing import Dict, List, Optional
import json

from util.connector import update_client_databases, update_plex_database
from util.database import DapsDB
from util.helper import create_table, print_settings, progress
from util.logger import Logger
from util.normalization import normalize_titles
from util.notification import send_notification
from util.plex import PlexClient
from util.config import Config


import json
from util.normalization import normalize_titles

def sync_to_plex(
    plex_client, arr_data, plex_data, logger, labels, config, db
):
    """
    Synchronize pre-defined labels from ARR data to Plex libraries.
    For each matched item in plex_data, ensures Plex labels match ARR.
    Output data structure remains unchanged.
    Also updates the plex_media_cache table with the new label state.
    """
    import json

    def get_id(val):
        return str(val) if val not in (None, "null", "") else None

    # Prepare lowercase set and original label mapping
    labels_lower = {l.lower(): l for l in labels}  # lowercase: original-case

    # ARR lookup tables
    id_maps = {
        "tmdb": {},
        "tvdb": {},
        "imdb": {},
        "title_year": {},
    }

    for item in arr_data:
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

        if (tid := get_id(item.get("tmdb_id"))): id_maps["tmdb"][tid] = arr_item
        if (tid := get_id(item.get("tvdb_id"))): id_maps["tvdb"][tid] = arr_item
        if (tid := get_id(item.get("imdb_id"))): id_maps["imdb"][tid] = arr_item
        key = (normalize_titles(item.get("title", "")), str(item.get("year", "") or ""))
        id_maps["title_year"][key] = arr_item

    output = []

    for plex_item in plex_data:
        # Parse Plex fields just once
        plex_labels = []
        guids = {}
        try:
            plex_labels = json.loads(plex_item["labels"]) if isinstance(plex_item.get("labels"), str) else (plex_item.get("labels") or [])
        except Exception:
            plex_labels = []
        try:
            guids = json.loads(plex_item["guids"]) if isinstance(plex_item.get("guids"), str) else (plex_item.get("guids") or {})
        except Exception:
            guids = {}

        # Make a copy to modify
        new_labels = list(plex_labels)

        # Find ARR match
        plex_ids = {
            "tmdb": get_id(guids.get("tmdb") or plex_item.get("tmdb_id")),
            "tvdb": get_id(guids.get("tvdb") or plex_item.get("tvdb_id")),
            "imdb": get_id(guids.get("imdb") or plex_item.get("imdb_id")),
        }
        key = (normalize_titles(plex_item.get("title", "")), str(plex_item.get("year", "") or ""))
        arr_item = (
            id_maps["tmdb"].get(plex_ids["tmdb"]) or
            id_maps["tvdb"].get(plex_ids["tvdb"]) or
            id_maps["imdb"].get(plex_ids["imdb"]) or
            id_maps["title_year"].get(key)
        )

        # Lowercase label sets for fast lookup
        plex_label_set = set(l.lower() for l in plex_labels if isinstance(l, str))
        add_remove = {}

        if arr_item:
            arr_label_set = set(l.lower() for l in arr_item["tags"] if isinstance(l, str))
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
                    new_labels = [l for l in new_labels if l.lower() != label_lc]
            match_type = next((k for k in ("tmdb", "tvdb", "imdb", "title_year") if arr_item in id_maps[k].values()), "unknown")
        else:
            # No ARR match: remove any matching label in Plex
            for label_lc, label in labels_lower.items():
                if label_lc in plex_label_set:
                    add_remove[label] = "remove"
                    plex_client.remove_label(plex_item, label, config.dry_run)
                    new_labels = [l for l in new_labels if l.lower() != label_lc]
            match_type = "NO MATCH"

        # If any label changed, update database too
        if add_remove:
            output.append({
                "title": plex_item.get("title"),
                "year": plex_item.get("year"),
                "add_remove": add_remove,
            })
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
                    labels=new_labels
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
            app_instance = mapping['app_instance'] # Radarr/Sonarr's Friendly Name
            labels = mapping['labels']
            arr_data.extend(
                row for row in db.get_media_cache_by_instance(app_instance) or []
                if (
                    any(label in (json.loads(row["tags"]) if isinstance(row["tags"], str) else row["tags"]) for label in labels)
                    and (
                        row.get("asset_type") != "show"
                        or row.get("season_number") in (None, "", "None")
                    )
                )
            )
            plex_instances = mapping['plex_instances']
            for plex_instance in plex_instances:
                plex_connection_data = config.instances_config['plex'][plex_instance['instance']]
                instance_name = plex_instance['instance']
                library_names = plex_instance['library_names']
                plex_client = PlexClient(plex_connection_data['url'], plex_connection_data['api'], logger)
                plex_data = []
                if plex_client.is_connected():
                    for library in library_names:
                        plex_data.extend(db.get_plex_media_cache_by_instance_and_library(instance_name, library))
                    output += sync_to_plex(plex_client, arr_data, plex_data, logger, labels, config, db)

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
