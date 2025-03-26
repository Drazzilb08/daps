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
import copy

from util.utility import *
from util.discord import discord, discord_check
from util.arrpy import StARR
from util.logger import setup_logger

try:
    from plexapi.server import PlexServer
    from tqdm import tqdm
    from pathvalidate import sanitize_filename, is_valid_filename
except ImportError as e:
    print(f"ImportError: {e}")
    print("Please install the required modules with 'pip install -r requirements.txt'")
    exit(1)

script_name = "poster_renamerr"

year_regex = re.compile(r"\s?\((\d{4})\).*")

def get_assets_files(source_dirs, logger, debug_items=None):
    """
    Get assets files from source directories

    Args:
        source_dir (list): Path to source directory
    Returns:
        list: List of dictionaries containing assets files
    """

    # Convert source_dirs to list if it's a string
    source_dirs = [source_dirs] if isinstance(source_dirs, str) else source_dirs

    # Initialize final_assets list
    final_assets = []
    prefix_index = create_new_empty_index()
    prefix_index['posters'] = {}
    # Iterate through each source directory
    for source_dir in source_dirs:
        new_assets = categorize_files(source_dir, logger)
        if new_assets:
            # Merge new_assets with final_assets
            for new in new_assets:
                found_match = False
                debug_assets = debug_items and len(debug_items) > 0 and (debug_item in new['normalized_title'] for debug_item in debug_items)
                if debug_assets:
                    logger.info(f"found new asset: {new}")
                search_matched_assets = search_matches(prefix_index, new['normalized_title'], 'posters', logger)
                for final in search_matched_assets:
                    if debug_assets:
                        logger.info(f"comparing to final asset {final}")
                    if final['normalized_title'] == new['normalized_title'] and final['year'] == new['year']:
                        if debug_assets:
                            logger.info('found a match')
                            logger.info(final)
                        found_match = True
                        # Compare normalized file names between final and new assets
                        for new_file in new['files']:
                            normalized_new_file = normalize_file_names(os.path.basename(new_file))
                            for final_file in final['files']:
                                normalized_final_file = normalize_file_names(os.path.basename(final_file))
                                # Replace final file with new file if the filenames match
                                if normalized_final_file == normalized_new_file:
                                    if debug_assets:
                                        logger.info('swapping file')
                                        logger.info(f"replacing {final_file}")
                                        logger.info(f"with {new_file}")
                                        logger.info(f"files before: {final['files']}")
                                    final['files'].remove(final_file)
                                    final['files'].append(new_file)
                                    break
                            else:
                                # Add new file to final asset if the filenames don't match
                                if debug_assets:
                                    logger.info("files did not match")
                                    logger.info(normalized_final_file)
                                    logger.info(normalized_new_file)
                                    logger.info(f"adding to files: {new_file}")
                                final['files'].append(new_file)
                        # Merge season_numbers from new asset to final asset
                        new_season_numbers = new.get('season_numbers', None)
                        if new_season_numbers:
                            final_season_numbers = final.get('season_numbers', None)
                            if final_season_numbers:
                                final['season_numbers'] = list(set(final_season_numbers + new_season_numbers))
                            else:
                                final['season_numbers'] = new_season_numbers
                        break
                if not found_match:
                    if debug_assets:
                        logger.info("didn't find a match, appending")
                        logger.info(new)
                    final_assets.append(new)
                    build_search_index(prefix_index, new['normalized_title'], new, 'posters', logger)

        else:
            logger.error(f"No assets found in {source_dir}")

    return final_assets

def handle_series_match(asset, media_seasons_numbers, asset_season_numbers):
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

def match_data(media_dict, asset_files, prefix_index, logger=None, debug_items=None):
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
    total_comparisons = 0;
    total_items = 0;
    matches =0;
    non_matches=0;
    # Iterate through each asset type
    with tqdm(total=len(asset_types), desc=f"Matching assets...", unit="asset types", leave=True) as pbar_outer:
        for asset_type in asset_types:
            if asset_type in media_dict:
                unmatched_dict = []
                matched_dict = []
                media_data = media_dict[asset_type]
                # Iterate through each media entry of the current asset type
                with tqdm(total=len(media_data), desc=f"Matching {asset_type}", leave=True, disable=None) as pbar_inner:
                    for media in media_data:
                        search_match = None;
                        total_items+=1
                        matched = False
                        # search here to identify matches
                        debug_search = debug_items and len(debug_items) > 0 and media['normalized_title'] in debug_items
                        search_matched_assets = search_matches(prefix_index, media['normalized_title'], asset_type, logger, debug_search=debug_search)
                        logger.debug(f"SEARCH ({asset_type}): matched assets for {media['title']} ({media['normalized_title']}) type={asset_type}")

                        logger.debug(search_matched_assets)
                        ## now to loop over each matched asset to determine if it's a match
                        media_seasons_numbers = None
                        if 'seasons' in media and media['seasons']:
                            media_seasons_numbers = [season['season_number'] for season in media.get('seasons', [])]
                            logger.debug(f"Season Numbers: {media_seasons_numbers}")

                        for search_asset in search_matched_assets:
                            total_comparisons+=1
                            if is_match(search_asset,media):
                                # either the both should be None or they should both be _something_
                                asset_season_numbers = search_asset.get('season_numbers', None)
                                if ((asset_season_numbers is None and media_seasons_numbers is None) or (asset_season_numbers and media_seasons_numbers)):
                                    matched=True
                                    if asset_season_numbers and media_seasons_numbers:
                                        handle_series_match(search_asset, media_seasons_numbers, asset_season_numbers)
                                    else:
                                        logger.debug(f"no season numbers found on asset {search_asset}")
                                        logger.debug(f"for media {media}")
                                    search_match = search_asset
                                    break
                                else:
                                    logger.debug(f"asset type '{asset_type}' found a match for a different asset type, but we are skipping")
                                    logger.debug(search_asset)
                                    logger.debug(media)

                        if not matched:
                            # need to do more searches now based on alt titles
                            for alt_title in media.get('alternate_titles', []):
                                search_matched_assets = search_matches(prefix_index, alt_title, asset_type, logger, debug_search=debug_search)
                                logger.debug(f"SEARCH ({asset_type}): matched assets for {alt_title} type={asset_type} - Alternate search")
                                logger.debug(search_matched_assets)
                                for search_asset in search_matched_assets:
                                    total_comparisons+=1
                                    if is_match_alternate(search_asset,media):
                                        # either the both should be None or they should both be _something_
                                        asset_season_numbers = search_asset.get('season_numbers', None)
                                        if ((asset_season_numbers is None and media_seasons_numbers is None) or (asset_season_numbers and media_seasons_numbers)):
                                            matched=True
                                            if asset_season_numbers and media_seasons_numbers:
                                                handle_series_match(search_asset, media_seasons_numbers, asset_season_numbers)
                                            search_match = search_asset
                                            break
                                        else:
                                            logger.debug(f"asset type '{asset_type}' found a ALT match for a different asset type, but we are skipping")
                                            logger.debug(search_asset)
                                            logger.debug(media)

                                if matched:
                                    break

                        if matched:
                            matches +=1
                            matched_dict.append({ # this is the structure where matches go... I think we'd need more info here to help border_replacer?... maybe just add a ref to the entire media as well?
                                'title': media['title'],
                                'year': media['year'],
                                'folder': media['folder'],
                                'files': search_match['files'],
                                'seasons_numbers': asset_season_numbers,
                                'asset_ref': search_match,
                                'asset_type': asset_type,
                            })

                        if not matched:
                            non_matches += 1
                            # If no match is found, add to unmatched dictionary
                            unmatched_dict.append({
                                'title': media['title'],
                                'year': media['year'],
                                'folder': media['folder'],
                            })

                        # Update combined matched and unmatched dictionaries
                        combined_dict['matched'][asset_type] = matched_dict
                        combined_dict['unmatched'][asset_type] = unmatched_dict

                        pbar_inner.update(1)
                logger.info(str(pbar_inner))
            pbar_outer.update(1)

    logger.info(str(pbar_outer))
    logger.info(f"{total_items} total_items")
    logger.info(f"{total_comparisons} total_comparisons")
    logger.info(f"{matches} total_matches")
    logger.info(f"{non_matches} non_matches")
    return combined_dict

def process_file(file, new_file_path, action_type, logger):
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



def rename_files(matched_assets, script_config, logger):
    """
    Renames files based on the matched assets and script config

    Args:
        matched_assets (dict): Dictionary of matched assets
        script_config (dict): Dictionary of script config

    Returns:
        dict: Dictionary of output messages
    """

    output = {}
    renamed_assets = {
        'movies': [],
        'series': [],
        'collections': []
    }

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
            progress_bar = tqdm(matched_assets[asset_type], desc=f"Renaming {asset_type} posters", unit="assets", leave=True, disable=None, total=len(matched_assets[asset_type]))
            for item in progress_bar:
                messages = []
                discord_messages = []
                files = item['files']
                folder = item['folder']

                # Remove any OS illegal characters from the file name
                if asset_type == "collections":
                    if not is_valid_filename(folder):
                        folder = sanitize_filename(folder)

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
                        try:
                            season_number = (re.search(r"Season (\d+)", file_name).group(1) if "Season" in file_name else "00").zfill(2)
                        except AttributeError:
                            logger.debug(f"Error extracting season number from {file_name}")
                            continue
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
                    if os.path.lexists(new_file_path):
                        existing_file = os.path.join(dest_dir, new_file_name)
                        try:
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
                                    if action_type in ["hardlink", "symlink"]:
                                        os.remove(new_file_path)

                                    process_file(file, new_file_path, action_type, logger) # any place that has process_file we need to track
                                    renamed_item = copy.deepcopy(item)
                                    renamed_item['files'] = [new_file_path]
                                    renamed_item['path'] = os.path.join(destination_dir, folder)
                                    renamed_assets[asset_type].append(renamed_item) # append here, but need to change file and folder attrs... which means copy (I think)
                        except FileNotFoundError:
                            # Handle the case where existing_file is a broken symlink
                            if not dry_run:
                                os.remove(new_file_path)
                                process_file(file, new_file_path, action_type, logger)
                                renamed_item = copy.deepcopy(item)
                                renamed_item['files'] = [new_file_path]
                                renamed_item['path'] = os.path.join(destination_dir, folder)
                                renamed_assets[asset_type].append(renamed_item) # append here, but need to change file and folder attrs... which means copy (I think)
                    else:
                        if file_name != new_file_name:
                            messages.append(f"{file_name} -renamed-> {new_file_name}")
                            discord_messages.append(f"{new_file_name}")
                        else:
                            if not print_only_renames:
                                messages.append(f"{file_name} -not-renamed-> {new_file_name}")
                                discord_messages.append(f"{new_file_name}")
                        if not dry_run:
                            process_file(file, new_file_path, action_type, logger)
                            renamed_item = copy.deepcopy(item)
                            renamed_item['files'] = [new_file_path]
                            renamed_item['path'] = os.path.join(destination_dir, folder)
                            renamed_assets[asset_type].append(renamed_item) # append here, but need to change file and folder attrs... which means copy (I think)

                # Append the messages to the output
                if messages or discord_messages:
                    output[asset_type].append({
                        'title': item['title'],
                        'year': item['year'],
                        'folder': item['folder'],
                        'messages': messages,
                        'discord_messages': discord_messages,
                    })
            logger.info(str(progress_bar))
        else:
            print(f"No {asset_type} to rename")

    logger.debug(f"RENAMED_ASSETS: {renamed_assets}")
    return output, renamed_assets

def handle_output(output, asset_folders, logger):
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


def notification(output, logger):
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

def main(config):
    """
    Main function.
    """
    global dry_run

    dry_run = config.dry_run
    log_level = config.log_level
    logger = setup_logger(log_level, script_name)

    script_config = config.script_config
    config_dir_path = os.path.dirname(config.config_path)
    name = script_name.replace("_", " ").upper()
    logger.info(f"Running {name}")
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
        source_dirs = script_config.get('source_dirs', False)
        source_overrides = script_config.get('source_overrides', False)
        destination_dir = script_config.get('destination_dir', False)
        action_type = script_config.get('action_type', False)
        print_only_renames = script_config.get('print_only_renames', False)
        border_replacerr = script_config.get('border_replacerr', False)
        instances = script_config.get('instances', [])
        sync_posters = script_config.get('sync_posters', False)
        incremental_border_replacerr = script_config.get('incremental_border_replacerr', False)
        search_index_debug_normalized_items = script_config.get('search_index_debug_normalized_items', [])

        logger.debug(create_bar("-"))  # Log separator
        # Log script configuration settings
        logger.debug(f'{"Dry_run:":<20}{dry_run}')
        logger.debug(f'{"Log level:":<20}{log_level}')
        logger.debug(f'{"Asset folders:":<20}{asset_folders}')
        logger.debug(f'{"Library names:":<20}{library_names}')
        logger.debug(f'{"Source dirs:":<20}\n{json.dumps(source_dirs, indent=4)}')
        logger.debug(f'{"Source overrides:":<20}{source_overrides}')
        logger.debug(f'{"Destination dir:":<20}{destination_dir}')
        logger.debug(f'{"Action type:":<20}{action_type}')
        logger.debug(f'{"Print only renames:":<20}{print_only_renames}')
        logger.debug(f'{"Border replacerr:":<20}{border_replacerr}')
        logger.debug(f'{"Instances:":<20}{instances}')
        logger.debug(f'{"Sync posters:":<20}{sync_posters}')
        logger.debug(f'{"Incremental border replacerr:":<20}{incremental_border_replacerr}')
        logger.debug(f'{"Search index debug items:":<20}{search_index_debug_normalized_items}')

        if not os.path.exists(destination_dir):
            logger.info(f"Creating destination directory: {destination_dir}")
            os.makedirs(destination_dir)
        else:
            logger.debug(f"Destination directory already exists: {destination_dir}")
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
            from modules.sync_gdrive import main as gdrive_main
            from util.config import Config
            gdrive_config = Config("sync_gdrive")
            gdrive_main(gdrive_config, logger)
            logger.info(f"Finished running sync_gdrive")
        else:
            logger.debug(f"Sync posters is disabled. Skipping...")

        logger.info("SPUD_UPDATED_CODE: 3/14/25 4pm")
        print("Gathering all the posters, please wait...")
        assets_list = get_assets_files(source_dirs, logger, debug_items=search_index_debug_normalized_items)

        prefix_index = create_new_empty_index()
        if assets_list:
            assets_dict = sort_assets(assets_list, logger, debug_items=search_index_debug_normalized_items, prefix_index=prefix_index)
            logger.debug(f"Asset files:\n{json.dumps(assets_dict, indent=4)}")
        else:
            logger.error("No assets found. Exiting...")
            return

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
                            try:
                                app = PlexServer(url, api)
                            except Exception as e:
                                logger.error(f"Error connecting to Plex: {e}")
                                app = None
                            if library_names and app:
                                print("Getting Plex data...")
                                results = get_plex_data(app, library_names, logger, include_smart=True, collections_only=True)
                                media_dict['collections'].extend(results)
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
                                        media_dict['movies'].extend(results)
                                    elif instance_type == "sonarr":
                                        media_dict['series'].extend(results)
                                else:
                                    logger.error(f"No {instance_type.capitalize()} data found.")

        else:
            logger.error(f"No instances found. Exiting script...")
            return

        # Log media data
        if not any(media_dict.values()):
            logger.error("No media found, Check instances setting in your config. Exiting.")
            return
        else:
            logger.debug(f"Media:\n{json.dumps(media_dict, indent=4)}")
        renamed_assets = None
        if media_dict and assets_dict:
            # Match media data to asset files
            print(f"Matching media to assets, please wait...")
            combined_dict = match_data(media_dict, assets_dict, prefix_index, logger, debug_items=search_index_debug_normalized_items)
            logger.debug(f"Matched and Unmatched media:\n{json.dumps(combined_dict, indent=4)}")
            matched_assets = combined_dict.get('matched', None)
            if any(matched_assets.values()):
                output, renamed_assets = rename_files(matched_assets, script_config, logger)
                if any(output.values()):
                    logger.debug(f"Output:\n{json.dumps(output, indent=4)}")
                    handle_output(output, asset_folders, logger)
                    if discord_check(script_name):
                        notification(output, logger)
                else:
                    logger.info(f"No new posters to rename.")
            else:
                logger.info(f"No assets matched to media.")

        if border_replacerr:
            # Run border_replacerr.py or log intent to run
            logger.info(f"Running border_replacerr.py")
            tmp_dir = os.path.join(destination_dir, 'tmp')
            from modules.border_replacerr import process_files
            from util.config import Config
            replacerr_config = Config("border_replacerr")
            replacerr_script_config = replacerr_config.script_config
            process_files(tmp_dir, destination_dir, dry_run, log_level, replacerr_script_config, logger, renamed_assets=(renamed_assets if incremental_border_replacerr else None)) # pass in renamed_assets here
            logger.info(f"Finished running border_replacerr.py")
        else:
            logger.debug(f"Border replacerr is disabled. Skipping...")
    except KeyboardInterrupt:
        print("Keyboard Interrupt detected. Exiting...")
        sys.exit()
    except Exception:
        logger.error(f"\n\nAn error occurred:\n", exc_info=True)
        logger.error(f"\n\n")
    finally:
        logger.info(create_bar(f"END {name}"))

