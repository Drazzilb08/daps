#   _           _          _                 
#  | |         | |        | |                
#  | |     __ _| |__   ___| | __ _ _ __ _ __ 
#  | |    / _` | '_ \ / _ \ |/ _` | '__| '__|
#  | |___| (_| | |_) |  __/ | (_| | |  | |   
#  |______\__,_|_.__/ \___|_|\__,_|_|  |_|   
# ======================================================================================
# Author: Drazzilb
# Description: A script to add/remove labels in Plex based on tags in Sonarr/Radarr
# Usage: python3 /path/to/labelarr.py
# Requirements: requests, pyyaml, plexapi
# License: MIT License
# ======================================================================================

version = "1.0.1"

import os
from tqdm import tqdm
from modules.config import Config
from modules.logger import setup_logger
from modules.arrpy import StARR
from plexapi.server import PlexServer
from plexapi.exceptions import BadRequest
import unicodedata
from modules.arrpy import arrpy_py_version

config = Config(script_name="labelarr")
logger = setup_logger(config.log_level, "labelarr")

def get_plex_data(plex, instance_type):
    if instance_type == "Radarr":
        type = "movie"
    elif instance_type == "Sonarr":
        type = "show"
    sections = plex.library.sections()
    plex_data = []
    for section in sections:
        if section.type == type:
            plex_data += section.all()
    return plex_data

def sync_labels_to_plex(plex, media, instance_type, app, labels, dry_run):
    plex_data = get_plex_data(plex, instance_type)
    for label in labels:
        label_tag = app.check_and_create_tag(label, dry_run)
        for item in tqdm(media, desc=f"Searching '{instance_type}' for {label}", total=len(media), disable=None):
            title = item['title']
            normalized_title = unicodedata.normalize('NFKD', title).encode('ASCII', 'ignore').decode('utf-8')
            year = item['year']
            tag_ids = item['tags']
            path = os.path.basename(item['path'])
            for data in plex_data:
                labels = data.labels
                label_names = [label.tag for label in labels]
                plex_title = data.title
                plex_year = data.year
                plex_path = os.path.basename(os.path.dirname(data.media[0].parts[0].file))
                normalized_plex_title = unicodedata.normalize('NFKD', plex_title).encode('ASCII', 'ignore').decode('utf-8')
                if normalized_title == normalized_plex_title and year == plex_year or path == plex_path:
                    if label_tag in tag_ids and label.capitalize() in label_names:
                        continue
                    elif label_tag in tag_ids and label.capitalize() not in label_names:
                        logger.debug(f"Found: '{label}' in '{instance_type}' for item: {title} ({year}) but not in 'Plex'")
                        if not dry_run:
                            logger.info(f"Adding: '{label}' to '{plex_title} ({plex_year})' in 'Plex'")
                            data.addLabel(label.capitalize())
                        else:
                            logger.info(f"Dry Run: Not adding tag to '{plex_title} ({plex_year})' in 'Plex'")
                    elif label_tag not in tag_ids and label.capitalize() in label_names:
                        logger.debug(f"Found: '{label}' in 'Plex' for item: {title} ({year}) but not in '{instance_type}'")
                        if not dry_run:
                            logger.info(f"Removing: '{label}' from '{plex_title} ({plex_year})' in 'Plex'")
                            data.removeLabel(label.capitalize())
                        else:
                            logger.info(f"Dry Run: Not removing tag from '{plex_title} ({plex_year})' in 'Plex'")

def sync_labels_from_plex(plex, media, instance_type, app, labels, dry_run):
    plex_data = get_plex_data(plex, instance_type)
    items_to_tag = []
    tag_message = []
    items_to_untag = []
    untag_message = []
    for label in labels:
        label_tag = app.check_and_create_tag(label, dry_run)
        for data in tqdm(plex_data, desc=f"Searching 'Plex' for {label}", total=len(plex_data), disable=None):
            labels = data.labels
            label_names = [label.tag for label in labels]
            plex_title = data.title
            plex_path = os.path.basename(os.path.dirname(data.media[0].parts[0].file))
            normalized_plex_title = unicodedata.normalize('NFKD', plex_title).encode('ASCII', 'ignore').decode('utf-8')
            plex_year = data.year
            for item in media:
                tag_ids = item['tags']
                title = item['title']
                normalized_title = unicodedata.normalize('NFKD', title).encode('ASCII', 'ignore').decode('utf-8')
                year = item['year']
                media_id = item['id']
                path = os.path.basename(item['path'])
                if normalized_title == normalized_plex_title and year == plex_year or path == plex_path:
                    if label_tag in tag_ids and label.capitalize() in label_names:
                        continue
                    elif label_tag not in tag_ids and label.capitalize() in label_names:
                        logger.debug(f"Found: '{label}' in 'Plex' for item: {title} ({year}) but not in '{instance_type}'")
                        if not dry_run:
                            tag_message.append(f"Adding: '{label}' to '{title} ({year})' in '{instance_type}'")
                            items_to_tag.append(media_id)
                        else:
                            tag_message.append(f"Dry Run: Not adding tag to '{title} ({year})' in '{instance_type}'")
                    elif label_tag in tag_ids and label.capitalize() not in label_names:
                        logger.debug(f"Found: '{label}' in '{instance_type}' for item: {title} ({year}) but not in 'Plex'")
                        if not dry_run:
                            untag_message.append(f"Removing: '{label}' from '{title} ({year})' in '{instance_type}'")
                            items_to_untag.append(media_id)
                        else:
                            untag_message.append(f"Dry Run: Not removing tag from '{title} ({year})' in '{instance_type}'")
    if items_to_tag:
        logger.info(f"Adding {len(items_to_tag)} items to '{label}' in '{instance_type}'")
        for message in tag_message:
            logger.info(message)
        app.add_tags(items_to_tag, label_tag)
    if items_to_untag:
        logger.info(f"Removing {len(items_to_untag)} items from '{label}' in '{instance_type}'")
        for message in untag_message:
            logger.info(message)
        app.remove_tags(items_to_untag, label_tag)
    
def main():
    logger.debug('*' * 40)
    logger.debug(f'* {"labelarr":^36} *')
    logger.debug(f'* {"Script Version:":<2} {version:>20} *')
    logger.debug(f'* {"arrpy.py Version:":<2} {arrpy_py_version:>18} *')
    logger.debug('*' * 40)
    logger.debug('')
    logger.info("Starting Labelarr")
    logger.debug('*' * 40)
    logger.debug(f'* {"Script Input Validated":^36} *')
    logger.debug('*' * 40)
    logger.debug(f'{" Script Settings ":*^40}')
    logger.debug(f'Dry_run: {config.dry_run}')
    logger.debug(f"Log Level: {config.log_level}")
    logger.debug(f"Labels: {config.labels}")
    logger.debug(f'*' * 40)
    logger.debug('')
    dry_run = config.dry_run
    labels = config.labels
    if config.dry_run:
        logger.info('*' * 40)
        logger.info(f'* {"Dry_run Activated":^36} *')
        logger.info('*' * 40)
        logger.info(f'* {" NO CHANGES WILL BE MADE ":^36} *')
        logger.info('*' * 40)
        logger.info('')
    if config.plex_data:
        for data in config.plex_data:
            api_key = data.get('api', '')
            url = data.get('url', '')
    try:
        plex = PlexServer(url, api_key)
    except BadRequest:
        logger.error("Plex URL or API Key is incorrect")
        exit()
    instance_data = {
        'Radarr': config.radarr_data,
        'Sonarr': config.sonarr_data
    }

    for instance_type, instances in instance_data.items():
        for instance in instances:
            instance_name = instance['name']
            url = instance['url']
            api = instance['api']
            script_name = None
            if instance_type == "Radarr" and config.radarr:
                data = next((data for data in config.radarr if data['name'] == instance_name), None)
                if data:
                    script_name = data['name']
            elif instance_type == "Sonarr" and config.sonarr:
                data = next((data for data in config.sonarr if data['name'] == instance_name), None)
                if data:
                    script_name = data['name']
            if script_name and instance_name == script_name:
                logger.debug(f"url: {url}")
                logger.debug(f"api: {'*' * (len(api) - 5)}{api[-5:]}")
                app = StARR(url, api, logger)
                media = app.get_media()
                if config.add_from_plex:
                    sync_labels_from_plex(plex, media, instance_type, app, labels, dry_run)
                else:
                    sync_labels_to_plex(plex, media, instance_type, app, labels, dry_run)
    logger.info("Labelarr finished")

if __name__ == "__main__":
    main()