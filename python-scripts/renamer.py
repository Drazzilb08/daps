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
# Requirements: requests, tqdm, fuzzywuzzy
# Version: 3.0.2
# License: MIT License
# ===================================================================================================

from modules.config import Config
from modules.logger import Logger
from modules.plex import PlexInstance
from modules.validate import ValidateInput
from modules.radarr import RadarrInstance
from modules.sonarr import SonarrInstance
import os
from fuzzywuzzy import fuzz
from tqdm import tqdm
import re
import shutil

config = Config(script_name="renamer")
logger = Logger(config.log_level, "renamer")
year_regex = re.compile(r"\b(19|20)\d{2}\b")
illegal_chars_regex = re.compile(r"[^\w\s\-\(\)]+")

def match_collection(plex_collections, file, collection_threshold):
    file_name = os.path.splitext(file)[0]
    closest_match = None
    closest_score = 0
    for plex_collection in plex_collections:
        plex_collection = illegal_chars_regex.sub("", plex_collection)
        plex_collection_match = fuzz.token_sort_ratio(
            file_name, plex_collection)
        if plex_collection_match >= collection_threshold:
            return plex_collection, None
        elif plex_collection_match >= (collection_threshold - 5):
            if closest_score < plex_collection_match:
                closest_match = plex_collection
                closest_score = plex_collection_match
    if closest_match:
        return None, f"No match found, closest match for {file} was {closest_match} with a score of {closest_score}"
    else:
        return None, None

def match_media(media, file, threshold):
    file_name = re.split(r'\(\d{4}\)', file)[0].rstrip()
    year_match = re.search(r'\((\d{4})\)', file)
    year = year_match.group(1) if year_match else None
    year = int(year) if year else None
    closest_match = None
    closest_score = 0
    closest_year = None
    for matched_media in media:
        year_in_title = year_regex.search(matched_media['title'])
        matched_media_name = year_regex.sub("", matched_media['title']) if year_in_title else matched_media['title']
        matched_media_name = illegal_chars_regex.sub("", matched_media_name)
        matched_media_year = matched_media['year']
        matched_media_name_match = fuzz.token_sort_ratio(file_name, matched_media_name)
        if matched_media_name_match >= threshold and year == matched_media_year:
            return matched_media, None
        elif matched_media_name_match >= (threshold - 5) and year == matched_media_year:
            if closest_match is None or matched_media_name_match > closest_score:
                closest_match = matched_media
                closest_year = matched_media_year
                closest_score = matched_media_name_match
    if closest_match:
        return None, f"No match found, closest match for {file} was {closest_match['title']} ({closest_year}) with a score of {closest_score}"
    else:
        return None, None

def rename_file(matched_name, file, destination_dir, source_dir, dry_run, action_type, print_only_renames, destination_file_list):
    file_extension = os.path.splitext(file)[-1].lstrip('.')
    matched_name = matched_name + "." + file_extension
    destination = os.path.join(destination_dir, matched_name)
    source = os.path.join(source_dir, file)
    if matched_name in destination_file_list:
        return None
    if file != matched_name:
        if dry_run:
            message = f"{file} -> {matched_name}"
        else:
            if action_type == "move":
                shutil.move(source, destination)
            elif action_type == "copy":
                shutil.copy(source, destination)
            message = f"{file} -> {matched_name}"
        return message
    else:
        if not print_only_renames:
            if dry_run:
                message = f"{file} -->> {matched_name}"
            else:
                if action_type == "move":
                    shutil.move(source, destination)
                elif action_type == "copy":
                    shutil.copy(source, destination)
                message = f"{file} -->> {matched_name}"
            return message

def rename_movies(matched_movie, file, destination_dir, source_dir, dry_run, action_type, print_only_renames, destination_file_list):
    folder_path = matched_movie['folderName']
    if folder_path.endswith('/'):
        folder_path = folder_path[:-1]
    matched_movie = os.path.basename(folder_path)
    return rename_file(matched_movie, file, destination_dir, source_dir, dry_run, action_type, print_only_renames, destination_file_list)

def rename_series(matched_series, file, destination_dir, source_dir, dry_run, action_type, print_only_renames, destination_file_list):
    folder_path = matched_series['path']
    if folder_path.endswith('/'):
        folder_path = folder_path[:-1]
    matched_series = os.path.basename(folder_path)
    file_extension = os.path.splitext(file)[-1].lstrip('.')
    if "Season" in file:
        season_info = file.split("Season ")[1].split(".")[0]
        try:
            season_number = int(season_info)
        except ValueError:
            logger.error(
                f"Error: Cannot convert {season_info} to an integer in file {file}")
            return
        season_info = f"{season_number:02d}"
        matched_series = matched_series + "_Season" + season_info
    elif "Specials" in file:
        matched_series = matched_series + "_Season00"
    return rename_file(matched_series, file, destination_dir, source_dir, dry_run, action_type, print_only_renames, destination_file_list)

def get_assets_files(assets_path):
    series = set()
    movies = set()
    collections = set()

    print("Getting assets files..., this may take a while.")
    files = os.listdir(assets_path)
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
                f.lower().startswith(lowercase_base_name + " - specials"
                ))for f in files):
                base_name = base_name + extension
                series.add(base_name)
            elif re.search(r' - season| - specials', lowercase_base_name):
                base_name = base_name + extension
                series.add(base_name)
            else:
                base_name = base_name + extension
                movies.add(base_name)
    series = sorted(series)
    collections = sorted(collections)
    movies = sorted(movies)
    return list(series), list(collections), list(movies)

def process_instance(instance_type, instance_name, url, api_key, config, destination_file_list, final_output, asset_series, asset_collections, asset_movies):
    if instance_type == "Plex":
        if config.library_names:
            app = PlexInstance(url, api_key, logger)
            source_file_list = asset_collections
            collections = app.get_collections(config.library_names)
        else:
            message = f"Error: No library names specified for {instance_name}"
            final_output.append(message)
            return final_output
    elif instance_type == "Radarr":
        app = RadarrInstance(url, api_key, logger)
        source_file_list = asset_movies
        movies = app.get_movies()
    elif instance_type == "Sonarr":
        app = SonarrInstance(url, api_key, logger)
        source_file_list = asset_series
        series = app.get_series()
    for file in tqdm(source_file_list, desc=f'Processing {instance_name}', total=len(source_file_list)):
        if file in destination_file_list:
            continue
        matched_collection = None
        matched_movie = None
        matched_series = None
        if instance_type == "Plex":
            matched_collection, reason = match_collection(collections, file, config.collection_threshold)
        elif instance_type == "Radarr":
            matched_movie, reason = match_media(movies, file, config.movies_threshold)
        elif instance_type == "Sonarr":
            matched_series, reason = match_media(series, file, config.series_threshold)
        if matched_collection:
            message = rename_file(matched_collection, file, config.destination_dir, config.source_dir, config.dry_run, config.action_type, config.print_only_renames, destination_file_list)
            final_output.append(message)
        elif matched_movie:
            message = rename_movies(matched_movie, file, config.destination_dir, config.source_dir, config.dry_run, config.action_type, config.print_only_renames, destination_file_list)
            final_output.append(message)
        elif matched_series:
            message = rename_series(matched_series, file, config.destination_dir, config.source_dir, config.dry_run, config.action_type, config.print_only_renames, destination_file_list)
            final_output.append(message)
    return final_output

def main():
    final_output = []
    validate_input = ValidateInput(config.log_level, config.dry_run, config.source_dir, config.library_names, config.destination_dir, config.movies_threshold, config.series_threshold, config.collection_threshold, config.action_type, config.print_only_renames, logger)
    config.log_level, config.dry_run = validate_input.validate_script(logger)
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
    for instance_type, instance_data in [ ('Plex', config.plex_data), ('Radarr', config.radarr_data), ('Sonarr', config.sonarr_data)]:
        for instance in instance_data:
            instance_name = instance['name']
            try:
                if (instance_type == "Radarr" and config.radarr is not None and {'name': instance_name} in config.radarr) or (instance_type == "Sonarr" and config.sonarr is not None and {'name': instance_name} in config.sonarr) or (instance_type != "Radarr" and instance_type != "Sonarr" and config.plex_data is not None):
                    url = instance['url']
                    api_key = instance['api']
                else:
                    continue
            except TypeError as e:
                logger.error("An error occurred:", e)
                continue
            validate_input.validate_global(url, api_key, instance_name, instance_type)
            final_output.append('*' * 40)
            final_output.append(f'* {instance_name:^36} *')
            final_output.append('*' * 40)
            logger.debug(f'{" Settings ":*^40}')
            logger.debug(f"Instance Name: {instance_name}")
            logger.debug(f"URL: {url}")
            logger.debug(f"API Key: {'<redacted>' if api_key else 'None'}")
            final_output = process_instance(instance_type, instance_name, url, api_key, config, destination_file_list, final_output, asset_series, asset_collections, asset_movies)
            permissions = 0o777
            os.chmod(config.destination_dir, permissions)
            os.chmod(config.source_dir, permissions)
    for message in final_output:
        if message == None:
            continue
        logger.info(message)

if __name__ == "__main__":
    main()