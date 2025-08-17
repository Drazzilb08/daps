# modules/labelarr.py

import json
import sys
from collections import defaultdict
from typing import Any, Dict, List, Optional

from util.arr import create_arr_client
from util.base_module import DapsModule
from util.connector import Connector
from util.database import DapsDB
from util.helper import create_table, print_settings
from util.logger import Logger
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

    def _get_arr_config(self, instance_name: str):
        """Get ARR instance configuration for a given instance name."""
        # Check Radarr instances
        if (
            hasattr(self.full_config.instances, "radarr")
            and instance_name in self.full_config.instances.radarr
        ):
            return self.full_config.instances.radarr[instance_name]

        # Check Sonarr instances
        if (
            hasattr(self.full_config.instances, "sonarr")
            and instance_name in self.full_config.instances.sonarr
        ):
            return self.full_config.instances.sonarr[instance_name]

        return None

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
        db: DapsDB,
    ) -> Optional[Dict]:
        """
        Sync labels for a SINGLE Plex item using connector-based mapping.

        Args:
            plex_client: Connected PlexClient
            plex_item: row dict from db.plex
            labels_lower: {lower_label: original_cased_label} for target labels
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
        new_labels = list(plex_labels)
        plex_label_set = {lbl.lower() for lbl in plex_labels if isinstance(lbl, str)}

        # Get the corresponding ARR media item using plex_mapping_id (connector-based approach)
        plex_item_id = plex_item.get("id")

        # Find ARR media item that points to this plex item
        arr_items = [
            item
            for item in db.media.get_all()
            if item.get("plex_mapping_id") == plex_item_id
        ]

        if not arr_items:
            # No ARR mapping found: remove any of the target labels that exist in Plex
            add_remove: Dict[str, str] = {}
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
                f"Sync '{plex_item.get('title')}' ({plex_item.get('year')}) [NO MAPPING]: {add_remove}"
            )

            if not self.config.dry_run:
                updated_item = dict(plex_item)
                updated_item["labels"] = new_labels
                db.plex.upsert(updated_item)

            return {
                "title": plex_item.get("title"),
                "year": plex_item.get("year"),
                "add_remove": add_remove,
            }

        # Use the first matching ARR item (should only be one due to unique constraint)
        arr_item = arr_items[0]

        # Compare tags between ARR and Plex items
        arr_tags = self._parse_tags(arr_item.get("tags", []))
        arr_label_set = {tag.lower() for tag in arr_tags if isinstance(tag, str)}

        add_remove: Dict[str, str] = {}

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

        if not add_remove:
            return None

        self.logger.debug(
            f"Sync '{plex_item.get('title')}' ({plex_item.get('year')}) [MAPPED]: {add_remove}"
        )

        if not self.config.dry_run:
            updated_item = dict(plex_item)
            updated_item["labels"] = new_labels
            db.plex.upsert(updated_item)

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

                # Refresh Database for the targeted instances/libraries and update mappings
                with Connector(
                    db=db,
                    logger=self.logger,
                    instance_map=instance_map,
                ) as connector:
                    connector.update_arr_database()
                    connector.update_plex_database()
                    # Update media-plex mappings using connector approach
                    connector.update_media_plex_mappings()

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

    def labelarr_sync_adhoc(
        self,
        source_instance: str,
        media_cache_id: int,
        tag_actions: Dict[str, List[str]],
        plex_instance: Optional[str] = None,
        plex_mapping_id: Optional[int] = None,
        dry_run: bool = False,
    ) -> Dict[str, Any]:
        """
        Perform ad-hoc tag sync for a specific media item.
        Similar to poster_renamerr.run_poster_rename_adhoc() and sync_gdrive.sync_folder_adhoc().

        Args:
            source_instance: ARR instance name
            media_cache_id: Media cache ID
            tag_actions: Dict with 'add' and 'remove' lists of tags
            plex_instance: Target Plex instance
            plex_mapping_id: Optional Plex mapping ID
            dry_run: Whether to perform a dry run

        Returns:
            Dict with sync results
        """
        log = self.logger.get_adapter("LABELARR_ADHOC")
        log.info(f"Starting adhoc tag sync for media {media_cache_id}")

        try:
            with DapsDB(logger=self.logger) as db:
                # Get the specific media item
                media_item = db.media.get_by_id(media_cache_id)
                if not media_item:
                    return {
                        "success": False,
                        "message": f"Media item {media_cache_id} not found",
                        "error_code": "MEDIA_NOT_FOUND",
                    }

                # Get the corresponding Plex item
                if plex_mapping_id:
                    plex_item = db.plex.get_by_id(plex_mapping_id)
                else:
                    # Use existing connector mapping logic
                    from util.connector import Connector

                    # Validate plex_instance and create minimal instance map for this operation
                    if not plex_instance or plex_instance in ("undefined", "null", ""):
                        # Get first available plex instance as fallback
                        available_plex = list(self.full_config.instances.plex.keys())
                        if available_plex:
                            plex_instance = available_plex[0]
                        else:
                            return {
                                "success": False,
                                "message": "No Plex instances available for sync",
                                "error_code": "NO_PLEX_INSTANCES",
                            }

                    instance_map = {
                        "arrs": [source_instance],
                        "plex": {plex_instance: []},  # Empty libraries = all libraries
                    }

                    with Connector(
                        db=db, logger=self.logger, instance_map=instance_map
                    ) as connector:
                        # Update mappings if needed
                        connector.update_media_plex_mappings()

                    # Get updated media item with mapping
                    media_item = db.media.get_by_id(media_cache_id)
                    plex_mapping_id = media_item.get("plex_mapping_id")

                    if plex_mapping_id:
                        plex_item = db.plex.get_by_id(plex_mapping_id)
                    else:
                        plex_item = None

                if not plex_item:
                    return {
                        "success": False,
                        "message": f"No matching Plex item found for media {media_item.get('title')}",
                        "error_code": "PLEX_ITEM_NOT_FOUND",
                    }

                # Connect to Plex
                plex_config = self.full_config.instances.plex[plex_instance]
                plex_client = PlexClient(plex_config.url, plex_config.api, self.logger)

                if not plex_client.is_connected():
                    return {
                        "success": False,
                        "message": f"Failed to connect to Plex instance '{plex_instance}'",
                        "error_code": "PLEX_CONNECTION_FAILED",
                    }

                # Apply tag actions to media item
                current_tags = self._parse_tags(media_item.get("tags", []))
                tags_to_add = tag_actions.get("add", [])
                tags_to_remove = tag_actions.get("remove", [])

                # Update tags
                updated_tags = [
                    tag for tag in current_tags if tag not in tags_to_remove
                ]
                updated_tags.extend(
                    [tag for tag in tags_to_add if tag not in updated_tags]
                )

                # Update the media_cache database with new tags if there are changes
                if tags_to_add or tags_to_remove:
                    log.info(
                        f"Updating media_cache with tags: add={tags_to_add}, remove={tags_to_remove}"
                    )

                    if not dry_run:
                        # Update ARR instance with new tags
                        arr_id = media_item.get("arr_id")
                        if arr_id and (tags_to_add or tags_to_remove):
                            try:
                                # Get ARR client for the source instance
                                arr_config = self._get_arr_config(source_instance)
                                if arr_config:
                                    arr_client = create_arr_client(
                                        arr_config.url, arr_config.api, self.logger
                                    )

                                    if arr_client and arr_client.is_connected():
                                        # Add tags to ARR
                                        if tags_to_add:
                                            log.info(
                                                f"Adding tags {tags_to_add} to ARR item {arr_id}"
                                            )
                                            arr_client.add_tags_by_name(
                                                arr_id, tags_to_add
                                            )

                                        # Remove tags from ARR
                                        if tags_to_remove:
                                            log.info(
                                                f"Removing tags {tags_to_remove} from ARR item {arr_id}"
                                            )
                                            arr_client.remove_tags_by_name(
                                                [arr_id], tags_to_remove
                                            )

                                        log.info(
                                            f"Successfully updated ARR instance {source_instance}"
                                        )
                                    else:
                                        log.warning(
                                            f"Failed to connect to ARR instance {source_instance}"
                                        )
                                else:
                                    log.warning(
                                        f"ARR config not found for instance {source_instance}"
                                    )
                            except Exception as e:
                                log.error(
                                    f"Failed to update ARR instance {source_instance}: {e}"
                                )

                        # Update database to reflect the new tag state
                        updated_media_item = dict(media_item)
                        updated_media_item["tags"] = updated_tags
                        db.media.upsert(
                            updated_media_item,
                            asset_type=media_item.get("asset_type"),
                            instance_type=media_item.get("instance_type"),
                            instance_name=source_instance,
                        )
                        log.debug(
                            f"Updated media_cache record {media_cache_id} with new tags: {updated_tags}"
                        )

                # Create labels mapping for sync (use the tags we want to manage)
                all_tags = list(
                    set(
                        tags_to_add
                        + [tag for tag in current_tags if tag not in tags_to_remove]
                    )
                )
                labels_lower = {tag.lower(): tag for tag in all_tags}

                # Set dry_run config temporarily
                original_dry_run = getattr(self.config, "dry_run", False)
                self.config.dry_run = dry_run

                try:
                    # Execute sync using labelarr's existing business logic (connector-based)
                    sync_result = self.sync_to_plex(
                        plex_client=plex_client,
                        plex_item=plex_item,
                        labels_lower=labels_lower,
                        db=db,
                    )

                    # Process result
                    if sync_result:
                        log.info(
                            f"Sync completed with changes: {sync_result['add_remove']}"
                        )
                        return {
                            "success": True,
                            "message": "Tag sync completed successfully",
                            "data": {
                                "title": sync_result["title"],
                                "year": sync_result["year"],
                                "changes": sync_result["add_remove"],
                                "media_cache_id": media_cache_id,
                                "plex_mapping_id": plex_item.get("id"),
                                "tag_actions": tag_actions,
                            },
                        }
                    else:
                        log.info("No changes needed - tags already in sync")
                        return {
                            "success": True,
                            "message": "No changes needed - tags already in sync",
                            "data": {
                                "title": plex_item.get("title"),
                                "year": plex_item.get("year"),
                                "changes": {},
                                "media_cache_id": media_cache_id,
                                "plex_mapping_id": plex_item.get("id"),
                                "tag_actions": tag_actions,
                            },
                        }
                finally:
                    # Restore original dry_run setting
                    self.config.dry_run = original_dry_run

        except Exception as e:
            log.error(f"Labelarr adhoc sync failed: {e}", exc_info=True)
            return {
                "success": False,
                "message": f"Labelarr sync failed: {str(e)}",
                "error_code": "LABELARR_SYNC_FAILED",
            }
