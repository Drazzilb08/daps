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

try:
    from plexapi.server import PlexServer
    from tqdm import tqdm
except ImportError as e:
    print(f"ImportError: {e}")
    print("Please install the required modules with 'pip install -r requirements.txt'")
    exit(1)

script_name = "poster_cleanarr"

config = Config(script_name)
log_level = config.log_level
dry_run = config.dry_run
logger = setup_logger(config.log_level, script_name)

logging.getLogger("requests").setLevel(logging.WARNING)
logging.getLogger('urllib3').setLevel(logging.WARNING)

year_regex = re.compile(r"(.*)\s\((\d{4})\)")

season_name_info = [
    "_Season",
]

def get_assets_files(assets_paths, asset_folders):
    """
    Get all files in the assets directory.
    
    Args:
        assets_paths (list): List of paths to assets directories.
        asset_folders (bool): Whether or not the assets are in folders.
        
    Returns:
        list: List of all files in the assets directory.
    """

    # Initialize an empty dictionary to categorize assets
    assets = {'movies': [], 'series': [], 'collections': []}
    
    # Iterate over each specified assets path
    for assets_path in assets_paths:
        # Get the list of files in the directory and sort them
        files = os.listdir(assets_path)
        files = sorted(files, key=lambda x: x.lower())

        # If asset folders are not used, categorize files based on their naming conventions
        if not asset_folders:
            # Iterate over each file in the directory
            for file in files:
                # Skip hidden files
                if file.startswith('.'):
                    continue

                # Extract base name and extension
                base_name, extension = os.path.splitext(file)

                # Categorize files into collections, series, or movies based on naming conventions
                if not re.search(r'\(\d{4}\)', base_name):
                    assets['collections'].append({
                        'title': base_name,
                        'files': file,
                        'source': assets_path
                    })
                else:
                    # Logic for categorizing series and movies based on naming conventions
                    if any(file.startswith(base_name) and any(season_name in file for season_name in season_name_info) for file in files) and not any(season_name in file for season_name in season_name_info):
                        season_files = [file for file in files if file.startswith(base_name) and any(season_name in file for season_name in season_name_info)]
                        season_files.append(file)
                        season_files = sorted(season_files)
                        assets['series'].append({
                            'title': base_name,
                            'files': season_files,
                            'source': assets_path
                        })
                    elif any(season_name in file for season_name in season_name_info):
                        continue
                    else:
                        assets['movies'].append({
                            'title': base_name,
                            'files': file,
                            'source': assets_path
                        })
        
        # If asset folders are used, categorize files based on the folder structure
        else:
            # Iterate over each root directory, subdirectories, and files
            for root, dirs, files in os.walk(assets_path):
                # Extract the title of the directory
                title = os.path.basename(root)

                # Skip if it's the root directory or if there are no files
                if root == assets_path or not files:
                    continue

                # Categorize directories into collections, series, or movies based on their structure
                if not re.search(year_regex, title):
                    assets['collections'].append({
                        'title': title,
                        'files': files,
                        'source': root
                    })
                else:
                    # Logic for categorizing series and movies based on folder structure
                    if any("Season" in file for file in files):
                        assets['series'].append({
                            'title': title,
                            'files': files,
                            'source': root
                        })
                    else:
                        assets['movies'].append({
                            'title': title,
                            'files': files,
                            'source': root
                        })
    
    # Log the gathered assets and return the categorized assets as a dictionary
    logger.debug(f"Assets:\n{json.dumps(assets, indent=4)}")
    return assets

def match_assets(assets_dict, media_dict):
    """
    Match assets to media.
    
    Args:
        assets_dict (dict): Dictionary of assets.
        media_dict (dict): Dictionary of media.
    
    Returns:
        dict: Dictionary of unmatched assets.
    """

    print("Matching assets...")
    
    # Define media types to be matched
    media_types = ['movies', 'series', 'collections']
    
    # Initialize a dictionary to store unmatched assets for each media type
    unmatched_assets = {media_type: [] for media_type in media_types}
    
    # Iterate through each media type
    for media_type in media_types:
        # Check if the media type exists in both assets and media dictionaries
        if media_type in media_dict and media_type in assets_dict:
            # Iterate through each asset in the asset dictionary of the given media type
            for asset_data in assets_dict[media_type]:
                # Initialize a flag to track if an asset is matched with media
                matched = False
                # Initialize a list to track missing seasons for series
                missing_seasons = []
                
                # Iterate through each media data of the same media type
                for media_data in media_dict[media_type]:
                    # Check if the normalized title and year match between the asset and media
                    if asset_data['normalized_title'] == media_data['normalized_title'] and asset_data['year'] == media_data['year']:
                        matched = True
                        
                        # For series, check for missing seasons in the media
                        if media_type == 'series':
                            files_to_remove = []
                            missing_seasons = [season for season in asset_data['season_numbers'] if season not in media_data['season_numbers']]
                            
                            # Identify files associated with missing seasons
                            for season in missing_seasons:
                                for file in asset_data['files']:
                                    if f"Season{season}" in file:
                                        files_to_remove.append(file)
                            
                            # If missing seasons exist, add details to the unmatched assets
                            if missing_seasons:
                                unmatched_assets[media_type].append({
                                    'title': asset_data['title'],
                                    'year': asset_data['year'],
                                    'files': files_to_remove,
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

def remove_assets(unmatched_dict):
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
            if not asset_data['files']:
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
    for asset_type in asset_types:
        if asset_type in remove_data:
            data = [
                [f"{asset_type.capitalize()}"]
            ]
            # Log the asset type as a table header
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
        script_data = config.script_config
        assets_paths = script_data.get('assets_paths', [])
        library_names = script_data.get('library_names', [])
        asset_folders = script_data.get('asset_folders', False)
        media_paths = script_data.get('media_paths', [])
        assets_paths = script_data.get('assets_paths', [])
        ignore_collections = script_data.get('ignore_collections', [])
        instances = script_data.get('instances', None)

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
            assets_dict = categorize_files(path, asset_folders)

        # Check if assets exist, log and exit if not found
        if not all(assets_dict.values()):
            logger.error("No assets found, Check asset_folders setting in your config. Exiting.")
            sys.exit()

        # Fetch media information
        media_dict = get_media_folders(media_paths, logger)

        # Check if media exists, log and exit if not found
        if any(value is None for value in media_dict.values()):
            logger.error("No media found, Check media_paths setting in your config. Exiting.")
            sys.exit()

        # Fetch Plex data if instances are specified in the config
        if instances:
            for instance_type, instance_data in config.instances_config.items():
                for instance in instances:
                    if instance in instance_data:
                        url = instance_data[instance]['url']
                        api = instance_data[instance]['api']
                        print("Connecting to Plex...")
                        app = PlexServer(url, api)
                        if library_names and app:
                            results = get_plex_data(app, library_names, logger, include_smart=False, collections_only=True)
                            media_dict['collections'] = []
                            media_dict['collections'].extend(results)
                        else:
                            logger.warning("No library names specified in config.yml. Skipping Plex.")
        else:
            logger.warning("No instances specified in config.yml. Skipping Plex.")

        # Match assets with media and log the results
        unmatched_dict = match_assets(assets_dict, media_dict)
        logger.debug(f"Unmatched:\n{json.dumps(unmatched_dict, indent=4)}")

        # Remove unmatched assets and log the details
        remove_data = remove_assets(unmatched_dict)
        logger.debug(f"Remove Data:\n{json.dumps(remove_data, indent=4)}")

        # Print the output of removed assets
        print_output(remove_data)
        logger.info(f"{'*' * 40} END {'*' * 40}\n")
    except KeyboardInterrupt:
        print("Keyboard Interrupt detected. Exiting...")
        sys.exit()

if __name__ == "__main__":
    main()
