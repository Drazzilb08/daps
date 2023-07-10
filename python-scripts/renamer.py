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
# Version: 4.3.18
# License: MIT License
# ===================================================================================================

from modules.logger import setup_logger
from plexapi.server import PlexServer
from modules.config import Config
from modules.arrpy import StARR
from unidecode import unidecode
from fuzzywuzzy import process
from fuzzywuzzy import fuzz
from tqdm import tqdm
import filecmp
import shutil
import errno
import json
import html
import sys
import os
import re

config = Config(script_name="renamer")
logger = setup_logger(config.log_level, "renamer")
year_regex = re.compile(r"\((19|20)\d{2}\).*")
illegal_chars_regex = re.compile(r'[<>:"/\\|?*\x00-\x1f]+')
remove_special_chars = re.compile(r'[^a-zA-Z0-9\sÆ^³]+')

season_name_info = [
    " - Season",
    " - Specials",
    "_Season"
]
words_to_remove = [
    "(US)",
]

def match_collection(plex_collections, source_file_list, collection_threshold):
    matched_collections = {"matched_media": []}
    almost_matched = {"almost_matched": []}
    not_matched = {"not_matched": []}
    for collection in tqdm(plex_collections, desc="Matching collections", total=len(plex_collections), disable=None):
        match = process.extractOne(collection, [item['title'] for item in source_file_list['collections']], scorer=fuzz.ratio)
        match_without_suffix = process.extractOne(collection, [re.sub(r' Collection', '', item['title']) for item in source_file_list['collections']], scorer=fuzz.ratio)
        match_without_prefix = process.extractOne(collection, [re.sub(r'^(A|An|The) ', '', item['title']) for item in source_file_list['collections']], scorer=fuzz.ratio)
        if match and match_without_suffix and match_without_prefix:
            if match[1] >= match_without_suffix[1] and match[1] >= match_without_prefix[1]:
                best_match = match
            elif match_without_suffix[1] >= match[1] and match_without_suffix[1] >= match_without_prefix[1]:
                best_match = match_without_suffix
            else:
                best_match = match_without_prefix
        elif match and match_without_suffix:
            if match[1] >= match_without_suffix[1]:
                best_match = match
            else:
                best_match = match_without_suffix
        elif match and match_without_prefix:
            if match[1] >= match_without_prefix[1]:
                best_match = match
            else:
                best_match = match_without_prefix
        elif match:
            best_match = match
        elif match_without_suffix:
            best_match = match_without_suffix
        elif match_without_prefix:
            best_match = match_without_prefix
        else:
            best_match = None
        collection = illegal_chars_regex.sub('', collection)
        if best_match:
            score = best_match[1]
            title = best_match[0]

            for item in source_file_list['collections']:
                files = item['files']
                if score >= collection_threshold and (title == item['title'] or title == item['title'].replace(' Collection', '')):
                    matched_collections['matched_media'].append({
                        "title": title,
                        "year": None,
                        "files": files,
                        "score": score,
                        "best_match": best_match,
                        "folder": collection,
                    })
                    break
                elif score >= collection_threshold - 10 and score < collection_threshold and (title == item['title'] or title == item['title'].replace(' Collection', '')):
                    files = item['files']
                    almost_matched['almost_matched'].append({
                        "title": title,
                        "year": None,
                        "files": files,
                        "score": score,
                        "best_match": best_match,
                        "folder": collection,
                    })
                    break
    logger.debug(f"Not matched collections: {json.dumps(not_matched, ensure_ascii=False, indent=4)}")
    logger.debug(f"Matched collections: {json.dumps(matched_collections, ensure_ascii=False, indent=4)}")
    logger.debug(f"Almost matched collections: {json.dumps(almost_matched, ensure_ascii=False, indent=4)}")
    return matched_collections

def match_media(media, source_file_list, threshold, type):
    matched_media = {"matched_media": []}
    almost_matched = {"almost_matched": []}
    not_matched = {"not_matched": []}
    for item in tqdm(media, desc="Matching media", total=len(media), disable=None):
        alternate_title = False
        alternate_titles = []
        title = item['title']
        try:
            if item['alternateTitles']:
                for i in item['alternateTitles']:
                    alternate_titles.append(i['title'])
        except KeyError:
            alternate_titles = []
        title = year_regex.sub('', title)
        year_from_title = year_regex.search(item['title'])
        title = illegal_chars_regex.sub('', title)
        title = unidecode(title)
        title = title.rstrip()
        for word in words_to_remove:
            title = title.replace(word, '')
        title = title.replace('&', 'and')
        title = re.sub(remove_special_chars, '', title)
        secondary_year = None
        if year_from_title:
            try:
                year = int(year_from_title.group(0)[1:-1])
            except ValueError:
                logger.error(f"Could not convert year to int: {year_from_title.group(0)[1:-1]} for {item['title']}")
                continue
        else:
            year = item['year']
        try:
            if item['secondaryYear']:
                secondary_year = item['secondaryYear']
        except KeyError:
            secondary_year = None
        path = item['path']
        folder = os.path.basename(os.path.normpath(path))
        folder_without_year = re.sub(year_regex, '', folder)
        matches = []
        matches.append(process.extract(title, [item['title'] for item in source_file_list[type]], scorer=fuzz.ratio))
        matches.append(process.extract(folder_without_year, [item['title'] for item in source_file_list[type]], scorer=fuzz.ratio))
        best_match = None
        for match in matches:
            for i in match:
                if best_match:
                    if i[1] > best_match[1]:
                        best_match = i
                    elif i[1] == best_match[1]:
                        if i[0] == title:
                            best_match = i
                else:
                    best_match = i
        if best_match and best_match[1] < threshold:
            for i in alternate_titles:
                alternate_match = process.extractOne(i, [item['title'] for item in source_file_list[type]], scorer=fuzz.ratio)
                if alternate_match and best_match and alternate_match[1] > best_match[1]:
                    best_match = alternate_match
                    alternate_title = True
                    break
        if best_match:
            match_year = None
            match_title = best_match[0]
            score = best_match[1]
            files = []
            for i in source_file_list[type]:
                files = i['files']
                match_year = i['year']
                if score >= threshold and match_title == i['title'] and (year == match_year or secondary_year == match_year):
                    matched_media['matched_media'].append({
                        "title": match_title,
                        "arr_title": title,
                        "year": match_year,
                        "arr_year": year,
                        "secondaryYear": secondary_year,
                        "files": files,
                        "score": best_match,
                        "alternate_title": alternate_title,
                        "folder": folder,
                    })
                    break
                elif score >= threshold - 10 and score < threshold and match_title == i['title'] and (year == match_year or secondary_year == match_year):
                    almost_matched['almost_matched'].append({
                        "title": match_title,
                        "arr_title": title,
                        "year": match_year,
                        "arr_year": year,
                        "secondaryYear": secondary_year,
                        "files": files,
                        "score": best_match,
                        "alternate_title": alternate_title,
                        "folder": folder,
                    })
                    break
    logger.debug(f"Matched media: {json.dumps(matched_media, ensure_ascii=False, indent=4)}")
    logger.debug(f"Almost matched media: {json.dumps(almost_matched, ensure_ascii=False, indent=4)}")
    logger.debug(f"Not matched media: {json.dumps(not_matched, ensure_ascii=False, indent=4)}")
    return matched_media

def rename_file(matched_media, destination_dir, source_dir, dry_run, action_type, print_only_renames):
    messages = []
    asset_folders = config.asset_folders
    for media in tqdm(matched_media['matched_media'], desc="Renaming files", total=len(matched_media['matched_media']), disable=None):
        files = media['files']
        folder = media['folder']
        if asset_folders:
            if dry_run:
                messages.append(f"Would create asset folder: {folder} at {destination_dir}")
            else:
                if not os.path.exists(os.path.join(destination_dir, folder)):
                    messages.append(f"Creating asset folder: {folder} at {destination_dir}")
                    os.makedirs(os.path.join(destination_dir, folder), exist_ok=True)
        for file in files:
            source_file_path = os.path.join(source_dir, file)
            file_extension = os.path.splitext(file)[1]
            old_file_name = file
            if any(word in file for word in season_name_info):
                season_number = re.search(r"Season (\d+)", file)
                if season_number:
                    season_number = season_number.group(1)
                    season_number = season_number.zfill(2)
                    if asset_folders:
                        new_file_name = f"Season{season_number}{file_extension}"
                    else:
                        new_file_name = f"{folder}_Season{season_number}{file_extension}"
                elif season_number := re.search(r"Season (\d\d)", file):
                    if asset_folders:
                        season_number = season_number.group(1)
                        new_file_name = f"Season{season_number}{file_extension}"
                    else:
                        season_number = season_number.group(1)
                        new_file_name = f"{folder}_Season{season_number}{file_extension}"
                elif " - Specials" in file:
                    if asset_folders:
                        new_file_name = f"Season00{file_extension}"
                    else:
                        new_file_name = f"{folder}_Season00{file_extension}"
                elif "_Season" in file:
                    new_file_name = file
                else:
                    logger.error(f"Unable to find season number for {file}")
                    continue
            else:
                if asset_folders:
                    new_file_name = f"poster{file_extension}"
                else:
                    new_file_name = f"{folder}{file_extension}"
            if asset_folders:
                destination_file_path = os.path.join(destination_dir, folder, new_file_name)
            else:
                destination_file_path = os.path.join(destination_dir, new_file_name)
            if new_file_name != old_file_name:
                if dry_run:
                    if action_type == 'copy':
                        if os.path.isfile(destination_file_path):
                            if filecmp.cmp(source_file_path, destination_file_path):
                                pass
                            else:
                                messages.append(f"Action Type: {action_type.capitalize()}: {old_file_name} -> {new_file_name}")
                        else:
                            messages.append(f"Action Type: {action_type.capitalize()}: {old_file_name} -> {new_file_name}")
                    if action_type == 'hardlink':
                        if os.path.isfile(destination_file_path):
                            if filecmp.cmp(source_file_path, destination_file_path):
                                pass
                            else:
                                messages.append(f"Action Type: {action_type.capitalize()}: {old_file_name} -> {new_file_name}")
                        else:
                            messages.append(f"Action Type: {action_type.capitalize()}: {old_file_name} -> {new_file_name}")
                    elif action_type == 'move':
                        messages.append(f"Action Type: {action_type.capitalize()}: {old_file_name} -> {new_file_name}")
                else:
                    if action_type == 'copy':
                        try:
                            if os.path.isfile(destination_file_path):
                                if filecmp.cmp(source_file_path, destination_file_path):
                                    pass
                                else:
                                    shutil.copyfile(source_file_path, destination_file_path)
                                    messages.append(f"Action Type: {action_type.capitalize()}: {old_file_name} -->> {new_file_name}")
                            else:
                                shutil.copyfile(source_file_path, destination_file_path)
                                messages.append(f"Action Type: {action_type.capitalize()}: {old_file_name} -->> {new_file_name}")
                        except OSError as e:
                            logger.error(f"Unable to copy file: {e}")
                    elif action_type == 'move':
                        try:
                            shutil.move(source_file_path, destination_file_path)
                            messages.append(f"Action Type: {action_type.capitalize()}: {old_file_name} -> {new_file_name}")
                        except OSError as e:
                            logger.error(f"Unable to move file: {e}")
                    elif action_type == 'hardlink':
                        try:
                            os.link(source_file_path, destination_file_path)
                            messages.append(f"Action Type: {action_type.capitalize()}: {old_file_name} -> {new_file_name}")
                        except OSError as e:
                            if e.errno == errno.EEXIST:
                                if os.path.samefile(source_file_path, destination_file_path):
                                    pass
                                else:
                                    os.replace(destination_file_path, source_file_path)
                                    os.link(source_file_path, destination_file_path)
                                    messages.append(f"Action Type: {action_type.capitalize()}: {old_file_name} -> {new_file_name}")
                            else:
                                logger.error(f"Unable to hardlink file: {e}")
                                continue
                    else:
                        logger.error(f"Unknown action type: {action_type}")
            else:
                if not print_only_renames:
                    if dry_run:
                        if action_type == 'copy':
                            if os.path.isfile(destination_file_path):
                                if filecmp.cmp(source_file_path, destination_file_path):
                                    pass
                                else:
                                    messages.append(f"Action Type: {action_type.capitalize()}: {old_file_name} -> {new_file_name}")
                            else:
                                messages.append(f"Action Type: {action_type.capitalize()}: {old_file_name} -> {new_file_name}")
                        if action_type == 'hardlink':
                            if os.path.isfile(destination_file_path):
                                if filecmp.cmp(source_file_path, destination_file_path):
                                    pass
                                else:
                                    messages.append(f"Action Type: {action_type.capitalize()}: {old_file_name} -> {new_file_name}")
                            else:
                                messages.append(f"Action Type: {action_type.capitalize()}: {old_file_name} -> {new_file_name}")
                        elif action_type == 'move':
                            messages.append(f"Action Type: {action_type.capitalize()}: {old_file_name} -> {new_file_name}")
                    else:
                        if action_type == 'copy':
                            try:
                                if os.path.isfile(destination_file_path):
                                    if filecmp.cmp(source_file_path, destination_file_path):
                                        pass
                                    else:
                                        shutil.copyfile(source_file_path, destination_file_path)
                                        messages.append(f"Action Type: {action_type.capitalize()}: {old_file_name} -->> {new_file_name}")
                                else:
                                    shutil.copyfile(source_file_path, destination_file_path)
                                    messages.append(f"Action Type: {action_type.capitalize()}: {old_file_name} -->> {new_file_name}")
                            except OSError as e:
                                logger.error(f"Unable to copy file: {e}")
                        elif action_type == 'move':
                            try:
                                shutil.move(source_file_path, destination_file_path)
                                messages.append(f"Action Type: {action_type.capitalize()}: {old_file_name} -->> {new_file_name}")
                            except OSError as e:
                                logger.error(f"Unable to move file: {e}")
                        elif action_type == 'hardlink':
                            try:
                                os.link(source_file_path, destination_file_path)
                                messages.append(f"Action Type: {action_type.capitalize()}: {old_file_name} -> {new_file_name}")
                            except OSError as e:
                                if e.errno == errno.EEXIST:
                                    if os.path.samefile(source_file_path, destination_file_path):
                                        pass
                                    else:
                                        os.replace(destination_file_path, source_file_path)
                                        os.link(source_file_path, destination_file_path)
                                        messages.append(f"Action Type: {action_type.capitalize()}: {old_file_name} -> {new_file_name}")
                                else:
                                    logger.error(f"Unable to hardlink file: {e}")
                                    continue
                        else:
                            logger.error(f"Unknown action type: {action_type}")
    return messages 

def get_assets_files(assets_path):
    asset_files = {}
    series = {"series": []}
    movies = {"movies":[]}
    collections = {"collections": []}
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
    for file in tqdm(files, desc=f'Sorting assets', total=len(files), disable=None):
        if file.startswith('.'):
            continue
        base_name, extension = os.path.splitext(file)
        if not re.search(r'\(\d{4}\)', base_name):
            collection = {
                "title": base_name,
                "year": None,
                "files": []
            }
            collection['files'].append(file)
            collections['collections'].append(collection)
        else:
            file_name = os.path.splitext(file)[0]
            match = re.search(r'\((\d{4})\)', base_name)
            year = int(match.group(1)) if match else None
            title = base_name.replace(f'({year})', '').strip()
            title = unidecode(html.unescape(title))
            title_match = unidecode(title)
            title = title.replace('&', 'and')
            if any(file.startswith(file_name) and any(file_name + season_name in file for season_name in season_name_info) for file in files):
                for show_name in series['series']:
                    title = re.sub(remove_special_chars, '', title)
                    if title == show_name['title'] and year == show_name['year']:
                        show_name['files'].append(file)
                        break
                else:
                    title = re.sub(remove_special_chars, '', title)
                    show = {
                        "title": title,
                        "year": year,
                        "files": []
                    }
                    show['files'].append(file)
                    series['series'].append(show)
            elif any(word in file for word in season_name_info):
                for season_name in season_name_info:
                    if season_name in file:
                        title = title.split(season_name)[0].strip()
                for show_name in series['series']:
                    title = re.sub(remove_special_chars, '', title)
                    if title == show_name['title'] and year == show_name['year']:
                        show_name['files'].append(file)
                        break
                else:
                    title = re.sub(remove_special_chars, '', title)
                    show = {
                        "title": title,
                        "year": year,
                        "files": []
                    }
                    show['files'].append(file)
                    series['series'].append(show)
            else:
                title = re.sub(remove_special_chars, '', title)
                movie = {
                    "title": title,
                    "year": year,
                    "files": []
                }
                movie['files'].append(file)
                movies['movies'].append(movie)
    collections = dict(sorted(collections.items()))
    movies = dict(sorted(movies.items()))
    series = dict(sorted(series.items()))
    asset_files.update(collections)
    asset_files.update(movies)
    asset_files.update(series)
    logger.debug(json.dumps(asset_files, indent=4))
    return asset_files

def process_instance(instance_type, instance_name, url, api, final_output, asset_files):
    collections = []
    media = []
    collection_names = []
    if instance_type == "Plex":
        if config.library_names:
            app = PlexServer(url, api)
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
    matched_media = []
    if instance_type == "Plex":
        matched_media = match_collection(collection_names, asset_files, config.collection_threshold)
    elif instance_type == "Radarr":
        matched_media = match_media(media, asset_files, config.movies_threshold, "movies")
    elif instance_type == "Sonarr":
        matched_media = match_media(media, asset_files, config.series_threshold, "series")
    if matched_media:
        message = rename_file(matched_media, config.destination_dir, config.source_dir, config.dry_run, config.action_type, config.print_only_renames)
        final_output.extend(message)
    else:
        message = f"No matches found for {instance_name}"
        final_output.append(message)
    return final_output
    
def print_output(final_output):
    if final_output:
        for message in final_output:
            logger.info(message)
        return
    else:
        return

def main():
    logger.debug('*' * 40)
    logger.debug(f'* {"Script Input Validated":^36} *')
    logger.debug('*' * 40)
    logger.debug(f'{" Script Settings ":*^40}')
    logger.debug(f'Dry_run: {config.dry_run}')
    logger.debug(f"Log Level: {config.log_level}")
    logger.debug(f"Asset folder: {config.asset_folders}")
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
    asset_files = get_assets_files(config.source_dir)
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
                logger.info('*' * 40)
                logger.info(f'* {instance_name:^36} *')
                logger.info('*' * 40)
                logger.debug(f'{" Settings ":*^40}')
                logger.debug(f"Instance Name: {instance_name}")
                logger.debug(f"URL: {url}")
                logger.debug(f"API Key: {'<redacted>' if api else 'None'}")
                final_output = process_instance(instance_type, instance_name, url, api, final_output, asset_files)
                print_output(final_output)
if __name__ == "__main__":
    main()