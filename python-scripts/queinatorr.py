#    ____             _             _                  
#   / __ \           (_)           | |                 
#  | |  | |_   _  ___ _ _ __   __ _| |_ ___  _ __ _ __ 
#  | |  | | | | |/ _ \ | '_ \ / _` | __/ _ \| '__| '__|
#  | |__| | |_| |  __/ | | | | (_| | || (_) | |  | |   
#   \___\_\\__,_|\___|_|_| |_|\__,_|\__\___/|_|  |_|   
# ===================================================================================================
# Author: Drazzilb
# Description: This script will move torrents from one category to another in qBittorrent based on
#              the title of the torrent. This is useful for moving torrents from a category that are stuck 
#              in a queue due to a missing file or not being an upgrade for existing episode file(s).
# Usage: python3 queinatorr.py
# Requirements: requests, qbittorrentapi
# Version: 0.0.3
# License: MIT License
# ===================================================================================================

import json
from modules.config import Config
from modules.logger import setup_logger
from qbittorrentapi import Client
from modules.arrpy import StARR
from urllib.parse import urlsplit

config = Config(script_name="queinatorr")
logger = setup_logger(config.log_level, "queinatorr")

queue_list = [
    "Not an upgrade for existing episode file(s)",
    "No files found are eligible for import in",
    "The download is missing files",
    "Not a Custom Format upgrade for existing movie file(s)"
]

def handle_qbit(title_list, url, username, password, move_category, dry_run, move_missing):
    name = None
    logger.debug('*' * 40)
    logger.debug(f'* {"Processing qBittorrent":^36} *')
    logger.debug('*' * 40)
    dict_torrent_hash_name_category = {}
    url_parts = urlsplit(url)
    host = url_parts.hostname
    port = url_parts.port
    qb = Client(host=host, port=port)
    qb.auth_log_in(username=username, password=password)
    torrents = qb.torrents_info()
    if move_category not in qb.torrents_categories().keys():
        logger.error(f"Category {move_category} does not exist. Please create it in qBittorrent")
        return
    for torrent in torrents:
        torrent_name = torrent['name']
        hash = torrent['hash']
        category = torrent['category']
        if move_missing:
            if category in move_missing and torrent['state'] == 'missingFiles':
                dict_torrent_hash_name_category[name] = {'hash': hash, 'category': category}
                logger.info(f"Adding {torrent_name} to the list of torrents to move from {category} to {move_category} due to it missing files, chances are it's a cross-seed")
        if any(isinstance(title, str) and (title and torrent_name and title.lower() in str(torrent_name).lower() or title and isinstance(torrent_name, str) and '.' in torrent_name and title.lower() in torrent_name.rsplit('.', 1)[0].lower()) for title in title_list):
            try:
                if category != move_category:
                    dict_torrent_hash_name_category[name] = {'hash': hash, 'category': category}
            except KeyError:
                logger.error(f"Could not find category for {name}")
    logger.debug(f"dict_torrent_hash_name_category: {json.dumps(dict_torrent_hash_name_category, indent=4)}")
    for torrent_name, dict_torrent_hash_category in dict_torrent_hash_name_category.items():
        torrent = torrent_name
        category = dict_torrent_hash_category['category']
        hash = dict_torrent_hash_category['hash']
        if category != move_category:
            if not dry_run:
                try:
                    qb.torrents_set_category(torrent_hashes=hash, category=move_category)
                    logger.info(f"Moving {torrent} from {category} to {move_category}")
                except Exception as e:
                    logger.error(f"Could not move {torrent} from {category} to {move_category}")
                    logger.error(e)
            else:
                logger.info(f"Would move {torrent} from {category} to {move_category}")
    qb.auth_log_out()

def handle_queued_items(queue):
    logger.debug('*' * 40)
    logger.debug(f'* {"Handling queue items":^36} *')
    logger.debug('*' * 40)
    title_list = []
    for record in queue['records']:
        if record['statusMessages']:
            for message in record['statusMessages']:
                if not message['messages']:
                    continue
                title = message['title']
                messages = message['messages']
                if messages:
                    if any(queue_item in msg for msg in messages for queue_item in queue_list):
                        if title and messages:
                            logger.info(f"Found {title} with {messages}")
                            title_list.append(title)
        try:
            if record['errorMessage']:
                title = record['title']
                error_message = record['errorMessage']
                if error_message:
                    if error_message in queue_list:
                        if title and error_message:
                            logger.info(f"Found {title} with {error_message}....")
                            title_list.append(title)
        except KeyError:
            pass
    logger.debug("")
    logger.debug(f"title_list: {title_list}")
    logger.debug("")
    return title_list

def main():
    logger.info("Starting queinatorr")
    dry_run = config.dry_run
    if config.dry_run:
        logger.info('*' * 40)
        logger.info(f'* {"Dry_run Activated":^36} *')
        logger.info('*' * 40)
        logger.info(f'* {" NO CHANGES WILL BE MADE ":^36} *')
        logger.info('*' * 40)
        logger.info('')
    for item in config.qbit:
        if item['starr_app'] is None:
            continue
        for app_data in [config.radarr_data, config.sonarr_data]:
            if app_data is not None:
                for i in app_data:
                    if i['name'] in ([item['starr_app']] if isinstance(item['starr_app'], str) else item['starr_app']):
                        app_type = 'Radarr' if app_data == config.radarr_data else 'Sonarr'
                        logger.info('*' * 40)
                        logger.info(f'* {f"Processing: {app_type}":^36} *')
                        logger.info('*' * 40)
                        url = i['url']
                        api = i['api']
                        logger.debug(f"url: {url}")
                        logger.debug(f"api: {'*' * (len(api) - 5)}{api[-5:]}")
                        app = StARR(url, api, logger)
                        queue = app.get_queue()
                        title_list = handle_queued_items(queue)
                        for q in config.qbit_data:
                            if q['name'] == item['name']:
                                url = q['url']
                                username = q['username']
                                password = q['password']
                                logger.debug(f"url: {url}")
                                logger.debug(f"username: {username}")
                                logger.debug(f"password: {'*' * len(password)}")
                                move_category = item['move_category']
                                try:
                                    move_missing = item['move_missing']
                                except KeyError:
                                    move_missing = None
                                for starr_app, category in move_category.items():
                                    if starr_app == i['name']:
                                        logger.debug(f"Matched {starr_app} with {i['name']}")
                                        move_category = category
                                        logger.debug(f"move_category: {move_category}")
                                        logger.debug(f"Move category for {starr_app} is {move_category}")
                                        logger.info('*' * 40)
                                        logger.info(f'* {f"Processing: {starr_app}":^36} *')
                                        logger.info('*' * 40)
                                if move_missing:
                                    for starr_app, category in move_missing.items():
                                        if starr_app == i['name']:
                                            if isinstance(category, str):
                                                category = [category]
                                            move_missing = category
                                            logger.debug(f"move_missing: {move_missing}")
                                            logger.debug(f"Move missing for {starr_app} is {move_missing}")
                                handle_qbit(title_list, url, username, password, move_category, dry_run, move_missing)
                                app.refresh_queue()
    logger.info("Exiting queinatorr")


if __name__ == '__main__':
    main()