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
#  Usage: python3 unmatched-asset.py
#  Note: There is a limitation to how this script works with regards to it matching series assets the
#         main series poster requires seasonal posters to be present. If you have a series that does
#         not have a seasonal poster then it will not match the series poster. If you don't have a season poster
#         your series will appear in the movies section.
#  Requirements: requests
#  License: MIT License
# ===========================================================================================================

script_version = "5.0.2"

import os
import re
from pathlib import Path
from plexapi.server import PlexServer
from plexapi.exceptions import BadRequest
from modules.logger import setup_logger
from modules.config import Config
from unidecode import unidecode
from tqdm import tqdm
import json
import logging
from modules.version import version
from modules.discord import discord
from modules.formatting import create_table

script_name = "unmatched-asset"
config = Config(script_name)
log_level = config.log_level
logger = setup_logger(log_level, script_name)
version(script_name, script_version, arrpy_py_version=None, logger=logger, config=config)

logging.getLogger("requests").setLevel(logging.WARNING)
logging.getLogger('urllib3').setLevel(logging.WARNING)

illegal_chars_regex = re.compile(r'[<>:"/\\|?*\x00-\x1f]+')
year_regex = re.compile(r"\((19|20)\d{2}\).*")

season_name_info = [
    "_Season",
    "Season"
]

def get_assets_files(assets_path):
    asset_folders = config.asset_folders
    asset_types = ['series', 'movies', 'collections']
    assets = {asset_type: [] for asset_type in asset_types}
    print("Getting assets files..., this may take a while.")
    files = os.listdir(assets_path)
    files = sorted(files, key=lambda x: x.lower())
    season_number = None
    def add_movies(title):
        assets['movies'].append({
            'title': title
        })

    def extract_season_info(base_name):
        season_number = None
        season_number_match = re.search(r'\d{2}$', base_name)
        if season_number_match:
            if season_number_match.group(0) == '00':
                season_number = 'Specials'
            else:
                season_number = f"Season {season_number_match.group(0)}"
        return season_number

    def add_series(title_without_season_info, season_number):
        if any(d['title'] == title_without_season_info for d in assets['series']):
            if season_number:
                assets['series'][-1]['season_number'].append(season_number)
        else:
            assets['series'].append({
                'title': title_without_season_info,
                'season_number': []
            })
            if season_number:
                assets['series'][-1]['season_number'].append(season_number)

    if not asset_folders:
        for file in tqdm(files, desc=f'Sorting assets', total=len(files)):
            if file.startswith('.'):
                continue
            base_name, extension = os.path.splitext(file)
            if not re.search(r'\(\d{4}\)', base_name):
                assets['collections'].append({
                    'title': base_name
                })
            else:
                file_name = os.path.splitext(file)[0]
                title = base_name
                title = unidecode(title)
                title_without_season_info = title
                for season_info in season_name_info:
                    title_without_season_info = re.sub(
                        season_info + r'\d+', '', title_without_season_info)
                if any(file.startswith(file_name) and any(file_name + season_name in file for season_name in season_name_info) for file in files):
                    season_number = extract_season_info(base_name)
                    if season_number:
                        add_series(title_without_season_info, season_number)
                    else:
                        add_movies(title)
                elif any(season_info in file for season_info in season_name_info):
                    season_number = extract_season_info(base_name)
                    if season_number:
                        add_series(title_without_season_info, season_number)
                    else:
                        add_movies(title)
                else:
                    assets['movies'].append({'title': title})
    else:
        for root, dirs, files in os.walk(assets_path):
            title = os.path.basename(root)
            if root == assets_path:
                continue
            if not files:
                continue
            if title.startswith('.'):
                continue
            if not re.search(year_regex, title):
                assets['collections'].append({
                    'title': title
                })
            else:
                if any(season_info in file for season_info in season_name_info for file in files):
                    assets['series'].append({
                        'title': title,
                        'season_number': []
                    })
                    for file in files:
                        if file.startswith('.'):
                            continue
                        base_name, extension = os.path.splitext(file)
                        if any(season_info in file for season_info in season_name_info):
                            season_number = extract_season_info(base_name)
                            add_series(title, season_number)
                else:
                    assets['movies'].append({'title': title})
    for asset_type in asset_types:
        assets[asset_type] = sorted(assets[asset_type], key=lambda x: x['title'])
    logger.debug("Assets:")
    logger.debug(json.dumps(assets, ensure_ascii=False, indent=4))
    return assets

def get_media_folders(media_paths):
    asset_types = ['series', 'movies']
    media = {'movies': [], 'series': []}
    print("Getting media folder information..., this may take a while.")
    for media_path in media_paths:
        base_name = os.path.basename(os.path.normpath(media_path))
        for subfolder in sorted(Path(media_path).iterdir()):
            if subfolder.is_dir():
                for sub_sub_folder in sorted(Path(subfolder).iterdir()):
                    if sub_sub_folder.is_dir():
                        sub_sub_folder_base_name = os.path.basename(
                            os.path.normpath(sub_sub_folder))
                        if not (sub_sub_folder_base_name.startswith("Season ") or sub_sub_folder_base_name == "Specials"):
                            logger.debug(
                                f"Skipping '{sub_sub_folder_base_name}' because it is not a season folder.")
                            continue
                        if any(subfolder.name in s['title'] for s in media['series']):
                            for series in media['series']:
                                if subfolder.name in series['title']:
                                    series['season_number'].append(
                                        sub_sub_folder.name)
                        else:
                            media['series'].append({
                                'title': subfolder.name,
                                'season_number': [],
                                'path': base_name
                            })
                            for series in media['series']:
                                if subfolder.name in series['title']:
                                    series['season_number'].append(
                                        sub_sub_folder.name)
                if not any(sub_sub_folder.is_dir() for sub_sub_folder in Path(subfolder).iterdir()):
                    media['movies'].append({
                        'title': subfolder.name,
                        'path': base_name
                    })
    media = dict(sorted(media.items()))
    logger.debug("Media Directories:")
    logger.debug(json.dumps(media, ensure_ascii=False, indent=4))
    return media

def match_assets(assets, media, plex_collections):
    unmatched_media = {'unmatched_movies': [], 'unmatched_series': [], 'unmatched_collections': []}
    for series in tqdm(media['series'], desc='Matching series', total=len(media['series'])):
        asset_found = False
        media_title  = re.sub(r'[^A-Za-z0-9]+', '', unidecode(series['title']).replace('&', 'and')).strip().lower()
        for asset in assets['series']:
            asset_title = re.sub(r'[^A-Za-z0-9]+', '', unidecode(asset['title']).replace('&', 'and')).strip().lower()
            if asset_title == media_title:
                asset_found = True
                missing_seasons = [
                    season for season in series['season_number'] if season not in asset['season_number']]
                if missing_seasons:
                    unmatched_media['unmatched_series'].append({
                        'title': series['title'],
                        'season_number': missing_seasons,
                        'missing_season': True,
                        'path': series['path']
                    })
                break
        if not asset_found:
            unmatched_media['unmatched_series'].append({
                'title': series['title'],
                'season_number': series['season_number'],
                'missing_season': False,
                'path': series['path']
            })
    for media_movie in tqdm(media['movies'], desc='Matching movies', total=len(media['movies'])):
        asset_found = False
        media_title = re.sub(r'[^A-Za-z0-9]+', '', unidecode(media_movie['title']).replace('&', 'and')).strip().lower()
        for asset in assets['movies']:
            asset_title = re.sub(r'[^A-Za-z0-9]+', '', unidecode(asset['title']).replace('&', 'and')).strip().lower()
            if media_title == asset_title:
                asset_found = True
                break
        if not asset_found:
            unmatched_media['unmatched_movies'].append({
                'title': media_movie['title'],
                'path': media_movie['path']
            })
    for plex_collection in tqdm(plex_collections['collections'], desc='Matching collections', total=len(plex_collections['collections'])):
        asset_found = False
        for asset in assets['collections']:
            if unidecode(plex_collection['title']) == unidecode(asset['title']):
                asset_found = True
                break
        if not asset_found:
            unmatched_media['unmatched_collections'].append({
                'title': plex_collection['title'],
            })
    logger.debug("Unmatched Assets:")
    logger.debug(json.dumps(unmatched_media, ensure_ascii=False, indent=4))
    return unmatched_media


def print_output(unmatched_media, media, plex_collections):
    unmatched_movies_total = 0
    unmatched_series_total = 0
    unmatched_collections_total = 0
    unmatched_seasons = 0
    total_seasons = 0
    total_movies = len(media['movies'])
    total_series = len(media['series'])
    for series in media['series']:
        total_seasons += len(series['season_number'])
    total_collections = len(plex_collections)
    if unmatched_media['unmatched_movies']:
        logger.info("Unmatched Movies:")
        previous_path = None
        for movie in unmatched_media['unmatched_movies']:
            if movie['path'] != previous_path:
                logger.info(f"\t{movie['path'].capitalize()}")
                previous_path = movie['path']
            logger.info(f"\t\t{movie['title']}")
            unmatched_movies_total += 1
        logger.info(f"\t{unmatched_movies_total} unmatched movies found: Percent complete: ({100 - 100 * unmatched_movies_total / total_movies:.2f}% of total {total_movies}).")
    if unmatched_media['unmatched_series']:
        logger.info("Unmatched Series:")
        previous_path = None
        for series in unmatched_media['unmatched_series']:
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
            unmatched_seasons += len(series['season_number'])
        logger.info(
            f"\t{unmatched_seasons} unmatched seasons found: Percent complete: ({100 - 100 * unmatched_seasons / total_seasons:.2f}% of total {total_seasons}).")
        logger.info(f"\t{unmatched_series_total} unmatched series found: Percent complete: ({100 - 100 * unmatched_series_total / total_series:.2f}% of total {total_series}).")
        logger.info(f"\t{unmatched_series_total} unmatched series & {unmatched_seasons} unmatched seasons. Grand percent complete: ({100 - 100 * (unmatched_series_total + unmatched_seasons) / (total_series + total_seasons):.2f}% of grand total {total_series + unmatched_seasons}).\n")
    if unmatched_media['unmatched_collections']:
        logger.info("Unmatched Collections:")
        for collection in unmatched_media['unmatched_collections']:
            logger.info(f"\t{collection['title']}")
            unmatched_collections_total += 1
        logger.info(f"\t{unmatched_collections_total} unmatched collections found: Percent complete: ({100 - 100 * unmatched_collections_total / unmatched_collections_total:.2f}% of total {total_collections}).\n")
    logger.info(f"Grand total: {unmatched_movies_total} unmatched movies, {unmatched_series_total} unmatched series, {unmatched_seasons} unmatched seasons, {unmatched_collections_total} unmatched collections. Grand percent complete: ({100 - 100 * (unmatched_movies_total + unmatched_series_total + unmatched_seasons + unmatched_collections_total) / (total_movies + total_series + total_seasons + total_collections):.2f}% of grand total {total_movies + total_series + total_seasons + total_collections}).\n")

def main():
    """
    Main function for the script.
    """
    data = [
        ["Script Settings"]
    ]
    create_table(data, log_level="debug", logger=logger)
    logger.debug(f'{"Log level:":<20}{log_level if log_level else "Not set"}')
    logger.debug(f'{"Asset Folders:":<20}{config.asset_folders if config.asset_folders else "Not set"}')
    logger.debug(f'{"Assets path:":<20}{config.assets_path if config.assets_path else "Not set"}')
    logger.debug(f'{"Media paths:":<20}{config.media_paths if config.media_paths else "Not set"}')
    logger.debug(f'{"Library names:":<20}{config.library_names if config.library_names else "Not set"}')
    logger.debug(f'{"Ignore collections:":<20}{config.ignore_collections if config.ignore_collections else "Not set"}')
    logger.debug('*' * 40 + '\n')
    if config.plex_data:
        for data in config.plex_data:
            api_key = data.get('api', '')
            url = data.get('url', '')
    if config.library_names:
        app = PlexServer(url, api_key)
    else:
        logger.info("No library names specified in config.yml. Skipping Plex.")
    assets = get_assets_files(config.assets_path)
    media = get_media_folders(config.media_paths)
    collections = []
    if config.library_names and app:
        for library_name in config.library_names:
            try:
                library = app.library.section(library_name)
                logger.debug(library)
                collections += library.collections()
            except BadRequest:
                logger.error(f"Library {library_name} not found.")
                continue
    else:
        logger.info(
            "No library names specified in config.yml. Skipping collections.")
    collection_names = [
        collection.title for collection in collections if collection.smart != True]
    logger.debug(json.dumps(collection_names, indent=4))
    if config.ignore_collections:
        for collection in config.ignore_collections:
            if collection in collection_names:
                collection_names.remove(collection)
    dict_plex = {'collections': []}
    for collection in collection_names:
        sanitized_collection = illegal_chars_regex.sub('', collection)
        dict_plex['collections'].append({'title': sanitized_collection})
    unmatched_media = match_assets(assets, media, dict_plex)
    print_output(unmatched_media, media, dict_plex)

if __name__ == "__main__":
    """
    Entry point for the script.
    """
    main()
