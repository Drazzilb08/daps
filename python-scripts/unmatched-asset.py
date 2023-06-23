#   _    _                       _       _              _                            _                 
#  | |  | |                     | |     | |            | |        /\                | |                
#  | |  | |_ __  _ __ ___   __ _| |_ ___| |__   ___  __| |______ /  \   ___ ___  ___| |_   _ __  _   _ 
#  | |  | | '_ \| '_ ` _ \ / _` | __/ __| '_ \ / _ \/ _` |______/ /\ \ / __/ __|/ _ \ __| | '_ \| | | |
#  | |__| | | | | | | | | | (_| | || (__| | | |  __/ (_| |     / ____ \\__ \__ \  __/ |_ _| |_) | |_| |
#   \____/|_| |_|_| |_| |_|\__,_|\__\___|_| |_|\___|\__,_|    /_/    \_\___/___/\___|\__(_) .__/ \__, |
#                                                                                         | |     __/ |
#                                                                                         |_|    |___/ 
# ===========================================================================================================
#  Author: Drazzilb                                                                                        
#  Description: This script will check your media folders against your assets folder to see if there       
#                are any folders that do not have a matching asset. It will also check your collections     
#                against your assets folder to see if there are any collections that do not have a          
#                matching asset. It will output the results to a file in the logs folder.                  
#  Usage: python3 unmatched=asset.py                                                                                  
#  Note: There is a limitation to how this script works with regards to it matching series assets the     
#         main series poster requires seasonal posters to be present. If you have a series that does       
#         not have a seasonal poster then it will not match the series poster.                                
#  Requirements: requests                                                                                            
#  Version: 4.1.0                                                                               
#  License: MIT License                                                                                   
# =========================================================================================================== 

import os
import re
from pathlib import Path
from plexapi.server import PlexServer
from modules.logger import setup_logger
from modules.config import Config
import sys
from unidecode import unidecode
from tqdm import tqdm
import json
import logging

config = Config(script_name="unmatched-assets")
logger = setup_logger(config.log_level, "unmatched-assets")
logging.getLogger("requests").setLevel(logging.WARNING)
logging.getLogger('urllib3').setLevel(logging.WARNING)

illegal_chars_regex = re.compile(r'[<>:"/\\|?*\x00-\x1f]+')

season_name_info = [
    "Season"
]

def get_assets_files(assets_path):
    asset_folders = config.asset_folders    
    series = {'series': []}
    movies = {'movies': []}
    collections = {'collections': []}

    try:
        print("Getting assets files..., this may take a while.")
        files = os.listdir(assets_path)
        files = sorted(files, key=lambda x: x.lower())
    except FileNotFoundError:
        logger.error(f"Error: {assets_path} not found.")
        exc_type, exc_obj, exc_tb = sys.exc_info()
        logger.error(f"Error: {exc_type}")
        if exc_tb is not None:
            logger.error(f"Line number: {exc_tb.tb_lineno}")
        sys.exit(1)
    season_number = None
    if not asset_folders:
        for file in tqdm(files, desc=f'Sorting assets', total=len(files)):
                if file.startswith('.'):
                    continue
                base_name, extension = os.path.splitext(file)
                if not re.search(r'\(\d{4}\)', base_name):
                    collections['collections'].append({
                        'title': base_name
                    })
                else:
                    title = base_name
                    title = unidecode(title)
                    title_without_season_info = title
                    for season_info in season_name_info:
                        title_without_season_info = re.sub(season_info + r'\d+', '', title_without_season_info)
                    if any(title_without_season_info in file and any(season_info in file for season_info in season_name_info) for file in files):
                        season_number = re.search(r'\d{2}$', base_name)
                        if season_number:
                            if season_number.group(0) == '00':
                                season_number = 'Specials'
                            else:
                                season_number = f"Season {season_number.group(0)}"
                        if any(d['title'] == title_without_season_info for d in series['series']):
                            if season_number:
                                series['series'][-1]['season_number'].append(season_number)
                        else:
                            series['series'].append({
                                'title': title_without_season_info, 
                                'season_number': []
                            })
                            if season_number:
                                series['series'][-1]['season_number'].append(season_number)
                    elif any(season_info in file for season_info in season_name_info):
                        season_number = re.search(r'\d{2}$', base_name)
                        if season_number:
                            if season_number.group(0) == '00':
                                season_number = 'Specials'
                            else:
                                season_number = f"Season {season_number.group(0)}"
                            if any(d['title'] == title_without_season_info for d in series['series']):
                                if season_number:
                                    series['series'][-1]['season_number'].append(season_number)
                            else:
                                series['series'].append({
                                    'title': title_without_season_info, 
                                    'season_number': []
                                })
                                if season_number:
                                    series['series'][-1]['season_number'].append(season_number)
                    else:
                        movies['movies'].append({'title': title})
    else:
        for root, dirs, files in os.walk(assets_path):
            if root == assets_path:
                continue
            basename = os.path.basename(root)
            if basename.startswith('.'):
                continue
            if not re.search(r'\(\d{4}\)', basename):
                collections['collections'].append({
                    'title': basename
                })
            else:
                title = basename
                if any(season_info in file for season_info in season_name_info for file in files):
                    series['series'].append({
                        'title': title, 
                        'season_number': []
                    })
                    for file in files:
                        if file.startswith('.'):
                            continue
                        base_name, extension = os.path.splitext(file)
                        if any(season_info in file for season_info in season_name_info):
                            season_number = re.search(r'\d{2}$', base_name)
                            if season_number:
                                if season_number.group(0) == '00':
                                    season_number = 'Specials'
                                else:
                                    season_number = f"Season {season_number.group(0)}"
                                if any(d['title'] == title for d in series['series']):
                                    if season_number:
                                        series['series'][-1]['season_number'].append(season_number)
                                else:
                                    series['series'].append({
                                        'title': title, 
                                        'season_number': []
                                    })
                                    if season_number:
                                        series['series'][-1]['season_number'].append(season_number)
                else:
                    if any('poster' in filename.lower() for filename in files):
                        movies['movies'].append({'title': title})


    
    collections['collections'] = sorted(collections['collections'], key=lambda x: x['title'])
    movies['movies'] = sorted(movies['movies'], key=lambda x: x['title'])
    series['series'] = sorted(series['series'], key=lambda x: x['title'])
    
    logger.debug("Assets:")
    logger.debug(json.dumps(collections, ensure_ascii=False, indent=4))
    logger.debug(json.dumps(movies, ensure_ascii=False, indent=4))
    logger.debug(json.dumps(series, ensure_ascii=False, indent=4))
    return series, collections, movies


def get_media_folders(media_paths):
    """
    Gets the folders from the media folders and sorts them into series and movies.
    
    Parameters:
        media_paths (list): A list of paths to the media folders.
        
    Returns:
        media_movies (list): A list of movies.
        media_series (list): A list of series.
    """
    series = {'series': []}
    movies = {'movies': []}
    print("Getting media folder information..., this may take a while.")
    
    for media_path in media_paths:
        base_name = os.path.basename(os.path.normpath(media_path))
        for subfolder in sorted(Path(media_path).iterdir()):
            if subfolder.is_dir():
                for sub_sub_folder in sorted(Path(subfolder).iterdir()):
                    if sub_sub_folder.is_dir():
                        if any(subfolder.name in s['title'] for s in series['series']):
                            series['series'][-1]['season_number'].append(sub_sub_folder.name)
                        else:
                            series['series'].append({
                                'title': subfolder.name, 
                                'season_number': [],
                                'path': base_name
                                })
                            series['series'][-1]['season_number'].append(sub_sub_folder.name)
                if not any(sub_sub_folder.is_dir() for sub_sub_folder in Path(subfolder).iterdir()):
                    movies['movies'].append({
                        'title': subfolder.name,
                        'path': base_name
                        })
    series = dict(sorted(series.items()))
    movies = dict(sorted(movies.items()))
    logger.debug("Media Directories:")
    logger.debug(json.dumps(series, ensure_ascii=False, indent=4))
    logger.debug(json.dumps(movies, ensure_ascii=False, indent=4))
    return movies, series

def match_assets(asset_series, asset_movies, media_movies, media_series, plex_collections, asset_collections):
    unmatched_series = {'unmatched_series': []}
    unmatched_movies = {'unmatched_movies': []}
    unmatched_collections = {'unmatched_collections': []}

    for series in tqdm(media_series['series'], desc='Matching series', total=len(media_series['series'])):
        asset_found = False
        for asset in asset_series['series']:
            if unidecode(series['title']) == unidecode(asset['title']):
                asset_found = True
                missing_seasons = [season for season in series['season_number'] if season not in asset['season_number']]
                if missing_seasons:
                    unmatched_series['unmatched_series'].append({
                        'title': series['title'],
                        'season_number': missing_seasons,
                        'missing_season': True,
                        'path': series['path']
                    })
                break
        if not asset_found:
            unmatched_series['unmatched_series'].append({
                'title': series['title'],
                'season_number': series['season_number'],
                'missing_season': False,
                'path': series['path']
            })

    for media_movie in tqdm(media_movies['movies'], desc='Matching movies', total=len(media_movies['movies'])):
        asset_found = False
        for asset in asset_movies['movies']:
            if unidecode(media_movie['title']) == unidecode(asset['title']):
                asset_found = True
                break
        if not asset_found:
            unmatched_movies['unmatched_movies'].append({
                'title': media_movie['title'],
                'path': media_movie['path']
            })

    for plex_collection in tqdm(plex_collections['collections'], desc='Matching collections', total=len(plex_collections['collections'])):
        asset_found = False
        for asset in asset_collections['collections']:
            if unidecode(plex_collection['title']) == unidecode(asset['title']):
                asset_found = True
                break
        if not asset_found:
            unmatched_collections['unmatched_collections'].append({
                'title': plex_collection['title'],
            })
    logger.debug("Unmatched Assets:")
    logger.debug(json.dumps(unmatched_series, ensure_ascii=False, indent=4))
    logger.debug(json.dumps(unmatched_movies, ensure_ascii=False, indent=4))
    logger.debug(json.dumps(unmatched_collections, ensure_ascii=False, indent=4))

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
    total_seasons = 0
    total_movies = len(media_movies['movies'])
    total_series = len(media_series['series'])
    for series in media_series['series']:
        total_seasons += len(series['season_number'])
    total_collections = len(plex_collections)
    if unmatched_movies['unmatched_movies']:
        logger.info("Unmatched Movies:")
        previous_path = None
        for movie in unmatched_movies['unmatched_movies']:
            if movie['path'] != previous_path:
                logger.info(f"\t{movie['path'].capitalize()}")
                previous_path = movie['path']
            logger.info(f"\t\t{movie['title']}")
            unmatched_movies_total += 1
        logger.info(f"\t{unmatched_movies_total} unmatched movies found: Percent complete: ({100 - 100 * unmatched_movies_total / total_movies:.2f}% of total {total_movies}).")
    unmatched_series = sorted(unmatched_series['unmatched_series'], key=lambda k: k['path'])
    if unmatched_series:
        logger.info("Unmatched Series:")
        previous_path = None
        for series in unmatched_series:
            if series['path'] != previous_path:
                logger.info(f"\t{series['path'].capitalize()}")
                previous_path = series['path']
            if series['missing_season']:
                output = f"Series poster available but seasons listed are missing"
                logger.info(f"\t\t{series['title']}, {output}")
                for season in series['season_number']:
                    logger.info(f"\t\t\t{season}")
            else:
                output = f"Series poster unavailable"
                logger.info(f"\t\t{series['title']}, {output}")
                for season in series['season_number']:
                    logger.info(f"\t\t\t{season}")
            unmatched_series_total += 1
            if series['missing_season']:
                unmatched_seasons += 1
        
        logger.info(f"\t{unmatched_seasons} unmatched seasons found: Percent complete: ({100 - 100 * unmatched_seasons / total_seasons:.2f}% of total {total_seasons}).")
        logger.info(f"\t{unmatched_series_total} unmatched series found: Percent complete: ({100 - 100 * unmatched_series_total / total_series:.2f}% of total {total_series}).")
        logger.info(f"\t{unmatched_series_total} unmatched series & {unmatched_seasons} unmatched seasons. Grand percent complete: ({100 - 100 * (unmatched_series_total + unmatched_seasons) / (total_series + total_seasons):.2f}% of grand total {total_series + unmatched_seasons}).\n")
    if unmatched_collections['unmatched_collections']:
        logger.info("Unmatched Collections:")
        for collection in unmatched_collections['unmatched_collections']:
            logger.info(f"\t{collection['title']}")
            unmatched_collections_total += 1
        logger.info(f"\t{unmatched_collections_total} unmatched collections found: Percent complete: ({100 - 100 * unmatched_collections_total / unmatched_collections_total:.2f}% of total {total_collections}).\n")
    logger.info(f"Grand total: {unmatched_movies_total} unmatched movies, {unmatched_series_total} unmatched series, {unmatched_seasons} unmatched seasons, {unmatched_collections_total} unmatched collections. Grand percent complete: ({100 - 100 * (unmatched_movies_total + unmatched_series_total + unmatched_seasons + unmatched_collections_total) / (total_movies + total_series + total_seasons + total_collections):.2f}% of grand total {total_movies + total_series + total_seasons + total_collections}).\n")

def main():
    """
    Main function for the script.
    """
    url = None
    api_key = None
    for data in config.plex_data:
        api_key = data.get('api', '')
        url = data.get('url', '')
    app = PlexServer(url, api_key)
    asset_series, asset_collections, asset_movies = get_assets_files(config.assets_path)
    media_movies, media_series = get_media_folders(config.media_paths)
    collections = []
    if config.library_names:
        for library_name in config.library_names:
            library = app.library.section(library_name)
            collections += library.collections()
    else:
        logger.info("No library names specified in config.yml. Skipping collections.")
    collection_names = [collection.title for collection in collections if collection.smart != True]
    for collection in config.ignore_collections:
        if collection in collection_names:
            collection_names.remove(collection)
    dict_plex = {'collections': []}
    for collection in collection_names:
        sanitized_collection = illegal_chars_regex.sub('', collection)
        dict_plex['collections'].append({'title': sanitized_collection})
    unmatched_movies, unmatched_series, unmatched_collections = match_assets(asset_series, asset_movies, media_movies, media_series, dict_plex, asset_collections)
    print_output(unmatched_movies, unmatched_series, unmatched_collections, media_movies, media_series, dict_plex)

if __name__ == "__main__":
    """
    Entry point for the script.
    """
    main()
