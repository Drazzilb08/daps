#   _____                                                _____ _                            
#  |  __ \                                              / ____| |                           
#  | |__) |___ _ __   __ _ _ __ ___   ___ _ __ ______  | |    | | ___  __ _ _ __   ___ _ __ 
#  |  _  // _ \ '_ \ / _` | '_ ` _ \ / _ \ '__|______| | |    | |/ _ \/ _` | '_ \ / _ \ '__|
#  | | \ \  __/ | | | (_| | | | | | |  __/ |           | |____| |  __/ (_| | | | |  __/ |   
#  |_|  \_\___|_| |_|\__,_|_| |_| |_|\___|_|            \_____|_|\___|\__,_|_| |_|\___|_|   
# ===========================================================================================================
#  Author: Drazzilb
#  Description: This script will remove any assets from your plex-meta-manager asset directory that are not being used by your media.
#               Note: This script will remove things that renamer has put in to the assets directory that do not have a folder in your
#               Media directory and cause a loop. I wouldn't recommend running this script very often (weekly at most, monthly is probably)
#  Usage: python3 renamer_cleaner.py
#  Requirements: requests
#  License: MIT License
# ===========================================================================================================

script_version = "2.1.0"

import os
import re
from pathlib import Path
from plexapi.server import PlexServer
from plexapi.exceptions import BadRequest
from modules.logger import setup_logger
from modules.config import Config
from tqdm import tqdm
import json
import logging
import sys
import shutil
from modules.arrpy import arrpy_py_version
from modules.version import version
from modules.discord import discord

script_name = "renamer_cleanarr"
config = Config(script_name)
logger = setup_logger(config.log_level, script_name)
version(script_name, script_version, arrpy_py_version, logger, config)

logging.getLogger("requests").setLevel(logging.WARNING)
logging.getLogger('urllib3').setLevel(logging.WARNING)

illegal_chars_regex = re.compile(r'[<>:"/\\|?*\x00-\x1f]+')
year_regex = re.compile(r"(.*)\s\((\d{4})\)")

season_name_info = [
    "_Season",
]

def get_assets_files(assets_paths, asset_folders):
    assets = {'movies': [], 'series': [], 'collections': []}
    
    print("Getting assets files..., this may take a while.")
    for assets_path in assets_paths:
        files = os.listdir(assets_path)
        files = sorted(files, key=lambda x: x.lower())

        if not asset_folders:
            for file in tqdm(files, desc=f'Sorting assets', total=len(files)):
                
                if file.startswith('.'):
                    continue
                base_name, extension = os.path.splitext(file)
                if not re.search(r'\(\d{4}\)', base_name):
                    assets['collections'].append({
                        'title': base_name,
                        'files': file,
                        'source': assets_path
                    })
                else:
                    if any(file.startswith(base_name) and any(season_name in file for season_name in season_name_info) for file in files) and not any(season_name in file for season_name in season_name_info):
                        season_files = [file for file in files if file.startswith(base_name) and any(season_name in file for season_name in season_name_info)]
                        season_files.append(file)
                        season_files = sorted(season_files)
                        assets['series'].append({
                            'title': base_name,
                            'files': season_files,
                            'source': assets_path
                        })
                    elif any(season_name in file for season_name in season_name_info):
                        continue
                    else:
                        assets['movies'].append({
                            'title': base_name,
                            'files': file,
                            'source': assets_path
                        })
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
                        'title': title,
                        'files': files,
                        'source': root
                    })
                else:
                    if any("Season" in file for file in files):
                        assets['series'].append({
                            'title': title,
                            'files': files,
                            'source': root
                        })
                    else:
                        assets['movies'].append({
                            'title': title,
                            'files': files,
                            'source': root
                        })
    logger.debug("Assets:")
    logger.debug(json.dumps(assets, ensure_ascii=False, indent=4))
    return assets


def get_media_folders(media_paths):
    media = {'movies':[], 'series': []}
    print("Getting media folder information..., this may take a while.")

    for media_path in media_paths:
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
                            media['series'][-1]['season_number'].append(
                                sub_sub_folder.name)
                        else:
                            media['series'].append({
                                'title': subfolder.name,
                                'season_number': [],
                            })
                            media['series'][-1]['season_number'].append(
                                sub_sub_folder.name)
                if not any(sub_sub_folder.is_dir() for sub_sub_folder in Path(subfolder).iterdir()):
                    media['movies'].append({
                        'title': subfolder.name,
                    })
    logger.debug("Media Directories:")
    logger.debug(json.dumps(media, ensure_ascii=False, indent=4))
    return media


def match_assets(assets, media, dict_plex):
    asset_types = ['movies', 'series', 'collections']
    unmatched_posters = {asset_type: [] for asset_type in asset_types}
    for asset_type in asset_types:
        for asset in assets[asset_type]:
            if asset_type == 'collections':
                if not any(asset['title'] in c['title'] for c in dict_plex['collections']):
                    unmatched_posters[asset_type].append(asset)
            else:
                if not any(asset['title'] in m['title'] for m in media[asset_type]):
                    unmatched_posters[asset_type].append(asset)
    logger.debug("Unmatched Posters:")
    logger.debug(json.dumps(unmatched_posters, ensure_ascii=False, indent=4))
    return unmatched_posters

def remove_assets(asset_folders, unmatched_assets, dry_run):
    asset_types = ['movies', 'series', 'collections']
    messages = []
    for asset_type in asset_types:
        for asset in unmatched_assets[asset_type]:
            if asset_type == 'collections':
                if asset_folders:
                    for root, dirs, files in os.walk(asset['source']):
                        for dir in dirs:
                            if dir == asset['title']:
                                logger.debug(f"Removing {dir}")
                                if not dry_run:
                                    shutil.rmtree(os.path.join(root, dir))
                                messages.append(f"Removed {dir}")
                else:
                    logger.debug(f"Removing {os.path.join(asset['source'], asset['files'])}")
                    if not dry_run:
                        os.remove(os.path.join(asset['source'], asset['files']))
                        messages.append(f"Removed Path: {os.path.join(asset['source'], asset['files'])}")
                    messages.append(f"Would have removed {os.path.join(asset['source'], asset['files'])}")
            else:
                if asset_folders:
                    for root, dirs, files in os.walk(asset['source']):
                        for dir in dirs:
                            if dir == asset['title']:
                                logger.debug(f"Removing {dir}")
                                if not dry_run:
                                    shutil.rmtree(os.path.join(root, dir))
                                    messages.append(f"Removed {dir}")
                                messages.append(f"Would have removed {dir}")
                else:
                    # if files is a list then it is a series
                    if isinstance(asset['files'], list):
                        for file in asset['files']:
                            file_path = os.path.join(asset['source'], file)
                            logger.debug(f"Removing {os.path.join(asset['source'], file)}")
                            if not dry_run:
                                os.remove(file_path)
                            messages.append(f"Removed Path: {os.path.join(asset['source'], file)}")
                    else:
                        logger.debug(f"Removing {os.path.join(asset['source'], asset['files'])}")
                        if not dry_run:
                            os.remove(os.path.join(asset['source'], asset['files']))
                        messages.append(f"Removed Path: {os.path.join(asset['source'], asset['files'])}")
    return messages

def print_output(messages):
    count = 0
    for message in messages:
        logger.info(message)
        count += 1
    logger.info(f"Total number of assets removed: {count}")

def main():
    url = None
    api_key = None
    app = None
    library = None
    script_data = config.script_data
    print(json.dumps(script_data, indent=4))
    assets_paths = script_data['assets_paths']
    library_names = script_data['library_names']
    asset_folders = script_data['asset_folders']
    media_paths = script_data['media_paths']
    ignore_collections = script_data['ignore_collections']
    if config.dry_run:
        logger.info('*' * 40)
        logger.info(f'* {"Dry_run Activated":^36} *')
        logger.info('*' * 40)
        logger.info(f'* {" NO CHANGES WILL BE MADE ":^36} *')
        logger.info('*' * 40)
        logger.info('')
    logger.debug('*' * 40)
    logger.debug(f'* {"Script Settings":^36} *')
    logger.debug('*' * 40)
    logger.debug(f'{"Log level:":<20}{config.log_level if config.log_level else "Not set"}')
    logger.debug(f'{"Dry run:":<20}{config.dry_run}')
    logger.debug(f"{'Asset Folders: ':<20}{asset_folders}")
    logger.debug(f'{"Assets path:":<20}{assets_paths if assets_paths else "Not set"}')
    logger.debug(f'{"Media paths:":<20}{media_paths if media_paths else "Not set"}')
    logger.debug(f'{"Library names:":<20}{library_names if library_names else "Not set"}')
    logger.debug(f'{"Ignore collections:":<20}{ignore_collections if ignore_collections else "Not set"}')
    logger.debug('*' * 40)
    logger.debug('')
    if config.plex_data:
        for data in config.plex_data:
            api_key = data.get('api', '')
            url = data.get('url', '')
    if config.library_names:
        try:
            app = PlexServer(url, api_key)
        except:
            logger.error("Unable to connect to Plex server. Please check your config.yml.")
            sys.exit()
    else:
        logger.info("No library names specified in config.yml. Skipping Plex.")
        sys.exit()
    assets = get_assets_files(assets_paths, asset_folders)
    media = get_media_folders(media_paths)
    collections = []
    if library_names and app:
        for library_name in library_names:
            try:
                library = app.library.section(library_name)
                logger.debug(library)
                collections += library.collections()
            except BadRequest:
                logger.error(f"Library {library_name} not found.")
                sys.exit()
    else:
        logger.info(
            "No library names specified in config.yml. Skipping collections.")
    collection_names = [collection.title for collection in collections if collection.smart != True]
    logger.debug(json.dumps(collection_names, indent=4))
    dict_plex = {'collections': []}
    for collection in collection_names:
        sanitized_collection = illegal_chars_regex.sub('', collection)
        dict_plex['collections'].append({'title': sanitized_collection})
    unmatched_assets = match_assets(assets, media, dict_plex)
    message = remove_assets(asset_folders, unmatched_assets, config.dry_run)
    print_output(message)

if __name__ == "__main__":
    """
    Entry point for the script.
    """
    main()
