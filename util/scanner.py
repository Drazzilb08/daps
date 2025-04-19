import os
import re
import html
from tqdm import tqdm
from unidecode import unidecode
import datetime
from typing import Any

from util.normalization import normalize_titles
from util.construct import create_collection, create_series, create_movie
from util.extract import extract_year, extract_ids
from util.constants import year_regex, season_pattern

def scan_files_in_flat_folder(folder_path: str) -> list[dict]:
    from collections import defaultdict

    files = os.listdir(folder_path)
    groups = defaultdict(list)
    normalized_map = {}
    assets_dict = []

    for file in files:
        if file.startswith('.'):
            continue
        title = file.rsplit('.', 1)[0]
        title = unidecode(html.unescape(title))
        raw_title = season_pattern.split(title)[0].strip()
        normalized_title = re.sub(r'[^a-zA-Z0-9]', '', raw_title).lower()

        if normalized_title in normalized_map:
            match_key = normalized_map[normalized_title]
            groups[match_key].append(file)
        else:
            groups[raw_title].append(file)
            normalized_map[normalized_title] = raw_title

    groups = dict(sorted(groups.items(), key=lambda x: x[0].lower()))

    with tqdm(total=len(groups), desc=f"Processing files in '{os.path.basename(folder_path)}'", leave=True) as pbar:
        for base_name, files in groups.items():
            assets_dict.append(parse_file_group(folder_path, base_name, files))
            pbar.update(1)

    return assets_dict

def scan_files_in_nested_folders(folder_path: str, logger: Any) -> list[dict]:
    assets_dict = []
    try:
        entries = list(os.scandir(folder_path))
        progress_bar = tqdm(entries, desc='Processing posters', total=len(entries), disable=None)

        for dir_entry in progress_bar:
            if not dir_entry.is_dir() or dir_entry.name.startswith('.') or dir_entry.name == "tmp":
                continue
            base_name = os.path.basename(dir_entry.path)
            files = [f.name for f in os.scandir(dir_entry.path) if f.is_file()]
            assets_dict.append(parse_folder_group(dir_entry.path, base_name, files))
    except FileNotFoundError:
        logger.warning(f"Folder not found: {folder_path}")
        return []

    return assets_dict

def parse_folder_group(folder_path: str, base_name: str, files: list[str]) -> dict:
    title = re.sub(year_regex, '', base_name)
    year = extract_year(base_name)
    tmdb_id, tvdb_id, imdb_id = extract_ids(base_name)
    normalize_title = normalize_titles(base_name)
    full_paths = sorted([os.path.join(folder_path, file) for file in files if not file.startswith('.')])

    is_series = any(season_pattern.search(file) for file in files)
    is_collection = not year

    if is_collection:
        return create_collection(title, normalize_title, full_paths)
    elif is_series:
        return create_series(title, year, tvdb_id, imdb_id, normalize_title, full_paths)
    else:
        return create_movie(title, year, tmdb_id, imdb_id, normalize_title, full_paths)

def parse_file_group(folder_path: str, base_name: str, files: list[str]) -> dict:
    # Shared title/year/ID extraction
    title = re.sub(year_regex, '', base_name)
    year = extract_year(base_name)
    tmdb_id, tvdb_id, imdb_id = extract_ids(base_name)
    normalize_title = normalize_titles(base_name)
    files = sorted([os.path.join(folder_path, file) for file in files if not file.startswith('.')])

    is_series = any(season_pattern.search(file) for file in files)
    is_collection = not year

   

    if is_collection:
        return create_collection(title, normalize_title, files)
    elif is_series:
        return create_series(title, year, tvdb_id, imdb_id, normalize_title, files)
    else:
        return create_movie(title, year, tmdb_id, imdb_id, normalize_title, files)


def process_files(folder_path: str, logger: Any) -> list[dict]:
    """
    Categorize files into movies, collections, and series.
    """
    asset_folders = _is_asset_folders(folder_path)
    start_time = datetime.datetime.now()

    if not asset_folders:
        assets_dict = scan_files_in_flat_folder(folder_path)
    else:
        assets_dict = scan_files_in_nested_folders(folder_path)

    end_time = datetime.datetime.now()
    elapsed_time = (end_time - start_time).total_seconds()
    item_count = len(assets_dict) if assets_dict else 0
    items_per_second = item_count / elapsed_time if elapsed_time > 0 else 0
    if logger:
        logger.info(f"Processed {item_count} files in {elapsed_time:.2f} seconds ({items_per_second:.2f} items/s) in folder '{os.path.basename(folder_path.rstrip('/'))}'")

    return assets_dict

def _is_asset_folders(folder_path: str) -> bool:
    """
    Check if the folder contains asset folders

    Args:
        folder_path (str): The path to the folder to check

    Returns:
        bool: True if the folder contains asset folders, False otherwise
    """
    if not os.path.exists(folder_path):
        return False
    else:
        for item in os.listdir(folder_path):
            if item.startswith('.') or item.startswith('@') or item == "tmp":
                continue
            if os.path.isdir(os.path.join(folder_path, item)):
                return True
        return False