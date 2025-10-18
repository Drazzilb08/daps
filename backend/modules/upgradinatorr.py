# modules/upgradinatorr.py

import sys
from typing import Any, Dict, List, Optional

from backend.util.arr import BaseARRClient, create_arr_client
from backend.util.base_module import DapsModule
from backend.util.helper import create_table, print_settings
from backend.util.logger import Logger
from backend.util.notification import NotificationManager

VALID_STATUSES = {"continuing", "airing", "ended", "canceled", "released"}


class Upgradinatorr(DapsModule):
    def __init__(self, logger: Optional[Logger] = None) -> None:
        super().__init__(logger)

    def filter_media(
        self,
        media_dict: List[Dict[str, Any]],
        checked_tag_id: int,
        ignore_tag_id: int,
        count: int,
        season_monitored_threshold: int,
    ) -> List[Dict[str, Any]]:
        filtered_media_dict: List[Dict[str, Any]] = []
        filter_count: int = 0
        for item in media_dict:
            if filter_count == count:
                break
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
                self.logger.debug(
                    f"Skipping {item['title']} ({item['year']}), Reason: {', '.join(reasons)}"
                )
                continue
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
                        self.logger.debug(
                            f"Skipping {item['title']} ({item['year']}), Season {i} unmonitored. Reason: No episodes in season."
                        )
                        continue
                    if (
                        season_monitored_threshold is not None
                        and monitored_percentage < season_monitored_threshold
                    ):
                        item["seasons"][i]["monitored"] = False
                        self.logger.debug(
                            f"{item['title']}, Season {i} unmonitored. Reason: monitored percentage {int(monitored_percentage)}% less than season_monitored_threshold {int(season_monitored_threshold)}%"
                        )
                    if item["seasons"][i]["monitored"]:
                        series_monitored = True
                if not series_monitored:
                    self.logger.debug(
                        f"Skipping {item['title']} ({item['year']}), Status: {item['status']}, Monitored: {item['monitored']}, Tags: {item['tags']}"
                    )
                    continue
            filtered_media_dict.append(item)
            self.logger.info(
                f"Queued for upgrade: {item['title']} ({item['year']}) [ID: {item['media_id']}]"
            )
            filter_count += 1
        return filtered_media_dict

    def process_search_response(
        self,
        search_response: Optional[Dict[str, Any]],
        media_id: int,
        app: BaseARRClient,
    ) -> None:
        if search_response:
            self.logger.debug(
                f"    [CMD] Waiting for command to complete for search response ID: {search_response['id']}"
            )
            ready = app.wait_for_command(search_response["id"])
            if ready:
                self.logger.debug(
                    f"    [CMD] Command completed successfully for search response ID: {search_response['id']}"
                )
            else:
                self.logger.debug(
                    f"    [CMD] Command did not complete successfully for search response ID: {search_response['id']}"
                )
        else:
            self.logger.warning(f"No search response for media ID: {media_id}")

    def process_queue(
        self, queue: Dict[str, Any], instance_type: str, media_ids: List[int]
    ) -> List[Dict[str, Any]]:
        id_type = "movieId" if instance_type == "radarr" else "seriesId"
        queue_dict: List[Dict[str, Any]] = []
        records = queue.get("records", [])
        for item in records:
            media_id = item.get(id_type)
            if media_id not in media_ids:
                continue
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
        queue_dict = [dict(t) for t in {tuple(d.items()) for d in queue_dict}]
        return queue_dict

    def process_instance(
        self,
        instance_type: str,
        instance_settings: Dict[str, Any],
        app: BaseARRClient,
    ) -> Optional[Dict[str, Any]]:
        tagged_count: int = 0
        untagged_count: int = 0
        total_count: int = 0
        count: int = instance_settings.count
        checked_tag_name: str = instance_settings.tag_name or "checked"
        ignore_tag_name: str = instance_settings.ignore_tag or "ignore"
        unattended: bool = instance_settings.unattended
        season_monitored_threshold = instance_settings.season_monitored_threshold or 0

        self.logger.info(f"Gathering media from {app.instance_name} ({instance_type})")
        if season_monitored_threshold is None:
            self.logger.warning(
                f"No 'season_monitored_threshold' provided for {app.instance_name}. Defaulting to 1."
            )
            season_monitored_threshold = 1
        media_dict: List[Dict[str, Any]] = (
            app.get_all_media(include_episode=True)
            if app.instance_type.lower() == "sonarr"
            else app.get_all_media()
        )
        ignore_tag_id = None
        checked_tag_id: int = app.get_tag_id_from_name(checked_tag_name)
        if ignore_tag_name:
            ignore_tag_id: int = app.get_tag_id_from_name(ignore_tag_name)

        filtered_media_dict: List[Dict[str, Any]] = self.filter_media(
            media_dict,
            checked_tag_id,
            ignore_tag_id,
            count,
            season_monitored_threshold,
        )
        if not filtered_media_dict and unattended:
            self.logger.info(
                f"All media for {app.instance_name} is already tagged—removing tags for unattended operation."
            )
            media_ids = [item["media_id"] for item in media_dict]
            self.logger.info("All media is tagged. Removing tags...")
            app.remove_tags(media_ids, checked_tag_id)
            media_dict = (
                app.get_parsed_media(include_episode=True)
                if app.instance_type.lower() == "sonarr"
                else app.get_parsed_media()
            )
            filtered_media_dict = self.filter_media(
                media_dict,
                checked_tag_id,
                ignore_tag_id,
                count,
                season_monitored_threshold,
            )

        if not filtered_media_dict and not unattended:
            self.logger.info(f"No media left to process for {app.instance_name}.")
            self.logger.warning(
                f"No media found for {app.instance_name}. Reason: nothing left to tag."
            )
            return None

        self.logger.debug(f"Filtered media count: {len(filtered_media_dict)}")
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

        if not self.config.dry_run:
            search_count: int = 0
            media_ids: List[int] = [item["media_id"] for item in filtered_media_dict]
            for item in filtered_media_dict:
                self.logger.debug("")  # Blank line before block
                self.logger.debug("═" * 70)
                self.logger.debug(
                    f"[PROCESSING] {item['title']} ({item['year']}) | ID: {item['media_id']}"
                )
                self.logger.debug("═" * 70)

                if item["seasons"] is None:
                    self.logger.debug(
                        f"Searching media without seasons for media ID: {item['media_id']}"
                    )
                    search_response = app.search_media(item["media_id"])
                    self.process_search_response(search_response, item["media_id"], app)
                    self.logger.debug(
                        f"  [TAG] Adding tag {checked_tag_id} to media ID: {item['media_id']}"
                    )
                    app.add_tags(item["media_id"], checked_tag_id)
                    search_count += 1
                    if search_count >= count:
                        self.logger.debug(
                            f"🔁 Reached search count limit after non-season search ({search_count} >= {count}), breaking."
                        )
                        self.logger.debug("─" * 70)
                        self.logger.debug(
                            f"[END] Finished: {item['title']} ({item['year']}) | ID: {item['media_id']}"
                        )
                        self.logger.debug("─" * 70)
                        self.logger.debug("")
                        break
                else:
                    searched = False
                    for season in item["seasons"]:
                        if season["monitored"]:
                            self.logger.debug(
                                f"  [SEASON] {season['season_number']}: Searching..."
                            )
                            search_response = app.search_season(
                                item["media_id"], season["season_number"]
                            )
                            self.process_search_response(
                                search_response, item["media_id"], app
                            )
                            searched = True

                    if searched:
                        self.logger.debug(
                            f"  [TAG] Adding tag {checked_tag_id} to media ID: {item['media_id']}"
                        )
                        app.add_tags(item["media_id"], checked_tag_id)
                        search_count += 1
                        if search_count >= count:
                            self.logger.debug(
                                f"🔁 Reached series-based search count limit ({search_count} >= {count}), breaking."
                            )
                            self.logger.debug("─" * 70)
                            self.logger.debug(
                                f"[END] Finished: {item['title']} ({item['year']}) | ID: {item['media_id']}"
                            )
                            self.logger.debug("─" * 70)
                            self.logger.debug("")
                            break

                self.logger.debug("─" * 70)
                self.logger.debug(
                    f"[END] Finished: {item['title']} ({item['year']}) | ID: {item['media_id']}"
                )
                self.logger.debug("─" * 70)
                self.logger.debug("")  # Blank line after block
                self.logger.info(
                    f"Finished processing: {item['title']} ({item['year']})"
                )

            self.logger.info(
                f"Completed upgrade operations for {app.instance_name}. Now retrieving download queue..."
            )
            queue = app.get_queue()
            self.logger.debug(f"Queue item count: {len(queue.get('records', []))}")
            queue_dict: List[Dict[str, Any]] = self.process_queue(
                queue, instance_type, media_ids
            )
            self.logger.debug(f"Queue dict item count: {len(queue_dict)}")

            queue_map: Dict[int, List[Dict[str, Any]]] = {}
            for q in queue_dict:
                queue_map.setdefault(q["media_id"], []).append(q)

            for item in filtered_media_dict:
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

    def print_output(self, output_dict: Dict[str, Any]) -> None:
        for instance, run_data in output_dict.items():
            if run_data:
                instance_data = run_data.get("data", None)
                if instance_data:
                    table = [[f"{run_data['server_name']}"]]
                    self.logger.info(create_table(table))
                    self.logger.info(
                        f"Upgrade summary for {run_data['server_name']}: {run_data.get('untagged_count', 0)} untagged, {run_data.get('tagged_count', 0)} tagged, {run_data.get('total_count', 0)} total."
                    )
                    for item in instance_data:
                        self.logger.info(f"{item['title']} ({item['year']})")
                        if item["download"]:
                            for download, format_score in item["download"].items():
                                self.logger.info(f"\t{download}\tScore: {format_score}")
                        else:
                            self.logger.info("\tNo upgrades found for this item.")
                        self.logger.info("")
                else:
                    self.logger.info(f"No items found for {instance}.")

    def run(self):
        try:
            if getattr(self.config, "log_level", "INFO") == "debug":
                print_settings(self.logger, self.config)
            if self.config.dry_run:
                table = [["Dry Run"], ["NO CHANGES WILL BE MADE"]]
                self.logger.info(create_table(table))
            if not getattr(self.config, "instances_list", None):
                self.logger.error("No instances found in config file.")
                sys.exit()
            output: Dict[str, Any] = {}
            for instance_entry in self.config.instances_list:
                instance_name = instance_entry.instance
                if not instance_name:
                    continue

                # Find the instance type and connection details in full_config.instances
                instance_type = None
                instance_cfg = None
                for typ in ["radarr", "sonarr"]:
                    type_dict = getattr(self.full_config.instances, typ, {})
                    if instance_name in type_dict:
                        instance_type = typ
                        instance_cfg = type_dict[instance_name]
                        break

                if not instance_cfg or not instance_type:
                    self.logger.warning(
                        f"Instance '{instance_name}' not found in config!"
                    )
                    continue

                app = create_arr_client(
                    instance_cfg.url,
                    instance_cfg.api,
                    self.logger,
                )
                if app and app.connect_status:
                    result = self.process_instance(instance_type, instance_entry, app)
                    if result:
                        output[instance_name] = result
            self.logger.debug(f"Processed instances: {list(output.keys())}")
            if output:
                self.print_output(output)
                manager = NotificationManager(
                    self.config, self.logger, module_name="upgradinatorr"
                )
                manager.send_notification(output)
        except KeyboardInterrupt:
            print("Keyboard Interrupt detected. Exiting...")
            sys.exit()
        except Exception:
            self.logger.error("\n\nAn error occurred:\n", exc_info=True)
            self.logger.error("\n\n")
        finally:
            self.logger.log_outro()


def main():
    upg = Upgradinatorr()
    upg.run()
