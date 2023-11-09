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
# Version: 5.3.4
# License: MIT License
# ===================================================================================================

from plexapi.exceptions import BadRequest
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

year_regex = re.compile(r"\((19|20)\d{2}\)")
illegal_chars_regex = re.compile(r'[<>:"/\\|?*\x00-\x1f]+')
remove_special_chars = re.compile(r'[^a-zA-Z0-9\s]+')

season_name_info = [
    " - Season",
    " - Specials",
    "_Season"
]

words_to_remove = [
    "(US)",
]

prefixes = [
    "The",
    "A",
    "An"
]
suffixes = [
    "Collection",
]


def find_best_match(matches, title):
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
    return best_match


def match_collection(plex_collections, source_file_list, collection_threshold):
    matched_collections = {"matched_media": []}
    almost_matched = {"almost_matched": []}
    not_matched = {"not_matched": []}
    for plex_collection in tqdm(plex_collections, desc="Matching collections", total=len(plex_collections), disable=None):
        plex_normalize_title = normalize_titles(plex_collection)
        matches = [
            process.extract(plex_collection, [item['title'] for item in source_file_list['collections']], scorer=fuzz.ratio),
            process.extract(plex_normalize_title, [item['normalized_title'] for item in source_file_list['collections']], scorer=fuzz.ratio)
        ]
        for prefix in prefixes:
            matches.append(process.extract(plex_collection, [re.sub(rf"^{prefix}\s(?=\S)", '', item['title']) for item in source_file_list['collections']], scorer=fuzz.ratio))
            matches.append(process.extract(plex_normalize_title, [re.sub(rf"^{prefix}\s(?=\S)", '', item['normalized_title']) for item in source_file_list['collections']], scorer=fuzz.ratio))
        for suffix in suffixes:
            matches.append(process.extract(plex_collection, [re.sub(rf"\s*{suffix}*", '', item['title']) for item in source_file_list['collections']], scorer=fuzz.ratio))
            matches.append(process.extract(plex_normalize_title, [re.sub(rf"\s*{suffix}*", '', item['normalized_title']) for item in source_file_list['collections']], scorer=fuzz.ratio))
        best_match = find_best_match(matches, plex_collection)
        folder = illegal_chars_regex.sub('', plex_collection)
        if best_match:
            match_title = best_match[0]
            score = best_match[1]
            for item in source_file_list['collections']:
                file_title = item['title']
                files = item['files']
                file_normalized_title = item['normalized_title']
                without_prefix = []
                for prefix in prefixes:
                    without_prefix = []
                    for prefix in prefixes:
                        without_prefix.append(re.sub(rf"^{prefix}\s(?=\S)", '', item['title']))
                        without_prefix.append(re.sub(rf"^{prefix}\s(?=\S)", '', item['normalized_title']))
                without_suffix = []
                for suffix in suffixes:
                    without_suffix.append(re.sub(rf"\s*{suffix}", '', item['title']))
                    without_suffix.append(re.sub(rf"\s*{suffix}", '', item['normalized_title']))
                if score >= collection_threshold and (
                        match_title == item['title'] or
                        match_title == item['normalized_title'] or
                        match_title in without_prefix or
                        match_title in without_suffix
                ):
                    matched_collections['matched_media'].append({
                        "title": file_title,
                        "normalized_title": file_normalized_title,
                        "plex_collection": plex_collection,
                        "normalized_collection": plex_normalize_title,
                        "year": None,
                        "files": files,
                        "score": score,
                        "best_match": best_match,
                        "folder": folder,
                    })
                    break
                elif score >= collection_threshold - 10 and score < collection_threshold and (
                        match_title == item['title'] or
                        match_title == item['normalized_title'] or
                        match_title in without_prefix or
                        match_title in without_suffix
                ):
                    almost_matched['almost_matched'].append({
                        "title": file_title,
                        "normalized_title": file_normalized_title,
                        "plex_collection": plex_collection,
                        "normalized_collection": plex_normalize_title,
                        "year": None,
                        "files": files,
                        "score": score,
                        "best_match": best_match,
                        "folder": folder,
                    })
                    break
                elif score < collection_threshold - 10 and (
                        match_title == item['title'] or
                        match_title == item['normalized_title'] or
                        match_title in without_prefix or
                        match_title in without_suffix
                ):
                    not_matched['not_matched'].append({
                        "title": file_title,
                        "normalized_title": file_normalized_title,
                        "plex_collection": plex_collection,
                        "normalized_collection": plex_normalize_title,
                        "year": None,
                        "files": files,
                        "score": score,
                        "best_match": best_match,
                        "folder": folder,
                    })
                    break

    logger.debug(f"Not matched collections: {json.dumps(not_matched, ensure_ascii=False, indent=4)}")
    logger.debug(f"Matched collections: {json.dumps(matched_collections, ensure_ascii=False, indent=4)}")
    logger.debug(f"Almost matched collections: {json.dumps(almost_matched, ensure_ascii=False, indent=4)}")
    return matched_collections


def match_media(media, source_file_list, type):
    matched_media = {"matched_media": []}
    not_matched = {"not_matched": []}
    for item in tqdm(media, desc="Matching media", total=len(media), disable=None):
        alternate_title = False
        alternate_titles = []
        normalized_alternate_titles = []
        arr_title = item['title']
        arr_path = os.path.basename(item['path'])
        arr_path = year_regex.sub("", arr_path).strip()
        normalized_arr_path = normalize_titles(arr_path)
        try:
            arr_path_year = year_regex.search(item['path'])
            arr_path_year = int(arr_path_year.group(0)[1:-1])
        except AttributeError:
            if item['status'] == 'upcoming' or item['status'] == 'announced':
                continue
            else:
                logger.warning(f"Unable to find year in path: {item['path']}")
        try:
            if item['alternateTitles']:
                for i in item['alternateTitles']:
                    alternate_titles.append(i['title'])
                    normalized_alternate_titles.append(normalize_titles(i['title']))
        except KeyError:
            alternate_titles = []
        year_from_title = year_regex.search(item['title'])
        arr_normalized_title = normalize_titles(arr_title)
        secondary_year = None
        if year_from_title:
            try:
                arr_year = int(year_from_title.group(0)[1:-1])
            except ValueError:
                logger.error(f"Could not convert year to int: {year_from_title.group(0)[1:-1]} for {item['title']}")
                continue
        else:
            arr_year = item['year']
        try:
            if item['secondaryYear']:
                secondary_year = item['secondaryYear']
        except KeyError:
            secondary_year = None
        path = item['path']
        folder = os.path.basename(os.path.normpath(path))
        files = []
        for i in source_file_list[type]:
            file_title = i['title']
            file_normalized_title = i['normalized_title']
            files = i['files']
            file_year = i['year']
            if (
                    arr_title == file_title or
                    arr_normalized_title == file_normalized_title or
                    arr_path == file_title or
                    normalized_arr_path == file_normalized_title or
                    file_title in alternate_titles or
                    file_normalized_title in normalized_alternate_titles
            ) and (
                    arr_year == file_year or
                    secondary_year == file_year or
                    arr_path_year == file_year
            ):
                matched_media['matched_media'].append({
                    "title": file_title,
                    "normalized_title": file_normalized_title,
                    "arr_title": arr_title,
                    "arr_normalized_title": arr_normalized_title,
                    "arr_path": arr_path,
                    "normalized_arr_path": normalized_arr_path,
                    "year": file_year,
                    "arr_year": arr_year,
                    "arr_path_year": arr_path_year,
                    "secondaryYear": secondary_year,
                    "files": files,
                    "alternate_title": alternate_title,
                    "folder": folder,
                })
                break
            elif (
                    arr_title == file_title or
                    arr_normalized_title == file_normalized_title or
                    arr_path == file_title or
                    normalized_arr_path == file_normalized_title or
                    file_title in alternate_titles or
                    file_normalized_title in normalized_alternate_titles
            ) and (
                    arr_year != file_year or
                    secondary_year != file_year or
                    arr_path_year != file_year
            ):
                not_matched['not_matched'].append({
                    "title": file_title,
                    "normalized_title": file_normalized_title,
                    "arr_title": arr_title,
                    "arr_normalized_title": arr_normalized_title,
                    "arr_path": arr_path,
                    "normalized_arr_path": normalized_arr_path,
                    "year": file_year,
                    "arr_year": arr_year,
                    "arr_path_year": arr_path_year,
                    "secondaryYear": secondary_year,
                    "files": files,
                    "alternate_title": alternate_title,
                    "folder": folder,
                })
    logger.debug(f"Matched media: {json.dumps(matched_media, ensure_ascii=False, indent=4)}")
    logger.debug(f"Not matched media: {json.dumps(not_matched, ensure_ascii=False, indent=4)}")
    return matched_media


def rename_file(matched_media, destination_dir, dry_run, action_type, print_only_renames):
    messages = []
    asset_folders = config.asset_folders
    destination_files = os.listdir(destination_dir)
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
            path = os.path.dirname(file)
            old_file_name = os.path.basename(file)
            source_file_path = os.path.join(path, file)
            file_extension = os.path.splitext(file)[1]
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
            if config.source_overrides:
                if path in config.source_overrides:
                    if asset_folders:
                        for root, dirs, files in os.walk(destination_dir):
                            basedir = os.path.basename(root)
                            if basedir == folder:
                                for file in files:
                                    if os.path.splitext(file)[0] == os.path.splitext(new_file_name)[0] and file_extension != os.path.splitext(file)[1]:
                                        if dry_run:
                                            messages.append(f"Would remove {file} from {basedir}")
                                        else:
                                            messages.append(f"Removed {file} from {basedir}")
                                            os.remove(os.path.join(root, file))
                    else:
                        for i in destination_files:
                            if folder == os.path.splitext(i)[0] and file_extension != os.path.splitext(i)[1]:
                                if dry_run:
                                    messages.append(f"Would remove {i} from {destination_dir}")
                                else:
                                    messages.append(f"Removed {i} from {destination_dir}")
                                    os.remove(os.path.join(destination_dir, i))
            if new_file_name != old_file_name:
                messages.extend(process_file(old_file_name, new_file_name, action_type, dry_run, destination_file_path, source_file_path, '-renamed->'))
            else:
                if not print_only_renames:
                    messages.extend(process_file(old_file_name, new_file_name, action_type, dry_run, destination_file_path, source_file_path, '-not-renamed->>'))
    return messages


def process_file(old_file_name, new_file_name, action_type, dry_run, destination_file_path, source_file_path, arrow):
    output = []
    if dry_run:
        if action_type == 'copy':
            if os.path.isfile(destination_file_path):
                if filecmp.cmp(source_file_path, destination_file_path):
                    logger.debug(f"Copy -> File already exists: {destination_file_path}")
                    pass
                else:
                    output.append(f"Action Type: {action_type.capitalize()}: {old_file_name} {arrow} {new_file_name}")
            else:
                output.append(f"Action Type: {action_type.capitalize()}: {old_file_name} {arrow} {new_file_name}")
        if action_type == 'hardlink':
            if os.path.isfile(destination_file_path):
                if filecmp.cmp(source_file_path, destination_file_path):
                    logger.debug(f"Hardlink -> File already exists: {destination_file_path}")
                    pass
                else:
                    output.append(f"Action Type: {action_type.capitalize()}: {old_file_name} {arrow} {new_file_name}")
            else:
                output.append(f"Action Type: {action_type.capitalize()}: {old_file_name} {arrow} {new_file_name}")
        elif action_type == 'move':
            output.append(f"Action Type: {action_type.capitalize()}: {old_file_name} {arrow} {new_file_name}")
    else:
        if action_type == 'copy':
            try:
                if os.path.isfile(destination_file_path):
                    if filecmp.cmp(source_file_path, destination_file_path):
                        logger.debug(f"Copy -> File already exists: {destination_file_path}")
                        pass
                    else:
                        shutil.copyfile(source_file_path, destination_file_path)
                        output.append(f"Action Type: {action_type.capitalize()}: {old_file_name} {arrow} {new_file_name}")
                else:
                    shutil.copyfile(source_file_path, destination_file_path)
                    output.append(f"Action Type: {action_type.capitalize()}: {old_file_name} {arrow} {new_file_name}")
            except OSError as e:
                logger.error(f"Unable to copy file: {e}")
        elif action_type == 'move':
            try:
                shutil.move(source_file_path, destination_file_path)
                output.append(f"Action Type: {action_type.capitalize()}: {old_file_name} {arrow} {new_file_name}")
            except OSError as e:
                logger.error(f"Unable to move file: {e}")
        elif action_type == 'hardlink':
            try:
                os.link(source_file_path, destination_file_path)
                output.append(f"Action Type: {action_type.capitalize()}: {old_file_name} {arrow} {new_file_name}")
            except OSError as e:
                if e.errno == errno.EEXIST:
                    if os.path.samefile(source_file_path, destination_file_path):
                        logger.debug(f"Hardlink -> File already exists: {destination_file_path}")
                        pass
                    else:
                        os.replace(destination_file_path, source_file_path)
                        os.link(source_file_path, destination_file_path)
                        output.append(f"Action Type: {action_type.capitalize()}: {old_file_name} {arrow} {new_file_name}")
                else:
                    logger.error(f"Unable to hardlink file: {e}")
                    return
        else:
            logger.error(f"Unknown action type: {action_type}")
    return output


def load_dict(title, year, files):
    return {
        "title": title,
        "normalized_title": None,
        "year": year,
        "files": files
    }


def normalize_titles(title):
    normalized_title = title
    for word in words_to_remove:
        normalized_title = title.replace(word, '')
    normalized_title = year_regex.sub('', normalized_title)
    normalized_title = illegal_chars_regex.sub('', normalized_title)
    normalized_title = unidecode(html.unescape(normalized_title))
    normalized_title = normalized_title.rstrip()
    normalized_title = normalized_title.replace('&', 'and')
    normalized_title = re.sub(remove_special_chars, '', normalized_title).lower()
    return normalized_title


def add_file_to_asset(category_dict, file):
    category_dict['files'].append(file)


def find_or_create_show(show_list, title, year, files, path):
    for show in show_list:
        if title == show['title'] and year == show['year']:
            add_file_to_asset(show, files[0])
            return
    show = load_dict(title, year, files)
    show_list.append(show)


def get_files(path):
    files = []
    try:
        files = os.listdir(path)
    except FileNotFoundError:
        logger.error(f"Path not found: {path}")
    return files


def sort_files(files, path, dict, basename):
    for file in tqdm(files, desc=f'Sorting assets from \'{basename}\' directory', total=len(files), disable=None):
        full_path = os.path.join(path, file)
        if file.startswith('.'):
            continue
        base_name, extension = os.path.splitext(file)
        if not re.search(r'\(\d{4}\)', base_name):
            collection = load_dict(base_name, None, [full_path])
            dict['collections'].append(collection)
        else:
            file_name = os.path.splitext(file)[0]
            match = re.search(r'\((\d{4})\)', base_name)
            year = int(match.group(1)) if match else None
            title = base_name.replace(f'({year})', '').strip()
            if any(file.startswith(file_name) and any(file_name + season_name in file for season_name in season_name_info) for file in files):
                find_or_create_show(dict['series'], title, year, [full_path], path)
            elif any(word in file for word in season_name_info):
                for season_name in season_name_info:
                    if season_name in file:
                        title = title.split(season_name)[0].strip()
                find_or_create_show(dict['series'], title, year, [full_path], path)
            else:
                movie = load_dict(title, year, [full_path])
                dict['movies'].append(movie)
    return dict


def get_assets_files(assets_path, override_paths):
    asset_files = {"series": [], "movies": [], "collections": []}
    override_files = {"series": [], "movies": [], "collections": []}
    asset_types = ['series', 'movies', 'collections']
    if assets_path:
        files = get_files(assets_path)
        basename = os.path.basename(assets_path.rstrip('/'))
        asset_files = sort_files(files, assets_path, asset_files, basename)
    if isinstance(override_paths, str):
        override_paths = [override_paths]
    if override_paths:
        for paths in override_paths:
            files = get_files(paths)
            basename = os.path.basename(paths.rstrip('/'))
            override_files = sort_files(files, paths, override_files, basename)
            if override_files and asset_files:
                asset_files = handle_override_files(asset_files, override_files, asset_types)
    for asset_types in asset_files:
        for asset in asset_files[asset_types]:
            normalized_title = normalize_titles(asset['title'])
            asset['normalized_title'] = normalized_title
    for asset_types in asset_files:
        for asset in asset_files[asset_types]:
            asset['files'].sort()
    logger.debug(json.dumps(asset_files, indent=4))
    return asset_files


def handle_override_files(asset_files, override_files, asset_types):
    for type in asset_types:
        for override_asset in override_files[type]:
            found = False
            for asset in asset_files[type]:
                if override_asset['title'] == asset['title'] and override_asset['year'] == asset['year']:
                    found = True
                    seen_files = set()
                    logger.debug(f"Override asset: {override_asset['title']} {override_asset['year']} will be used instead of {asset['title']} {asset['year']}")
                    for override_file in override_asset['files']:
                        override_file_name = os.path.splitext(os.path.basename(override_file))[0]
                        if override_file_name not in seen_files:
                            seen_files.add(override_file_name)
                            asset['files'] = [f for f in asset['files'] if os.path.splitext(os.path.basename(f))[0] != override_file_name]
                            asset['files'].append(override_file)
            if not found:
                asset_files[type].append(override_asset)
    return asset_files


def process_instance(instance_type, instance_name, url, api, final_output, asset_files):
    collections = []
    media = []
    collection_names = []
    if instance_type == "Plex":
        if config.library_names:
            app = PlexServer(url, api)
            for library_name in config.library_names:
                try:
                    library = app.library.section(library_name)
                    logger.debug(f"Library: {library_name} found in {instance_name}")
                    collections += library.collections()
                except BadRequest:
                    logger.error(f"Error: {library_name} does not exist in {instance_name}")
            collection_names = [collection.title for collection in collections if collection.smart != True]
            logger.debug(json.dumps(collection_names, indent=4))
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
        matched_media = match_media(media, asset_files, "movies")
    elif instance_type == "Sonarr":
        matched_media = match_media(media, asset_files, "series")
    if matched_media:
        message = rename_file(matched_media, config.destination_dir, config.dry_run, config.action_type, config.print_only_renames)
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
    logger.debug(f"source_overrides: {config.source_overrides}")
    logger.debug(f"destination_dir: {config.destination_dir}")
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

    asset_files = get_assets_files(config.source_dir, config.source_overrides)
    
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
