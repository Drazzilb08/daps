import json
import re
import sys
from types import SimpleNamespace
from typing import List, Dict, Optional, Any

from util.arrpy import create_arr_client
from util.logger import Logger
from util.utility import (
    progress,
    create_table,
    print_settings
)
from util.notification import send_notification
from util.constants import tmdb_id_regex, tvdb_id_regex
from tqdm import tqdm


def main(config: SimpleNamespace) -> None:
    """
    Process Radarr and Sonarr instances to identify and delete media items flagged by health checks
    as removed from TMDB or TVDB. Supports dry run mode and logs all actions.

    Args:
        config (SimpleNamespace): Configuration object containing:
            - log_level (str): Logging verbosity level.
            - module_name (str): Name of the module for logging context.
            - dry_run (bool): If True, no deletions are performed.
            - instances_config (Dict[str, Dict[str, Dict[str, str]]]): Configuration for each instance type and instance.
            - instances (List[str]): List of instance names to process.

    Behavior:
        - Iterates over configured Radarr and Sonarr instances.
        - Retrieves health check data and media libraries.
        - Identifies media items flagged as removed.
        - Deletes flagged media items unless dry run is enabled.
        - Sends notifications about deleted items.
        - Logs all key steps and errors.
    """
    logger: Logger = Logger(config.log_level, config.module_name)

    try:
        # Display configuration settings if in debug mode
        if config.log_level.lower() == "debug":
            print_settings(logger, config)

        # Print dry run notice if enabled
        if config.dry_run:
            table: List[List[str]] = [
                ["Dry Run"],
                ["NO CHANGES WILL BE MADE"]
            ]
            logger.info(create_table(table))
            logger.info('')

        # Iterate over each instance type (radarr/sonarr)
        for instance_type, instance_data in config.instances_config.items():
            # Iterate over each configured instance for this type
            for instance in config.instances:
                if instance in instance_data:
                    # Create client for the current instance
                    app: Optional[Any] = create_arr_client(
                        instance_data[instance]['url'],
                        instance_data[instance]['api'],
                        logger
                    )
                    if app and app.connect_status:
                        # Retrieve health check warnings
                        health: Optional[List[Dict[str, Any]]] = app.get_health()

                        # Retrieve current media library without episode details
                        media_dict: List[Dict[str, Any]] = app.get_parsed_media(include_episode=False)

                        id_list: List[int] = []

                        # Parse health check messages for removed media IDs
                        if health:
                            for health_item in health:
                                if health_item['source'] == "RemovedMovieCheck" or health_item['source'] == "RemovedSeriesCheck":
                                    if instance_type == "radarr":
                                        for m in re.finditer(tmdb_id_regex, health_item['message']):
                                            id_list.append(int(m.group(1)))
                                    if instance_type == "sonarr":
                                        for m in re.finditer(tvdb_id_regex, health_item['message']):
                                            id_list.append(int(m.group(1)))

                            logger.debug(f"id_list:\n{json.dumps(id_list, indent=4)}")

                            output: List[Dict[str, Any]] = []

                            # Match health-check IDs with media library entries
                            with progress(media_dict, desc=f"Processing {instance_type}", unit="items", logger=logger, leave=True) as pbar:
                                for item in pbar:
                                    if (instance_type == "radarr" and item['tmdb_id'] in id_list) or \
                                        (instance_type == "sonarr" and item['tvdb_id'] in id_list):
                                        db_id = item['tmdb_id'] if instance_type == "radarr" else item['tvdb_id']
                                        logger.debug(f"Found {item['title']} with: {db_id}")
                                        output.append(item)

                            logger.debug(f"output:\n{json.dumps(output, indent=4)}")

                            if output:
                                logger.info(f"Deleting {len(output)} {instance_type} items from {app.instance_name}")

                                # Delete each matched item unless dry run is enabled
                                for item in tqdm(output, desc=f"Deleting {instance_type} items", unit="items", disable=None, total=len(output)):
                                    if not config.dry_run:
                                        logger.info(f"{item['title']} deleted with id: {item['media_id']} and tvdb/tmdb id: {item['db_id']}")
                                        app.delete_media(item['media_id'])
                                    else:
                                        logger.info(f"{item['title']} would have been deleted with id: {item['media_id']}")

                                # Send notification with deleted items
                                send_notification(
                                    logger=logger,
                                    module_name=config.module_name,
                                    config=config,
                                    output=output,
                                )
                        else:
                            logger.info(f"No health data returned for {app.instance_name}, this is fine if there was nothing to delete. Skipping deletion checks.")

    except KeyboardInterrupt:
        print("Keyboard Interrupt detected. Exiting...")
        sys.exit()
    except Exception:
        logger.error(f"\n\nAn error occurred:\n", exc_info=True)
        logger.error(f"\n\n")