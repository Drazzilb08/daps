#   _____                                 _             _                  _____
#  |  __ \                               (_)           | |                |  __ \
#  | |__) |___ _ __   __ _ _ __ ___   ___ _ _ __   __ _| |_ ___  _ __ _ __| |__) |   _
#  |  _  // _ \ '_ \ / _` | '_ ` _ \ / _ \ | '_ \ / _` | __/ _ \| '__| '__|  ___/ | | |
#  | | \ \  __/ | | | (_| | | | | | |  __/ | | | | (_| | || (_) | |  | |_ | |   | |_| |
#  |_|  \_\___|_| |_|\__,_|_| |_| |_|\___|_|_| |_|\__,_|\__\___/|_|  |_(_)|_|    \__, |
#                                                                                 __/ |
#                                                                                |___/
# ===================================================================================================
# Author: Drazzilb
# Description: This script will rename all series in Sonarr/Radarr to match the naming scheme of the
#              Naming Convention within Radarr/Sonarr. It will also add a tag to the series so that it can be easily
#              identified as having been renamed.
# Usage: python3 /path/to/renameinatorr.py
# Requirements: requests, pyyaml
# Version: 2.0.2
# License: MIT License
# ===================================================================================================

from modules.config import Config
from modules.logger import Logger
from modules.sonarr import SonarrInstance
from modules.radarr import RadarrInstance
from modules.validate import ValidateInput

config = Config(script_name="renameinatorr")
logger = Logger(config.log_level, "renameinatorr")

def check_all_tagged(all_media, tag_id):
    """
    Check if all media has been tagged.
    
    Args:
        all_media (list): The list of all media.
        tag_id (int): The ID of the tag to check.
        
    Returns:
        bool: True if all media has been tagged, False otherwise.
    """
    for media in all_media:
        if tag_id not in media['tags']:
            return False
    return True

def print_format(items, library_item_to_rename, instance_type, dry_run, total_count, tagged_percent, untagged_percent, media_type, tagged_count, untagged_count):
    """
    Print the format of the output.
    
    Args:
        items (list): The list of items to print.
        library_item_to_rename (list): The list of items to rename.
        instance_type (str): The type of instance to process.
        dry_run (bool): Whether or not to perform a dry run.
        total_count (int): The total number of items to process.
        tagged_percent (float): The percentage of items that have been tagged.
        untagged_percent (float): The percentage of items that have not been tagged.
        media_type (str): The type of media to process.
        tagged_count (int): The number of items that have been tagged.
        untagged_count (int): The number of items that have not been tagged.
    """
    if dry_run:
        tagged = "would have been tagged"
        renamed = "would have been renamed to"
    else:
        tagged = "has been tagged"
        renamed = "renamed to"
    print()
    for item in items:
        if instance_type == "sonarr":
            series_title = item["title"]
            logger.info(f"Series Title: {series_title} {tagged}.")
            current_season = None
            for episode in library_item_to_rename:
                season_number = episode["seasonNumber"]
                existing_path = episode["existingPath"]
                new_path = episode["newPath"]
                if current_season != season_number:
                    current_season = season_number
                    logger.info(f"\tSeason {season_number:02d}:")
                logger.info(
                    f"\t\t{existing_path.split('/')[-1]} {renamed} {new_path.split('/')[-1]}")
        if instance_type == "radarr":
            movie_title = item["title"]
            logger.info(f"Movie Title: {movie_title} {tagged}.")
            for file in library_item_to_rename:
                existing_path = file["existingPath"]
                new_path = file["newPath"]
                logger.info(
                    f"\t{existing_path.split('/')[-1]} {renamed} {new_path.split('/')[-1]}")
    if total_count > 0:
        tagged_percent = (tagged_count / total_count) * 100
        untagged_percent = (untagged_count / total_count) * 100
        logger.info(f'Total {media_type}: {total_count}, Tagged {media_type}: {tagged_count} ({tagged_percent:.2f}%), Untagged {media_type}: {untagged_count} ({untagged_percent:.2f}%)\n')
            
def process_instance(instance_type, instance_name, url, api, tag_name, count, dry_run, reset, unattended):
    """
    Process the instance based on the instance type.
    
    Args:
        instance_type (str): The type of instance to process.
        instance_name (str): The name of the instance to process.
        url (str): The URL of the instance to process.
        api (str): The API key of the instance to process.
        tag_name (str): The name of the tag to use.
        count (int): The number of items to process.
        dry_run (bool): Whether or not to perform a dry run.
        reset (bool): Whether or not to reset the tag.
        unattended (bool): Whether or not to run unattended.
    """
    tagged_count = 0
    untagged_count = 0
    total_count = 0
    new_tag = 0
    if instance_type == "Radarr":
        app = RadarrInstance(url, api, logger)
        media = app.get_movies()
        media_type = "Movies"
        file_id = "movieFileId"
    elif instance_type == "Sonarr":
        app = SonarrInstance(url, api, logger)
        media = app.get_series()
        media_type = "Series"
        file_id = "episodeFileId"
    arr_tag_id = app.check_and_create_tag(tag_name, dry_run, logger)
    logger.debug(f"Length of Media for {str(app)}: {len(media)}")
    all_tagged = check_all_tagged(media, arr_tag_id)
    if reset:
        app.remove_tags(media, arr_tag_id, tag_name, logger)
        logger.info(f'All of {instance_name} have had the tag {tag_name} removed.')
        all_tagged = False 
    elif all_tagged and unattended:
        app.remove_tags(media, arr_tag_id, tag_name, logger)
        logger.info(f'All of {instance_name} have had the tag {tag_name} removed.')
        all_tagged = False
    elif all_tagged and not unattended:
        logger.info(f'All of {instance_name} has been tagged with {tag_name}')
        logger.info("If you would like to remove the tag and re-run the script, please set reset to True or set unattended to True.")
        logger.info(f"Skipping {instance_name}...")
        return
    if not all_tagged:
        untagged_media = [
            m for m in media if arr_tag_id not in m['tags']]
        media_to_process = untagged_media[:count]
        checked = True
        items = []
        for item in media_to_process:
            media_id = item["id"]
            library_item_to_rename = app.get_rename_list(media_id)
            files_to_rename = [file[file_id]for file in library_item_to_rename]
            if not dry_run:
                if instance_type == "Radarr":
                    checked = app.rename_files(media_id, logger, library_item_to_rename)
                elif instance_type == "Sonarr": 
                    checked = app.rename_files(media_id, logger, files_to_rename)
            if checked:
                if not dry_run:
                    app.add_tag(media_id, arr_tag_id)
                    new_tag += 1
                    app.refresh_media(logger, media_id)
                items.append(item)
        for m in media:
            if (arr_tag_id in m["tags"]):
                tagged_count += 1
            elif (arr_tag_id not in m["tags"]):
                untagged_count += 1
        total_count = (tagged_count + new_tag) + untagged_count
        tagged_percent = ((tagged_count + new_tag) / total_count) * 100
        untagged_percent = (untagged_count / total_count) * 100
        print_format(items, library_item_to_rename, instance_type.lower(), dry_run, total_count, tagged_percent, untagged_percent, media_type, tagged_count, untagged_count)

def main():
    """
    Main function to run the script
    """
    validate_input = ValidateInput(config.log_level, config.dry_run, logger) 
    config.log_level, config.dry_run = validate_input.validate_script(logger)
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
                    count = data['count']
                    tag_name = data['tag_name']
                    reset = data['reset']
                    unattended = data['unattended']
            elif instance_type == "Sonarr" and config.sonarr:
                data = next((data for data in config.sonarr if data['name'] == instance_name), None)
                if data:
                    script_name = data['name']
                    count = data['count']
                    tag_name = data['tag_name']
                    reset = data['reset']
                    unattended = data['unattended']
            if script_name and instance_name == script_name:
                logger.info('*' * 40)
                logger.info(f'* {instance_name:^36} *')
                logger.info('*' * 40)
                logger.debug(f'{" Settings ":*^40}')
                logger.debug(f"Instance Name: {instance_name}")
                logger.debug(f"URL: {url}")
                logger.debug(f"API Key: {'<redacted>' if api else 'None'}")
                process_instance(instance_type, instance_name, url, api, tag_name, count, config.dry_run, reset, unattended)

if __name__ == "__main__":
    """
    Main entry point for the script.
    """
    main()