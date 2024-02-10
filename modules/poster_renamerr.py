#   _____          _            _____                                           
#  |  __ \        | |          |  __ \                                          
#  | |__) |__  ___| |_ ___ _ __| |__) |___ _ __   __ _ _ __ ___   ___ _ __ _ __ 
#  |  ___/ _ \/ __| __/ _ \ '__|  _  // _ \ '_ \ / _` | '_ ` _ \ / _ \ '__| '__|
#  | |  | (_) \__ \ ||  __/ |  | | \ \  __/ | | | (_| | | | | | |  __/ |  | |   
#  |_|   \___/|___/\__\___|_|  |_|  \_\___|_| |_|\__,_|_| |_| |_|\___|_|  |_|   
#                         ______                                                
#                        |______|                                               
# ===================================================================================================
# Author: Drazzilb
# Description: This script will rename your posters to match Plex-Meta-Manager's naming scheme from TPDB's naming.
# Usage: python3 poster_renamerr.py 
# Requirements: requests, tqdm, pyyaml
# License: MIT License
# ===================================================================================================

import os
import sys
import re
import json
import filecmp
import shutil
import time

from util.logger import setup_logger
from util.utility import *
from util.discord import discord, discord_check
from util.config import Config
from util.arrpy import StARR

try:
    from plexapi.server import PlexServer
    from tqdm import tqdm
except ImportError as e:
    print(f"ImportError: {e}")
    print("Please install the required modules with 'pip install -r requirements.txt'")
    exit(1)

script_name = "poster_renamerr"
config = Config(script_name)
log_level = config.log_level
dry_run = config.dry_run
logger = setup_logger(log_level, script_name)

year_regex = re.compile(r"\s?\((\d{4})\).*")

def get_assets_files(source_dir, source_overrides):
    """
    Returns a dictionary of assets files

    Args:
        source_dir (str): Path to source directory
        source_overrides (list): List of paths to source override directories
    
    Returns:
        dict: Dictionary of assets files
    """

    source_assets = {} 

    # Fetches asset files from the primary source directory
    if not os.path.exists(source_dir):
        logger.error(f"Source directory not found: {source_dir}")
    else:
        source_assets = categorize_files(source_dir, asset_folders=False)
    # Handles source overrides if provided
    if source_overrides:
        source_overrides = [source_overrides] if isinstance(source_overrides, str) else source_overrides
        # Process each override directory
        for source_override in source_overrides:
            if not os.path.exists(source_override):
                logger.error(f"Source override directory not found: {source_override}. Skipping...")
                continue
            # Retrieves asset files from the override directory
            override_dict = categorize_files(source_override, asset_folders=False)
            # Consolidate the value of each key into one unified list
            override_assets = [asset for value in override_dict.values() for asset in value]
            # Handles overrides between primary source and the override
            handle_overrides(source_assets, override_assets)
    
    if source_assets:
        # Sort the contents of each key by title
        for key, value in source_assets.items():
            source_assets[key] = sorted(value, key=lambda k: k['title'])

    return source_assets

def handle_overrides(source_assets, override_assets):
    """
    Handles overrides between source and override assets
    
    Args:
        source_assets (dict): Dictionary of source assets
        override_assets (dict): Dictionary of override assets
    
    Returns:
        None
    """

    # List of asset types to consider for overrides
    asset_types = ['collections', 'movies', 'series']

    # Iterates through each asset type
    for asset_type in asset_types:
        # Iterates through each asset in the source assets
        for source_asset in source_assets[asset_type]:
            # Iterates through each asset in the override assets
            for override_asset in override_assets:
                # Checks if the title and year of the source and override asset match
                if (
                    source_asset['normalized_title'] == override_asset['normalized_title']
                    and source_asset['year'] == override_asset['year']
                ):
                    # Compares and handles the files between source and override assets
                    for override_file in override_asset['files']:
                        override_basename, extension = os.path.splitext(os.path.basename(override_file))
                        normalized_override_basename = normalize_file_names(override_basename)
                        for source_file in source_asset['files']:
                            source_basename, extension = os.path.splitext(os.path.basename(source_file))
                            normalized_source_basename = normalize_file_names(source_basename)
                            # Replaces source file with override file if the filenames match
                            if source_basename == override_basename or normalized_source_basename == normalized_override_basename:
                                source_asset['files'].remove(source_file)
                                source_asset['files'].append(override_file)
                                break
                        # Adds override file to source asset matching based upon normalized filenames
                        else:
                            source_asset['files'].append(override_file)
                    # Combines the season_numbers key no duplicates
                    if asset_type == "series":
                        source_asset_season_numbers = source_asset.get('season_numbers', [])
                        override_asset_season_numbers = override_asset.get('season_numbers', [])
                        for season_number in override_asset_season_numbers:
                            if season_number not in source_asset_season_numbers:
                                source_asset_season_numbers.append(season_number)
                        source_asset['season_numbers'] = source_asset_season_numbers
                        # Sort the season_numbers key
                        source_asset['season_numbers'].sort()
                    # Removes the override asset from the override assets
                    override_assets.remove(override_asset)
                    break
        # Adds any remaining override assets to the source assets
        if override_assets:
            for override_asset in override_assets:
                normalized_title = normalize_file_names(override_asset['title'])
                if not override_asset['year'] and override_asset['title']:
                    if not any(asset['normalized_title'] == normalized_title for asset in source_assets['collections']):
                        source_assets['collections'].append(override_asset)
                elif override_asset['year'] and 'season_numbers' not in override_asset:
                    if not any(asset['normalized_title'] == normalized_title and asset['year'] == override_asset['year'] for asset in source_assets['movies']):
                        source_assets['movies'].append(override_asset)
                elif 'season_numbers' in override_asset and override_asset['season_numbers']:
                    if not any(asset['normalized_title'] == normalized_title and asset['year'] == override_asset['year'] for asset in source_assets['series']):
                        source_assets['series'].append(override_asset)

def match_data(media_dict, asset_files):
    """
    Matches media data to asset files
    
    Args:
        media_dict (dict): Dictionary of media data
        asset_files (dict): Dictionary of asset files
        
    Returns:
        dict: Dictionary of matched and unmatched media data
    """

    # Initialize dictionaries for matched and unmatched media data
    combined_dict = {
        'matched': {'collections': [], 'movies': [], 'series': []},
        'unmatched': {'collections': [], 'movies': [], 'series': []}
    }

    # List of asset types to consider
    asset_types = [type for type in media_dict if media_dict[type] is not None]

    # Iterate through each asset type
    with tqdm(total=len(asset_types), desc=f"Matching assets...", unit="asset types", leave=True) as pbar_outer:
        for asset_type in asset_types:
            if asset_type in media_dict:  # Check if the asset type exists in media dictionary
                unmatched_dict = []  # Initialize unmatched dictionary for current asset type
                matched_dict = []  # Initialize matched dictionary for current asset type
                asset_data = asset_files[asset_type]  # Get asset data for current asset type
                media_data = media_dict[asset_type]  # Get media data for current asset type
                # Iterate through each media entry of the current asset type
                with tqdm(total=len(media_data), desc=f"Matching {asset_type}", unit="media", leave=True, disable=None) as pbar_inner:
                    for media in media_data:
                        matched = False  # Flag to indicate if media has been matched to an asset
                        if asset_type == 'series':
                            media_seasons_numbers = [season['season_number'] for season in media.get('seasons', [])]
                        # Iterate through each asset entry of the current asset type
                        for asset in asset_data:
                            # Extracting various properties of assets and media for comparison
                            no_prefix = asset.get('no_prefix', None)
                            no_suffix = asset.get('no_suffix', None)
                            no_prefix_normalized = asset.get('no_prefix_normalized', None)
                            no_suffix_normalized = asset.get('no_suffix_normalized', None)
                            alternate_titles = media.get('alternate_titles', [])
                            normalized_alternate_titles = media.get('normalized_alternate_titles', [])
                            secondary_year = media.get('secondary_year', None)
                            original_title = media.get('original_title', None)

                            # Matching criteria for media and asset
                            if (
                                asset['title'] == media['title'] or
                                asset['normalized_title'] == media['normalized_title'] or
                                asset['title'] in alternate_titles or
                                asset['normalized_title'] in normalized_alternate_titles or
                                asset['title'] == original_title or
                                (no_prefix and media['title'] in no_prefix) or
                                (no_suffix and media['title'] in no_suffix) or
                                (no_prefix_normalized and media['normalized_title'] in no_prefix_normalized) or
                                (no_suffix_normalized and media['normalized_title'] in no_suffix_normalized)
                            ) and (
                                asset['year'] == media['year'] or
                                asset['year'] == secondary_year
                            ):
                                matched = True  # Set flag to indicate a match
                                asset_season_numbers = asset.get('season_numbers', None)
                                if asset_type == "series":
                                    # Iterate through each file in the asset
                                    files_to_remove = []
                                    seasons_to_remove = []
                                    for file in asset['files']:
                                        # Check for season-related file naming
                                        if re.search(r' - Season| - Specials', file):
                                            if re.search(r"Season (\d+)", file):
                                                season_number = int(re.search(r"Season (\d+)", file).group(1))
                                            elif "Specials" in file:
                                                season_number = 0
                                            if season_number not in media_seasons_numbers:
                                                files_to_remove.append(file)
                                                continue
                                    for file in files_to_remove:
                                        asset['files'].remove(file)
                                    for season in asset_season_numbers:
                                        if season not in media_seasons_numbers:
                                            seasons_to_remove.append(season)
                                    for season in seasons_to_remove:
                                        asset_season_numbers.remove(season)
                                            
                                # Store matched data in the matched dictionary
                                matched_dict.append({
                                    'title': media['title'],
                                    'year': media['year'],
                                    'folder': media['folder'],
                                    'files': asset['files'],
                                    'seasons_numbers': asset_season_numbers,
                                })
                                break  # Break loop after finding a match

                        if not matched:
                            # If no match is found, add to unmatched dictionary
                            unmatched_dict.append({
                                'title': media['title'],
                                'year': media['year'],
                                'folder': media['folder'],
                            })

                        # Update combined matched and unmatched dictionaries
                        combined_dict['matched'][asset_type] = matched_dict
                        combined_dict['unmatched'][asset_type] = unmatched_dict

                        pbar_inner.update(1)  # Update progress bar for media matching
                pbar_outer.update(1)  # Update progress bar for asset types
    return combined_dict  # Return the combined dictionary of matched and unmatched media data

def process_file(file, new_file_path, action_type):
    """
    Processes a file based on the action type
    
    Args:
        file (str): Path to file
        new_file_path (str): Path to new file
        action_type (str): Action type to perform on the file
        
    Returns:
        None
    """
    
    try:
        # Check the action type and perform the appropriate operation
        if action_type == "copy":
            shutil.copy(file, new_file_path)  # Copy the file to the new location
        elif action_type == "move":
            shutil.move(file, new_file_path)  # Move the file to the new location
        elif action_type == "hardlink":
            os.link(file, new_file_path)  # Create a hard link to the new location
        elif action_type == "symlink":
            os.symlink(file, new_file_path)  # Create a symbolic link to the new location
    except OSError as e:
        # Handle errors if any operation fails
        logger.error(f"Error {action_type}ing file: {e}")  # Log the error message

    

def rename_files(matched_assets, script_config):
    """
    Renames files based on the matched assets and script config
    
    Args:
        matched_assets (dict): Dictionary of matched assets
        script_config (dict): Dictionary of script config
        
    Returns:
        dict: Dictionary of output messages
    """
    
    output = {}
    
    # Retrieve configuration settings from the script_config
    asset_folders = script_config.get('asset_folders', False)
    border_replacerr = script_config.get('border_replacerr', False)
    action_type = script_config.get('action_type', False)
    print_only_renames = script_config.get('print_only_renames', False)
    destination_dir = script_config.get('destination_dir', False)
    
    # Handle border_replacerr settings
    if border_replacerr:
        tmp_dir = os.path.join(destination_dir, 'tmp')
        if not dry_run:
            if not os.path.exists(tmp_dir):
                os.makedirs(tmp_dir)
            else:
                logger.debug(f"{tmp_dir} already exists")
            destination_dir = tmp_dir
        else:
            logger.debug(f"Would create folder {tmp_dir}")
            destination_dir = tmp_dir
    else:
        destination_dir = script_config.get('destination_dir', False)
    
    asset_types = ['collections', 'movies', 'series']
    
    # Iterate through each asset type
    for asset_type in asset_types:
        output[asset_type] = []
        # If assets to rename
        if matched_assets[asset_type]:
            for item in tqdm(matched_assets[asset_type], desc=f"Renaming {asset_type} posters", unit="assets", leave=True, disable=None, total=len(matched_assets[asset_type])):
                messages = []
                discord_messages = []
                files = item['files']
                folder = item['folder']

                # Remove any OS illegal characters from the file name
                if asset_type == "collections":
                    folder = re.sub(r'[<>:"/\\|?*]', '', folder.replace('/', ''))
                
                # Handle asset_folders configuration
                if asset_folders:
                    dest_dir = os.path.join(destination_dir, folder)
                    if not os.path.exists(dest_dir):
                        if not dry_run:
                            os.makedirs(dest_dir)
                else:
                    dest_dir = destination_dir
                
                # Iterate through each file in the asset
                for file in files:
                    file_name = os.path.basename(file)
                    file_extension = os.path.splitext(file)[1]
                    
                    # Check for season-related file naming
                    if re.search(r' - Season| - Specials', file_name):
                        season_number = (re.search(r"Season (\d+)", file_name).group(1) if "Season" in file_name else "00").zfill(2)
                        if asset_folders:
                            new_file_name = f"Season{season_number}{file_extension}"
                        else:
                            new_file_name = f"{folder}_Season{season_number}{file_extension}"
                        new_file_path = os.path.join(dest_dir, new_file_name)
                    else:
                        if asset_folders:
                            new_file_name = f"poster{file_extension}"
                        else:
                            new_file_name = f"{folder}{file_extension}"
                        new_file_path = os.path.join(dest_dir, new_file_name)
                    
                    # Check if the new file path already exists
                    if os.path.isfile(new_file_path):
                        existing_file = os.path.join(dest_dir, new_file_name)
                        # Check if the existing file is the same as the new file True = same, False = different
                        if not filecmp.cmp(file, existing_file):
                            if file_name != new_file_name:
                                messages.append(f"{file_name} -renamed-> {new_file_name}")
                                discord_messages.append(f"{new_file_name}")
                            else:
                                if not print_only_renames:
                                    messages.append(f"{file_name} -not-renamed-> {new_file_name}")
                                    discord_messages.append(f"{new_file_name}")
                            if not dry_run:
                                process_file(file, new_file_path, action_type)
                    else:
                        if file_name != new_file_name:
                            messages.append(f"{file_name} -renamed-> {new_file_name}")
                            discord_messages.append(f"{new_file_name}")
                        else:
                            if not print_only_renames:
                                messages.append(f"{file_name} -not-renamed-> {new_file_name}")
                                discord_messages.append(f"{new_file_name}")
                        if not dry_run:
                            process_file(file, new_file_path, action_type)
                
                # Append the messages to the output
                output[asset_type].append({
                    'title': item['title'],
                    'year': item['year'],
                    'folder': item['folder'],
                    'messages': messages,
                    'discord_messages': discord_messages,
                })
        else:
            print(f"No {asset_type} to rename")
    return output

def handle_output(output, asset_folders):
    """
    Handles the output messages
    
    Args:
        output (dict): Dictionary of output messages
    
    Returns:
        None
    """
    # Iterate through each asset type in the output
    for asset_type, assets in output.items():
        if assets:
            # Create a table and log the asset type
            table = [
                [f"{asset_type.capitalize()}"],
            ]
            if any(asset['messages'] for asset in assets):
                logger.info(create_table(table))
            # Iterate through each asset within the asset type
            for asset in assets:
                title = asset['title']
                title = year_regex.sub("", title).strip()
                year = asset['year']
                folder = asset['folder']
                messages = asset['messages']
                if year:
                    year = f" ({year})"
                else:
                    year = ""
                messages.sort()  # Sorting the messages alphabetically for consistency
                # Log the asset title and year, along with its messages
                if messages:
                    logger.info(f"{title}{year}")
                    if asset_folders:
                        if dry_run:
                            logger.info(f"\tWould create folder '{folder}'")
                        else:
                            logger.info(f"\tCreated folder '{folder}'")
                    if asset_type == "series":
                        for message in messages:
                            logger.info(f"\t{message}")
                    else:
                        for message in messages:
                            logger.info(f"\t{message}")
                    logger.info("")
        else:
            # If no assets are present for the asset type, log the message
            logger.info(f"No {asset_type} to rename")


def notification(output):
    """
    Sends a notification to Discord
    
    Args:
        output (dict): Dictionary of output messages
        
    Returns:
        None
    """
    
    discord_dict = {}  # Dictionary to organize messages to be sent to Discord
    fields = []  # List to hold individual message fields
    # Loop through the output dictionary containing messages for different asset types
    for asset_type, assets in output.items():
        if assets:
            discord_messages = []  # List to hold individual messages for each asset
            current_field = ""  # String to store messages within the field character limit
            
            # Prepare messages for each asset within the asset type
            for asset in assets:
                asset_messages = []  # List to hold individual lines for each asset's message
                title = asset['title']
                title = year_regex.sub("", title).strip()
                year = asset['year']
                if year:
                    year = f" ({year})"
                else:
                    year = ""
                messages = asset['discord_messages']  # Extracting specific messages for Discord display
                # Sort messages
                messages.sort()  # Sorting the messages alphabetically for consistency
                if messages:
                    asset_messages.append(f"{title}{year}")  # Adding the title and year as the first line of the message
                    if asset_type == "series":
                        for message in messages:
                            asset_messages.append(f"\t{message}")
                    else:
                        for message in messages:
                            asset_messages.append(f"\t{message}")
                    if asset_messages:
                        asset_messages.append("")  # Adding an empty line between assets
                    discord_messages.append("\n".join(asset_messages))  # Joining lines into an asset-specific message
                else:
                    continue
        
            
            # Split asset-specific messages into multiple fields if their total length exceeds Discord's field limit
            for message in discord_messages:
                if len(current_field) + len(message) + len("\t\n") <= 1000:
                    current_field += message + "\n"  # Adding the message to the current field
                else:
                    fields.append({  # Creating a field containing a set of messages
                        "name": asset_type.capitalize(),  # Capitalizing the asset type for field name
                        "value": f"```{current_field}```"  # Adding the current field's messages in code block format
                    })
                    current_field = message + "\n"  # Starting a new field with the current message
                    asset_type = ""  # Resetting asset_type for the next field within the same asset_type
            
            # Add the remaining messages as a new field
            if current_field:
                fields.append({  # Creating a field containing the remaining messages
                    "name": asset_type.capitalize(),
                    "value": f"```{current_field}```"
                })
                if len(fields) <= 25:  # Checking if the total number of fields is within the Discord limit
                    discord_dict[1] = fields  # Storing fields in the discord_dict under key 1
                else:
                    # Splitting fields into multiple keys if there are more than 25 fields
                    num_fields = len(fields)
                    num_messages_per_field = 25
                    num_keys = num_fields // num_messages_per_field
                    if num_fields % num_messages_per_field != 0:
                        num_keys += 1

                    for i in range(num_keys):
                        start_index = i * num_messages_per_field
                        end_index = min(start_index + num_messages_per_field, num_fields)
                        discord_dict[i + 1] = fields[start_index:end_index]  # Splitting fields into separate keys
        else:
            continue

    # Check if the total character count of the messages in the current dict exceeds 6000 characters
    new_dict = {}
    new_fields = []
    new_field_count = 0
    new_character_count = 0

    # Iterate through the original 'discord_dict' to check character count and split messages if they exceed 5000 characters
    for key, value in discord_dict.items():
        total_character_count = sum(len(field['value']) for field in value)
        if total_character_count > 5000:
            for field in value:
                field_character_count = len(field['value'])
                # Check and split fields that exceed 5000 characters
                if new_character_count + field_character_count + len("\n") + len("\t") <= 5000:
                    new_fields.append(field)
                    new_character_count += field_character_count
                else:
                    new_dict[new_field_count + 1] = new_fields
                    new_fields = [field]
                    new_field_count += 1
                    new_character_count = field_character_count

            if new_fields:
                new_dict[new_field_count + 1] = new_fields
        else:
            new_dict[key] = value

    discord_dict = new_dict  # Update discord_dict with the restructured message data

    # Calculate the total character count for each key in the updated 'discord_dict'
    total_character_count_per_key = {}
    for key, value in discord_dict.items():
        total_character_count_per_key[key] = sum(len(field['value']) for field in value)

    # Send messages to Discord by iterating through each key-value pair in the updated 'discord_dict'
    for key, value in discord_dict.items():
        print(f"Sending message {key} of {len(discord_dict)}")  # Display message sending status
        # Actual function to send messages to Discord (which is currently represented by a 'print' statement)
        discord(fields=value, logger=logger, script_name=script_name, description=f"{'__**Dry Run**__' if dry_run else ''}", color=0x00ff00, content=None)
        # Pauses for 5 seconds each 5th message
        if key % 5 == 0:
            print("Pausing for 5 seconds to let Discord catch up...")
            time.sleep(5)

def main():
    """
    Main function.
    """
    name = script_name.replace("_", " ").upper()
    try:
        logger.info(create_bar(f"START {name}"))
        # Display script settings
        table = [["Script Settings"]]
        logger.debug(create_table(table))
        script_config = config.script_config
        valid = validate(config, script_config, logger)
        # Extract script configuration settings
        asset_folders = script_config.get('asset_folders', False)
        library_names = script_config.get('library_names', False)
        source_dir = script_config.get('source_dir', False)
        source_overrides = script_config.get('source_overrides', False)
        destination_dir = script_config.get('destination_dir', False)
        action_type = script_config.get('action_type', False)
        print_only_renames = script_config.get('print_only_renames', False)
        border_replacerr = script_config.get('border_replacerr', False)
        instances = script_config.get('instances', [])
        sync_posters = script_config.get('sync_posters', False)

        logger.debug(create_bar("-"))  # Log separator
        # Log script configuration settings
        logger.debug(f'{"Dry_run:":<20}{dry_run}')
        logger.debug(f'{"Log level:":<20}{log_level}')
        logger.debug(f'{"Asset folders:":<20}{asset_folders}')
        logger.debug(f'{"Library names:":<20}{library_names}')
        logger.debug(f'{"Source dir:":<20}{source_dir}')
        logger.debug(f'{"Source overrides:":<20}{source_overrides}')
        logger.debug(f'{"Destination dir:":<20}{destination_dir}')
        logger.debug(f'{"Action type:":<20}{action_type}')
        logger.debug(f'{"Print only renames:":<20}{print_only_renames}')
        logger.debug(f'{"Border replacerr:":<20}{border_replacerr}')
        logger.debug(f'{"Instances:":<20}{instances}')
        logger.debug(f'{"Sync posters:":<20}{sync_posters}')

        if not os.path.exists(destination_dir):
            logger.info(f"Creating destination directory: {destination_dir}")
            os.makedirs(destination_dir)
        else:
            logger.debug(f"Destination directory already exists: {destination_dir}")
        
        # Log other settings...
        logger.debug(create_bar("-"))  # Log separator

        if dry_run:
            # Log dry run message
            table = [
                ["Dry Run"],
                ["NO CHANGES WILL BE MADE"]
            ]
            logger.info(create_table(table))

        # Sync posters if enabled
        if sync_posters:
            # Run sync_posters.py or log intent to run
            logger.info(f"Running sync_gdrive")
            from modules.sync_gdrive import main
            main()

        assets_dict = {}
        # Retrieve asset files
        print("Gathering all the posters, please wait...")
        assets_dict = get_assets_files(source_dir, source_overrides)

        # Log retrieved asset files or exit if not found
        if any(assets_dict.values()):
            logger.debug(f"Asset files:\n{json.dumps(assets_dict, indent=4)}")
        else:
            logger.error("No asset files found. Exiting.")
            return
        media_dict = {}  # Initialize dictionary for media data
        # Loop through instances for media retrieval
        for instance_type, instances_data in config.instances_config.items():
            # Retrieve media data for each instance
            for instance in instances:
                if instance in instances_data:
                    if instance_type == "plex":
                        media_type = "collections"
                        if library_names:
                            print("Connecting to Plex...")
                            app = PlexServer(instances_data[instance]['url'], instances_data[instance]['api'])
                            results = get_plex_data(app, library_names, logger, include_smart=True, collections_only=True)
                    else:
                        if instance_type == "radarr":
                            media_type = 'movies'
                        elif instance_type == "sonarr":
                            media_type = 'series'
                        app = StARR(instances_data[instance]['url'], instances_data[instance]['api'], logger)
                        results = handle_starr_data(app, instance_type)
                    if results:
                        if media_type in media_dict:
                            media_dict[media_type].extend(results)
                        else:
                            media_dict[media_type] = results
        # Log media data
        logger.debug(f"media_dict:\n{json.dumps(media_dict, indent=4)}")

        if media_dict and assets_dict:
            # Match media data to asset files
            combined_dict = match_data(media_dict, assets_dict)
            logger.debug(f"Matched and Unmatched media:\n{json.dumps(combined_dict, indent=4)}")
            matched_assets = combined_dict.get('matched', None)
            output = rename_files(matched_assets, script_config)
        if any(asset['messages'] for asset in output['collections']) or any(asset['messages'] for asset in output['movies']) or any(asset['messages'] for asset in output['series']):
            # Log output and handle notifications
            logger.debug(f"Output:\n{json.dumps(output, indent=4)}")
            handle_output(output, asset_folders)
            if discord_check(script_name):
                notification(output)
        else:
            # Log message if no output is found
            logger.info("No new posters to rename.")
        if border_replacerr:
            # Run border_replacerr.py or log intent to run
            logger.info(f"Running border_replacerr.py")
            tmp_dir = os.path.join(destination_dir, 'tmp')
            from modules.border_replacerr import process_files
            process_files(tmp_dir, destination_dir, asset_folders, dry_run)
    except KeyboardInterrupt:
        print("Keyboard Interrupt detected. Exiting...")
        sys.exit()
    except Exception:
        logger.error(f"\n\nAn error occurred:\n", exc_info=True)
        logger.error(f"\n\n")
    finally:
        logger.info(create_bar(f"END {name}"))

if __name__ == "__main__":
    main()
    
