import os
import re
import html
from unidecode import unidecode
import datetime
from typing import Any, Optional, List, Dict
from collections import defaultdict
from util.utility import progress

from util.normalization import normalize_titles
from util.construct import create_collection, create_series, create_movie
from util.extract import extract_year, extract_ids
from util.constants import year_regex, season_pattern, remove_special_chars, illegal_chars_regex


def scan_files_in_flat_folder(folder_path: str, logger: Any) -> List[Dict]:
    """
    Scan a flat directory structure (no subfolders) for media assets.

    Args:
        folder_path (str): Path to the folder containing files.
        logger (Any): Logger instance for progress and debugging.

    Returns:
        List[Dict]: List of parsed media asset dictionaries.
    """

    try:
        files = os.listdir(folder_path)
    except FileNotFoundError:
        return []

    groups = defaultdict(list)
    normalized_map = {}
    assets_dict = []

    for file in files:
        if file.startswith('.'):
            continue
        title = file.rsplit('.', 1)[0]
        title = unidecode(html.unescape(title))
        title = re.sub(illegal_chars_regex, '', title)
        raw_title = season_pattern.split(title)[0].strip()
        normalized_title = remove_special_chars.sub('', raw_title.lower())
        print(f"normalized_title: {normalized_title}")
        if normalized_title in normalized_map:
            match_key = normalized_map[normalized_title]
            groups[match_key].append(file)
        else:
            groups[raw_title].append(file)
            normalized_map[normalized_title] = raw_title

    groups = dict(sorted(groups.items(), key=lambda x: x[0].lower()))

    with progress(groups.items(), desc=f'Processing files {os.path.basename(folder_path)}', total=len(groups), unit='file', logger=logger) as pbar:
        for base_name, files in groups.items():
            assets_dict.append(parse_file_group(folder_path, base_name, files))
            pbar.update(1)

    return assets_dict


def scan_files_in_nested_folders(folder_path: str, logger: Any) -> Optional[List[Dict]]:
    """
    Scan a directory with subfolders representing grouped assets (e.g., per movie/series).

    Args:
        folder_path (str): Path to the base folder.
        logger (Any): Logger instance.

    Returns:
        Optional[List[Dict]]: List of parsed asset dictionaries from subfolders, or None on error.
    """
    assets_dict = []
    try:
        entries = list(os.scandir(folder_path))
        progress_bar = progress(entries, desc='Processing posters', total=len(entries), unit='folder', logger=logger)

        for dir_entry in progress_bar:
            if not dir_entry.is_dir() or dir_entry.name.startswith('.') or dir_entry.name == "tmp":
                continue
            base_name = os.path.basename(dir_entry.path)
            files = [f.name for f in os.scandir(dir_entry.path) if f.is_file()]
            assets_dict.append(parse_folder_group(dir_entry.path, base_name, files))
    except Exception:
        return None

    return assets_dict


def parse_folder_group(folder_path: str, base_name: str, files: List[str]) -> Dict:
    """
    Parse metadata and build a structured dictionary for assets within a folder.

    Args:
        folder_path (str): Full path to the asset folder.
        base_name (str): Name of the base folder.
        files (List[str]): List of file names within the folder.

    Returns:
        Dict: Structured media dictionary.
    """
    title = re.sub(year_regex, '', base_name)
    title = unidecode(html.unescape(title))
    year = extract_year(base_name)
    tmdb_id, tvdb_id, imdb_id = extract_ids(base_name)
    normalized_title = normalize_titles(base_name)
    full_paths = sorted([os.path.join(folder_path, file) for file in files if not file.startswith('.')])
    parent_folder = os.path.basename(folder_path)

    # Determine media type: collection (no year), series (season indicators), or movie
    is_series = len(files) > 1 and any("Season" in os.path.basename(file) for file in files)
    is_collection = not year

    if is_collection:
        # Collection: no year detected
        return create_collection(title, normalized_title, full_paths, parent_folder)
    elif is_series:
        # Series: multiple files with season indicators
        return create_series(title, year, tvdb_id, imdb_id, normalized_title, full_paths, parent_folder)
    else:
        # Movie: default case
        return create_movie(title, year, tmdb_id, imdb_id, normalized_title, full_paths, parent_folder)


def parse_file_group(folder_path: str, base_name: str, files: List[str]) -> Dict:
    """
    Parse a group of files in a flat folder into structured metadata.

    Args:
        folder_path (str): Path to the containing folder.
        base_name (str): Group title.
        files (List[str]): List of file names.

    Returns:
        Dict: Structured media dictionary.
    """
    id_cleaned_name = re.sub(r"\{(?:tmdb|tvdb|imdb)-\w+\}", "", base_name).strip()
    title = re.sub(year_regex, '', id_cleaned_name).strip()
    title = unidecode(html.unescape(title))
    year = extract_year(base_name)
    tmdb_id, tvdb_id, imdb_id = extract_ids(base_name)
    normalized_title = normalize_titles(base_name)
    files = sorted([os.path.join(folder_path, file) for file in files if not file.startswith('.')])

    # Determine media type: collection (no year), series (season indicators), or movie
    is_series = any(season_pattern.search(file) for file in files)
    is_collection = not year

    if is_collection:
        # Collection: no year detected
        return create_collection(title, normalized_title, files)
    elif is_series:
        # Series: season pattern detected in files
        return create_series(title, year, tvdb_id, imdb_id, normalized_title, files)
    else:
        # Movie: default case
        return create_movie(title, year, tmdb_id, imdb_id, normalized_title, files)


def process_files(folder_path: str, logger: Any) -> Optional[List[Dict]]:
    """
    Determine folder structure and route to the appropriate scanning logic.

    Args:
        folder_path (str): Path to the folder to scan.
        logger (Any): Logger instance.

    Returns:
        Optional[List[Dict]]: List of structured asset dictionaries, or None on failure.
    """
    asset_folders = _is_asset_folders(folder_path, logger)
    logger.debug(f"Folder Path: {folder_path} | Asset Folder: {asset_folders}")
    start_time = datetime.datetime.now()

    if not asset_folders:
        assets_dict = scan_files_in_flat_folder(folder_path, logger)
    else:
        assets_dict = scan_files_in_nested_folders(folder_path, logger)

    end_time = datetime.datetime.now()
    if assets_dict:
        elapsed_time = (end_time - start_time).total_seconds()
        item_count = sum(len(asset.get('files', [])) for asset in assets_dict) if assets_dict else 0
        items_per_second = item_count / elapsed_time if elapsed_time > 0 else 0
        if logger:
            logger.info(f"Processed {item_count} files in {elapsed_time:.2f} seconds ({items_per_second:.2f} items/s) in folder '{os.path.basename(folder_path.rstrip('/'))}'")
        return assets_dict
    else:
        return None


def _is_asset_folders(folder_path: str, logger: Any) -> bool:
    """
    Check if the folder contains asset folders.

    Args:
        folder_path (str): The path to the folder to check.
        logger (Any): Logger instance for debug output.

    Returns:
        bool: True if the folder contains asset folders, False otherwise.
    """
    if not os.path.exists(folder_path):
        return False
    for item in os.listdir(folder_path):
        if item.startswith('.') or item.startswith('@') or item == "tmp":
            logger.debug(f"Skipping hidden item: {item}")
            continue
        if os.path.isdir(os.path.join(folder_path, item)):
            logger.debug(f"Found asset folder: {item}")
            return True
    return False
def process_selected_files(file_paths: List[str], logger: Any, asset_folders: bool = False) -> List[Dict]:
    """
    Given a list of file paths, group and parse them into assets_dict (as get_assets_files would return).
    """
    from collections import defaultdict
    assets_dict = []
    if asset_folders:
        # Group by parent directory name
        folder_groups = defaultdict(list)
        for file_path in file_paths:
            if file_path.startswith('.'):
                continue
            folder_name = os.path.basename(os.path.dirname(file_path))
            folder_groups[folder_name].append(file_path)
        for folder_name, files in folder_groups.items():
            folder_path = os.path.dirname(files[0])
            base_files = [os.path.basename(f) for f in files]
            assets_dict.append(parse_folder_group(folder_path, folder_name, base_files))
    else:
        # Flat file grouping (original)
        groups = defaultdict(list)
        normalized_map = {}
        for file_path in file_paths:
            filename = os.path.basename(file_path)
            if filename.startswith('.'):
                continue
            title = filename.rsplit('.', 1)[0]
            title = unidecode(html.unescape(title))
            title = re.sub(illegal_chars_regex, '', title)
            raw_title = season_pattern.split(title)[0].strip()
            normalized_title = remove_special_chars.sub('', raw_title.lower())
            if normalized_title in normalized_map:
                match_key = normalized_map[normalized_title]
                groups[match_key].append(file_path)
            else:
                groups[raw_title].append(file_path)
                normalized_map[normalized_title] = raw_title
        for base_name, files in groups.items():
            folder = os.path.dirname(files[0]) if files else ""
            base_files = [os.path.basename(f) for f in files]
            assets_dict.append(parse_file_group(folder, base_name, base_files))
    return assets_dict