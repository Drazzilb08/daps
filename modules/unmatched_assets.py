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
#  Description: This script will check your media folders against your assets folder to see if there
#                are any folders that do not have a matching asset. It will also check your collections
#                against your assets folder to see if there are any collections that do not have a
#                matching asset. It will output the results to a file in the logs folder.
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
from util.utility import *
from util.logger import setup_logger
from util.config import Config
from util.arrpy import StARR

try:
    from plexapi.server import PlexServer
    from tqdm import tqdm
except ImportError as e:
    print(f"ImportError: {e}")
    print("Please install the required modules with 'pip install -r requirements.txt'")
    exit(1)

script_name = "unmatched_assets"
config = Config(script_name)
log_level = config.log_level
logger = setup_logger(log_level, script_name)

year_regex = re.compile(r"(.*)\s\((\d{4})\)")

def match_assets(assets_dict, media_dict, ignore_root_folders):
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
    # Loop through different media types
    for media_type in ['movies', 'series', 'collections']:
        unmatched_assets[media_type] = {}
        # Check if the media type is present in both assets and media dictionaries
        if media_type in media_dict and media_type in assets_dict:
            # Iterate through each media data in the media dictionary of the current type
            for media_data in tqdm(media_dict[media_type], desc=f"Matching {media_type}", unit="media", total=len(media_dict[media_type]), leave=True, disable=None):
                # Check if the media is released, ended, or continuing
                if media_type in ['series', 'movies'] and not media_data['status'] in ['released', 'ended', 'continuing']:
                        continue
                if media_type == "collections":
                    location = media_data['location']
                else:
                    location = media_data['root_folder']
                root_folder = os.path.basename(location.rstrip('/')).lower()
                if ignore_root_folders:
                    if root_folder in ignore_root_folders or location in ignore_root_folders:
                        continue
                # Initialize variable to store whether a match was found
                matched = False
                if location not in unmatched_assets[media_type]:
                    unmatched_assets[media_type][location] = []
                # Get season numbers for series
                if media_type == 'series':
                    media_seasons_numbers = [season['season_number'] for season in media_data.get('seasons', []) if season['season_has_episodes']]
                # Compare media data with each asset data for the same media type
                for asset_data in assets_dict[media_type]:
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
                    # If normalized title and year match between asset and media, check for missing seasons
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
    return unmatched_assets

def print_output(unmatched_dict, media_dict):
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
            create_table(table, log_level="info", logger=logger)
            logger.info(f"\n{'*' * 80}\n")
            for location, data in data_set.items():
                location = location.rstrip('/')
                location_base = os.path.basename(location)
                if data:
                    table = [
                        [location_base.title(), len(data)]
                    ]
                    create_table(table, log_level="info", logger=logger)
                    logger.info("")
                    for item in data:
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
    data = [
        ["Statistics"],
    ]
    create_table(data, log_level="info", logger=logger)
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
    create_table(table, log_level="info", logger=logger)

def main():
    """
    Main function.
    """
    name = script_name.replace("_", " ").upper()
    try:
        logger.info(f"\n{'*' * 40} STARTING {name} {'*' * 40}\n")
        # Logging script settings
        data = [
            ["Script Settings"]
        ]
        create_table(data, log_level="debug", logger=logger)
        
        # Retrieving script configuration
        script_config = config.script_config
        asset_folders = script_config.get('asset_folders', [])
        assets_paths = script_config.get('assets_paths', '')
        media_paths = script_config.get('media_paths', [])
        library_names = script_config.get('library_names', [])
        ignore_collections = script_config.get('ignore_collections', [])
        instances = script_config.get('instances', None)
        ignore_root_folders = script_config.get('ignore_root_folders', [])
        valid = validate(config, script_config, logger)

        # Logging script settings
        logger.debug(f'{"Log level:":<20}{log_level if log_level else "Not set"}')
        logger.debug(f'{"Asset Folders:":<20}{asset_folders if asset_folders else "Not set"}')
        logger.debug(f'{"Assets path:":<20}{assets_paths if assets_paths else "Not set"}')
        logger.debug(f'{"Media paths:":<20}{media_paths if media_paths else "Not set"}')
        logger.debug(f'{"Library names:":<20}{library_names if library_names else "Not set"}')
        logger.debug(f'{"Ignore collections:":<20}{ignore_collections if ignore_collections else "Not set"}')
        logger.debug(f'{"Instances:":<20}{instances if instances else "Not set"}')
        logger.debug('*' * 40 + '\n')

        # Fetching assets and media paths
        media_dict = {}
        for path in assets_paths:
            assets_dict = categorize_files(path, asset_folders)
            
        # Checking for assets and logging
        if assets_dict:
            logger.debug(f"Assets:\n{json.dumps(assets_dict, indent=4)}")
        if not all(assets_dict.values()):
            logger.error("No assets found, Check asset_folders setting in your config. Exiting.")
            sys.exit()
        
        # Checking for media paths and logging
        if any(value is None for value in media_dict.values()):
            logger.error("No media found, Check media_paths setting in your config. Exiting.")
            sys.exit()
        if media_dict:
            logger.debug(f"Media:\n{json.dumps(media_dict, indent=4)}")
        
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
                                results = get_plex_data(app, library_names, logger, include_smart=False, collections_only=True)
                                media_dict['collections'].extend(results)
                                # Remove ignored collections
                                if ignore_collections:
                                    media_dict['collections'] = [collection for collection in media_dict['collections'] if collection['title'] not in ignore_collections]
                            else:
                                logger.warning("No library names specified in config.yml. Skipping Plex.")
                        else:
                            url = instance_data[instance]['url']
                            api = instance_data[instance]['api']
                            app = StARR(url, api, logger)
                            if app:
                                results = handle_starr_data(app, instance_type)
                                if instance_type == "radarr":
                                    media_dict['movies'].extend(results)
                                elif instance_type == "sonarr":
                                    media_dict['series'].extend(results)
                            else:
                                logger.warning(f"No {instance_type.capitalize()} instances specified in config.yml. Skipping {instance_type.capitalize()}.")
        else:
            logger.warning("No instances specified in config.yml. Skipping Plex.")
        logger.debug(f"Media:\n{json.dumps(media_dict, indent=4)}")
        # Matching assets and printing output
        unmatched_dict = match_assets(assets_dict, media_dict, ignore_root_folders)
        logger.debug(f"Unmatched Dict:\n{json.dumps(unmatched_dict, indent=4)}")
        print_output(unmatched_dict, media_dict)
    except KeyboardInterrupt:
        print("Exiting due to keyboard interrupt.")
        sys.exit()
    except Exception:
        logger.error(f"\n\nAn error occurred:\n", exc_info=True)
        logger.error(f"\n\n")
    finally:
        logger.info(f"\n{'*' * 40} END {'*' * 40}\n")


if __name__ == "__main__":
    """
    Entry point for the script.
    """
    main()
