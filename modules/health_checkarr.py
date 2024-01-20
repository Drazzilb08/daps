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

from util.config import Config
from util.logger import setup_logger
from util.arrpy import StARR
from util.utility import *
from util.discord import discord

try:
    from tqdm import tqdm
except ImportError as e:
    print(f"ImportError: {e}")
    print("Please install the required modules with 'pip install -r requirements.txt'")
    exit(1)

script_name = "health_checkarr"
config = Config(script_name)
dry_run = config.dry_run
log_level = config.log_level
logger = setup_logger(log_level, script_name)

tmdb_id_extractor = re.compile(r"tmdbid (\d+)")
tvdb_id_extractor = re.compile(r"tvdbid (\d+)")

def main():
    """
    Main function.
    """
    try:
        health = None
        script_config = config.script_config
        instances = script_config.get('instances', None)
        valid = validate(config, script_config, logger)
        # Log script settings
        data = [
            ["Script Settings"]
        ]
        create_table(data, log_level="debug", logger=logger)
        logger.debug(f'{"Dry_run:":<20}{dry_run if dry_run else "False"}')
        logger.debug(f'{"Log level:":<20}{log_level if log_level else "INFO"}')
        logger.debug(f'{"Instances:":<20}{instances if instances else "Not Set"}')
        logger.debug(f'*' * 40 + '\n')
        
        if dry_run:
            data = [
                ["Dry Run"],
                ["NO CHANGES WILL BE MADE"]
            ]
            create_table(data, log_level="info", logger=logger)
            logger.info('')

        for instance_type, instance_data in config.instances_config.items():
            for instance in instances:
                if instance in instance_data:
                    app = StARR(instance_data[instance]['url'], instance_data[instance]['api'], logger)
                    server_name = app.get_instance_name()
                    health = app.get_health()
                    media_dict = handle_starr_data(app, instance_type)
                    id_list = []
                    if health:
                        for health_item in health:
                            if health_item['source'] == "RemovedMovieCheck" or health_item['source'] == "RemoveSeriesCheck":
                                if instance_type == "Radarr":
                                    for m in re.finditer(tmdb_id_extractor, health_item['message']):
                                        id_list.append(int(m.group(1)))
                                if instance_type == "Sonarr":
                                    for m in re.finditer(tvdb_id_extractor, health_item['message']):
                                        id_list.append(int(m.group(1)))
                    logger.debug(f"id_list:\n{json.dumps(id_list, indent=4)}")
                    output = []
                    for item in tqdm(media_dict, desc=f"Processing {instance_type}", unit="items", disable=None, total=len(media_dict)):
                        if item['db_id'] in id_list:
                            logger.debug(f"Found {item['title']} with: {item['db_id']}")
                            output.append(item)
                    logger.debug(f"output:\n{json.dumps(output, indent=4)}")

                    if output:
                        logger.info(f"Deleting {len(output)} {instance_type} items from {server_name}")
                        for item in tqdm(output, desc=f"Deleting {instance_type} items", unit="items", disable=None, total=len(output)):
                            if not dry_run:
                                logger.info(f"{item['title']} deleted with id: {item['db_id']}")
                                app.delete_media(item['db_id'], instance_type)
                            else:
                                logger.info(f"{item['title']} would have been deleted with id: {item['db_id']}")
        logger.info(f"{'*' * 40} END {'*' * 40}\n")
    except KeyboardInterrupt:
        print("Keyboard Interrupt detected. Exiting...")
        sys.exit()

if __name__ == '__main__':
    main()