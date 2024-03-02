#               _    _ _                    
#              | |  | | |                   
#   _ __   ___ | |__| | |       _ __  _   _ 
#  | '_ \ / _ \|  __  | |      | '_ \| | | |
#  | | | | (_) | |  | | |____ _| |_) | |_| |
#  |_| |_|\___/|_|  |_|______(_) .__/ \__, |
#                              | |     __/ |
#                              |_|    |___/ 
# ===================================================================================================
# Author: Drazzilb
# Description: This script will find all files that are not hardlinked and will process them in radarr
#              and sonarr. This is useful for finding files that are not hardlinked and wish to have 100%
#              hardlinks seeding.
# Usage: python3 nohl.py
# Requirements: Python 3.8+, requests
# License: MIT License
# ===================================================================================================

import os
import re
import sys
import json

from util.arrpy import StARR
from util.discord import discord, discord_check
from util.utility import *
from util.logger import setup_logger

try:
    from tqdm import tqdm
except ImportError as e:
    print(f"ImportError: {e}")
    print("Please install the required modules with 'pip install -r requirements.txt'")
    exit(1)

script_name = "nohl"

# Regular expressions for file parsing
season_regex = r"Season (\d{1,2})"
episode_regex = r"(?:E|e)(\d{1,2})"
title_regex = r".*\/([^/]+)\s\((\d{4})\).*"
year_regex = re.compile(r"\s?\((\d{4})\).*")

def find_no_hl_files(path, logger):
    """
    Finds all files that are not hardlinked in a given path.
    
    Args:
        path (str): Path to search for files.
        
    Returns:
        dict: Dictionary of files that are not hardlinked.
    """
    path_basename = os.path.basename(path.rstrip('/'))
    nohl_data = {'movies':[], 'series':[]}  # Initialize an empty list to store non-hardlinked file information
    # Iterating through items in the specified path
    for item in tqdm([i for i in os.listdir(path) if os.path.isdir(os.path.join(path, i))], desc=f"Searching '{path_basename}'", unit="item", total=len(os.listdir(path)), disable=None, leave=True):
        if item.startswith('.'):  # Skip hidden files or directories
            continue
        
        # Extracting title and year information using regex
        title = re.sub(year_regex, '', item)
        try:
            year = int(year_regex.search(item).group(1))
        except AttributeError as e:
            year = 0
        # Creating an asset dictionary to store file information
        asset_list = {
            'title': title,
            'year': year,
            'normalized_title': normalize_titles(title),
            'root_path': path,
            'path': os.path.join(path, item)
        }
        
        if os.path.isdir(os.path.join(path, item)) and any(os.path.isdir(os.path.join(path, item, sub_folder)) for sub_folder in os.listdir(os.path.join(path, item))):
            # If the item is a directory and contains sub folders
            sub_folders = [sub_folder for sub_folder in os.listdir(os.path.join(path, item)) if os.path.isdir(os.path.join(path, item, sub_folder)) and not sub_folder.startswith('.')]
            sub_folders.sort()
            asset_list['season_info'] = []  # Initialize list to store season information
            
            # Processing sub folders
            for sub_folder in sub_folders:
                sub_folder_files = [file for file in os.listdir(os.path.join(path, item, sub_folder)) if os.path.isfile(os.path.join(path, item, sub_folder, file)) and not file.startswith('.')]
                season = re.search(season_regex, sub_folder)
                try:
                    season_number = int(season.group(1))
                except AttributeError as e:
                    season_number = 0
                sub_folder_files.sort()
                nohl_files = []
                
                # Finding non-hardlinked files within sub folders
                for file in sub_folder_files:
                    file_path = os.path.join(path, item, sub_folder, file)
                    if (os.path.isfile(file_path) and os.stat(file_path).st_nlink == 1):
                        nohl_files.append(file_path)
                # Extracting episode numbers
                episodes = []
                for file in nohl_files:
                    try:
                        episode_match = re.search(episode_regex, file)
                        if episode_match is not None:
                            episode = int(episode_match.group(1))
                            episodes.append(episode)
                    except AttributeError as e:
                        logger.error(f"{e}")
                        logger.error(f"Error processing file: {file}.")
                        continue

                # Storing season information with non-hardlinked files
                season_list = {
                    'season_number': season_number,
                    'episodes': episodes,
                    'nohl': nohl_files
                }
                
                if nohl_files:
                    asset_list['season_info'].append(season_list)
            if asset_list['season_info'] and any(season['nohl'] for season in asset_list['season_info']):
                nohl_data['series'].append(asset_list)
        else:
            # For individual files within directories
            files = [file for file in os.listdir(os.path.join(path, item)) if os.path.isfile(os.path.join(path, item, file)) and not file.startswith('.')]
            files.sort()
            nohl_files = []
            
            # Finding non-hardlinked files within individual files
            for file in files:
                file_path = os.path.join(path, item, file)
                if (os.path.isfile(file_path) and os.stat(file_path).st_nlink == 1):
                    nohl_files.append(file_path)
            
            # Storing non-hardlinked files
            asset_list['nohl'] = nohl_files
            if nohl_files:
                nohl_data['movies'].append(asset_list)
        
    return nohl_data  # Return the list of dictionaries representing non-hardlinked files

def handle_searches(app, search_list, instance_type):
    """
    Handles searching for files in Radarr or Sonarr.

    Args:
        app (StARR): StARR object for Radarr/Sonarr.
        search_list (dict): Dictionary of files to search for.
        instance_type (str): Type of instance, either 'radarr' or 'sonarr'.
    """
    print("Searching for files... this may take a while.")
    searched_for = []  # Initialize a list to store media items that have been searched for
    searches = 0  # Initialize the number of searches performed
    for item in tqdm(search_list, desc="Searching...", unit="item", total=len(search_list), disable=None, leave=True):
        if instance_type == 'radarr':
            # For Radarr instance, handle search for movie files
            app.delete_movie_file(item['file_ids'])  # Delete specified movie files
            results = app.refresh_items(item['media_id'])  # Refresh the media item
            ready = app.wait_for_command(results['id'])  # Wait for the refresh command to complete
            if ready:
                app.search_media(item['media_id'])  # Initiate search for the media item
                searched_for.append(item)
                searches += 1  # Increment the count of searches performed
        elif instance_type == 'sonarr':
            # For Sonarr instance, handle search for episodes or season packs
            seasons = item.get('seasons', [])
            if seasons:
                for season in seasons:
                    season_pack = season['season_pack']
                    file_ids = list(set([episode['episode_file_id'] for episode in season['episode_data']]))
                    episode_ids = [episode['episode_id'] for episode in season['episode_data']]
                    if season_pack:
                        # Delete season files if it's a season pack
                        app.delete_episode_files(file_ids)
                        results = app.refresh_items(item['media_id'])
                        ready = app.wait_for_command(results['id'])
                        if ready:
                            app.search_season(item['media_id'], season['season_number'])
                            searched_for.append(item)
                    else:
                        # Delete episode files if individual episodes
                        app.delete_episode_files(file_ids)
                        results = app.refresh_items(item['media_id'])
                        ready = app.wait_for_command(results['id'])
                        if ready:
                            app.search_episodes(episode_ids)
                            searched_for.append(item)
    print(f"Searches performed: {searches}")
    return searched_for

def filter_media(app, media_list, nohl_data, instance_type, exclude_profiles, exclude_media, max_search):
    """
    Filters media based on quality profile and monitored status.
    
    Args:
        app (StARR): StARR object for Radarr/Sonarr.
        media_list (dict): Dictionary of media items.
        nohl_list (dict): Dictionary of files that are not hardlinked.
        instance_type (str): Type of instance, either 'radarr' or 'sonarr'.
        exclude_profiles (list): List of quality profiles to exclude.
        exclude_media (list): List of media titles to exclude.
        
    Returns:
        dict: Dictionary of filtered media and media to search for.
    """
    quality_profiles = app.get_quality_profile_names()
    exclude_profile_ids = []
    
    # Get IDs for quality profiles to be excluded
    if exclude_profiles:
        for profile in exclude_profiles:
            for profile_name, profile_id in quality_profiles.items():
                if profile_name == profile:
                    exclude_profile_ids.append(profile_id)
    
    data_list = {'search_media': [], 'filtered_media': []}  # Initialize dictionary to store filtered media and media to search
    
    # Iterate through nohl_list (dictionary of non-hardlinked files)
    for nohl_item in tqdm(nohl_data, desc="Filtering media...", unit="item", total=len(nohl_data), disable=None, leave=True):
        # Iterate through media items in media_list
        for media_item in media_list:
            # Compare media items with non-hardlinked items
            if media_item['normalized_title'] == nohl_item['normalized_title'] and media_item['year'] == nohl_item['year']:
                # Check if the media item is not monitored
                if media_item['monitored'] == False or media_item['title'] in exclude_media or media_item['quality_profile'] in exclude_profile_ids:
                    data_list['filtered_media'].append({
                        'title': media_item['title'], 
                        'year': media_item['year'],
                        'monitored': media_item['monitored'],
                        'exclude_media': media_item['title'] in exclude_media,
                        'quality_profile': quality_profiles.get(media_item['quality_profile']) if media_item['quality_profile'] in exclude_profile_ids else None
                    })
                    continue
                # Handle search for media files based on instance type (Radarr/Sonarr)
                if instance_type == 'radarr':
                    file_ids = media_item['file_id']
                    data_list['search_media'].append({
                        'media_id': media_item['media_id'],
                        'title': media_item['title'], 
                        'year': media_item['year'],
                        'file_ids': file_ids
                    })
                elif instance_type == 'sonarr':
                        # Retrieve information about seasons of the media item from Sonarr
                        media_seasons_info = media_item.get('seasons', {})
                        
                        # Retrieve information about non-hardlinked files specifically related to seasons
                        file_season_info = nohl_item.get('season_info', [])
                        
                        # Lists to store data about episodes or season packs
                        season_data = []
                        filtered_seasons = []
                        
                        # Iterate through each season of the media item
                        for media_season in media_seasons_info:
                            for file_season in file_season_info:
                                # Match the season number between media and non-hardlinked files
                                if media_season['season_number'] == file_season['season_number']:
                                    # Check if the season is unmonitored
                                    if media_season['monitored'] == False:
                                        # Append unmonitored season to filtered_seasons list
                                        filtered_seasons.append({
                                            'season_number': media_season['season_number'],
                                            'monitored': media_season['monitored'],
                                        })
                                    else:
                                        # Check if it's a season pack
                                        if media_season['season_pack'] == True:
                                            # Append season pack information (including episode data) to season_data list
                                            season_data.append({
                                                'season_number': media_season['season_number'],
                                                'season_pack': media_season['season_pack'],
                                                'episode_data': media_season['episode_data']
                                            })
                                        else:
                                            # Lists to store episodes with hardlink issues and monitored episodes
                                            filtered_episodes = []
                                            episode_data = []
                                            
                                            # Check each episode in the season
                                            for episode in media_season['episode_data']:
                                                # Check if the episode is unmonitored
                                                if episode['monitored'] == False:
                                                    # Append unmonitored episode to filtered_episodes list
                                                    filtered_episodes.append(episode)
                                                else:
                                                    # Check if the episode is not hardlinked
                                                    if episode['episode_number'] in file_season['episodes']:
                                                        # Append episode data to episode_data list
                                                        episode_data.append(episode)
                                            
                                            # Append unmonitored episodes within the season to filtered_seasons
                                            if filtered_episodes:
                                                filtered_seasons.append({
                                                    'season_number': media_season['season_number'],
                                                    'monitored': media_season['monitored'],
                                                    'episodes': filtered_episodes
                                                })
                                            
                                            # Append monitored episodes with hardlink issues to season_data
                                            if episode_data:  
                                                season_data.append({
                                                    'season_number': media_season['season_number'],
                                                    'season_pack': media_season['season_pack'],
                                                    'episode_data': episode_data
                                                })

                        # If there are unmonitored seasons or season packs, add to filtered_media
                        if filtered_seasons:
                            data_list['filtered_media'].append({
                                'title': media_item['title'], 
                                'year': media_item['year'],
                                'seasons': filtered_seasons
                            })
                        
                        # If there are monitored episodes or season packs with hardlink issues, add to search_media
                        if season_data:
                            data_list['search_media'].append({
                                'media_id': media_item['media_id'],
                                'title': media_item['title'], 
                                'year': media_item['year'],
                                'monitored': media_item['monitored'],
                                'seasons': season_data
                            })
    # Limit the number of searches to the maximum allowed
    if len(data_list['search_media']) > max_search:
        data_list['search_media'] = data_list['search_media'][:max_search]
    # Return the dictionary containing filtered media and media to search for in Sonarr
    return data_list

def handle_messages(output_dict, logger):
    """
    Handle CLI output for nohl.py
    
    Args:
        output_dict (dict): Dictionary of output data.
        
    Returns:
        None
    """
    table = [
        ["Results"],
    ]
    logger.info(create_table(table))
    # Iterate through each instance in the output_dict
    for instance, instance_data in output_dict.items():
        
        # Retrieve search and filtered media information
        search_media = instance_data['data']['search_media']
        filtered_media = instance_data['data']['filtered_media']

        # Display searched media information
        if search_media:
            for search_item in search_media:
                # For Radarr instances, display deleted and searched files
                if instance_data['instance_type'] == 'radarr':
                    logger.info(f"{search_item['title']} ({search_item['year']})")
                    logger.info(f"\tDeleted and searched.\n")
                else:  # For Sonarr instances, display files that were searched
                    logger.info(f"{search_item['title']} ({search_item['year']})")
                    if search_item.get('seasons', None):
                        for season in search_item['seasons']:
                            if season['season_pack']:
                                logger.info(f"\tSeason {season['season_number']}, deleted and searched.")
                            else:
                                logger.info(f"\tSeason {season['season_number']}")
                                for episode in season['episode_data']:
                                    logger.info(f"\t   Episode {episode['episode_number']}, deleted and searched.")
                            logger.info("")
        # Display filtered media information
        table = [
            ["Filtered Media"],
        ]
        if filtered_media:
            logger.debug(create_table(table))
            for filtered_item in filtered_media:
                monitored = filtered_item.get('monitored', None)
                logger.debug(f"{filtered_item['title']} ({filtered_item['year']})")
                if monitored == False:
                    logger.debug(f"\tSkipping, not monitored.")
                elif filtered_item.get('exclude_media', None):
                    logger.debug(f"\tSkipping, excluded.")
                elif filtered_item.get('quality_profile', None):
                    logger.debug(f"\tSkipping, quality profile: {filtered_item['quality_profile']}")
                elif filtered_item.get('seasons', None):
                    for season in filtered_item['seasons']:
                        if season['monitored'] == False:
                            logger.debug(f"\tSeason {season['season_number']}, skipping, not monitored.")
                        elif season.get('episodes', None):
                            logger.debug(f"\tSeason {season['season_number']}")
                            for episode in season['episodes']:
                                logger.debug(f"\t   Episode {episode['episode_number']}, skipping, not monitored.")
                            logger.debug("")
        else:
            logger.debug(f"No files to filter for {instance_data['server_name']}")
        logger.debug("")


def notification(final_output, logger, log_level):
    """
    Sends a discord notification with the results of the script.
    
    Args:
        final_output (dict): Dictionary of output data.
        
    Returns:
        None
    """
    # Initialize variables for message building
    fields = []
    built_fields = {}
    count = 0
    message_count = 0

    # Loop through each instance in the final output
    previous_instance = None
    for instance, instance_data in final_output.items():
        server_name = instance_data['server_name']
        data = instance_data['data']
        search_media = data.get('search_media', [])
        filtered_media = data.get('filtered_media', [])


        # Build fields for search media
        if search_media:
            # Initialize variables for message building
            if previous_instance != instance:
                name = f"❌ {server_name}: Search Media"
            else:
                name = None
            discord_messages = []
            current_field = ""
            for search_item in search_media:
                sub_messages = []
                # Construct messages for Radarr or Sonarr
                if instance_data['instance_type'] == 'radarr':
                    sub_messages.append(f"{search_item['title']} ({search_item['year']})\n")
                elif instance_data['instance_type'] == 'sonarr':
                    # Construct messages for Sonarr including season and episode data
                    sub_messages.append(f"{search_item['title']} ({search_item['year']})")
                    if search_item.get('seasons', None):
                        # Iterate through seasons and episodes
                        for season in search_item['seasons']:
                            if season['season_pack']:
                                sub_messages.append(f"\tSeason {season['season_number']}")
                            else:
                                sub_messages.append(f"\tSeason {season['season_number']}")
                                for episode in season['episode_data']:
                                    sub_messages.append(f"\t\tEpisode {episode['episode_number']}")
                            sub_messages.append("")
                discord_messages.append("\n".join(sub_messages))

            # Split asset-specific messages into multiple fields if their total length exceeds Discord's field limit
            if discord_messages:
                current_field = ""
                for message in discord_messages:
                    # Check if adding the message exceeds the character limit
                    if len(current_field) + len(message) <= 1000:
                        current_field += message + "\n"
                    else:
                        # Add the current field to the fields list
                        fields.append({ 
                            "name": name if name else "",
                            "value": f"```{current_field}```"
                        })
                        # Start a new field with the current message
                        name = ""
                        current_field = message + "\n"
                # Add the last field to the fields list
                fields.append({ 
                    "name": name if name else "",
                    "value": f"```{current_field}```"
                })
            
            # Add the fields to the built_fields dictionary
            num_fields = len(fields)
            num_messages_per_field = 25
            num_keys = num_fields // num_messages_per_field
            if num_fields % num_messages_per_field != 0:
                num_keys += 1

            for i in range(num_keys):
                start_index = i * num_messages_per_field
                end_index = min(start_index + num_messages_per_field, num_fields)
                built_fields[i + 1] = fields[start_index:end_index]

        if log_level == "debug" and filtered_media:
            filter_message = []
            for filtered_item in filtered_media:
                # Construct messages for filtered media
                filter_message.append(f"{filtered_item['title']} ({filtered_item['year']})")
                monitored = filtered_item.get('monitored', None)
                if monitored == False:
                    filter_message.append(f"\tSkipping, not monitored.")
                # Handle other filtering criteria (exclusion, quality profile, etc.)
                # Append season and episode information where available
                elif filtered_item.get('exclude_media', None):
                    # Handle other filtering criteria (exclusion, quality profile, etc.)
                    filter_message.append(f"\tSkipping, excluded.")
                elif filtered_item.get('quality_profile', None):
                    filter_message.append(f"\tSkipping, quality profile: {filtered_item['quality_profile']}")
                elif filtered_item.get('seasons', None):
                    for season in filtered_item['seasons']:
                        if season['monitored'] == False:
                            filter_message.append(f"\tSeason {season['season_number']}, skipping, not monitored.")
                        elif season.get('episodes', None):
                            filter_message.append(f"\tSeason {season['season_number']}")
                            for episode in season['episodes']:
                                filter_message.append(f"\t\tEpisode {episode['episode_number']}, skipping, not monitored.")
                            filter_message.append("")
            filter_message = "\n".join(filter_message)
            fields.append({
                    "name": f"{server_name}: Filtered Media",
                    "value": f"```{filter_message}```",
                    "inline": False
                })

        # Handle cases where there are no files to search or filter
        if not search_media:
            fields.append({
                    "name": f"✅ {server_name} all files are hardlinked!",
                    "value": f"",
                    "inline": False
                })

        # Check character count for message splitting
        count += 1
        # Split messages if character count exceeds a certain limit
        if count >= 25:
            count = 0
            message_count += 1
            built_fields[message_count] = fields
            fields = []
        previous_instance = instance
    
    # Create message blocks for Discord
    if fields:
        message_count += 1
        built_fields[message_count] = fields

    # Send messages to Discord
    for message_number, fields in built_fields.items():
        print(f"Sending message {message_number} of {message_count}...")
        if dry_run:
            description = "__**Dry Run**__\nAll items deleted and searched for"
        else:
            description = "All items deleted and searched for"

        discord(fields, logger, script_name, description=description, color=0x00ff00, content=None)


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
        # Check if a dry run is enabled
        if dry_run:
            # Display a notification for a dry run
            table = [
                ["Dry Run"],
                ["NO CHANGES WILL BE MADE"]
            ]
            logger.info(create_table(table))
        
        # Fetch configurations from the script's config file
        script_config = config.script_config
        max_search = script_config.get('maximum_searches', None)
        instances = script_config.get('instances', None)
        filters = script_config.get('filters', None)
        paths = script_config.get('paths', None)
        print_files = script_config.get('print_files', False)
        script_config.get("print_files", False)
        valid = validate(config, script_config, logger)

        # Check if instances are properly configured
        if instances is None:
            logger.error("No instances set in config file.")
            return

        # Display script configurations in the logs
        table = [
            ["Script Configuration"],
        ]
        logger.debug(create_table(table))
        logger.debug(f'{"Dry_run:":<20}{dry_run}')
        logger.debug(f'{"Log level:":<20}{log_level}')
        logger.debug(f'{"Maximum Searches:":<30}{max_search}')
        logger.debug(f'{f"Instances:":<30}\n{json.dumps(instances, indent=4)}')
        logger.debug(f'{"Filters:":<30}\n{json.dumps(filters, indent=4)}')
        logger.debug(f'{"Paths:":<30}\n{json.dumps(paths, indent=4)}')
        logger.debug(f'{"Print Files:":<30}{print_files}')
        logger.debug(f'{"Exclude Profiles:":<30}\n{json.dumps(filters.get("exclude_profiles", []), indent=4)}')
        logger.debug(f'{"Exclude Movies:":<30}\n{json.dumps(filters.get("exclude_movies", []), indent=4)}')
        logger.debug(f'{"Exclude Series:":<30}\n{json.dumps(filters.get("exclude_series", []), indent=4)}')
        logger.debug(create_bar("-"))

        # Display the summary of non-hardlinked files in each directory
        output_dict = {}
        # Process provided paths to find non-hardlinked files
        nohl_list = {'movies': [], 'series': []}
        if paths:
            for path in paths:
                results = find_no_hl_files(path, logger)
                if results:
                    nohl_list['movies'].extend(results['movies'])
                    nohl_list['series'].extend(results['series'])

        # Display non-hardlinked files in the logs
        logger.debug(f"Non-Hardlinked Files:\n{json.dumps(nohl_list, indent=4)}")
        
        # Generate a summary of the number of non-hardlinked files in each directory
        total = 0
        table = [
            ["Directory", "Number of Files"],
        ]
        counter = {}
        results_table = [
            ["Non-Hardlinked Files"],
        ]
        logger.info(create_table(results_table))
        for media_type, results in nohl_list.items():
            if results:
                old_root_path = ""
                for item in results:
                    root_path = os.path.basename(os.path.normpath(item['root_path']))
                    if media_type == 'movies':
                        counter[root_path] = counter.get(root_path, 0) + len(item['nohl'])
                        total += len(item['nohl'])
                    elif media_type == 'series':
                        for season in item['season_info']:
                            counter[root_path] = counter.get(root_path, 0) + len(season['nohl'])
                            total += len(season['nohl'])
                    if print_files:
                        if old_root_path != root_path:
                            logger.info(f"Root Path: {root_path}")
                        logger.info(f"\t{item['title']} ({item['year']})")
                        if media_type == 'movies':
                            for file in item['nohl']:
                                file_name = os.path.basename(file)
                                logger.info(f"\t\t{file_name}")
                        else:
                            for season in item['season_info']:
                                for file in season['nohl']:
                                    file_name = os.path.basename(file)
                                    logger.info(f"\t\t{file_name}")
                        logger.info("")
                    old_root_path = root_path
        for key, value in counter.items():
            table.append([key, value])
        if total:
            table.append(["Total", total])
            logger.info(create_table(table))
            logger.info("")
        # Iterate through instances and handle the connections and data retrieval
        for instance_type, instance_data in config.instances_config.items():
            for instance in instances:
                if instance in instance_data:
                    data_list = {'search_media': [], 'filtered_media': []}
                    instance_settings = instance_data.get(instance, None)
                    app = StARR(instance_settings['url'], instance_settings['api'], logger)
                    server_name = app.get_instance_name()
                    exclude_profiles = filters.get('exclude_profiles', [])
                    table = [
                        [f"{server_name}"],
                    ]
                    logger.info(create_table(table))
                    if instance_type == "radarr" and not nohl_list['movies'] or instance_type == "sonarr" and not nohl_list['series']:
                        logger.info(f"No non-hardlinked files found for server: {server_name}")
                    exclude_media = filters.get('exclude_movies', []) if instance_type == 'radarr' else filters.get('exclude_series', [])
                    nohl_data = nohl_list['movies'] if instance_type == "radarr" else nohl_list['series'] if instance_type == "sonarr" else None
                    if nohl_data:
                        media_list = handle_starr_data(app, server_name, instance_type)
                        data_list = filter_media(app, media_list, nohl_data, instance_type, exclude_profiles, exclude_media, max_search)
                        if data_list:
                            logger.debug(f"Data Media:\n{json.dumps(data_list, indent=4)}")
                        search_list = data_list.get('search_media', [])
                        if search_list:
                            # Conduct searches if not a dry run
                            if not dry_run:
                                search_list = handle_searches(app, search_list, instance_type)
                                data_list['search_media'] = search_list
                        # Prepare output data
                    output_dict[instance] = {
                        'server_name': server_name,
                        'instance_type': instance_type,
                        'data': data_list
                    }
        logger.debug(f"Output Data:\n{json.dumps(output_dict, indent=4)}")
        # Display command-line output about processed files and excluded media
        handle_messages(output_dict, logger)
        
        # Send a Discord notification containing the output data
        if discord_check(script_name):
            notification(output_dict, logger, log_level)
    except KeyboardInterrupt:
        print("Keyboard Interrupt detected. Exiting...")
        sys.exit()
    except Exception:
        logger.error(f"\n\nAn error occurred:\n", exc_info=True)
        logger.error(f"\n\n")
    finally:
        logger.info(create_bar(f" ENDING {name} "))