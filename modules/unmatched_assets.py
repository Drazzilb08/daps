#   _    _                       _       _              _                         _       
#  | |  | |                     | |     | |            | |     /\                | |      
#  | |  | |_ __  _ __ ___   __ _| |_ ___| |__   ___  __| |    /  \   ___ ___  ___| |_ ___ 
#  | |  | | '_ \| '_ ` _ \ / _` | __/ __| '_ \ / _ \/ _` |   / /\ \ / __/ __|/ _ \ __/ __|
#  | |__| | | | | | | | | | (_| | || (__| | | |  __/ (_| |  / ____ \\__ \__ \  __/ |_\__ \
#   \____/|_| |_|_| |_| |_|\__,_|\__\___|_| |_|\___|\__,_| /_/    \_\___/___/\___|\__|___/
#                                                      ______                             
#                                                     |______|                            
# ===========================================================================================================
#  Author: Drazzilb
#  Usage: python3 unmatched_assets.py
#  Note: There is a limitation to how this script works with regards to it matching series assets the
#         main series poster requires seasonal posters to be present. If you have a series that does
#         not have a seasonal poster then it will not match the series poster. If you don't have a season poster
#         your series will appear in the movies section.
#  Requirements: requests
#  License: MIT License
# ===========================================================================================================

import json
import os
import sys
from util.utility import *
from util.arrpy import StARR
from util.logger import setup_logger
import copy

try:
    from plexapi.server import PlexServer
    from tqdm import tqdm
except ImportError as e:
    print(f"ImportError: {e}")
    print("Please install the required modules with 'pip install -r requirements.txt'")
    exit(1)

script_name = "unmatched_assets"

def match_data(media_dict, assets_dict, prefix_index, ignore_root_folders, logger):
    """
    Matches assets to media and returns a dictionary of unmatched assets.
    
    Args:
        assets_dict (dict): Dictionary of assets.
        media_dict (dict): Dictionary of media.
        ignore_root_folders (list): List of root folders to ignore.
        
    Returns:
        dict: Dictionary of unmatched assets.
    """

    
    # Initialize dictionary to store unmatched assets by media types
    unmatched_assets = {}
    skipped = []
    # Loop through different media types
    for media_type in ['movies', 'series', 'collections']:
        unmatched_assets[media_type] = {}
        # Check if the media type is present in both assets and media dictionaries
        if media_type in media_dict and media_type in assets_dict:
            # Iterate through each media data in the media dictionary of the current type
            for media_data in tqdm(media_dict[media_type], desc=f"Matching {media_type}", unit="media", total=len(media_dict[media_type]), leave=True, disable=None):
                # Initialize variable to store whether a match was found
                matched = False

                # Check if the media is released, ended, or continuing or not monitored
                if media_type in ['series', 'movies'] and not media_data['status'] in ['released', 'ended', 'continuing']:
                    skipped.append(f"{media_data['title']} ({media_data['year']})")
                    continue
                
                # Get location of media
                if media_type == "collections":
                    location = media_data['location']
                else:
                    location = media_data['root_folder']

                # Get root folder name
                root_folder = os.path.basename(location.rstrip('/')).lower()

                # Check if the root folder should be ignored
                if ignore_root_folders:
                    if root_folder in ignore_root_folders or location in ignore_root_folders:
                        continue

                # Check if location is in unmatched_assets
                if location not in unmatched_assets[media_type]:
                    unmatched_assets[media_type][location] = []
                
                # Get season numbers for series
                if media_type == 'series':
                    media_seasons_numbers = [season['season_number'] for season in media_data.get('seasons', []) if season['season_has_episodes']]

                search_matched_assets = search_matches(prefix_index, media_data['title'], media_type, logger)
                # Compare media data with each asset data for the same media type
                for asset_data in search_matched_assets:
                    asset_seasons_numbers = asset_data.get('season_numbers', None)
                    # Check if the asset matches the media
                    if is_match(asset_data, media_data, logger):
                        matched = True
                        if media_type == 'series':
                            if asset_seasons_numbers and media_seasons_numbers:
                                missing_seasons = []
                                for season in media_seasons_numbers:
                                    if season not in asset_seasons_numbers:
                                        missing_seasons.append(season)
                                if missing_seasons:
                                    unmatched_assets[media_type][location].append({
                                        'title': media_data['title'],
                                        'year': media_data['year'],
                                        'missing_seasons': missing_seasons,
                                        'season_numbers': media_seasons_numbers
                                    })
                if not matched:
                    if media_type == 'series':
                        unmatched_assets[media_type][location].append({
                            'title': media_data['title'],
                            'year': media_data['year'],
                            'season_numbers': media_seasons_numbers
                        })
                    else:
                        unmatched_assets[media_type][location].append({
                            'title': media_data['title'],
                            'year': media_data['year']
                        })
    return unmatched_assets, skipped

def print_output(unmatched_dict, media_dict, logger):
    """
    Prints the output of the script.
    
    Args:
        unmatched_dict (dict): Dictionary of unmatched assets.
        media_dict (dict): Dictionary of media.
        
    Returns:
        None
    """
    # Asset types to consider
    asset_types = ['movies', 'series', 'collections']
    # Loop through different asset types
    for asset_type in asset_types:
        data_set = unmatched_dict.get(asset_type, None)
        if data_set:
            table = [
                [f"Unmatched {asset_type.capitalize()}"]
            ]
            logger.info(create_table(table))
            for location, data in data_set.items():
                location = location.rstrip('/')
                location_base = os.path.basename(location)
                if data:
                    if asset_type == "collections":
                        suffix = " Library"
                    else:
                        suffix = ""
                    table = [
                        [f"{location_base.title()}{suffix}", len(data)]
                    ]
                    logger.info(create_table(table))
                    logger.info("")
                    for item in data:
                        if data.index(item) % 10 == 0:
                            logger.info(f"\t*** {location_base.title()}{suffix} {data.index(item)+1} - {min(data.index(item)+10, len(data))} ***")
                            logger.info("")
                        if asset_type == 'series':
                            missing_seasons = item.get('missing_seasons', False)
                            if missing_seasons:
                                logger.info(f"\t{item['title']} ({item['year']}) (Seasons listed below have missing posters)")
                                for season in item['missing_seasons']:
                                    logger.info(f"\t\tSeason: {season} <- Missing")
                            else:
                                logger.info(f"\t{item['title']} ({item['year']})")
                                for season in item['season_numbers']:
                                    logger.info(f"\t\tSeason: {season}")
                        else:
                            year = f" ({item['year']})" if item['year'] else ""
                            logger.info(f"\t{item['title']}{year}")
                        logger.info("")
            logger.info("")
    # Calculate statistics for movies, series, collections, and the overall unmatched assets
    unmatched_movies_total = sum(len(data) for data in unmatched_dict.get('movies', {}).values())
    total_movies = len(media_dict.get('movies', [])) if media_dict.get('movies') else 0
    percent_movies_complete = (total_movies - unmatched_movies_total) / total_movies * 100 if total_movies != 0 else 0

    unmatched_series_total = sum(len(data) for data in unmatched_dict.get('series', {}).values())
    total_series = len(media_dict.get('series', [])) if media_dict.get('series') else 0
    series_percent_complete = (total_series - unmatched_series_total) / total_series * 100 if total_series != 0 else 0

    unmatched_seasons_total = 0
    total_seasons = 0
    for location, data in unmatched_dict.get('series', {}).items():
        for item in data:
            if item.get('missing_season'):
                unmatched_seasons_total += len(item['missing_seasons']) if item['missing_seasons'] else 0
            elif item.get('season_numbers'):
                unmatched_seasons_total += len(item['season_numbers']) if item['season_numbers'] else 0
    for item in media_dict.get('series', []):
        seasons = item.get('seasons', None)
        if seasons:
            for season in seasons:
                if season['season_has_episodes']:
                    total_seasons += 1

    season_total_percent_complete = (total_seasons - unmatched_seasons_total) / total_seasons * 100 if total_seasons != 0 else 0

    unmatched_collections_total = sum(len(data) for data in unmatched_dict.get('collections', {}).values())
    total_collections = len(media_dict.get('collections', [])) if media_dict.get('collections') else 0
    collection_percent_complete = (total_collections - unmatched_collections_total) / total_collections * 100 if total_collections != 0 else 0

    grand_total = total_movies + total_series + total_seasons + total_collections
    grand_unmatched_total = unmatched_movies_total + unmatched_series_total + unmatched_seasons_total + unmatched_collections_total
    grand_percent_complete = (grand_total - grand_unmatched_total) / grand_total * 100 if grand_total != 0 else 0

    # Print statistics to the logger
    logger.info('')
    table = [
        ["Statistics"],
    ]
    logger.info(create_table(table))
    table = [
        ["Type", "Total", "Unmatched", "Percent Complete"]
    ]
    if unmatched_dict.get('movies', None) or media_dict.get('movies', None):
        table.append(["Movies", total_movies, unmatched_movies_total, f"{percent_movies_complete:.2f}%"])
    if unmatched_dict.get('series', None) or media_dict.get('series', None):
        table.append(["Series", total_series, unmatched_series_total, f"{series_percent_complete:.2f}%"])
        table.append(["Seasons", total_seasons, unmatched_seasons_total, f"{season_total_percent_complete:.2f}%"])
    if unmatched_dict.get('collections', None) or media_dict.get('collections', None):
        table.append(["Collections", total_collections, unmatched_collections_total, f"{collection_percent_complete:.2f}%"])
    table.append(["Grand Total", grand_total, grand_unmatched_total, f"{grand_percent_complete:.2f}%"])
    logger.info(create_table(table))

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
        logger.info(create_bar(f"STARTING {name}"))
        # Logging script settings
        
        # Retrieving script configuration
        script_config = config.script_config
        source_dirs = script_config.get('source_dirs', '')
        library_names = script_config.get('library_names', [])
        ignore_collections = script_config.get('ignore_collections', [])
        instances = script_config.get('instances', None)
        ignore_root_folders = script_config.get('ignore_root_folders', [])

        # Logging script settings
        table = [
            ["Script Settings"]
        ]
        logger.debug(create_table(table))
        logger.debug(f'{"Log level:":<20}{log_level}')
        logger.debug(f'{"Assets path:":<20}{source_dirs}')
        logger.debug(f'{"Library names:":<20}{library_names}')
        logger.debug(f'{"Ignore collections:":<20}{ignore_collections}')
        logger.debug(f'{"Instances:":<20}{instances}')
        logger.debug(create_bar("-"))

        prefix_index = create_new_empty_index()
        print("Gathering all the posters, please wait...")
        assets_dict, prefix_index = get_assets_files(source_dirs, logger)
        if not assets_dict:
            return
        logger.debug(f"Assets Dictionary:\n{json.dumps(assets_dict, indent=4)}")
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
                                # Remove ignored collections
                                if ignore_collections:
                                    for item in ignore_collections:
                                        for collection in results[:]:
                                            if collection['title'] == item:
                                                results.remove(collection)
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

        if not any(media_dict.values()):
            logger.error("No media found, Check instances setting in your config. Exiting.")
            return
        else:
            # Create duplicate dictionary and remove season key from each item for logging
            media_dict_copy = copy.deepcopy(media_dict)
            for media_type, media_list in media_dict_copy.items():
                for media in media_list:
                    if 'seasons' in media:
                        del media['seasons']
            logger.debug(f"Media Dictionary:\n{json.dumps(media_dict_copy, indent=4)}")

        # Matching assets and printing output
        unmatched_dict, skipped = match_data(media_dict, assets_dict, prefix_index, ignore_root_folders, logger)
        if skipped:
            logger.debug("The following media was skipped due to it not being released, ended, or continuing:")
            for item in skipped:
                logger.debug(f"\t{item}")
        if any(unmatched_dict.values()):
            logger.debug(f"Unmatched Dict:\n{json.dumps(unmatched_dict, indent=4)}")
            print_output(unmatched_dict, media_dict, logger)
        else:
            logger.info("All assets matched.")

    except KeyboardInterrupt:
        print("Exiting due to keyboard interrupt.")
        sys.exit()
    except Exception:
        logger.error(f"\n\nAn error occurred:\n", exc_info=True)
        logger.error(f"\n\n")
        return
    finally:
        logger.info(create_bar(f"ENDING {name}"))
