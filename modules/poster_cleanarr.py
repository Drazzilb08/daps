#   _____          _             _____ _                                  
#  |  __ \        | |           / ____| |                                 
#  | |__) |__  ___| |_ ___ _ __| |    | | ___  __ _ _ __   __ _ _ __ _ __ 
#  |  ___/ _ \/ __| __/ _ \ '__| |    | |/ _ \/ _` | '_ \ / _` | '__| '__|
#  | |  | (_) \__ \ ||  __/ |  | |____| |  __/ (_| | | | | (_| | |  | |   
#  |_|   \___/|___/\__\___|_|   \_____|_|\___|\__,_|_| |_|\__,_|_|  |_|   
#                         ______                                          
#                        |______|                                          
# ===========================================================================================================
#  Author: Drazzilb
#  Description: This script will remove any assets from your plex-meta-manager asset directory that are not being used by your media.
#               Note: This script will remove things that renamer has put in to the assets directory that do not have a folder in your
#               Media directory and cause a loop. I wouldn't recommend running this script very often (weekly at most, monthly is probably)
#  Usage: python3 poster_cleanarr.py
#  Requirements: requests
#  License: MIT License
# ===========================================================================================================

import os
import re
import json
import logging
import shutil

from util.logger import setup_logger
from util.config import Config
from util.utility import *
from util.arrpy import StARR

try:
    from plexapi.server import PlexServer
    from tqdm import tqdm
except ImportError as e:
    print(f"ImportError: {e}")
    print("Please install the required modules with 'pip install -r requirements.txt'")
    exit(1)

script_name = "poster_cleanarr"

config = Config(script_name)
logger = setup_logger(config.log_level, script_name)
log_level = config.log_level
dry_run = config.dry_run

logging.getLogger("requests").setLevel(logging.WARNING)
logging.getLogger('urllib3').setLevel(logging.WARNING)

year_regex = re.compile(r"(.*)\s\((\d{4})\)")

season_name_info = [
    "_Season",
]

def match_assets(assets_dict, media_dict, ignore_collections):
    """
    Match assets to media.
    
    Args:
        assets_dict (dict): Dictionary of assets.
        media_dict (dict): Dictionary of media.
    
    Returns:
        dict: Dictionary of unmatched assets.
    """
    # Define media types to be matched
    media_types = ['movies', 'series', 'collections']
    
    # Initialize a dictionary to store unmatched assets for each media type
    unmatched_assets = {media_type: [] for media_type in media_types}
    
    # Iterate through each media type
    for media_type in media_types:
        # Check if the media type exists in both assets and media dictionaries
        if media_type in media_dict and media_type in assets_dict:
            # Iterate through each asset in the asset dictionary of the given media type
            for asset_data in tqdm(assets_dict[media_type], desc=f"Matching {media_type}", unit="assets", total=len(assets_dict[media_type]), disable=None, leave=True):
                # Initialize a flag to track if an asset is matched with media
                matched = False
                # Skip collections if in ignore_collections
                if ignore_collections:
                    if media_type == 'collections' and asset_data['title'] in ignore_collections:
                        continue
                # Iterate through each media data of the same media type
                for media_data in media_dict[media_type]:
                    # Check if the normalized title and year match between the asset and media
                    no_prefix = asset_data.get('no_prefix', None)
                    no_suffix = asset_data.get('no_suffix', None)
                    no_prefix_normalized = asset_data.get('no_prefix_normalized', None)
                    no_suffix_normalized = asset_data.get('no_suffix_normalized', None)
                    alternate_titles = media_data.get('alternate_titles', [])
                    normalized_alternate_titles = media_data.get('normalized_alternate_titles', [])
                    secondary_year = media_data.get('secondary_year', None)
                    original_title = media_data.get('original_title', None)
                    asset_seasons_numbers = asset_data.get('season_numbers', None)
                    folder = media_data.get('folder', None)
                    # Get title and year from folder base_name
                    if folder:
                        folder_base_name = os.path.basename(folder)
                        match = re.search(year_regex, folder_base_name)
                        if match:
                            folder_title, folder_year = match.groups()
                            folder_year = int(folder_year)
                            normalized_folder_title = normalize_titles(folder_title)
                    if media_type == 'series':
                        media_seasons_numbers = [season['season_number'] for season in media_data.get('seasons', [])]
                    # Skip the iteration if the asset is already matched
                    if matched:
                        continue
                    # Matching criteria for media and asset
                    if (
                            asset_data['title'] == media_data['title'] or
                            asset_data['normalized_title'] == media_data['normalized_title'] or
                            asset_data['title'] in alternate_titles or
                            asset_data['normalized_title'] in normalized_alternate_titles or
                            asset_data['title'] == original_title or
                            folder_title == asset_data['title'] or
                            normalized_folder_title == asset_data['normalized_title'] or
                            (no_prefix and media_data['title'] in no_prefix) or
                            (no_suffix and media_data['title'] in no_suffix) or
                            (no_prefix_normalized and media_data['normalized_title'] in no_prefix_normalized) or
                            (no_suffix_normalized and media_data['normalized_title'] in no_suffix_normalized)
                        ) and (
                            asset_data['year'] == media_data['year'] or
                            asset_data['year'] == secondary_year or
                            folder_year == asset_data['year']
                        ):
                        matched = True
                        # For series, check for missing seasons in the media
                        if media_type == 'series':
                            if asset_seasons_numbers and media_seasons_numbers:
                                missing_seasons = []
                                for season in asset_seasons_numbers:
                                    if season not in media_seasons_numbers:
                                        missing_seasons.append(season)
                                # Remove all files that are not missing from asset['files']
                                if missing_seasons:
                                    files_to_remove = []
                                    for file in asset_data['files']:
                                        file_name = os.path.basename(file)
                                        if '_Season' in file_name:
                                            season_number_match = re.search(r'_Season(\d+)', file_name)
                                            if season_number_match:
                                                season_number = int(season_number_match.group(1))
                                            if season_number not in missing_seasons:
                                                files_to_remove.append(file)
                                        elif '_Season' not in file:
                                            files_to_remove.append(file)

                                    # Remove the files that need to be removed
                                    for file in files_to_remove:
                                        asset_data['files'].remove(file)
                            
                            # If missing seasons exist, add details to the unmatched assets
                            if missing_seasons:
                                unmatched_assets[media_type].append({
                                    'title': asset_data['title'],
                                    'year': asset_data['year'],
                                    'files': asset_data['files'],
                                    'path': asset_data.get('path', None),
                                    'missing_season': True,
                                    'missing_seasons': missing_seasons
                                })
                        break
                
                # If no match is found, add the asset to unmatched assets based on media type
                if not matched:
                    if media_type == 'series':
                        unmatched_assets[media_type].append({
                            'title': asset_data['title'],
                            'year': asset_data['year'],
                            'files': asset_data['files'],
                            'path': asset_data.get('path', None),
                            'missing_season': False,
                            'missing_seasons': asset_data['season_numbers']
                        })
                    else:
                        unmatched_assets[media_type].append({
                            'title': asset_data['title'],
                            'year': asset_data['year'],
                            'files': asset_data['files'],
                            'path': asset_data.get('path', None)
                        })
    return unmatched_assets

def remove_assets(unmatched_dict, assets_paths):
    """
    Remove unmatched assets.

    Args:
        unmatched_dict (dict): Dictionary of unmatched assets.
    
    Returns:
        dict: Dictionary of assets removed.
    """
    # Define the types of assets
    asset_types = ['movies', 'series', 'collections']
    
    # Initialize a dictionary to store removed asset data categorized by asset types
    remove_data = {media_type: [] for media_type in asset_types}
    
    # Initialize a list to track items to be removed
    remove_list = []
    
    # Iterate through each asset type
    for asset_type in asset_types:
        # Iterate through each asset data within the unmatched assets of the given asset type
        for asset_data in unmatched_dict[asset_type]:
            messages = []
            
            # Check if the asset has no associated files (empty folder)
            if not asset_data['files'] and asset_data['path']:
                # Add the path of the empty folder to the removal list and log a message
                remove_list.append(asset_data['path'])
                messages.append(f"Removing empty folder: {os.path.basename(asset_data['path'])}")
            else:
                # For each file associated with the asset, add it to the removal list and log a message
                for file in asset_data['files']:
                    remove_list.append(file)
                    messages.append(f"Removing file: {os.path.basename(file)}")

            # Store removal data for the current asset type
            remove_data[asset_type].append({
                'title': asset_data['title'],
                'year': asset_data['year'],
                'messages': messages
            })

    # If not a dry run, perform the removal operations
    if not dry_run:
        for path in remove_list:
            try:
                # Check if the path is a directory; if so, remove the directory recursively
                if os.path.isdir(path):
                    shutil.rmtree(path)
                else:
                    # If it's a file, remove the file and its parent folder if it becomes empty
                    os.remove(path)
                    folder_path = os.path.dirname(path)
                    if not os.listdir(folder_path):
                        os.rmdir(folder_path)
            except OSError as e:
                logger.error(f"Error: {e}")
                logger.error(f"Failed to remove: {path}")
                continue
        # Check for empty directories and remove them
        for assets_path in assets_paths:
            for root, dirs, files in os.walk(assets_path, topdown=False):
                for dir in dirs:
                    dir_path = os.path.join(root, dir)
                    if not os.listdir(dir_path):
                        try:
                            logger.info(f"Removing empty folder: {dir}")
                            os.rmdir(dir_path)
                        except OSError as e:
                            logger.error(f"Error: {e}")
                            logger.error(f"Failed to remove: {dir_path}")
                            continue
    
    return remove_data

def print_output(remove_data):
    """
    Print output of removed assets.
    
    Args:
        remove_data (dict): Dictionary of removed assets.
    
    Returns:
        None
    """
    
    # Define the types of assets
    asset_types = ['collections', 'movies', 'series']
    count = 0  # Counter to track the total number of assets removed
    
    # Iterate through each asset type
    # If any asset asset types in remove_data have data statement is true
    if any(remove_data[asset_type] for asset_type in asset_types):
        for asset_type in asset_types:
            if asset_type in remove_data:
                if remove_data[asset_type]:
                    data = [
                    [f"{asset_type.capitalize()}"]
                    ]
                    create_table(data, log_level="info", logger=logger)
                # Iterate through each removed asset of the current type
                    for data in remove_data[asset_type]:
                        title = data['title']
                        year = data['year']
                        
                        # Log the title and year (if available) of the removed asset
                        if year:
                            logger.info(f"\t{title} ({year})")
                        else:
                            logger.info(f"\t{title}")
                        
                        # Log messages related to the removal of files or folders associated with the asset
                        asset_messages = data['messages']
                        for message in asset_messages:
                            logger.info(f"\t\t{message}")
                            count += 1  # Increment the counter for each removed asset message
                        logger.info("")  # Add an empty line for better readability
    else:
        data = [
            ["No assets removed"]
        ]
        create_table(data, log_level="info", logger=logger)
                
    # Log the total number of assets removed across all types
    logger.info(f"\nTotal number of assets removed: {count}")


def main():
    """
    Main function.
    """
    try:
        # Check if it's a dry run and log the message
        if dry_run:
            data = [
                ["Dry Run"],
                ["NO CHANGES WILL BE MADE"]
            ]
            create_table(data, log_level="info", logger=logger)

        # Fetch script configurations from the provided YAML file
        script_config = config.script_config
        results = validate(config, script_config, logger)
        if not results:
            logger.error("Invalid script configuration. Exiting.")
            sys.exit()
        assets_paths = script_config.get('assets_paths', [])
        library_names = script_config.get('library_names', [])
        asset_folders = script_config.get('asset_folders', False)
        media_paths = script_config.get('media_paths', [])
        assets_paths = script_config.get('assets_paths', [])
        ignore_collections = script_config.get('ignore_collections', [])
        instances = script_config.get('instances', None)

        # Log script settings for debugging purposes
        data = [
            ["Script Settings"]
        ]
        create_table(data, log_level="debug", logger=logger)
        logger.debug(f'{"Log level:":<20}{log_level if log_level else "Not set"}')
        logger.debug(f'{"Dry_run:":<20}{dry_run if dry_run else "False"}')
        logger.debug(f'{"Asset Folders:":<20}{asset_folders if asset_folders else "Not set"}')
        logger.debug(f'{"Assets paths:":<20}{assets_paths if assets_paths else "Not set"}')
        logger.debug(f'{"Media paths:":<20}{media_paths if media_paths else "Not set"}')
        logger.debug(f'{"Library names:":<20}{library_names if library_names else "Not set"}')
        logger.debug(f'{"Ignore Collections:":<20}{ignore_collections if ignore_collections else "Not set"}')
        logger.debug(f'{"Instances:":<20}{instances if instances else "Not set"}')
        logger.debug('*' * 40 + '\n')

        # Initialize dictionaries to store assets and media information
        assets_dict = {}
        media_dict = {'series': {}, 'movies': {}, 'collections': {}}

        # Fetch and categorize assets
        for path in assets_paths:
            results = categorize_files(path, asset_folders)
            for key, value in results.items():
                if key not in assets_dict:
                    assets_dict[key] = []
                assets_dict[key].extend(value)

        # Check if assets exist, log and exit if not found
        if not all(assets_dict.values()):
            logger.error("No assets found, Check asset_folders setting in your config. Exiting.")
            sys.exit()

        # Check if media exists, log and exit if not found
        if any(value is None for value in media_dict.values()):
            logger.error("No media found, Check media_paths setting in your config. Exiting.")
            sys.exit()

        # Fetch information from Plex and StARR
        media_dict = {
            'movies': [],
            'series': [],
            'collections': []
        }
        if instances:
            for instance_type, instance_data in config.instances_config.items():
                for instance in instances:
                    if instance in instance_data:
                        if instance_type == "plex":
                            url = instance_data[instance]['url']
                            api = instance_data[instance]['api']
                            app = PlexServer(url, api)
                            if library_names and app:
                                results = get_plex_data(app, library_names, logger, include_smart=True, collections_only=True)
                                media_dict['collections'].extend(results)
                            else:
                                logger.warning("No library names specified in config.yml. Skipping Plex.")
                        else:
                            url = instance_data[instance]['url']
                            api = instance_data[instance]['api']
                            app = StARR(url, api, logger)
                            if app:
                                results = handle_starr_data(app, instance_type)
                                if instance_type == "radarr":
                                    media_dict['movies'].extend(results)  # Append the results to the 'movies' list
                                elif instance_type == "sonarr": 
                                    media_dict['series'].extend(results)  # Append the results to the 'series' list
                    
        else:
            logger.warning("No instances specified in config.yml. Skipping Plex.")
        # Match assets with media and log the results
        unmatched_dict = match_assets(assets_dict, media_dict, ignore_collections)
        logger.debug(f"Unmatched:\n{json.dumps(unmatched_dict, indent=4)}")

        # Remove unmatched assets and log the details
        remove_data = remove_assets(unmatched_dict, assets_paths)
        logger.debug(f"Remove Data:\n{json.dumps(remove_data, indent=4)}")


        # Print the output of removed assets
        print_output(remove_data)
    except KeyboardInterrupt:
        print("Keyboard Interrupt detected. Exiting...")
        sys.exit()
    except Exception:
        logger.error(f"\n\nAn error occurred:\n", exc_info=True)
        logger.error(f"\n\n")
    finally:
        logger.info(f"\n{'*' * 40} END {'*' * 40}\n")

if __name__ == "__main__":
    main()
