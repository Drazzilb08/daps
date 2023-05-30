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
# Requirements: requests, tqdm
# Version: 3.0.1
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

def match_collection(plex_collections, file, collection_threshold):
    file_name = os.path.splitext(file)[0]
    logger.debug(f'file_name: {file_name}')
    closest_match = None
    closest_score = 0
    for plex_collection in plex_collections:
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
    
def rename_collections(matched_collection, file, destination_dir, source_dir, dry_run, action_type, print_only_renames, destination_file_list):
    file_extension = os.path.basename(file).split(".")[-1]
    matched_collection = matched_collection + "." + file_extension
    matched_collection = remove_illegal_chars(matched_collection)
    destination = os.path.join(destination_dir, matched_collection)
    source = os.path.join(source_dir, file)
    if file != matched_collection:
        if matched_collection not in destination_file_list:
            if dry_run:
                message = f"{file} -> {matched_collection}"
                return message
            else:
                if action_type == "move":
                    shutil.move(source, destination)
                elif action_type == "copy":
                    shutil.copy(source, destination)
                message = f"{file} -> {matched_collection}"
                return message
    else:
        if print_only_renames == False:
            if dry_run:
                message = f"{file} -->> {matched_collection}"
                return message
            else:
                if action_type == "move":
                    shutil.move(source, destination)
                elif action_type == "copy":
                    shutil.copy(source, destination)
                    message = f"{file} -->> {matched_collection}"
                return message

def remove_illegal_chars(string):
    illegal_characters = re.compile(r'[\\/:*?"<>|\0]')
    return illegal_characters.sub("", string)

def match_movies(movies, file, movies_threshold):
    if " - Season" in file or " - Special" in file:
        return None, f"File {file} ignored because it contains 'Season' or 'Special'"
    year = None
    best_match = None
    closest_match = None
    closest_score = 0
    logger.debug(f'File Name: {file}')
    file_name = file.split("(")[0].rstrip()
    logger.debug(f'Movie Name: {file_name}')
    year_match = re.search(r'\((\d{4})\)', file)
    if year_match:
        year = year_match.group(1)
        logger.debug(f'Year: {year}')
    else:
        logger.debug("Year not found")
    year = str(year)
    for matched_movie in movies:
        year_in_title = re.search(r'\((\d{4})\)', matched_movie['title'])
        if year_in_title:
            matched_movie_name = matched_movie['title'].split("(")[0].rstrip()
        else:
            matched_movie_name = matched_movie['title']
        matched_movie_name = remove_illegal_chars(matched_movie_name)
        matched_movie_year = matched_movie['year']
        matched_movie_year = str(matched_movie_year)
        matched_movie_name_match = fuzz.token_sort_ratio(file_name, matched_movie_name)
        if matched_movie_name_match >= movies_threshold:
            if year == matched_movie_year:
                best_match = matched_movie
                break
        elif matched_movie_name_match >= (movies_threshold - 5):
            if year == matched_movie_year:
                if closest_score < matched_movie_name_match:
                    closest_match = matched_movie
                    closest_year = matched_movie_year
                    closest_score = matched_movie_name_match
    if best_match:
        return best_match, None
    elif closest_match:
        return None, f"No match found, closest match for {file} was {closest_match['title']} ({closest_year}) with a score of {closest_score}"
    else:
        return None, None

def rename_movies(matched_movie, file, destination_dir, source_dir, dry_run, action_type, print_only_renames, destination_file_list):
    folder_path = matched_movie['folderName']
    file = file.replace("_", "")
    if folder_path.endswith('/'):
        folder_path = folder_path[:-1]
    matched_movie = os.path.basename(folder_path)
    file_extension = os.path.basename(file).split(".")[-1]
    matched_movie = matched_movie + "." + file_extension
    destination = os.path.join(destination_dir, matched_movie)
    source = os.path.join(source_dir, file)
    if file != matched_movie:
        if matched_movie not in destination_file_list:
            if dry_run:
                message = f"{file} -> {matched_movie}"
                return message
            else:
                if action_type == "move":
                    shutil.move(source, destination)
                elif action_type == "copy":
                    shutil.copy(source, destination)
                message = f"{file} -> {matched_movie}"
                return message
    else:
        if print_only_renames == False:
            if dry_run:
                message = f"{file} -->> {matched_movie}"
                return message
            else:
                if action_type == "move":
                    shutil.move(source, destination)
                elif action_type == "copy":
                    shutil.copy(source, destination)
                message = f"{file} -->> {matched_movie}"
                return message
            
def match_series(series, file, series_threshold):
    year = None
    best_match = None
    closest_match = None
    closest_score = 0
    file = file.replace("_", "")
    logger.debug(f'File Name: {file}')
    file_name = re.split(r'\(\d{4}\)', file)[0].rstrip()
    logger.debug(f'Series Name: {file_name}')
    year_match = re.search(r'\((\d{4})\)', file)
    if year_match:
        year = year_match.group(1)
        logger.debug(f'Year: {year}')
    else:
        logger.debug("Year not found")
    year = str(year)
    for matched_series in series:
        year_in_title = re.search(r'\((\d{4})\)', matched_series['title'])
        if year_in_title:
            matched_series_name = matched_series['title'].split("(")[0].rstrip()
        else:
            matched_series_name = matched_series['title']
        matched_series_name = remove_illegal_chars(matched_series_name)
        matched_series_year = matched_series['year']
        matched_series_year = str(matched_series_year)
        matched_series_name_match = fuzz.token_sort_ratio(file_name, matched_series_name)
        if matched_series_name_match >= series_threshold:
            if year == matched_series_year:
                best_match = matched_series
                break
        elif matched_series_name_match >= (series_threshold - 5):
            if year == matched_series_year:
                if closest_score < matched_series_name_match:
                    closest_match = matched_series
                    closest_year = matched_series_year
                    closest_score = matched_series_name_match
    if best_match:
        return best_match, None
    elif closest_match:
        return None, f"No match found, closest match for {file} was {closest_match['title']} ({closest_year}) with a score of {closest_score}"
    else:
        return None, None
    
def rename_series(matched_series, file, destination_dir, source_dir, dry_run, action_type, print_only_renames, destination_file_list):
    folder_path = matched_series['path']
    if folder_path.endswith('/'):
        folder_path = folder_path[:-1]
    matched_series = os.path.basename(folder_path)
    file_extension = os.path.basename(file).split(".")[-1]
    if "_Season" in file:
        show_name, season_info = file.split("_Season")
        if show_name == matched_series:
            matched_series = show_name + "_Season" + season_info
        else:
            matched_series = matched_series + "_Season" + season_info
    else:
        if "Season" in file:
            season_info = file.split("Season ")[1].split(".")[0]
            try:
                season_number = int(season_info)
            except ValueError:
                logger.error(
                    f"Error: Cannot convert {season_info} to an integer in file {file}")
                return
            if season_number < 10:
                matched_series = matched_series + \
                    "_Season0" + season_info + "." + file_extension
            elif season_number >= 10:
                matched_series = matched_series + \
                    "_Season" + season_info + "." + file_extension
        elif "Specials" in file:
            matched_series = matched_series + "_Season00" + "." + file_extension
        else:
            matched_series = matched_series + "." + file_extension
    destination = os.path.join(destination_dir, matched_series)
    source = os.path.join(source_dir, file)
    if file != matched_series:
        if matched_series not in destination_file_list:
            if dry_run:
                message = f"{file} -> {matched_series}"
                return message
            else:
                if action_type == "move":
                    shutil.move(source, destination)
                elif action_type == "copy":
                    shutil.copy(source, destination)
                message = f"{file} -> {matched_series}"
                return message
    else:
        if print_only_renames == False:
            if dry_run:
                message = f"{file} -->> {matched_series}"
                return message
            else:
                if action_type == "move":
                    shutil.move(source, destination)
                elif action_type == "copy":
                    shutil.copy(source, destination)
                message = f"{file} -->> {matched_series}"
                return message
            
def process_instance(instance_type,instance_name, url, api_key, config, destination_file_list, final_output, asset_series, asset_collections, asset_movies):
    matched_collection = None
    matched_movie = None
    matched_series = None
    if instance_type == "Plex":
        app = PlexInstance(url, api_key)
        source_file_list = asset_collections
    elif instance_type == "Radarr":
        app = RadarrInstance(url, api_key)
        source_file_list = asset_movies
    elif instance_type == "Sonarr":
        app = SonarrInstance(url, api_key)
        source_file_list = asset_series
    if instance_type == "Plex":
        collections = app.get_collections(config.library_names)
    elif instance_type == "Radarr":
        movies = app.get_movies()
    elif instance_type == "Sonarr":
        series = app.get_series()
    for file in tqdm(source_file_list, desc=f'Processing {instance_name}', total=len(source_file_list)):
        if file in destination_file_list:
            continue
        if instance_type == "Plex":
            matched_collection, reason = match_collection(collections, file, config.collection_threshold)
        elif instance_type == "Radarr":
            matched_movie, reason = match_movies(movies, file, config.movies_threshold)
        elif instance_type == "Sonarr":
            matched_series, reason = match_series(series, file, config.series_threshold)
        if matched_collection:
            message = rename_collections(matched_collection, file, config.destination_dir, config.source_dir, config.dry_run, config.action_type, config.print_only_renames, destination_file_list)
            final_output.append(message)
        elif matched_movie:
            message = rename_movies(matched_movie, file, config.destination_dir, config.source_dir, config.dry_run, config.action_type, config.print_only_renames, destination_file_list)
            final_output.append(message)
        elif matched_series:
            message = rename_series(matched_series, file, config.destination_dir, config.source_dir, config.dry_run, config.action_type, config.print_only_renames, destination_file_list)
            final_output.append(message)
    return final_output

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
    for file in assets_path:
        lowercase_file_name = file.lower()
        if not re.search(r'\(\d{4}\)', lowercase_file_name):
            collections.add(file)
        else:
            if any(lowercase_file_name in f.lower() and (" - season" in f.lower() or "specials" in f.lower()) for f in assets_path):
                series.add(file)
            elif re.search(r' - season\d{2}|specials', lowercase_file_name):
                series.add(file)
            else:
                movies.add(file)
    
    series = sorted(series)
    collections = sorted(collections)
    movies = sorted(movies)
    return list(series), list(collections), list(movies)

def main():
    final_output = []
    validate_input = ValidateInput(config.log_level, config.dry_run, config.source_dir, config.library_names, config.destination_dir, config.movies_threshold, config.series_threshold, config.collection_threshold, config.action_type, config.print_only_renames)
    config.log_level, config.dry_run = validate_input.validate_script(script_name = "renamer")
    source_file_list = sorted(os.listdir(config.source_dir), key=lambda x: x.lower())
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
    asset_series, asset_collections, asset_movies = get_assets_files(source_file_list)
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
            final_output = process_instance(instance_type,instance_name, url, api_key, config, destination_file_list, final_output, asset_series, asset_collections, asset_movies)
            permissions = 0o777
            os.chmod(config.destination_dir, permissions)
            os.chmod(config.source_dir, permissions)
    for message in final_output:
        if message == None:
            continue
        logger.info(message)

if __name__ == "__main__":
    main()