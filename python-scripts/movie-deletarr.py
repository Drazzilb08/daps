#   __  __            _      _____       _      _                  
#  |  \/  |          (_)    |  __ \     | |    | |                 
#  | \  / | _____   ___  ___| |  | | ___| | ___| |_ __ _ _ __ _ __ 
#  | |\/| |/ _ \ \ / / |/ _ \ |  | |/ _ \ |/ _ \ __/ _` | '__| '__|
#  | |  | | (_) \ V /| |  __/ |__| |  __/ |  __/ || (_| | |  | |   
#  |_|  |_|\___/ \_/ |_|\___|_____/ \___|_|\___|\__\__,_|_|  |_|   
# ===================================================================================================
# Author: Drazzilb
# Description: This script will delete movies and shows from Radarr and Sonarr based on the if they show
#              up in the health check. This is useful for removing movies and shows that have been removed
#              from TMDB or TVDB.
# Usage: python3 movie-deletarr.py
# Requirements: requests
# Version: 0.0.1
# License: MIT License
# ===================================================================================================

from modules.config import Config
from modules.logger import setup_logger
from modules.arrpy import StARR
import json
import re

config = Config(script_name="movie-deletarr")
logger = setup_logger(config.log_level, "movie-deletarr")

tmdb_id_extractor = re.compile(r"tmdbid (\d+)")
tvdb_id_extractor = re.compile(r"tvdbid (\d+)")

def main():
    dry_run = config.dry_run
    log_level = config.log_level
    print(f"dry_run: {dry_run}")
    print(f"log_level: {log_level}")
    instance_data = {
        'Radarr': config.radarr_data,
        'Sonarr': config.sonarr_data
    }
    for instance_type, instances in instance_data.items():
        for instance in instances:
            logger.info('*' * 40)
            logger.info(f'* {f"Processing: {instance_type}":^36} *')
            logger.info('*' * 40)
            url = instance['url']
            api = instance['api']
            logger.debug(f"url: {url}")
            logger.debug(f"api: {'*' * (len(api) - 5)}{api[-5:]}")
            app = StARR(url, api, logger)
            health = app.get_health()
            media = app.get_media()
            id_list = []
            for h in health:
                if h['source'] == "RemovedMovieCheck" or h['source'] == "RemoveSeriesCheck":
                    if instance_type == "Radarr":
                        for m in re.finditer(tmdb_id_extractor, h['message']):
                            id_list.append(int(m.group(1)))
                    if instance_type == "Sonarr":
                        for m in re.finditer(tvdb_id_extractor, h['message']):
                            id_list.append(int(m.group(1)))
            logger.info(f"id_list: {id_list}")
            dict_list_of_ids = {}
            for m in media:
                title = m['title']
                id = m['id']
                if instance_type == "Sonarr":
                    media_id = m['tvdbId']
                    id_type = "tvdbId"
                if instance_type == "Radarr":
                    media_id = m['tmdbId']
                    id_type = "tmdbId"
                if media_id in id_list:
                    logger.info(f"Found {title} with {id_type}: {media_id}")
                    dict_list_of_ids[title] = id
            logger.debug(f"dict_list_of_ids: {json.dumps(dict_list_of_ids, indent=4)}")
            for title, id in dict_list_of_ids.items():
                if not dry_run:
                    logger.info(f"{title} deleted with id: {id}")
                    app.delete_media(id, instance_type)
                else:
                    logger.info(f"{title} would have been deleted with id: {id}")

if __name__ == '__main__':
    main()