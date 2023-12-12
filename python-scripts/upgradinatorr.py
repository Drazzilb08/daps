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
# License: MIT License
# ===================================================================================================

script_version = "3.2.2"

from modules.config import Config
from modules.logger import setup_logger
from modules.arrpy import StARR
from modules.arrpy import arrpy_py_version
from modules.version import version
from modules.discord import discord
from modules.formatting import create_table

script_name = "upgradinatorr"
config = Config(script_name)
log_level = config.log_level
logger = setup_logger(log_level, script_name)
version(script_name, script_version, arrpy_py_version, logger, config)

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
        if isinstance(status, str):
            if status != "all" and status != media['status']:
                continue
        elif isinstance(status, list):
            for stat in status:
                if stat == media['status']:
                    break
            else:
                continue
        if tag_id not in media['tags']:
            return False
    return True

def process_instance(instance_type, instance_name, count, tag_name, unattended, status, monitored, url, api, dry_run, reset):
    """
    Process a given instance.
    Parameters:
        instance_type (str): The type of instance to process.
        instance_name (str): The name of the instance to process.
        count (int): The number of items to process.
        tag_name (str): The name of the tag to use.
        unattended (bool): Whether or not to run the script unattended.
        status (str): The status to check for.
        monitored (bool): Whether or not to check for monitored media.
        url (str): The URL of the instance.
        api (str): The API key of the instance.
        dry_run (bool): Whether or not to run the script in dry run mode.
        reset (bool): Whether or not to reset the tag.
    """
    media_type = None
    tagged_count = 0
    untagged_count = 0
    total_count = 0
    app = StARR(url, api, logger)
    server_name = app.get_instance_name()
    data = [
        [server_name],
    ]
    create_table(data, log_level, logger)
    data = [
        [f"{server_name} Settings"]
    ]
    create_table(data, log_level, logger)
    logger.debug('*' * 40)
    logger.debug(f"Script Settings for {instance_name}:")
    logger.debug(f'{"Count:":<20}{count if count else "Not Set"}')
    logger.debug(f'{"tag_name:":<20}{tag_name if tag_name else "Not Set"}')
    logger.debug(f'{"reset: {reset}":<20}{reset if reset else "Not Set"}')
    logger.debug(f'{"unattended:":<20}{unattended if unattended else "Not Set"}')
    logger.debug(f'{"URL:":<20}{url if url else "Not Set"}')
    logger.debug(f'{"API:":<20}{"*" * (len(api) - 5)}{api[-5:] if api else "Not Set"}')
    logger.debug(f'{"Instance Type:":<20}{instance_type if instance_type else "Not Set"}')
    logger.debug(f'{"ARR name:":<20}{server_name if instance_name else "Not Set"}')
    logger.debug('*' * 40 + '\n')
    media = app.get_media()
    if instance_type == "Radarr":
        media_type = "Movies"
    elif instance_type == "Sonarr":
        media_type = "Series"
    arr_tag_id = app.get_tag_id_from_name(tag_name)
    if not arr_tag_id:
        arr_tag_id = app.create_tag(tag_name)
        if arr_tag_id:
            logger.debug(f"Tag: {tag_name} | Tag ID: {arr_tag_id}")
    else:
        logger.debug(f"Tag: {tag_name} | Tag ID: {arr_tag_id}")
    all_tagged = check_all_tagged(media, arr_tag_id, status, monitored)
    all_media_ids = [item["id"] for item in media]
    if reset:
        if not dry_run:
            app.remove_tags(all_media_ids, arr_tag_id)
            logger.info(f'All of {instance_name} have had the tag {tag_name} removed.')
            all_tagged = False 
        else:
            logger.info(f'All of {instance_name} would have had the tag {tag_name} removed.')
            all_tagged = False
    elif all_tagged and unattended:
        if not dry_run:
            app.remove_tags(all_media_ids, arr_tag_id)
            logger.info(f'All of {instance_name} have had the tag {tag_name} removed.')
            discord(None, logger, config, script_name, description=f"All of {instance_name} have had the tag {tag_name} removed.", color=0xFFA500, content=None)
            all_tagged = False
        else:
            logger.info(f'All of {instance_name} would have had the tag {tag_name} removed.')
            discord(None, logger, config, script_name, description=f"All of {instance_name} would have had the tag {tag_name} removed.", color=0xFFA500, content=None)
            all_tagged = False
    elif all_tagged and not unattended:
        logger.info(f'All of {instance_name} has been tagged with {tag_name}')
        logger.info("If you would like to remove the tag and re-run the script, please set reset to True or set unattended to True.")
        logger.info(f"Skipping {instance_name}...")
        discord(None, logger, config, script_name, description=f"All of {instance_name} has been tagged with {tag_name}, please set reset to True or set unattended to True to remove the tag and re-run the script, {instance_name} will be skipped.", color=0xFFA500, content=None)
        return
    if not all_tagged:
        if isinstance(status, str):
            untagged_media = [m for m in media if arr_tag_id not in m['tags'] and m['monitored'] == monitored and (status == "all" or status == m['status'])]
        elif isinstance(status, list):
            untagged_media = [m for m in media if arr_tag_id not in m['tags'] and m['monitored'] == monitored and any(stat == m['status'] for stat in status)]
        media_to_process = untagged_media[:count]
        media_ids_to_process = [item["id"] for item in media_to_process]
        if not dry_run:
            app.add_tags(media_ids_to_process, arr_tag_id)
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
    data = [
        ["Script Settings"]
    ]
    create_table(data, log_level, logger)
    logger.debug(f'{"Dry_run:":<20}{config.dry_run if config.dry_run else "False"}')
    logger.debug(f'{"Log level:":<20}{log_level if log_level else "INFO"}')
    logger.debug(f'*' * 40 + '\n')
    if config.dry_run:
        data = [
            ["Dry Run"],
            ["NO CHANGES WILL BE MADE"]
        ]
        create_table(data, log_level, logger)
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
                    monitored = data.get('monitored', True)
                    status = data.get('status', 'all')
            if script_name and instance_name == script_name:
                process_instance(instance_type, instance_name, count, tag_name, unattended, status, monitored, url, api, config.dry_run, reset)

if __name__ == '__main__':
    """
    Main entry point for the script.
    """
    main()
