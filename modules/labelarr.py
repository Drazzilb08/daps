# modules/labelarr.py

import json
import sys
from collections import defaultdict
from typing import Dict, List, Optional

from util.base_module import DapsModule
from util.connector import Connector
from util.database import DapsDB
from util.helper import create_table, print_settings
from util.logger import Logger
from util.normalization import normalize_titles
from util.notification import NotificationManager
from util.plex import PlexClient


class Labelarr(DapsModule):
    def __init__(self, logger: Optional[Logger] = None) -> None:
        """
        Standard constructor using dependency injection.

        Args:
            logger: Logger instance
        """
        super().__init__(logger)

    def _get_id(self, val: Optional[object]) -> Optional[str]:
        """Normalize IDs from rows/guids into comparable strings or None."""
        return str(val) if val not in (None, "null", "") else None

    def _parse_tags(self, raw) -> List[str]:
        """Safely convert a stored tags field (list or JSON string) into a list[str]."""
        if isinstance(raw, list):
            return [t for t in raw if isinstance(t, str)]
        if isinstance(raw, str):
            try:
                val = json.loads(raw)
                if isinstance(val, list):
                    return [t for t in val if isinstance(t, str)]
            except Exception:
                return []
        return []

    def _parse_labels(self, raw) -> List[str]:
        """Safely convert a stored labels field (list or JSON string) into a list[str]."""
        if isinstance(raw, list):
            return [t for t in raw if isinstance(t, str)]
        if isinstance(raw, str):
            try:
                val = json.loads(raw)
                if isinstance(val, list):
                    return [t for t in val if isinstance(t, str)]
            except Exception:
                return []
        return []

    def _parse_guids(self, raw) -> Dict[str, str]:
        """Safely convert a stored guids field (dict or JSON string) into a dict."""
        if isinstance(raw, dict):
            return raw
        if isinstance(raw, str):
            try:
                val = json.loads(raw)
                if isinstance(val, dict):
                    return val
            except Exception:
                return {}
        return {}

    def _build_arr_indexes(self, arr_data: List[Dict]) -> Dict[str, Dict]:
        """
        Build fast lookup tables for ARR items by various IDs and title/year.

        Returns:
            {
              "dual": {"tmdb_imdb": {...}, "tvdb_imdb": {...}},
              "maps": {"tmdb": {...}, "tvdb": {...}, "imdb": {...}, "title_year": {...}}
            }
        """
        dual = {"tmdb_imdb": {}, "tvdb_imdb": {}}
        maps = {"tmdb": {}, "tvdb": {}, "imdb": {}, "title_year": {}}

        for item in arr_data:
            arr_item = dict(item)
            arr_item["tags"] = self._parse_tags(item.get("tags"))

            tid_tmdb = self._get_id(item.get("tmdb_id"))
            tid_tvdb = self._get_id(item.get("tvdb_id"))
            tid_imdb = self._get_id(item.get("imdb_id"))

            if tid_tmdb and tid_imdb:
                dual["tmdb_imdb"][(tid_tmdb, tid_imdb)] = arr_item
            if tid_tvdb and tid_imdb:
                dual["tvdb_imdb"][(tid_tvdb, tid_imdb)] = arr_item
            if tid_tmdb:
                maps["tmdb"][tid_tmdb] = arr_item
            if tid_tvdb:
                maps["tvdb"][tid_tvdb] = arr_item
            if tid_imdb:
                maps["imdb"][tid_imdb] = arr_item

            key = (normalize_titles(item.get("title")), str(item.get("year") or ""))
            maps["title_year"][key] = arr_item

        return {"dual": dual, "maps": maps}

    def _build_instance_map(self) -> Dict[str, object]:
        """
        Build the instance map for Connector from self.config.mappings.
        """
        arrs = set()
        plex_map: Dict[str, set] = {}

        for mapping in getattr(self.config, "mappings", []) or []:
            app_instance = getattr(mapping, "app_instance", None)
            if isinstance(app_instance, str) and app_instance.strip():
                arrs.add(app_instance)

            plex_instances = getattr(mapping, "plex_instances", []) or []
            for pi in plex_instances:
                # Support both attr-style and dict-style entries
                inst = (
                    getattr(pi, "instance", None)
                    if hasattr(pi, "instance")
                    else (pi.get("instance") if isinstance(pi, dict) else None)
                )
                libs = (
                    getattr(pi, "library_names", None)
                    if hasattr(pi, "library_names")
                    else (pi.get("library_names") if isinstance(pi, dict) else None)
                )
                if not inst:
                    continue
                if inst not in plex_map:
                    plex_map[inst] = set()
                if libs:
                    for name in libs:
                        if isinstance(name, str) and name.strip():
                            plex_map[inst].add(name)

        result: Dict[str, object] = {}
        if arrs:
            result["arrs"] = sorted(arrs)
        if plex_map:
            # Use the simple accepted form: {'plex': {'inst': ['Lib1', 'Lib2']}}
            result["plex"] = {
                inst: sorted(list(libs)) for inst, libs in plex_map.items()
            }
        return result

    def sync_to_plex(
        self,
        plex_client: PlexClient,
        plex_item: Dict,
        labels_lower: Dict[str, str],
        arr_indexes: Dict[str, Dict],
        db: DapsDB,
    ) -> Optional[Dict]:
        """
        Sync labels for a SINGLE Plex item using prebuilt ARR indexes.

        Args:
            plex_client: Connected PlexClient
            plex_item: row dict from db.plex
            labels_lower: {lower_label: original_cased_label} for target labels
            arr_indexes: dict returned by _build_arr_indexes
            db: DapsDB

        Returns:
            dict(title, year, add_remove) if a change occurred; otherwise None.
        """
        # Only label root items: movies or root show rows (no season context)
        asset_type = plex_item.get("asset_type")
        if (
            asset_type == "show"
            and plex_item.get("season_number") not in (None, "", "None")
        ) or asset_type in ("season", "episode"):
            return None
        plex_labels = self._parse_labels(plex_item.get("labels"))
        guids = self._parse_guids(plex_item.get("guids"))

        new_labels = list(plex_labels)
        plex_label_set = {lbl.lower() for lbl in plex_labels if isinstance(lbl, str)}

        plex_ids = {
            "tmdb": self._get_id(guids.get("tmdb") or plex_item.get("tmdb_id")),
            "tvdb": self._get_id(guids.get("tvdb") or plex_item.get("tvdb_id")),
            "imdb": self._get_id(guids.get("imdb") or plex_item.get("imdb_id")),
        }
        key = (
            normalize_titles(plex_item.get("title")),
            str(plex_item.get("year") or ""),
        )

        dual = arr_indexes["dual"]
        maps = arr_indexes["maps"]

        arr_item = None
        match_type = "NO MATCH"

        if plex_ids["tmdb"] and plex_ids["imdb"]:
            arr_item = dual["tmdb_imdb"].get((plex_ids["tmdb"], plex_ids["imdb"]))
            if arr_item:
                match_type = "TMDB+IMDB"
        if not arr_item and plex_ids["tvdb"] and plex_ids["imdb"]:
            arr_item = dual["tvdb_imdb"].get((plex_ids["tvdb"], plex_ids["imdb"]))
            if arr_item:
                match_type = "TVDB+IMDB"
        if not arr_item and plex_ids["tmdb"]:
            arr_item = maps["tmdb"].get(plex_ids["tmdb"])
            if arr_item:
                match_type = "TMDB"
        if not arr_item and plex_ids["tvdb"]:
            arr_item = maps["tvdb"].get(plex_ids["tvdb"])
            if arr_item:
                match_type = "TVDB"
        if not arr_item and plex_ids["imdb"]:
            arr_item = maps["imdb"].get(plex_ids["imdb"])
            if arr_item:
                match_type = "IMDB"
        if not arr_item:
            arr_item = maps["title_year"].get(key)
            if arr_item:
                match_type = "TITLE/YEAR"

        add_remove: Dict[str, str] = {}

        if arr_item:
            arr_label_set = {
                tag.lower() for tag in arr_item["tags"] if isinstance(tag, str)
            }
            for label_lc, label in labels_lower.items():
                in_arr = label_lc in arr_label_set
                in_plex = label_lc in plex_label_set
                if in_arr and not in_plex:
                    add_remove[label] = "add"
                    plex_client.add_label(plex_item, label, self.config.dry_run)
                    new_labels.append(label)
                    plex_label_set.add(label_lc)
                elif in_plex and not in_arr:
                    add_remove[label] = "remove"
                    plex_client.remove_label(plex_item, label, self.config.dry_run)
                    new_labels = [
                        li
                        for li in new_labels
                        if not (isinstance(li, str) and li.lower() == label_lc)
                    ]
                    plex_label_set.discard(label_lc)
        else:
            # No ARR match: remove any of the target labels that exist in Plex
            for label_lc, label in labels_lower.items():
                if label_lc in plex_label_set:
                    add_remove[label] = "remove"
                    plex_client.remove_label(plex_item, label, self.config.dry_run)
                    new_labels = [
                        li
                        for li in new_labels
                        if not (isinstance(li, str) and li.lower() == label_lc)
                    ]
                    plex_label_set.discard(label_lc)

        if not add_remove:
            return None

        self.logger.debug(
            f"Sync '{plex_item.get('title')}' ({plex_item.get('year')}) [{match_type}]: {add_remove}"
        )

        if not self.config.dry_run:
            db.plex.update_labels(
                title=plex_item.get("title"),
                year=plex_item.get("year"),
                library_name=plex_item.get("library_name"),
                instance_name=plex_item.get("instance_name"),
                plex_id=plex_item.get("plex_id"),
                labels=new_labels,
            )

        return {
            "title": plex_item.get("title"),
            "year": plex_item.get("year"),
            "add_remove": add_remove,
        }

    def handle_messages(self, data_dict: List[Dict]) -> None:
        """Display results in a formatted table"""
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

    def run(self) -> None:
        try:
            with DapsDB(logger=self.logger) as db:
                if self.config.log_level.lower() == "debug":
                    print_settings(self.logger, self.config)

                if self.config.dry_run:
                    table = [["Dry Run"], ["NO CHANGES WILL BE MADE"]]
                    self.logger.info(create_table(table))

                # Build instance map for Connector based on self.config.mappings
                instance_map = self._build_instance_map()

                # Refresh caches for the targeted instances/libraries
                with Connector(
                    db=db,
                    logger=self.logger,
                    instance_map=instance_map,
                ) as connector:
                    connector.update_arr_database()
                    connector.update_plex_database()

                output: List[Dict] = []

                for mapping in self.config.mappings:
                    app_instance = mapping.app_instance
                    labels = (
                        mapping.labels
                        if isinstance(mapping.labels, list)
                        else [mapping.labels]
                    )
                    labels_lower = {label.lower(): label for label in labels}

                    # Build ARR data PER mapping (idempotent, no cross-mapping accumulation)
                    arr_rows = db.media.get_by_instance(app_instance) or []
                    filtered_arr: List[Dict] = []
                    for row in arr_rows:
                        # Only root show rows (season_number empty) or non-shows
                        if row.get("asset_type") == "show" and row.get(
                            "season_number"
                        ) not in (None, "", "None"):
                            continue
                        row_tags = self._parse_tags(row.get("tags"))
                        row_tags_lc = {t.lower() for t in row_tags}
                        if any(lbl in row_tags_lc for lbl in labels_lower.keys()):
                            filtered_arr.append(row)

                    # Determine which Plex asset types this mapping should operate on
                    allowed_types = {
                        r.get("asset_type") for r in filtered_arr if r.get("asset_type")
                    }
                    if not allowed_types:
                        inst_name_lc = (app_instance or "").lower()
                        if "sonarr" in inst_name_lc:
                            allowed_types = {"show"}
                        elif "radarr" in inst_name_lc:
                            allowed_types = {"movie"}
                        else:
                            # Fallback: allow both if we can't infer
                            allowed_types = {"movie", "show"}

                    arr_indexes = self._build_arr_indexes(filtered_arr)

                    # For each Plex instance/library in this mapping, pull items and sync one-by-one
                    for plex_instance in mapping.plex_instances:
                        instance_name = plex_instance.instance
                        library_names = plex_instance.library_names

                        plex_conn = self.full_config.instances.plex[instance_name]
                        plex_client = PlexClient(
                            plex_conn.url, plex_conn.api, self.logger
                        )

                        if not plex_client.is_connected():
                            continue

                        plex_data: List[Dict] = []
                        for library in library_names:
                            raw_rows = (
                                db.plex.get_by_instance_and_library(
                                    instance_name, library
                                )
                                or []
                            )
                            for row in raw_rows:
                                # Only operate on root items: movies or root show rows (season_number empty)
                                asset_type = row.get("asset_type")
                                if asset_type == "show" and row.get(
                                    "season_number"
                                ) not in (None, "", "None"):
                                    continue
                                if asset_type in ("season", "episode"):
                                    continue
                                # Enforce allowed asset types for this mapping (prevents movie mapping touching shows and vice versa)
                                if asset_type and asset_type not in allowed_types:
                                    continue
                                plex_data.append(row)

                        # Deduplicate by plex_id just in case
                        _seen_ids = set()
                        _deduped: List[Dict] = []
                        for row in plex_data:
                            pid = row.get("plex_id")
                            if pid in _seen_ids:
                                continue
                            _seen_ids.add(pid)
                            _deduped.append(row)
                        plex_data = _deduped

                        for plex_item in plex_data:
                            result = self.sync_to_plex(
                                plex_client=plex_client,
                                plex_item=plex_item,
                                labels_lower=labels_lower,
                                arr_indexes=arr_indexes,
                                db=db,
                            )
                            if result:
                                output.append(result)

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
