# modules/renameinatorr.py

import re
import sys
import time
from collections import defaultdict
from typing import Any, Dict, List, Optional

from util.arr import BaseARRClient, create_arr_client
from util.base_module import DapsModule
from util.constants import season_regex
from util.helper import create_table, print_settings, progress
from util.logger import Logger
from util.notification import NotificationManager


class Renameinatorr(DapsModule):
    def __init__(self, logger: Optional[Logger] = None) -> None:
        super().__init__(logger)

    @staticmethod
    def print_output(output: Dict[str, Dict[str, Any]], logger: Logger) -> None:
        for instance, instance_data in output.items():
            table = [[f"{instance_data['server_name'].capitalize()} Rename List"]]
            logger.info(create_table(table))
            for item in instance_data["data"]:
                if item["file_info"] or item["new_path_name"]:
                    logger.info(f"{item['title']} ({item['year']})")
                if item["new_path_name"]:
                    logger.info(
                        f"\tFolder Renamed: {item['path_name']} -> {item['new_path_name']}"
                    )
                if item["file_info"]:
                    logger.info("\tFiles:")
                    for existing_path, new_path in item["file_info"].items():
                        logger.info(
                            f"\t\tOriginal: {existing_path}\n\t\tNew: {new_path}\n"
                        )
            logger.info("")
            total_items = len(instance_data["data"])
            total_rename_items = len(
                [v["file_info"] for v in instance_data["data"] if v["file_info"]]
            )
            total_folder_rename = len(
                [
                    v["new_path_name"]
                    for v in instance_data["data"]
                    if v["new_path_name"]
                ]
            )
            if any(v["file_info"] or v["new_path_name"] for v in instance_data["data"]):
                table = [
                    [f"{instance_data['server_name'].capitalize()} Rename Summary"],
                    [f"Total Items: {total_items}"],
                ]
                if any(v["file_info"] for v in instance_data["data"]):
                    table.append([f"Total Renamed Items: {total_rename_items}"])
                if any(v["new_path_name"] for v in instance_data["data"]):
                    table.append([f"Total Folder Renames: {total_folder_rename}"])
                logger.info(create_table(table))
            else:
                logger.info(f"No items renamed in {instance_data['server_name']}.")
            logger.info("")

    @staticmethod
    def get_count_for_instance_type(
        config: Any, instance_type: str, logger: Logger
    ) -> int:
        count = config.count
        if instance_type == "radarr" and getattr(config, "radarr_count", None):
            logger.debug(
                f"radarr_count found! overriding count from {config.count} to {config.radarr_count}"
            )
            count = config.radarr_count
        elif instance_type == "sonarr" and getattr(config, "sonarr_count", None):
            logger.debug(
                f"sonarr_count found! overriding count from {config.count} to {config.sonarr_count}"
            )
            count = config.sonarr_count
        logger.info(f"using count= {count} for instance_type= {instance_type}")
        return count

    @staticmethod
    def get_chunks_for_run(
        media_dict: List[Dict[str, Any]], chunk_size: int, logger: Logger
    ) -> List[List[Dict[str, Any]]]:
        chunks: List[List[Dict[str, Any]]] = []
        for i in range(0, len(media_dict), chunk_size):
            chunks.append(media_dict[i : i + chunk_size])
        return chunks

    @staticmethod
    def get_untagged_chunks_for_run(
        media_dict: List[Dict[str, Any]],
        tag_id: int,
        chunk_size: int,
        all_in_single_run: bool,
        logger: Logger,
    ) -> List[List[Dict[str, Any]]]:
        all_items_without_tags = [
            item for item in media_dict if tag_id not in item["tags"]
        ]
        return Renameinatorr.get_chunks_for_run(
            all_items_without_tags, chunk_size, logger
        )

    def process_instance(
        self,
        app: BaseARRClient,
        instance_type: str,
        config: Any,
        logger: Logger,
    ) -> List[Dict[str, Any]]:
        table = [[f"Processing {app.instance_name}"]]
        logger.debug(create_table(table))
        default_batch_size: int = 100
        instance_start_time: float = time.time()
        media_dict: List[Dict[str, Any]] = app.get_all_media()
        count: int = self.get_count_for_instance_type(config, instance_type, logger)
        tag_id: Any = None

        # Ignore-tag filtering: skip items with the ignore tag, if configured
        skipped_count = 0
        if getattr(config, "ignore_tag", None):
            ignore_tag_id = app.get_tag_id_from_name(config.ignore_tag)
            if ignore_tag_id:
                before_count = len(media_dict)
                media_dict = [
                    item
                    for item in media_dict
                    if ignore_tag_id not in item.get("tags", [])
                ]
                skipped_count = before_count - len(media_dict)
                if skipped_count > 0:
                    logger.info(
                        f"Skipped {skipped_count} items due to ignore tag '{config.ignore_tag}'."
                    )

        # Tagging logic: filter untagged, clear if all tagged
        if getattr(config, "tag_name", None):
            tag_id = app.get_tag_id_from_name(config.tag_name)
            all_items_without_tags = None
            if tag_id:
                all_items_without_tags = [
                    item for item in media_dict if tag_id not in item["tags"]
                ]
            if not all_items_without_tags:
                media_ids = [item["media_id"] for item in media_dict]
                logger.info("All media is tagged. Removing tags...")
                app.remove_tags(media_ids, tag_id)
                all_items_without_tags = app.get_parsed_media()
            media_dict = all_items_without_tags
        # Chunking behavior: single or batched
        if not getattr(config, "enable_batching", False):
            if not count:
                chunks_to_process_this_run: List[List[Dict[str, Any]]] = [media_dict]
            else:
                chunks_to_process_this_run = self.get_chunks_for_run(
                    media_dict, count, logger
                )
                chunks_to_process_this_run = (
                    [chunks_to_process_this_run[0]]
                    if chunks_to_process_this_run
                    else []
                )
        else:
            count = count if count else default_batch_size
            chunks_to_process_this_run = self.get_chunks_for_run(
                media_dict, count, logger
            )
        logger.info(f"num_chunks= {len(chunks_to_process_this_run)}")
        final_media_dict: List[Dict[str, Any]] = []
        chunk_progress_bar = progress(
            chunks_to_process_this_run,
            desc=f"Processing batches for '{app.instance_name}'...",
            unit="items",
            logger=logger,
            leave=True,
        )
        for chunk in chunk_progress_bar:
            chunk_start_time: float = time.time()
            media_dict = chunk
            logger.debug(f"Processing {len(media_dict)} media items in current chunk")
            if media_dict:
                logger.info("Processing data... This may take a while.")
                progress_bar = progress(
                    media_dict,
                    desc=f"Processing single batch for '{app.instance_name}'...",
                    unit="items",
                    logger=logger,
                    leave=True,
                )
                grouped_root_folders: Dict[str, List[int]] = defaultdict(list)
                media_ids: List[int] = []
                any_renamed: bool = False
                for item in progress_bar:
                    file_info: Dict[str, str] = {}
                    rename_response = app.get_rename_list(item["media_id"])
                    for items in rename_response:
                        existing_path = items.get("existingPath")
                        new_path = items.get("newPath")
                        # Remove season info from path if present
                        if existing_path and re.search(season_regex, existing_path):
                            existing_path = re.sub(season_regex, "", existing_path)
                        if new_path and re.search(season_regex, new_path):
                            new_path = re.sub(season_regex, "", new_path)
                        if existing_path:
                            existing_path = existing_path.lstrip("/")
                        if new_path:
                            new_path = new_path.lstrip("/")
                        file_info[existing_path] = new_path
                    item["new_path_name"] = None
                    item["file_info"] = file_info
                    if file_info:
                        any_renamed = True
                    media_ids.append(item["media_id"])
                    if getattr(config, "rename_folders", False):
                        grouped_root_folders[item["root_folder"]].append(
                            item["media_id"]
                        )
                if not getattr(config, "dry_run", False):
                    # Perform file renaming
                    if media_ids:
                        app.rename_media(media_ids)
                        if any_renamed:
                            logger.info(f"Refreshing {app.instance_name}...")
                            response = app.refresh_items(media_ids)
                            ready = app.wait_for_command(response["id"])
                            if ready:
                                logger.info(
                                    f"Media refreshed on {app.instance_name}..."
                                )
                    else:
                        logger.info(f"No media to rename on {app.instance_name}...")
                    # Tagging after rename
                    if tag_id and getattr(config, "tag_name", None):
                        logger.info(
                            f"Adding tag '{config.tag_name}' to items in {app.instance_name}..."
                        )
                        app.add_tags(media_ids, tag_id)
                    # Folder rename steps
                    if (
                        getattr(config, "rename_folders", False)
                        and grouped_root_folders
                    ):
                        logger.info(f"Renaming folders in {app.instance_name}...")
                        for (
                            root_folder,
                            folder_media_ids,
                        ) in grouped_root_folders.items():
                            logger.debug(f"renaming root folder {root_folder}")
                            app.rename_folders(folder_media_ids, root_folder)
                        logger.info(f"Refreshing {app.instance_name}...")
                        response = app.refresh_items(media_ids)
                        logger.info(f"Waiting for {app.instance_name} to refresh...")
                        ready = app.wait_for_command(response["id"])
                        logger.info(f"Folders renamed in {app.instance_name}...")
                        # Update items with new path names if changed
                        if ready:
                            logger.info(
                                f"Fetching updated data for {app.instance_name}..."
                            )
                            new_media_dict = app.get_all_media()
                            for new_item in new_media_dict:
                                for old_item in media_dict:
                                    if new_item["media_id"] == old_item["media_id"]:
                                        logger.debug(
                                            f"Checking if item {new_item['media_id']} changed..."
                                        )
                                        if (
                                            new_item["path_name"]
                                            != old_item["path_name"]
                                        ):
                                            logger.debug(
                                                f"item {new_item['media_id']} changed from {old_item['path_name']} to {new_item['path_name']}"
                                            )
                                            old_item["new_path_name"] = new_item[
                                                "path_name"
                                            ]
                final_media_dict.extend(media_dict)
                total_renamed = sum(
                    len(i["file_info"]) for i in media_dict if i.get("file_info")
                )
                total_folder_renamed = sum(bool(i["new_path_name"]) for i in media_dict)
                logger.info(
                    f"Chunk completed in {time.time() - chunk_start_time:.2f} seconds | "
                    f"Files renamed: {total_renamed} | Folders renamed: {total_folder_renamed}"
                )
        logger.info(
            f"Finished processing {app.instance_name} in {time.time() - instance_start_time:.2f} seconds."
        )
        final_media_dict.sort(key=lambda it: it.get("new_path_name") or it["path_name"])
        trimmed: List[Dict[str, Any]] = []
        for item in final_media_dict:
            raw_info = item.get("file_info", {})
            sorted_info = {old: raw_info[old] for old in sorted(raw_info.keys())}
            trimmed.append(
                {
                    "title": item["title"],
                    "year": item["year"],
                    "path_name": item["path_name"],
                    "new_path_name": item.get("new_path_name"),
                    "file_info": sorted_info,
                }
            )
        return trimmed

    def run(self):
        try:
            if self.config.log_level.lower() == "debug":
                print_settings(self.logger, self.config)
            if self.config.dry_run:
                table = [["Dry Run"], ["NO CHANGES WILL BE MADE"]]
                self.logger.info(create_table(table))
                self.logger.info("")

            output = {}
            for instance_type in ["radarr", "sonarr"]:
                instance_dict = getattr(self.full_config.instances, instance_type, {})
                for instance_name, instance_cfg in instance_dict.items():
                    if instance_name in self.config.instances:
                        app = create_arr_client(
                            instance_cfg.url,
                            instance_cfg.api,
                            self.logger,
                        )
                        if app and app.connect_status:
                            data = self.process_instance(
                                app, instance_type, self.config, self.logger
                            )
                            output[instance_name] = {
                                "server_name": app.instance_name,
                                "data": data,
                            }
            if any(value["data"] for value in output.values()):
                self.print_output(output, self.logger)
                manager = NotificationManager(
                    self.config, self.logger, module_name="renameinatorr"
                )
                manager.send_notification(output)
            else:
                self.logger.info("No media items to rename.")
        except KeyboardInterrupt:
            print("Keyboard Interrupt detected. Exiting...")
            sys.exit()
        except Exception:
            self.logger.error("\n\nAn error occurred:\n", exc_info=True)
            self.logger.error("\n\n")
        finally:
            self.logger.log_outro()
