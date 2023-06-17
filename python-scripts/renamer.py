#   _____                                      _____
#  |  __ \                                    |  __ \
#  | |__) |___ _ __   __ _ _ __ ___   ___ _ __| |__) |   _
#  |  _  // _ \ '_ \ / _` | '_ ` _ \ / _ \ '__|  ___/ | | |
#  | | \ \  __/ | | | (_| | | | | | |  __/ |  | |   | |_| |
#  |_|  \_\___|_| |_|\__,_|_| |_| |_|\___|_|  |_|    \__, |
#                                                     __/ |
#                                                    |___/
# ===================================================================================================
# Author: Drazzilb
# Description: This script will check for unmatched assets in your Plex library.
#              It will output the results to a file in the logs folder.
# Usage: python3 renamer.py
# Requirements: requests, tqdm, fuzzywuzzy, pyyaml
# Version: 3.0.11
# License: MIT License
# ===================================================================================================

from modules.config import Config
from modules.logger import setup_logger
from modules.plex import PlexInstance
from modules.arrpy import StARR
import os
import sys
from fuzzywuzzy import fuzz
from tqdm import tqdm
import re
import shutil

config = Config(script_name="renamer")
logger = setup_logger(config.log_level, "renamer")
year_regex = re.compile(r"\((19|20)\d{2}\)")
illegal_chars_regex = re.compile(r"[^\w\s\-\(\)/.'’]+")

def match_collection(plex_collections, file, collection_threshold):
    try:
        file_name = os.path.splitext(file)[0]
        for plex_collection in plex_collections:
            plex_collection = illegal_chars_regex.sub("", plex_collection)
            plex_collection_match = fuzz.token_sort_ratio(
                file_name, plex_collection)
            if plex_collection_match >= collection_threshold:
                return plex_collection
        return None
    except Exception as e:
        logger.error(f"Error: {e}")
        exc_type, exc_obj, tb = sys.exc_info()
        if tb is not None:
            logger.error(f"Error: {exc_type}, {tb.tb_lineno}")
        return None

def match_media(media, file, threshold):
    try:
        file_name = re.split(r'\(\d{4}\)', file)[0].rstrip()
        year_match = re.search(r'\((\d{4})\)', file)
        year = year_match.group(1) if year_match else None
        year = int(year) if year else None
        for matched_media in media:
            year_in_title = year_regex.search(matched_media['title'])
            matched_media_name = year_regex.sub("", matched_media['title']) if year_in_title else matched_media['title']
            matched_media_name = illegal_chars_regex.sub("", matched_media_name)
            matched_media_year = matched_media['year']
            matched_media_name_match = fuzz.token_sort_ratio(file_name, matched_media_name)
            if matched_media_name_match >= threshold and year != matched_media_year:
                logger.debug(f"Found a possible match: {matched_media_name} ({matched_media_year})")
            if matched_media_name_match >= threshold and year == matched_media_year:
                return matched_media
        return None
    except Exception as e:
        logger.error(f"Error: {e}")
        exc_type, exc_obj, tb = sys.exc_info()
        if tb is not None:
            logger.error(f"Error: {exc_type}, {tb.tb_lineno}")
        return None

def rename_file(matched_name, file, destination_dir, source_dir, dry_run, action_type, print_only_renames, destination_file_list):
    file_extension = os.path.splitext(file)[-1].lstrip('.')
    matched_name = matched_name + "." + file_extension
    destination = os.path.join(destination_dir, matched_name)
    source = os.path.join(source_dir, file)
    if matched_name in destination_file_list and action_type == "copy":
        return None
    if file != matched_name:
        if dry_run:
            message = f"{file} -> {matched_name}"
        else:
            try:
                if action_type == "move":
                    shutil.move(source, destination)
                elif action_type == "copy":
                    shutil.copy(source, destination)
                message = f"{file} -> {matched_name}"
            except Exception as e:
                logger.error(f"Error: {e}")
                exc_type, exc_obj, tb = sys.exc_info()
                if tb is not None:
                    logger.error(f"Error: {exc_type}, {tb.tb_lineno}")
                return None
        return message
    else:
        if not print_only_renames:
            if dry_run:
                message = f"{file} -->> {matched_name}"
            else:
                try:
                    if action_type == "move":
                        shutil.move(source, destination)
                    elif action_type == "copy":
                        shutil.copy(source, destination)
                    message = f"{file} -->> {matched_name}"
                except Exception as e:
                        logger.error(f"Error: {e}")
                        exc_type, exc_obj, tb = sys.exc_info()
                        if tb is not None:
                            logger.error(f"Error: {exc_type}, {tb.tb_lineno}")
                        return None
            return message

def rename_movies(matched_movie, file, destination_dir, source_dir, dry_run, action_type, print_only_renames, destination_file_list):
    try:
        folder_path = matched_movie['folderName']
        if folder_path.endswith('/'):
            folder_path = folder_path[:-1]
        matched_movie = os.path.basename(folder_path)
        return rename_file(matched_movie, file, destination_dir, source_dir, dry_run, action_type, print_only_renames, destination_file_list)
    except Exception as e:
            logger.error(f"Error: {e}")
            exc_type, exc_obj, tb = sys.exc_info()
            if tb is not None:
                logger.error(f"Error: {exc_type}, {tb.tb_lineno}")
            return None

def rename_series(matched_series, file, destination_dir, source_dir, dry_run, action_type, print_only_renames, destination_file_list):
    try:
        folder_path = matched_series['path']
        if folder_path.endswith('/'):
            folder_path = folder_path[:-1]
        matched_series = os.path.basename(folder_path)
        if "Season" in file:
            season_info = file.split("Season")[1].split(".")[0]
            try:
                season_number = int(season_info)
            except ValueError as e:
                logger.error(
                    f"Error: Cannot convert {season_info} to an integer in file {file}. {e}")
                exc_type, exc_obj, exc_tb = sys.exc_info()
                if exc_tb is not None:
                    logger.error(f"Error: {exc_type}, {exc_tb.tb_lineno}")
                return
            season_info = f"{season_number:02d}"
            matched_series = matched_series + "_Season" + season_info
        elif "Specials" in file:
            matched_series = matched_series + "_Season00"
        return rename_file(matched_series, file, destination_dir, source_dir, dry_run, action_type, print_only_renames, destination_file_list)
    except Exception as e:
        logger.error(f"Error: {e}")
        exc_type, exc_obj, exc_tb = sys.exc_info()
        if exc_tb is not None:
            logger.error(f"Error: {exc_type}, {exc_tb.tb_lineno}")

def get_assets_files(assets_path):
    series = set()
    movies = set()
    collections = set()

    try:
        print("Getting assets files..., this may take a while.")
        files = os.listdir(assets_path)
    except FileNotFoundError:
        logger.error(f"Error: {assets_path} not found.")
        exc_type, exc_obj, exc_tb = sys.exc_info()
        logger.error(f"Error: {exc_type}")
        if exc_tb is not None:
            logger.error(f"Line number: {exc_tb.tb_lineno}")
        sys.exit(1)

    for file in tqdm(files, desc=f'Sorting assets', total=len(files)):
        base_name, extension = os.path.splitext(file)
        lowercase_base_name = base_name.lower()
        if not re.search(r'\(\d{4}\)', lowercase_base_name):
            base_name = base_name + extension
            collections.add(base_name)
        else:
            if any((
                lowercase_base_name == f.lower() or 
                f.lower().startswith(lowercase_base_name + " - season") or 
                f.lower().startswith(lowercase_base_name + " - specials") or 
                lowercase_base_name == f.lower() or 
                f.lower().startswith(lowercase_base_name + "_season")
                ) for f in files):
                base_name = base_name + extension
                series.add(base_name)
            elif re.search(r' - season| - specials', lowercase_base_name):
                base_name = base_name + extension
                series.add(base_name)
            elif re.search(r'_season', lowercase_base_name):
                base_name = base_name + extension
                series.add(base_name)
            else:
                base_name = base_name + extension
                movies.add(base_name)
    series = sorted(series)
    collections = sorted(collections)
    movies = sorted(movies)
    return list(series), list(collections), list(movies)

def process_instance(instance_type, instance_name, url, api, destination_file_list, final_output, asset_series, asset_collections, asset_movies):
    source_file_list = []
    collections = []
    media = []
    try:
        if instance_type == "Plex":
            if config.library_names:
                app = PlexInstance(url, api, logger)
                source_file_list = asset_collections
                collections = app.get_collections(config.library_names)
            else:
                message = f"Error: No library names specified for {instance_name}"
                final_output.append(message)
                return final_output
        else: 
            app = StARR(url, api, logger)
            media = app.get_media()
            if instance_type == "Radarr":
                source_file_list = asset_movies
            elif instance_type == "Sonarr":
                source_file_list = asset_series
        for file in tqdm(source_file_list, desc=f'Processing {instance_name}', total=len(source_file_list)):
            if file in destination_file_list and config.action_type == "copy":
                continue
            matched_collection = None
            matched_movie = None
            matched_series = None
            if instance_type == "Plex":
                matched_collection = match_collection(collections, file, config.collection_threshold)
            elif instance_type == "Radarr":
                matched_movie = match_media(media, file, config.movies_threshold)
            elif instance_type == "Sonarr":
                matched_series = match_media(media, file, config.series_threshold)
            if matched_collection:
                message = rename_file(matched_collection, file, config.destination_dir, config.source_dir, config.dry_run, config.action_type, config.print_only_renames, destination_file_list)
                final_output.append(message)
                source_file_list[source_file_list.index(file)] = ""
            elif matched_movie:
                message = rename_movies(matched_movie, file, config.destination_dir, config.source_dir, config.dry_run, config.action_type, config.print_only_renames, destination_file_list)
                final_output.append(message)
                source_file_list[source_file_list.index(file)] = ""
            elif matched_series:
                message = rename_series(matched_series, file, config.destination_dir, config.source_dir, config.dry_run, config.action_type, config.print_only_renames, destination_file_list)
                final_output.append(message)
                source_file_list[source_file_list.index(file)] = ""
        return final_output
    except Exception as e:
        exc_type, exc_obj, exc_tb = sys.exc_info()
        final_output.append(f"Error processing {instance_name}: {e} on line {exc_tb.tb_lineno if exc_tb else None}")
        return final_output

def main():
    final_output = []
    destination_file_list = sorted(os.listdir(config.destination_dir), key=lambda x: x.lower())
    logger.debug('*' * 40)
    logger.debug(f'* {"Script Input Validated":^36} *')
    logger.debug('*' * 40)
    logger.debug(f'{" Script Settings ":*^40}')
    logger.debug(f'Dry_run: {config.dry_run}')
    logger.debug(f"Log Level: {config.log_level}")
    logger.debug(f"library_names: {config.library_names}")
    logger.debug(f"source_dir: {config.source_dir}")
    logger.debug(f"destination_dir: {config.destination_dir}")
    logger.debug(f"movies_threshold: {config.movies_threshold}")
    logger.debug(f"series_threshold: {config.series_threshold}")
    logger.debug(f"collection_threshold: {config.collection_threshold}")
    logger.debug(f"action_type: {config.action_type}")
    logger.debug(f"print_only_renames: {config.print_only_renames}")
    logger.debug(f'*' * 40)
    logger.debug('')
    if config.dry_run:
        logger.info('*' * 40)
        logger.info(f'* {"Dry_run Activated":^36} *')
        logger.info('*' * 40)
        logger.info(f'* {" NO CHANGES WILL BE MADE ":^36} *')
        logger.info('*' * 40)
        logger.info('')
    asset_series, asset_collections, asset_movies = get_assets_files(config.source_dir)
    instance_data = {
        'Plex': config.plex_data,
        'Radarr': config.radarr_data,
        'Sonarr': config.sonarr_data
    }

    for instance_type, instances in instance_data.items():
        for instance in instances:
            instance_name = instance['name']
            url = instance['url']
            api = instance['api']
            script_name = None
            if instance_type == "Radarr" and config.radarr:
                data = next((data for data in config.radarr if data['name'] == instance_name), None)
                if data:
                    script_name = data['name']
            elif instance_type == "Sonarr" and config.sonarr:
                data = next((data for data in config.sonarr if data['name'] == instance_name), None)
                if data:
                    script_name = data['name']
            elif instance_type == "Plex":
                script_name = instance_name
            if script_name and instance_name == script_name:
                final_output.append('*' * 40)
                final_output.append(f'* {instance_name:^36} *')
                final_output.append('*' * 40)
                logger.debug(f'{" Settings ":*^40}')
                logger.debug(f"Instance Name: {instance_name}")
                logger.debug(f"URL: {url}")
                logger.debug(f"API Key: {'<redacted>' if api else 'None'}")
                final_output = process_instance(instance_type, instance_name, url, api, destination_file_list, final_output, asset_series, asset_collections, asset_movies)
                permissions = 0o777
                os.chmod(config.destination_dir, permissions)
                os.chmod(config.source_dir, permissions)
    for message in final_output:
        if message == None:
            continue
        logger.info(message)

if __name__ == "__main__":
    main()