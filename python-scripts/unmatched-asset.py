#   _    _                       _       _              _                            _                 
#  | |  | |                     | |     | |            | |        /\                | |                
#  | |  | |_ __  _ __ ___   __ _| |_ ___| |__   ___  __| |______ /  \   ___ ___  ___| |_   _ __  _   _ 
#  | |  | | '_ \| '_ ` _ \ / _` | __/ __| '_ \ / _ \/ _` |______/ /\ \ / __/ __|/ _ \ __| | '_ \| | | |
#  | |__| | | | | | | | | | (_| | || (__| | | |  __/ (_| |     / ____ \\__ \__ \  __/ |_ _| |_) | |_| |
#   \____/|_| |_|_| |_| |_|\__,_|\__\___|_| |_|\___|\__,_|    /_/    \_\___/___/\___|\__(_) .__/ \__, |
#                                                                                         | |     __/ |
#                                                                                         |_|    |___/ 
# ===================================================================================================
# Author: Drazzilb
# Description: This script will check your media folders against your assets folder to see if there are any folders that do not have a matching asset.
#              It will also check your collections against your assets folder to see if there are any collections that do not have a matching asset.
#              It will output the results to a file in the logs folder.
# Usage: python3 unmatched-asset.py
# Requirements: requests
# Version: 3.0.1
# License: MIT License
# ===================================================================================================

import os
import re
from pathlib import Path
from modules.plex import PlexInstance
from modules.logger import Logger
from modules.config import Config

config = Config(script_name="unmatched-assets")
logger = Logger(config.log_level, "unmatched-assets")

def get_assets_files(assets_path):
    """
    Gets the files from the assets folder and sorts them into series, movies, and collections.
    
    Parameters:
        assets_path (str): The path to the assets folder.
    
    Returns:
        series (list): A list of series.
        collections (list): A list of collections.
        movies (list): A list of movies.
    """
    series = set()
    movies = set()
    collections = set()

    print("Getting assets files..., this may take a while.")
    files = os.listdir(assets_path)
    for file in files:
        file_name, file_ext = os.path.splitext(file)
        lowercase_file_name = file_name.lower()
        if not re.search(r'\(\d{4}\)', lowercase_file_name):
            collections.add(file_name)
        else:
            if any(lowercase_file_name in f.lower() and ("_season" in f.lower() or "specials" in f.lower()) for f in files):
                series.add(file_name)
            elif re.search(r'_season\d{2}|specials', lowercase_file_name):
                series.add(file_name)
            else:
                movies.add(file_name)
    
    series = sorted(series)
    collections = sorted(collections)
    movies = sorted(movies)
    return list(series), list(collections), list(movies)

def get_media_folders(media_paths):
    """
    Gets the folders from the media folders and sorts them into series and movies.
    
    Parameters:
        media_paths (list): A list of paths to the media folders.
        
    Returns:
        media_movies (list): A list of movies.
        media_series (list): A list of series.
    """
    media_series = []
    media_movies = []
    print("Getting media folder information..., this may take a while.")
    for media_path in media_paths:
        for subfolder in sorted(Path(media_path).iterdir()):
            if subfolder.is_dir():
                has_season_or_special = False
                sub_sub_folder_contents = []
                for sub_sub_folder in sorted(subfolder.iterdir()):
                    if sub_sub_folder.is_dir():
                        sub_sub_folder_contents.append(sub_sub_folder.name)
                        if "season" in sub_sub_folder.name.lower() or "special" in sub_sub_folder.name.lower():
                            has_season_or_special = True
                if has_season_or_special:
                    media_series.append((media_path, subfolder.name, sub_sub_folder_contents))
                else:
                    media_movies.append((media_path, subfolder.name))
    return media_movies, media_series

def unmatched(asset_series, asset_movies, media_movies, media_series, plex_collections, asset_collections):
    """
    Checks the media folders against the assets folder to see if there are any folders that do not have a matching asset.
    
    Parameters:
        asset_series (list): A list of series from the assets folder.
        asset_movies (list): A list of movies from the assets folder.
        media_movies (list): A list of movies from the media folders.
        media_series (list): A list of series from the media folders.
        plex_collections (list): A list of collections from Plex.
        asset_collections (list): A list of collections from the assets folder.
        
    Returns:
        unmatched_series (list): A list of series that do not have a matching asset.
        unmatched_movies (list): A list of movies that do not have a matching asset.
        unmatched_collections (list): A list of collections that do not have a matching asset.
    """
    unmatched_series = []
    unmatched_movies = []
    unmatched_collections = []
    if media_series:
        for series_info in media_series:
            library = series_info[0]
            series_name = series_info[1]
            series_seasons = series_info[2]
            flag = False
            if series_name not in asset_series:
                unmatched_series.append((library, series_name, series_seasons, flag))
            else:
                missing_seasons = []
                for season in series_seasons:
                    season = season.replace(" ", "")
                    season_with_series = f"{series_name}_{season}"
                    if season == "Specials":
                        season_with_series = f"{series_name}_Season00"
                    if season_with_series not in asset_series:
                        if season == "Season00":
                            season = "Specials"
                        else:
                            season = season.replace("Season", "Season ")
                        missing_seasons.append(season)
                        flag = True
                if missing_seasons:
                    unmatched_series.append((library, series_name, missing_seasons, flag))
    if media_movies:
        for movie in media_movies:
            movie_name = movie[1]
            if movie_name not in asset_movies:
                unmatched_movies.append((movie))
    if plex_collections:
        for collection in plex_collections:
            collection_name = collection[1]

            if collection_name not in asset_collections:
                unmatched_collections.append((collection))
    return unmatched_movies, unmatched_series, unmatched_collections


def print_output(unmatched_movies, unmatched_series, unmatched_collections, media_movies, media_series, plex_collections):
    """
    Prints the output of the unmatched function.
    
    Parameters:
        unmatched_movies (list): A list of movies that do not have a matching asset.
        unmatched_series (list): A list of series that do not have a matching asset.
        unmatched_collections (list): A list of collections that do not have a matching asset.
        media_movies (list): A list of movies from the media folders.
        media_series (list): A list of series from the media folders.
        plex_collections (list): A list of collections from Plex.
        
    Returns:
        None
    """
    unmatched_movies_total = 0
    unmatched_series_total = 0
    unmatched_collections_total = 0
    unmatched_seasons = 0
    total_movies = len(media_movies)
    total_series = len(media_series)
    total_seasons = len([season for series in media_series for season in series[2]])
    total_collections = len(plex_collections)
    if unmatched_movies:
        logger.info("Unmatched Movies:")
        previous_path = None
        for path in unmatched_movies:
            if path[0] != previous_path:
                logger.info("*" * 40)
                logger.info(f"\tMedia Path: {os.path.basename(os.path.normpath(path[0])).title()}")
                previous_path = path[0]
            logger.info(f"\t{path[1]}")
            unmatched_movies_total += 1
        logger.info(f"\t{unmatched_movies_total} unmatched movies found: Percent complete: ({100 - 100 * unmatched_movies_total / total_movies:.2f}% of total {total_movies}).\n")
    if unmatched_series:
        logger.info("Unmatched Series:")
        previous_path = None
        for path in unmatched_series:
            if path[0] != previous_path:
                logger.info("*" * 40)
                logger.info(f"\tMedia Path: {os.path.basename(os.path.normpath(path[0])).title()}")
                previous_path = path[0]
            logger.info(f"\t{path[1]}")
            unmatched_series_total += 1
            for season in path[2]:
                if path[3]:
                    logger.info(f"\t\t{season} (Missing assets)")
                    unmatched_seasons += 1
                else:
                    logger.info(f"\t\t{season}")
                    unmatched_seasons += 1
        logger.info(f"\t{unmatched_seasons} unmatched seasons found: Percent complete: ({100 - 100 * unmatched_seasons / total_seasons:.2f}% of total {total_seasons}).")
        logger.info(f"\t{unmatched_series_total} unmatched series found: Percent complete: ({100 - 100 * unmatched_series_total / total_series:.2f}% of total {total_series}).")
        logger.info(f"\t{unmatched_series_total} unmatched series & {unmatched_seasons} unmatched seasons. Grand percent complete: ({100 - 100 * (unmatched_series_total + unmatched_seasons) / (total_series + total_seasons):.2f}% of grand total {total_series + unmatched_seasons}).\n")
    if unmatched_collections:
        logger.info("Unmatched Collections:")
        previous_library = None
        for library in unmatched_collections:
            if library[0] != previous_library:
                logger.info(f"\tLibrary: {library[0].title()}")
                previous_library = library[0]
            logger.info(f"\t\t{library[1]}")
            unmatched_collections_total += 1
        logger.info(f"\t{unmatched_collections_total} unmatched collections found: Percent complete: ({100 - 100 * unmatched_collections_total / unmatched_collections_total:.2f}% of total {total_collections}).\n")
    logger.info(f"Grand total: {unmatched_movies_total} unmatched movies, {unmatched_series_total} unmatched series, {unmatched_seasons} unmatched seasons, {unmatched_collections_total} unmatched collections. Grand percent complete: ({100 - 100 * (unmatched_movies_total + unmatched_series_total + unmatched_seasons + unmatched_collections_total) / (total_movies + total_series + total_seasons + total_collections):.2f}% of grand total {total_movies + total_series + total_seasons + total_collections}).\n")

def main():
    """
    Main function for the script.
    """
    for data in config.plex_data:
        api_key = data.get('api', '')
        url = data.get('url', '')
    if url and api_key:
        plex_collections = []
    else:
        plex_collections = None
    illegal_chars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*']
    plex = PlexInstance(url, api_key, logger)
    asset_series, asset_collections, asset_movies = get_assets_files(config.assets_path)
    media_movies, media_series = get_media_folders(config.media_paths)
    if config.library_names:
        for library in config.library_names:
            collections_from_plex = plex.get_collections(library)
            for collection in config.ignore_collections:
                if collection in collections_from_plex:
                    collections_from_plex.remove(collection)
            for collection in collections_from_plex:
                sanitized_collection = ''.join(c for c in collection if c not in illegal_chars)
                plex_collections.append((library, sanitized_collection))
    unmatched_movies, unmatched_series, unmatched_collections = unmatched(asset_series, asset_movies, media_movies, media_series, plex_collections, asset_collections)
    print_output(unmatched_movies, unmatched_series, unmatched_collections, media_movies, media_series, plex_collections)

if __name__ == "__main__":
    """
    Entry point for the script.
    """
    main()
