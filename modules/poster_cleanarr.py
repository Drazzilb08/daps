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
import sys

from util.utility import *
from util.arrpy import StARR
from util.logger import setup_logger

try:
    from plexapi.server import PlexServer
    from tqdm import tqdm
except ImportError as e:
    print(f"ImportError: {e}")
    print("Please install the required modules with 'pip install -r requirements.txt'")
    exit(1)

script_name = "poster_cleanarr"

def match_assets(assets_list, media_dict, ignore_media):
    """
    Match assets to media.
    
    Args:
        assets_dict (dict): Dictionary of assets.
        media_dict (dict): Dictionary of media.
    
    Returns:
        dict: Dictionary of unmatched assets.
    """
    # Initialize dictionary to store unmatched assets by media types
    unmatched_assets = []
    # Loop through different media types
    # Iterate through each asset in the asset dictionary of the given media type
    for asset_data in tqdm(assets_list, desc=f"Matching...", unit="assets", total=len(assets_list), disable=None, leave=True):
        # Initialize a flag to track if an asset is matched with media
        matched = False

        if not asset_data['files']:
            unmatched_assets.append({
                'title': asset_data['title'],
                'year': asset_data['year'],
                'files': asset_data['files'],
                'path': asset_data.get('path', None)
            })
            continue

        # Iterate through each media data of the same media type
        for media_data in media_dict:

            if is_match(asset_data, media_data):
                matched = True
                
                # For series, check for missing seasons in the media
                if media_data.get('season_numbers', None):
                    media_seasons_numbers = media_data.get('season_numbers', None)
                    asset_seasons_numbers = asset_data.get('season_numbers', None)
                    if asset_seasons_numbers and media_seasons_numbers:
                        missing_seasons = []
                        for season in asset_seasons_numbers:
                            if season not in media_seasons_numbers:
                                missing_seasons.append(season)
                        files = []
                        for season in missing_seasons:
                            season = str(season).zfill(2)
                            season = f"Season{season}"
                            for file in asset_data['files']:
                                if season in file:
                                    files.append(file)
                        if missing_seasons:
                            unmatched_assets.append({
                                'title': asset_data['title'],
                                'year': asset_data['year'],
                                'files': files,
                                'path': asset_data.get('path', None),
                                'missing_season': True,
                                'missing_seasons': missing_seasons
                            })
                    break
        # If no match is found, add the asset to unmatched assets based on media type
        if not matched:
            if f"{asset_data['title']} ({asset_data['year']})" in ignore_media:
                print(f"{asset_data['title']} ({asset_data['year']}) is in ignore_media, skipping...")
                continue
            unmatched_assets.append({
                'title': asset_data['title'],
                'year': asset_data['year'],
                'files': asset_data['files'],
                'path': asset_data.get('path', None)
            })
    return unmatched_assets

def remove_assets(unmatched_dict, source_dirs, logger):
    """
    Remove unmatched assets.

    Args:
        unmatched_dict (dict): Dictionary of unmatched assets.
    
    Returns:
        dict: Dictionary of assets removed.
    """
    # Define the types of assets
    
    # Initialize a dictionary to store removed asset data categorized by asset types
    remove_data = []
    
    # Initialize a list to track items to be removed
    remove_list = []
    # Iterate through each asset type
    # Iterate through each asset data within the unmatched assets of the given asset type
    for asset_data in unmatched_dict:
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
        remove_data.append({
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
        for assets_path in source_dirs:
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

def print_output(remove_data, logger):
    """
    Print output of removed assets.
    
    Args:
        remove_data (dict): Dictionary of removed assets.
    
    Returns:
        None
    """
    
    # Define the types of assets
    count = 0  # Counter to track the total number of assets removed

    for data in remove_data:
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


def main(config):
    """
    Main function.
    """
    global dry_run
    dry_run = config.dry_run
    log_level = config.log_level
    logger = setup_logger(log_level, script_name)
    script_config = config.script_config
    name = script_name.replace("_", " ").upper()

    try:
        logger.info(create_bar(f"START {name}"))
        # Check if it's a dry run and log the message
        if dry_run:
            table = [
                ["Dry Run"],
                ["NO CHANGES WILL BE MADE"]
            ]
            logger.info(create_table(table))

        # Fetch script configurations from the provided YAML file
        script_config = config.script_config
        results = validate(config, script_config, logger)
        if not results:
            logger.error("Invalid script configuration. Exiting.")
            return
        library_names = script_config.get('library_names', [])
        source_dirs = script_config.get('source_dirs', [])
        instances = script_config.get('instances', None)
        ignore_media = script_config.get('ignore_media', [])

        # Log script settings for debugging purposes
        table = [
            ["Script Settings"]
        ]
        logger.debug(create_table(table))
        logger.debug(f'{"Log level:":<20}{log_level}')
        logger.debug(f'{"Dry_run:":<20}{dry_run}')
        logger.debug(f'{"Assets paths:":<20}{source_dirs}')
        logger.debug(f'{"Library names:":<20}{library_names}')
        logger.debug(f'{"Instances:":<20}{instances}')
        logger.debug(f'{"Ignore media:":<20}{ignore_media}')
        logger.debug(create_bar("-"))

        source_dirs = [source_dirs] if isinstance(source_dirs, str) else source_dirs 

        assets_list = []
        for path in source_dirs:
            results = categorize_files(path, logger)
            if results:
                assets_list.extend(results)
            else:
                logger.error(f"No assets found in {path}.")
        # Checking for assets and logging
        if assets_list:
            logger.debug(f"Assets:\n{json.dumps(assets_list, indent=4)}")
        else:
            logger.error("No assets found, Check source_dirs setting in your config. Exiting.")
            return

        # Fetch information from Plex and StARR
        media_dict = []
        if instances:
            for instance_type, instance_data in config.instances_config.items():
                for instance in instances:
                    if instance in instance_data:
                        if instance_type == "plex":
                            url = instance_data[instance]['url']
                            api = instance_data[instance]['api']
                            try:
                                app = PlexServer(url, api)
                            except Exception as e:
                                logger.error(f"Error connecting to Plex: {e}")
                                app = None
                            if library_names and app:
                                print("Getting Plex data...")
                                results = get_plex_data(app, library_names, logger, include_smart=True, collections_only=True)
                                media_dict.extend(results)
                            else:
                                logger.warning("No library names specified in config.yml. Skipping Plex.")
                        else:
                            url = instance_data[instance]['url']
                            api = instance_data[instance]['api']
                            app = StARR(url, api, logger)
                            server_name = app.get_instance_name()
                            if app:
                                print(f"Getting {instance_type.capitalize()} data...")
                                results = handle_starr_data(app, server_name, instance_type, logger, include_episode=False)
                                if results:
                                    if instance_type == "radarr":
                                        media_dict.extend(results)
                                    elif instance_type == "sonarr": 
                                        media_dict.extend(results)
                                else:
                                    logger.error(f"No {instance_type.capitalize()} data found.")
                                
        else:
            logger.error(f"No instances found. Exiting script...")
            return

        if not media_dict:
            logger.error("No media found, Check instances setting in your config. Exiting.")
            return
        else:
            logger.debug(f"Media:\n{json.dumps(media_dict, indent=4)}")

        # Match assets with media and log the results
        unmatched_dict = match_assets(assets_list, media_dict, ignore_media)
        if unmatched_dict:
            logger.debug(f"Unmatched:\n{json.dumps(unmatched_dict, indent=4)}")
            remove_data = remove_assets(unmatched_dict, source_dirs, logger)
            if remove_data:
                logger.debug(f"Remove Data:\n{json.dumps(remove_data, indent=4)}")
                print_output(remove_data, logger)
        else:
            logger.info(f"No assets removed.")

    except KeyboardInterrupt:
        print("Keyboard Interrupt detected. Exiting...")
        sys.exit()
    except Exception:
        logger.error(f"\n\nAn error occurred:\n", exc_info=True)
        logger.error(f"\n\n")
    finally:
        logger.info(create_bar(f"END {name}"))