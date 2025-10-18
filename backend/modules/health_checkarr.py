# modules/health_checkarr.py

import json
import re
import sys
from typing import Any, Dict, List, Optional

from backend.util.arr import create_arr_client
from backend.util.base_module import DapsModule
from backend.util.constants import tmdb_id_regex, tvdb_id_regex
from backend.util.helper import create_table, print_settings, progress
from backend.util.logger import Logger
from backend.util.notification import NotificationManager


class HealthCheckarr(DapsModule):
    def __init__(self, logger: Optional[Logger] = None) -> None:
        """
        Standard constructor using dependency injection.

        Args:
            config: Complete DAPS configuration object
            logger: Logger instance
        """
        super().__init__(logger)

    def run(self) -> None:
        """
        Process Radarr and Sonarr instances to identify and delete media items flagged by health checks
        as removed from TMDB or TVDB. Supports dry run mode and logs all actions.
        """
        try:
            if self.config.log_level.lower() == "debug":
                print_settings(self.logger, self.config)

            if self.config.dry_run:
                table = [["Dry Run"], ["NO CHANGES WILL BE MADE"]]
                self.logger.info(create_table(table))
                self.logger.info("")

            # Supported instance types: radarr/sonarr
            for instance_type in ["radarr", "sonarr"]:
                instances = getattr(self.full_config.instances, instance_type)
                if not instances:
                    continue
                for instance_name, instance_info in instances.items():
                    app = create_arr_client(
                        instance_info.url,
                        instance_info.api,
                        self.logger,
                    )
                    if not app or not app.is_connected():
                        self.logger.warning(
                            f"[{instance_type}] '{instance_name}': connection failed."
                        )
                        continue

                    health = app.get_health()
                    media_dict = app.get_all_media()  # List of dicts

                    id_list: List[int] = []
                    # Parse health check messages for removed media IDs
                    if health:
                        for health_item in health:
                            if (
                                health_item["source"] == "RemovedMovieCheck"
                                or health_item["source"] == "RemovedSeriesCheck"
                            ):
                                if instance_type == "radarr":
                                    for m in re.finditer(
                                        tmdb_id_regex, health_item["message"]
                                    ):
                                        id_list.append(int(m.group(1)))
                                if instance_type == "sonarr":
                                    for m in re.finditer(
                                        tvdb_id_regex, health_item["message"]
                                    ):
                                        id_list.append(int(m.group(1)))

                        self.logger.debug(f"id_list:\n{json.dumps(id_list, indent=4)}")
                        output: List[Dict[str, Any]] = []

                        # Match health-check IDs with media library entries
                        with progress(
                            media_dict,
                            desc=f"Processing {instance_type}",
                            unit="items",
                            logger=self.logger,
                            leave=True,
                        ) as pbar:
                            for item in pbar:
                                # media_dict items are expected to be dicts from the API
                                if (
                                    instance_type == "radarr"
                                    and item["tmdb_id"] in id_list
                                ) or (
                                    instance_type == "sonarr"
                                    and item["tvdb_id"] in id_list
                                ):
                                    db_id = (
                                        item["tmdb_id"]
                                        if instance_type == "radarr"
                                        else item["tvdb_id"]
                                    )
                                    self.logger.debug(
                                        f"Found {item['title']} with: {db_id}"
                                    )
                                    output.append(item)

                        self.logger.debug(f"output:\n{json.dumps(output, indent=4)}")

                        if output:
                            self.logger.info(
                                f"Deleting {len(output)} {instance_type} items from {app.instance_name}"
                            )
                            # Delete each matched item unless dry run is enabled
                            with progress(
                                output,
                                desc=f"Deleting {instance_type} items",
                                unit="items",
                                logger=self.logger,
                                leave=True,
                            ) as pbar:
                                for item in pbar:
                                    if not self.config.dry_run:
                                        self.logger.info(
                                            f"{item['title']} deleted with id: {item['media_id']} and tvdb/tmdb id: {item.get('db_id', '')}"
                                        )
                                        app.delete_media(item["media_id"])
                                    else:
                                        self.logger.info(
                                            f"{item['title']} would have been deleted with id: {item['media_id']}"
                                        )

                            # Send notification with deleted items
                            manager = NotificationManager(
                                self.config, self.logger, module_name="health_checkarr"
                            )
                            manager.send_notification(output)
                        else:
                            self.logger.info(
                                f"No health data returned for {app.instance_name}, this is fine if there was nothing to delete. Skipping deletion checks."
                            )
        except KeyboardInterrupt:
            print("Keyboard Interrupt detected. Exiting...")
            sys.exit()
        except Exception:
            self.logger.error("\n\nAn error occurred:\n", exc_info=True)
            self.logger.error("\n\n")
        finally:
            self.logger.log_outro()
