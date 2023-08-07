#   _    _                           _ _             _                  _____
#  | |  | |                         | (_)           | |                |  __ \
#  | |  | |_ __   __ _ _ __ __ _  __| |_ _ __   __ _| |_ ___  _ __ _ __| |__) |   _
#  | |  | | '_ \ / _` | '__/ _` |/ _` | | '_ \ / _` | __/ _ \| '__| '__|  ___/ | | |
#  | |__| | |_) | (_| | | | (_| | (_| | | | | | (_| | || (_) | |  | |_ | |   | |_| |
#   \____/| .__/ \__, |_|  \__,_|\__,_|_|_| |_|\__,_|\__\___/|_|  |_(_)|_|    \__, |
#         | |     __/ |                                                        __/ |
#         |_|    |___/                                                        |___/
# ===================================================================================================
# Author: Drazzilb
# Description: A script to upgrade Sonarr/Radarr libraries to the keep in line with trash-guides
# Usage: python3 /path/to/upgradinatorr.py
# Requirements: requests, pyyaml
# Version: 2.0.6
# License: MIT License
# ===================================================================================================

from modules.config import Config
from modules.logger import setup_logger
from modules.arrpy import StARR

config = Config(script_name="upgradinatorr")
logger = setup_logger(config.log_level, "upgradinatorr")

def check_all_tagged(all_media, tag_id, status, monitored):
    """
    Check if all media with a given tag is in a given status and monitored state.
    Parameters:
        all_media (list): A list of dictionaries representing all media in the Radarr instance.
        tag_id (int): The ID of the tag to check for
        status (str): The status to check for
        monitored (bool): Whether or not to check for monitored media
    Returns:
        True if all media with the given tag is in the given status and monitored state, False otherwise.
    """
    for media in all_media:
        if monitored != media['monitored']:
            continue
        if status != "all" and status != media['status']:
            continue
        if tag_id not in media['tags']:
            return False
    return True

def process_instance(instance_type, instance_name, count, tag_name, unattended, status, monitored, url, api, dry_run, reset):
    media_type = None
    tagged_count = 0
    untagged_count = 0
    total_count = 0
    app = StARR(url, api, logger)
    media = app.get_media()
    if instance_type == "Radarr":
        media_type = "Movies"
    elif instance_type == "Sonarr":
        media_type = "Series"
    arr_tag_id = app.check_and_create_tag(tag_name, dry_run)
    all_tagged = check_all_tagged(media, arr_tag_id, status, monitored)
    if reset:
        if not dry_run:
            app.remove_tags(media, arr_tag_id, tag_name)
            logger.info(f'All of {instance_name} have had the tag {tag_name} removed.')
            all_tagged = False 
        else:
            logger.info(f'All of {instance_name} would have had the tag {tag_name} removed.')
            all_tagged = False
    elif all_tagged and unattended:
        if not dry_run:
            app.remove_tags(media, arr_tag_id, tag_name)
            logger.info(f'All of {instance_name} have had the tag {tag_name} removed.')
            all_tagged = False
        else:
            logger.info(f'All of {instance_name} would have had the tag {tag_name} removed.')
            all_tagged = False
    elif all_tagged and not unattended:
        logger.info(f'All of {instance_name} has been tagged with {tag_name}')
        logger.info("If you would like to remove the tag and re-run the script, please set reset to True or set unattended to True.")
        logger.info(f"Skipping {instance_name}...")
        return
    if not all_tagged:
        untagged_media = [m for m in media if arr_tag_id not in m['tags'] and m['monitored'] == monitored and (status == "all" or status == m['status'])]
        media_to_process = untagged_media[:count]
        media_ids_to_process = [item["id"] for item in media_to_process]
        if not dry_run:
            app.add_tag(media_ids_to_process, arr_tag_id)
            app.search_media(media_ids_to_process)
            for title in media_to_process:
                logger.info(f"Search request sent for '{title['title']}', this item has been tagged with '{tag_name}'")
        else:
            for title in media_to_process:
                logger.info(f"Search request would have been sent for '{title['title']}', this item would have been tagged with '{tag_name}'")
        for m in media:
            if (arr_tag_id in m["tags"]):
                tagged_count += 1
            elif (arr_tag_id not in m["tags"]):
                untagged_count += 1
        total_count = tagged_count + untagged_count
        tagged_percent = (tagged_count / total_count) * 100
        untagged_percent = (untagged_count / total_count) * 100
        logger.info(f'Total {media_type}: {total_count}, Tagged {media_type}: {tagged_count} ({tagged_percent:.2f}%), Untagged {media_type}: {untagged_count} ({untagged_percent:.2f}%)\n')

def main():
    """
    Main function for the script.
    """
    count = 0
    tag_name = None
    unattended = None
    status = None
    monitored = None
    reset = False
    logger.debug('*' * 40)
    logger.debug(f'* {"Script Input Validated":^36} *')
    logger.debug('*' * 40)
    logger.debug(f'{" Script Settings ":*^40}')
    logger.debug(f'Dry_run: {config.dry_run}')
    logger.debug(f"Log Level: {config.log_level}")
    logger.debug(f'*' * 40)
    logger.debug('')
    if config.dry_run:
        logger.info('*' * 40)
        logger.info(f'* {"Dry_run Activated":^36} *')
        logger.info('*' * 40)
        logger.info(f'* {" NO CHANGES WILL BE MADE ":^36} *')
        logger.info('*' * 40)
        logger.info('')
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
                    count = data.get('count', 1)
                    tag_name = data.get('tag_name', 'Upgradinatorr')
                    reset = data.get('reset', False)
                    unattended = data.get('unattended', False)
                    monitored = data.get('monitored', True)
                    status = data.get('status', 'all')
            elif instance_type == "Sonarr" and config.sonarr:
                data = next((data for data in config.sonarr if data['name'] == instance_name), None)
                if data:
                    script_name = data['name']
                    count = data['count']
                    count = data.get('count', 1)
                    tag_name = data.get('tag_name', 'Upgradinatorr')
                    reset = data.get('reset', False)
                    unattended = data.get('unattended', False)
                    status = data.get('status', 'all')
            if script_name and instance_name == script_name:
                logger.info('*' * 40)
                logger.info(f'* {instance_name:^36} *')
                logger.info('*' * 40)
                logger.debug(f'{" Settings ":*^40}')
                logger.debug(f"Instance Name: {instance_name}")
                logger.debug(f"URL: {url}")
                logger.debug(f"api: {'*' * (len(api) - 5)}{api[-5:]}")
                process_instance(instance_type, instance_name, count, tag_name, unattended, status, monitored, url, api, config.dry_run, reset)

if __name__ == '__main__':
    """
    Main entry point for the script.
    """
    main()
