import json
import sys
from collections import defaultdict
from typing import Dict, List

from util.config import DapsConfig, load_config
from util.connector import Connector
from util.database import DapsDB
from util.helper import create_table, print_settings
from util.logger import Logger
from util.normalization import normalize_titles
from util.notification import NotificationManager
from util.plex import PlexClient


class Labelarr:
    def __init__(self, logger: Logger = None, config: DapsConfig = None):
        self.full_config = config or load_config()
        self.config = self.full_config.labelarr
        self.logger = logger or Logger(self.config.log_level, "labelarr")
        self.db = None

    def sync_to_plex(self, plex_client, arr_data, plex_data, labels) -> List[Dict]:
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
            tags_val = item["tags"]
            if isinstance(tags_val, str):
                try:
                    arr_tags = json.loads(tags_val)
                except Exception:
                    arr_tags = []
            elif isinstance(tags_val, list):
                arr_tags = tags_val

            arr_item = dict(item)
            arr_item["tags"] = arr_tags

            tid_tmdb = get_id(item["tmdb_id"])
            tid_tvdb = get_id(item["tvdb_id"])
            tid_imdb = get_id(item["imdb_id"])
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
            key = (
                normalize_titles(item["title"]),
                str(item["year"] or ""),
            )
            id_maps["title_year"][key] = arr_item

        output = []

        for plex_item in plex_data:
            # Parse Plex fields
            plex_labels = []
            guids = {}
            try:
                plex_labels = (
                    json.loads(plex_item["labels"])
                    if isinstance(plex_item["labels"], str)
                    else (plex_item["labels"] or [])
                )
            except Exception:
                plex_labels = []
            try:
                guids = (
                    json.loads(plex_item["guids"])
                    if isinstance(plex_item["guids"], str)
                    else (plex_item["guids"] or {})
                )
            except Exception:
                guids = {}

            new_labels = list(plex_labels)

            # Get all possible IDs from plex
            plex_ids = {
                "tmdb": get_id(guids.get("tmdb") or plex_item["tmdb_id"]),
                "tvdb": get_id(guids.get("tvdb") or plex_item["tvdb_id"]),
                "imdb": get_id(guids.get("imdb") or plex_item["imdb_id"]),
            }
            key = (
                normalize_titles(plex_item["title"]),
                str(plex_item["year"] or ""),
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
                        plex_client.add_label(plex_item, label, self.config.dry_run)
                        new_labels.append(label)
                    elif in_plex and not in_arr:
                        add_remove[label] = "remove"
                        plex_client.remove_label(plex_item, label, self.config.dry_run)
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
                        plex_client.remove_label(plex_item, label, self.config.dry_run)
                        new_labels = [
                            label_item
                            for label_item in new_labels
                            if label_item.lower() != label_lc
                        ]

            # If any label changed, update DB
            if add_remove:
                output.append(
                    {
                        "title": plex_item["title"],
                        "year": plex_item["year"],
                        "add_remove": add_remove,
                    }
                )
                self.logger.debug(
                    f"Sync '{plex_item['title']}' ({plex_item['year']}) [{match_type}]: {add_remove}"
                )
                if not self.config.dry_run:
                    self.db.plex.update(
                        title=plex_item["title"],
                        year=plex_item["year"],
                        library_name=plex_item["library_name"],
                        instance_name=plex_item["instance_name"],
                        plex_id=plex_item["plex_id"],
                        labels=new_labels,
                    )
        return output

    def handle_messages(self, data_dict: List[Dict]):
        table: List[List[str]] = [["Results"]]
        self.logger.info(create_table(table))

        label_changes: Dict[tuple, List[str]] = defaultdict(list)
        for item in data_dict:
            for label, action in item["add_remove"].items():
                key = (label, action)
                label_changes[key].append(f"{item['title']} ({item['year']})")

        for (label, action), items in label_changes.items():
            verb = "added to" if action == "add" else "removed from"
            self.logger.info(f"\nLabel: {label} has been {verb}:")
            for entry in items:
                self.logger.info(f"  - {entry}")

    def run(self):
        try:
            with DapsDB(logger=self.logger) as self.db:
                if self.config.log_level.lower() == "debug":
                    print_settings(self.logger, self.config)

                if self.config.dry_run:
                    table = [["Dry Run"], ["NO CHANGES WILL BE MADE"]]
                    self.logger.info(create_table(table))

                connector = Connector(self.db, self.full_config, self.logger)

                connector.update_arr_database()
                connector.update_plex_database()

                output: List[Dict] = []
                arr_data = []
                for mapping in self.config.mappings:
                    app_instance = mapping.app_instance
                    labels = (
                        mapping.labels
                        if isinstance(mapping.labels, list)
                        else [mapping.labels]
                    )
                    arr_data.extend(
                        row
                        for row in self.db.media.get_by_instance(app_instance) or []
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
                                row["asset_type"] != "show"
                                or row["season_number"] in (None, "", "None")
                            )
                        )
                    )
                    plex_instances = mapping.plex_instances
                    for plex_instance in plex_instances:
                        instance_name = plex_instance.instance
                        library_names = plex_instance.library_names
                        # Config: assume all plex instances always present, throw if not
                        plex_connection_data = self.full_config.instances.plex[
                            instance_name
                        ]
                        plex_client = PlexClient(
                            plex_connection_data.url,
                            plex_connection_data.api,
                            self.logger,
                        )
                        plex_data = []
                        if plex_client.is_connected():
                            for library in library_names:
                                plex_data.extend(
                                    self.db.plex.get_by_instance_and_library(
                                        instance_name, library
                                    )
                                )
                            output += self.sync_to_plex(
                                plex_client, arr_data, plex_data, labels
                            )

                if output:
                    self.handle_messages(output)
                    manager = NotificationManager(
                        self.config, self.logger, module_name="labelarr"
                    )
                    manager.send_notification(output)
                else:
                    self.logger.info("No labels to sync to Plex")
        except KeyboardInterrupt:
            print("Keyboard Interrupt detected. Exiting...")
            sys.exit()
        except Exception:
            self.logger.error("\n\nAn error occurred:\n", exc_info=True)
            self.logger.error("\n\n")
        finally:
            self.logger.log_outro()
