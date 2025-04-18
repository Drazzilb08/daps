#   _    _            _ _   _        _____ _               _                   
#  | |  | |          | | | | |      / ____| |             | |                  
#  | |__| | ___  __ _| | |_| |__   | |    | |__   ___  ___| | ____ _ _ __ _ __ 
#  |  __  |/ _ \/ _` | | __| '_ \  | |    | '_ \ / _ \/ __| |/ / _` | '__| '__|
#  | |  | |  __/ (_| | | |_| | | | | |____| | | |  __/ (__|   < (_| | |  | |   
#  |_|  |_|\___|\__,_|_|\__|_| |_|  \_____|_| |_|\___|\___|_|\_\__,_|_|  |_|   
# ===================================================================================================
# Author: Drazzilb
# Description: This script will delete movies and shows from Radarr and Sonarr based on the if they show
#              up in the health check. This is useful for removing movies and shows that have been removed
#              from TMDB or TVDB.
# Usage: python3 health_checkarr.py
# Requirements: requests
# License: MIT License
# ===================================================================================================

import json
import re
import sys

from util.discord import discord, discord_check
from util.arrpy import StARR
from util.utility import *
from util.discord import discord
from util.logger import setup_logger

try:
    from tqdm import tqdm
except ImportError as e:
    print(f"ImportError: {e}")
    print("Please install the required modules with 'pip install -r requirements.txt'")
    exit(1)

script_name = "health_checkarr"

tmdb_id_extractor = re.compile(r"tmdbid (\d+)")
tvdb_id_extractor = re.compile(r"tvdbid (\d+)")

def notification(output, logger):
    delete_list = []

    for item in output:
        delete_list.append(f"**{item['title']}**\t\t{item['tvdb_id'] if item['instance_type'] == 'sonarr' else item['tmdb_id']}")
    # convert delete_list to a string
    delete_list = "\n".join(delete_list)
    fields = {
            "name": "Items below have been deleted from Radarr/Sonarr",
            "value": f"```{delete_list}```",
            "inline": False
        }
    # Convert the fields to a list
    fields = [fields]
    print(f"Sending Discord notification with {len(delete_list)} items")
    discord(fields, logger, script_name, description=f"{'__**Dry Run**__' if dry_run else ''}", color=0x00ff00, content=None)

def main(config):
    """
    Main function.
    """
    global dry_run
    dry_run = config.dry_run
    log_level = config.log_level
    logger = setup_logger(log_level, script_name)
    script_config = config.script_config
    name = script_name.replace("_", " ").upper()
    try:
        logger.info(create_bar(f"START {name}"))
        health = None
        script_config = config.script_config
        instances = script_config.get('instances', None)
        notifications = script_config.get('notifications', None)
        valid = validate(config, script_config, logger)
        # Log script settings
        table = [
            ["Script Settings"]
        ]
        logger.debug(create_table(table))
        logger.debug(f'{"Dry_run:":<20}{dry_run if dry_run else "False"}')
        logger.debug(f'{"Log level:":<20}{log_level if log_level else "INFO"}')
        logger.debug(f'{"Instances:":<20}{instances if instances else "Not Set"}')
        logger.debug(f'{"Notifications:":<20}{script_config.get("notifications", "Not Set")}')
        logger.debug(create_bar("-"))
        if dry_run:
            table = [
                ["Dry Run"],
                ["NO CHANGES WILL BE MADE"]
            ]
            logger.info(create_table(table))
            logger.info('')

        for instance_type, instance_data in config.instances_config.items():
            for instance in instances:
                if instance in instance_data:
                    app = StARR(instance_data[instance]['url'], instance_data[instance]['api'], logger)
                    if app.connect_status:
                        server_name = app.get_instance_name()
                        health = app.get_health()
                        media_dict = handle_starr_data(app, server_name, instance_type, logger, include_episode=False)
                        id_list = []
                        if health:
                            for health_item in health:
                                if health_item['source'] == "RemovedMovieCheck" or health_item['source'] == "RemovedSeriesCheck":
                                    if instance_type == "radarr":
                                        for m in re.finditer(tmdb_id_extractor, health_item['message']):
                                            id_list.append(int(m.group(1)))
                                    if instance_type == "sonarr":
                                        for m in re.finditer(tvdb_id_extractor, health_item['message']):
                                            id_list.append(int(m.group(1)))
                        logger.debug(f"id_list:\n{json.dumps(id_list, indent=4)}")
                        output = []
                        for item in tqdm(media_dict, desc=f"Processing {instance_type}", unit="items", disable=None, total=len(media_dict)):
                            if (instance_type == "radarr" and item['tmdb_id'] in id_list) or (instance_type == "sonarr" and item['tvdb_id'] in id_list):
                                logger.debug(f"Found {item['title']} with: {item['db_id']}")
                                output.append(item)
                        logger.debug(f"output:\n{json.dumps(output, indent=4)}")

                        if output:
                            logger.info(f"Deleting {len(output)} {instance_type} items from {server_name}")
                            for item in tqdm(output, desc=f"Deleting {instance_type} items", unit="items", disable=None, total=len(output)):
                                if not dry_run:
                                    logger.info(f"{item['title']} deleted with id: {item['media_id']} and tvdb/tmdb id: {item['db_id']}")
                                    app.delete_media(item['media_id'])
                                else:
                                    logger.info(f"{item['title']} would have been deleted with id: {item['media_id']}")
    except KeyboardInterrupt:
        print("Keyboard Interrupt detected. Exiting...")
        sys.exit()
    except Exception:
        logger.error(f"\n\nAn error occurred:\n", exc_info=True)
        logger.error(f"\n\n")
    finally:
        logger.info(create_bar(f"END {name}"))