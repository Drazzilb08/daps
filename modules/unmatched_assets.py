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

from util.utility import *
from util.logger import setup_logger
from util.config import Config

try:
    from plexapi.server import PlexServer
except ImportError as e:
    print(f"ImportError: {e}")
    print("Please install the required modules with 'pip install -r requirements.txt'")
    exit(1)

script_name = "unmatched_assets"
config = Config(script_name)
log_level = config.log_level
logger = setup_logger(log_level, script_name)

def match_assets(assets_dict, media_dict):
    """
    Matches assets to media and returns a dictionary of unmatched assets.
    
    Args:
        assets_dict (dict): Dictionary of assets.
        media_dict (dict): Dictionary of media.
        
    Returns:
        dict: Dictionary of unmatched assets.
    """
    
    # Initialize dictionary to store unmatched assets by media types
    unmatched_assets = {
        'movies': [],
        'series': [],
        'collections': []
    }
    
    # Loop through different media types
    for media_type in ['movies', 'series', 'collections']:
        # Check if the media type is present in both assets and media dictionaries
        if media_type in media_dict and media_type in assets_dict:
            # Iterate through each media data in the media dictionary of the current type
            for media_data in media_dict[media_type]:
                media_normalized_title = media_data['normalized_title']
                media_year = media_data['year']
                matched = False
                missing_seasons = []
                
                # Compare media data with each asset data for the same media type
                for asset_data in assets_dict[media_type]:
                    asset_normalized_title = asset_data['normalized_title']
                    asset_year = asset_data['year']
                    
                    # If normalized title and year match between asset and media, check for missing seasons
                    if media_normalized_title == asset_normalized_title and media_year == asset_year:
                        matched = True
                        
                        # Find missing seasons by comparing season numbers
                        if media_type == 'series':
                            missing_seasons = [season for season in media_data['season_numbers'] if season not in asset_data['season_numbers']]
                        
                        # If missing seasons are found, append details to unmatched_assets
                        if missing_seasons:
                            missing_seasons.sort()
                            unmatched_assets[media_type].append({
                                'title': media_data['title'],
                                'year': media_data['year'],
                                'missing_season': True,
                                'missing_seasons': missing_seasons,
                                'location': media_data['location']
                            })
                
                # If there's no match found, add the media to unmatched_assets
                if not matched:
                    if media_type == 'series':
                        unmatched_assets[media_type].append({
                            'title': media_data['title'],
                            'year': media_data['year'],
                            'missing_season': False,
                            'season_numbers': media_data['season_numbers'],
                            'location': media_data['location']
                        })
                    else:
                        unmatched_assets[media_type].append({
                            'title': media_data['title'],
                            'year': media_data['year'],
                            'location': media_data['location']
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
        if asset_type == 'collections':
            location_type = "Library"
        else:
            location_type = "Folder"
        if data_set:
            # Print unmatched assets for each type
            data = [
                [f"Unmatched {asset_type.capitalize()}"]
            ]
            create_table(data, log_level="info", logger=logger)
            previous_location = None
            for data in data_set:
                location = data['location']
                if location != previous_location:
                    table = [
                        [f"{location_type}: {location}"]
                    ]
                    logger.info("")
                    create_table(table, log_level="info", logger=logger)
                    logger.info("")
                    previous_location = location
                # Print details of unmatched assets, handling series separately for missing seasons
                if asset_type == 'series':
                    if data.get('missing_season'):
                        logger.info(f"\t{data['title']} ({data['year']}) (Seasons listed below are missing)")
                        for season in data['missing_seasons']:
                            logger.info(f"\t\tSeason: {season} <- Missing")
                    elif data.get('season_numbers'):
                        logger.info(f"\t{data['title']} ({data['year']})")
                        for season in data['season_numbers']:
                            logger.info(f"\t\tSeason: {season}")
                else:
                    year = f" ({data['year']})" if data['year'] else ""
                    logger.info(f"\t{data['title']}{year}")
                logger.info("")

    # Calculate statistics for movies, series, collections, and the overall unmatched assets
    if unmatched_dict.get('movies', None):
        total_movies = len(media_dict.get('movies', []))
        unmatched_movies_total = len(unmatched_dict.get('movies', []))
        percent_movies_complete = (total_movies - unmatched_movies_total) / total_movies * 100
    else:
        total_movies = 0
        unmatched_movies_total = 0
        percent_movies_complete = 0

    if unmatched_dict.get('series', None):
        total_series = len(media_dict.get('series', []))
        unmatched_series_total = len(unmatched_dict.get('series', []))
        series_percent_complete = (total_series - unmatched_series_total) / total_series * 100

        unmatched_seasons_total = sum(len(data.get('season_numbers', [])) + len(data.get('missing_seasons', [])) for data in unmatched_dict.get('series', []))
        total_seasons = sum(len(media_data.get('season_numbers', [])) for media_data in media_dict.get('series', []))
        season_total_percent_complete = (total_seasons - unmatched_seasons_total) / total_seasons * 100 if total_seasons != 0 else 0
    else:
        total_series = 0
        unmatched_series_total = 0
        series_percent_complete = 0
        season_total_percent_complete = 0

    if unmatched_dict.get('collections', None):
        unmatched_collections_total = len(unmatched_dict.get('collections', []))
        total_collections = len(media_dict.get('collections', []))
        collection_percent_complete = (total_collections - unmatched_collections_total) / total_collections * 100 if total_collections != 0 else 0
    else:
        unmatched_collections_total = 0
        total_collections = 0
        collection_percent_complete = 0

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
    if unmatched_dict.get('movies', None):
        table.append(["Movies", total_movies, unmatched_movies_total, f"{percent_movies_complete:.2f}%"])
    if unmatched_dict.get('series', None):
        table.append(["Series", total_series, unmatched_series_total, f"{series_percent_complete:.2f}%"])
        table.append(["Seasons", total_seasons, unmatched_seasons_total, f"{season_total_percent_complete:.2f}%"])
    if unmatched_dict.get('collections', None):
        table.append(["Collections", total_collections, unmatched_collections_total, f"{collection_percent_complete:.2f}%"])
    table.append(["Grand Total", grand_total, grand_unmatched_total, f"{grand_percent_complete:.2f}%"])
    create_table(table, log_level="info", logger=logger)

def main():
    """
    Main function for the script.
    """
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
        exit()

    media_dict = get_media_folders(media_paths, logger)
    logger.debug(f"Media:\n{json.dumps(media_dict, indent=4)}")
    
    # Checking for media paths and logging
    if any(value is None for value in media_dict.values()):
        logger.error("No media found, Check media_paths setting in your config. Exiting.")
        exit()
    if media_dict:
        logger.debug(f"Media:\n{json.dumps(media_dict, indent=4)}")
    
    # Processing Plex instances
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
                        # Remove ignored collections
                        if ignore_collections:
                            media_dict['collections'] = [collection for collection in media_dict['collections'] if collection['title'] not in ignore_collections]
                    else:
                        logger.warning("No library names specified in config.yml. Skipping Plex.")
    else:
        logger.warning("No instances specified in config.yml. Skipping Plex.")
    logger.debug(f"Media:\n{json.dumps(media_dict, indent=4)}")
    # Matching assets and printing output
    unmatched_dict = match_assets(assets_dict, media_dict)
    print_output(unmatched_dict, media_dict)
    logger.info(f"{'*' * 40} END {'*' * 40}\n")


if __name__ == "__main__":
    """
    Entry point for the script.
    """
    main()
