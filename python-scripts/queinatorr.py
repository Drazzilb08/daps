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
    "The download is missing files"
]

def handle_qbit(title_list, url, username, password, move_category, dry_run):
    dict_torrent_and_category = {}
    url_parts = urlsplit(url)
    host = url_parts.hostname
    port = url_parts.port
    qb = Client(host=host, port=port)
    qb.log_main(username, password)
    torrents = qb.torrents_info()
    if move_category not in qb.torrents_categories().keys():
        logger.error(f"Category {move_category} does not exist. Please create it in qBittorrent")
        return
    for torrent in torrents:
        if torrent['name'] in title_list:
            try:
                category = torrent['category']
                name = torrent['name']
                logger.debug(f"Found {name} in {category}")
                dict_torrent_and_category[name] = category
            except KeyError:
                print(f"Could not find category for {name}")
    for torrent, category in dict_torrent_and_category.items():
        if category != move_category:
            if not dry_run:
                try:
                    qb.torrents_set_category(torrent_hashes=torrent, category=move_category)
                    logger.info(f"Moving {torrent} from {category} to {move_category}")
                except Exception as e:
                    logger.error(f"Could not move {torrent} from {category} to {move_category}")
                    logger.error(e)
            else:
                logger.info(f"Would move {torrent} from {category} to {move_category}")
        else:
            logger.info(f"{torrent} is already in {move_category}")

def handle_queued_items(queue):
    title_list = []
    for record in queue['records']:
        if record['statusMessages']:
            for message in record['statusMessages']:
                if not message['messages']:
                    continue
                title = message['title']
                messages = message['messages']
                logger.debug(f"Found {title} with {messages}")
                if messages:
                    if any(queue_item in msg for msg in messages for queue_item in queue_list):
                        if title and messages:
                            logger.debug(f"Found {title} with {messages}")
                            title_list.append(title)
        try:
            if record['errorMessage']:
                title = record['title']
                error_message = record['errorMessage']
                logger.debug(f"Found {title} with {error_message}")
                if error_message:
                    if any(queue_item in msg or msg in queue_item for msg in error_message for queue_item in queue_list):
                        if title and error_message:
                            logger.debug(f"Found {title} with {error_message}")
                            title_list.append(title)
        except KeyError:
            pass
        
    print(title_list)
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
                        print(f"Processing {app_type}")
                        print("*" * 20)
                        print(f"Matched {item['name']} with {i['name']}")
                        url = i['url']
                        api = i['api']
                        app = StARR(url, api, logger)
                        queue = app.get_queue()
                        title_list = handle_queued_items(queue)
                        for q in config.qbit_data:
                            if q['name'] == item['name']:
                                url = q['url']
                                username = q['username']
                                password = q['password']
                                move_category = item['move_category']
                                for starr_app, category in move_category.items():
                                    if starr_app == i['name']:
                                        logger.debug(f"Matched {starr_app} with {i['name']}")
                                        move_category = category
                                        logger.debug(f"Move category for {starr_app} is {move_category}")
                                handle_qbit(title_list, url, username, password, move_category, dry_run)
    logger.info("Exiting queinatorr")


if __name__ == '__main__':
    main()