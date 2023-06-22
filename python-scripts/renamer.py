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
# Note: There is a limitation to how this script works with regards to it matching series assets the 
#       main series poster requires seasonal posters to be present. If you have a series that does 
#       not have a seasonal poster then it will not match the series poster.
# Note: If you're not seeing a movie/show show up as match, chances are it could be due to the 
#       following reasons:
#       1. The threshold is too high. Try lowering it.
#        - One thing to do before changing the threshold is to check for "Almost Matches"
#          These are matches that are close to the threshold but with 10 points less.
#          To check for "Almost Matches" Set logging level to debug and run the script.
#          Debug logs are quite verbose so it may require some digging. Good ol Ctrl+F is your friend.
#        - The default threshold is 96, This is what I've found to be the best balance between
#          accuracy and false positives. If you're getting too many false positives, try raising
#          the threshold. If you're not getting enough matches, try lowering the threshold.
#       2. The movie/show's naming scheme is not conducive to matching. Try renaming it per Trash's Guides
#          - Radarr: https://trash-guides.info/Radarr/Radarr-recommended-naming-scheme/
#          - Sonarr: https://trash-guides.info/Sonarr/Sonarr-recommended-naming-scheme/
#       3. Finally the years may be off, from time to time TVDB and/or TMDB may have an entry put onto their
#          site with the wrong year. During that time you may have added a movie/show to your library. 
#          Since then the year has been corrected on TVDB/TMDB but your media still has the wrong year. 
# Requirements: requests, tqdm, fuzzywuzzy, pyyaml
# Version: 4.0.0
# License: MIT License
# ===================================================================================================

from modules.config import Config
from modules.logger import setup_logger
from plexapi.server import PlexServer
from modules.arrpy import StARR
import os
import json
import sys
from fuzzywuzzy import fuzz
from fuzzywuzzy import process
from tqdm import tqdm
import re
import shutil
from unidecode import unidecode

config = Config(script_name="renamer")
logger = setup_logger(config.log_level, "renamer")
year_regex = re.compile(r"\((19|20)\d{2}\)")
illegal_chars_regex = re.compile(r'[<>:"/\\|?*\x00-\x1f]+')


season_name_info = [
    " - Season",
    " - Specials",
    "_Season"
]

def scorer(s1, s2, force_ascii=True, full_process=True):
    return fuzz.ratio(s1, s2)

def match_collection(plex_collections, source_file_list, collection_threshold):
    matched_collections = {}
    almost_matched = {}
    for collection in tqdm(plex_collections, desc="Matching collections", total=len(plex_collections)):
        if collection == "Collectionless":
            continue
        collection = illegal_chars_regex.sub('', collection)
        best_match = process.extractOne(collection, source_file_list.keys(), scorer=scorer)
        if best_match and best_match[1] >= collection_threshold:
            matched_collections[collection] = {'files': source_file_list[best_match[0]]['files'], 'score': best_match[1]}
        if best_match and collection_threshold - 10 <= best_match[1] < collection_threshold:
            logger.debug(f"Almost matched collection: {collection} with score: {best_match[1]}")
            almost_matched[collection] = {'files': source_file_list[best_match[0]]['files'], 'score': best_match[1]}
    logger.debug(f"Matched collections: {json.dumps(matched_collections, ensure_ascii=False, indent=4)}")
    logger.debug(f"Almost matched collections: {json.dumps(almost_matched, ensure_ascii=False, indent=4)}")
    return matched_collections

def match_media(media, source_file_list, threshold):
    matched_media = {}
    almost_matched = {}
    not_matched = {}  
    for item in tqdm(media, desc="Matching media", total=len(media)):
        title = item['title']
        title = year_regex.sub('', title)
        title = illegal_chars_regex.sub('', title)
        title = unidecode(title)
        year = item['year']
        path = item['path']
        folder = os.path.basename(os.path.normpath(path))
        folder_without_year = year_regex.sub('', folder)
        title_match = process.extractOne(title, source_file_list.keys(), scorer=scorer)
        path_match = process.extractOne(folder_without_year, source_file_list.keys(), scorer=scorer)
        if title_match and path_match:
            if title_match[1] >= path_match[1]:
                best_match = title_match
            else:
                best_match = path_match
        elif title_match:
            best_match = title_match
        elif path_match:
            best_match = path_match
        else:
            best_match = None
        if best_match and best_match[1] >= threshold:
            source_file_list_year = source_file_list[best_match[0]]['year']
            if source_file_list_year == year:
                matched_media[folder] = {'files': source_file_list[best_match[0]]['files'], 'score': best_match[1]}
        elif best_match and threshold - 5 <= best_match[1] < threshold:
            source_file_list_year = source_file_list[best_match[0]]['year']
            if source_file_list_year == year:
                almost_matched[folder] = {'files': source_file_list[best_match[0]]['files'], 'score': best_match[1]}
        elif best_match and threshold - 10 <= best_match[1] < threshold:
            not_matched[folder] = {'files': source_file_list[best_match[0]]['files'], 'score': best_match[1]}
    logger.debug(f"Not matched media: {json.dumps(not_matched, ensure_ascii=False, indent=4)}")
    logger.debug(f"Matched media: {json.dumps(matched_media, ensure_ascii=False, indent=4)}")
    logger.debug(f"Almost matched media: {json.dumps(almost_matched, ensure_ascii=False, indent=4)}")
    return matched_media

def rename_file(matched_media, destination_dir, source_dir, dry_run, action_type, print_only_renames, destination_file_list):
    messages = []
    for media in tqdm(matched_media, desc="Renaming files", total=len(matched_media)):
        for file in matched_media[media]['files']:
            source_file_path = os.path.join(source_dir, file)
            file_extension = os.path.splitext(file)[1]
            old_file_name = file
            if any(word in file for word in season_name_info):
                season_number = re.search(r"Season (\d+)", file)
                if season_number:
                    season_number = season_number.group(1)
                    season_number = season_number.zfill(2)
                    new_file_name = f"{media}_Season{season_number}{file_extension}"
                elif season_number := re.search(r"Season (\d\d)", file):
                    season_number = season_number.group(1)
                    new_file_name = f"{media}_Season{season_number}{file_extension}"
                elif " - Specials" in file:
                    new_file_name = f"{media}_Season00{file_extension}"
                elif "_Season" in file:
                    new_file_name = file
                else:
                    logger.error(f"Unable to find season number for {file}")
                    continue
            else:
                new_file_name = f"{media}{file_extension}"
            destination_file_path = os.path.join(destination_dir, new_file_name)
            if new_file_name in destination_file_list and action_type == 'copy':
                logger.debug(f"Destination file already exists: {destination_file_path}")
                continue
            if new_file_name != old_file_name:
                if dry_run:
                    messages.append(f"Action Type: {action_type.capitalize()}: {old_file_name} -> {new_file_name}")
                else:
                    if action_type == 'copy':
                        try:
                            shutil.copyfile(source_file_path, destination_file_path)
                        except OSError as e:
                            logger.error(f"Unable to copy file: {e}")
                    elif action_type == 'move':
                        try:
                            shutil.move(source_file_path, destination_file_path)
                        except OSError as e:
                            logger.error(f"Unable to move file: {e}")
                    elif action_type == 'hardlink':
                        try:
                            os.link(source_file_path, destination_file_path)
                        except OSError as e:
                            logger.error(f"Unable to create hardlink: {e}")
                    else:
                        logger.error(f"Unknown action type: {action_type}")
                    messages.append(f"Action Type: {action_type.capitalize()}: {old_file_name} -> {new_file_name}")
            else:
                if not print_only_renames:
                    if dry_run:
                        messages.append(f"Action Type: {action_type.capitalize()}: {old_file_name} -->> {new_file_name}")
                    else:
                        if action_type == 'copy':
                            try:
                                shutil.copyfile(source_file_path, destination_file_path)
                            except OSError as e:
                                logger.error(f"Unable to copy file: {e}")
                        elif action_type == 'move':
                            try:
                                shutil.move(source_file_path, destination_file_path)
                            except OSError as e:
                                logger.error(f"Unable to move file: {e}")
                        elif action_type == 'hardlink':
                            try:
                                os.link(source_file_path, destination_file_path)
                            except OSError as e:
                                logger.error(f"Unable to create hardlink: {e}")
                        else:
                            logger.error(f"Unknown action type: {action_type}")
                        messages.append(f"Action Type: {action_type.capitalize()}: {old_file_name} -->> {new_file_name}")
    return messages

def get_assets_files(assets_path):
    series = {}
    movies = {}
    collections = {}

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
        if file.startswith('.'):
            continue
        base_name, extension = os.path.splitext(file)
        if not re.search(r'\(\d{4}\)', base_name):
            collections[base_name] = {'year': None, 'files': []}
            collections[base_name]['files'].append(file)
        else:
            match = re.search(r'\((\d{4})\)', base_name)
            year = int(match.group(1)) if match else None
            title = base_name.replace(f'({year})', '').strip()
            title = unidecode(title)
            if any(title in file and any(season_name in file for season_name in season_name_info) for file in files):
                if title in series:
                    series[title]['files'].append(file)
                else:
                    series[title] = {'year': year, 'files': []}
                    series[title]['files'].append(file)
            elif any(word in file for word in season_name_info):
                title_without_series_info = title
                for season_name in season_name_info:
                    if season_name in file:
                        title_without_series_info = title.split(season_name)[0].strip()
                if title_without_series_info in series:
                    series[title_without_series_info]['files'].append(file)
                else:
                    series[title_without_series_info] = {'year': year, 'files': []}
                    series[title_without_series_info]['files'].append(file)
            else:
                movies[title] = {'year': year, 'files': []}
                movies[title]['files'].append(file)
    collections = dict(sorted(collections.items()))
    movies = dict(sorted(movies.items()))
    series = dict(sorted(series.items()))
    return series, collections, movies

def process_instance(instance_type, instance_name, url, api, destination_file_list, final_output, asset_series, asset_collections, asset_movies):
    source_file_list = []
    collections = []
    media = []
    collection_names = []
    try:
        if instance_type == "Plex":
            if config.library_names:
                app = PlexServer(url, api)
                source_file_list = asset_collections
                for library_name in config.library_names:
                    library = app.library.section(library_name)
                    collections += library.collections()
                collection_names = [collection.title for collection in collections if collection.smart != True]
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
        # logger.debug(f"source_file_list: {json.dumps(source_file_list, ensure_ascii=False, indent=4)}")
        matched_media = []
        if instance_type == "Plex":
            matched_media = match_collection(collection_names, source_file_list, config.collection_threshold)
        elif instance_type == "Radarr" or instance_type == "Sonarr":
            matched_media = match_media(media, source_file_list, config.movies_threshold)
        if matched_media:
            message = rename_file(matched_media, config.destination_dir, config.source_dir, config.dry_run, config.action_type, config.print_only_renames, destination_file_list)
            final_output.extend(message)
        else:
            message = f"No matches found for {instance_name}"
            final_output.append(message)
        return final_output
    except Exception as e:
        exc_type, exc_obj, exc_tb = sys.exc_info()
        final_output.append(f"Error processing {instance_name}: {e} on line {exc_tb.tb_lineno if exc_tb else None}")
        return final_output
    
def print_output(final_output):
    if final_output:
        for message in final_output:
            logger.info(message)
        return
    else:
        return

def main():
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
            final_output = []
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
                print_output(final_output)
                permissions = 0o777
                os.chmod(config.destination_dir, permissions)
                os.chmod(config.source_dir, permissions)

if __name__ == "__main__":
    main()