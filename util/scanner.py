import os
import re
import html
import datetime
from typing import Any, Dict, List, Optional
from collections import defaultdict

from unidecode import unidecode

from util.utility import progress
from util.normalization import normalize_titles
from util.construct import create_collection, create_series, create_movie
from util.extract import extract_year, extract_ids
from util.constants import (
    year_regex,
    season_pattern,
    remove_special_chars,
    illegal_chars_regex,
)


def scan_files_in_flat_folder(folder_path: str, logger: Any) -> List[Dict]:
    """Scan a flat directory structure (no subfolders) for media assets.

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
    except Exception as exc:
        logger.error(f"Unexpected error listing files in folder {folder_path}: {exc}")
        return []

    groups = defaultdict(list)
    normalized_map = {}
    assets_dict = []

    for file in files:
        try:
            if re.match(r"^\.[^.]", file):
                continue
            title = file.rsplit(".", 1)[0]
            title = unidecode(html.unescape(title))
            title = re.sub(illegal_chars_regex, "", title)
            raw_title = season_pattern.split(title)[0].strip()
            normalized_title = remove_special_chars.sub("", raw_title.lower())
            if normalized_title in normalized_map:
                match_key = normalized_map[normalized_title]
                groups[match_key].append(file)
            else:
                groups[raw_title].append(file)
                normalized_map[normalized_title] = raw_title
        except Exception as exc:
            logger.error(
                f"Error processing file '{file}' in folder {folder_path}: {exc}"
            )
            continue

    groups = dict(sorted(groups.items(), key=lambda x: x[0].lower()))

    with progress(
        groups.items(),
        desc=f"Processing files {os.path.basename(folder_path)}",
        total=len(groups),
        unit="file",
        logger=logger,
    ) as pbar:
        for base_name, files in groups.items():
            try:
                assets_dict.append(parse_file_group(folder_path, base_name, files))
            except Exception as exc:
                logger.error(
                    f"Error parsing file group '{base_name}' in folder {folder_path}: {exc}"
                )
                continue
            pbar.update(1)

    return assets_dict


def scan_files_in_nested_folders(folder_path: str, logger: Any) -> Optional[List[Dict]]:
    """Scan a directory with subfolders representing grouped assets (e.g., per movie/series).

    Args:
      folder_path (str): Path to the base folder.
      logger (Any): Logger instance.

    Returns:
      Optional[List[Dict]]: List of parsed asset dictionaries from subfolders, or None on error.
    """
    assets_dict = []
    try:
        entries = list(os.scandir(folder_path))
        progress_bar = progress(
            entries,
            desc="Processing posters",
            total=len(entries),
            unit="folder",
            logger=logger,
        )

        for dir_entry in progress_bar:
            if (
                not dir_entry.is_dir()
                or dir_entry.name.startswith(".")
                or dir_entry.name == "tmp"
            ):
                continue
            base_name = os.path.basename(dir_entry.path)
            try:
                files = [f.name for f in os.scandir(dir_entry.path) if f.is_file()]
            except Exception as exc:
                logger.error(
                    f"Failed to scan nested folder: {dir_entry.path} | Exception: {exc}"
                )
                continue
            if not files:
                logger.debug(f"Skipping empty folder: {dir_entry.path}")
                continue
            try:
                assets_dict.append(parse_folder_group(dir_entry.path, base_name, files))
            except Exception as exc:
                logger.error(
                    f"Failed to parse folder group: {dir_entry.path} | Exception: {exc}"
                )
                continue
    except Exception as exc:
        logger.error(f"Error scanning folder {folder_path}: {exc}")
        return None
    return assets_dict


def parse_folder_group(folder_path: str, base_name: str, files: List[str]) -> Dict:
    """Parse metadata and build a structured dictionary for assets within a folder.

    Args:
      folder_path (str): Path to the folder.
      base_name (str): Base name of the folder.
      files (List[str]): List of file names.

    Returns:
      Dict: Structured asset dictionary.
    """
    try:
        title = re.sub(year_regex, "", base_name)
        title = unidecode(html.unescape(title))
        year = extract_year(base_name)
        tmdb_id, tvdb_id, imdb_id = extract_ids(base_name)
        normalized_title = normalize_titles(base_name)
        full_paths = sorted(
            [
                os.path.join(folder_path, file)
                for file in files
                if not file.startswith(".")
            ]
        )
        parent_folder = os.path.basename(folder_path)

        if not full_paths:
            raise ValueError(f"No valid files found in folder")

        is_series = len(files) > 1 and any(
            "Season" in os.path.basename(file) for file in files
        )
        is_collection = not year

        if is_collection:
            return create_collection(
                title, tmdb_id, normalized_title, full_paths, parent_folder
            )
        if is_series or tvdb_id:
            return create_series(
                title,
                year,
                tvdb_id,
                imdb_id,
                normalized_title,
                full_paths,
                parent_folder,
            )
        return create_movie(
            title, year, tmdb_id, imdb_id, normalized_title, full_paths, parent_folder
        )
    except Exception as exc:
        raise ValueError(
            f"Error parsing folder group. Folder: {folder_path}, Base name: {base_name}, Exception: {exc}"
        )


def parse_file_group(folder_path: str, base_name: str, files: List[str]) -> Dict:
    """Parse a group of files in a flat folder into structured metadata.

    Args:
      folder_path (str): Path to the containing folder.
      base_name (str): Group title.
      files (List[str]): List of file names.

    Returns:
      Dict: Structured media dictionary.
    """
    try:
        id_cleaned_name = re.sub(r"\{(?:tmdb|tvdb|imdb)-\w+\}", "", base_name).strip()
        title = re.sub(year_regex, "", id_cleaned_name).strip()
        title = unidecode(html.unescape(title))
        year = extract_year(base_name)
        tmdb_id, tvdb_id, imdb_id = extract_ids(base_name)
        normalized_title = normalize_titles(base_name)
        files = sorted(
            [
                os.path.join(folder_path, file)
                for file in files
                if not re.match(r"^\.[^.]", file)
            ]
        )
        is_series = any(season_pattern.search(file) for file in files)
        is_collection = not year
        non_season_file = next((f for f in files if not season_pattern.search(f)), None)
        if non_season_file:
            media_folder = os.path.splitext(os.path.basename(non_season_file))[0]
        else:
            media_folder = (
                os.path.splitext(os.path.basename(files[0]))[0] if files else ""
            )

        if is_collection:
            return create_collection(
                title,
                tmdb_id,
                normalized_title,
                files,
                parent_folder=None,
                media_folder=media_folder,
            )
        if is_series or tvdb_id:
            return create_series(
                title,
                year,
                tvdb_id,
                imdb_id,
                normalized_title,
                files,
                parent_folder=None,
                media_folder=media_folder,
            )
        return create_movie(
            title,
            year,
            tmdb_id,
            imdb_id,
            normalized_title,
            files,
            parent_folder=None,
            media_folder=media_folder,
        )
    except Exception as exc:
        raise ValueError(
            f"Error parsing file group. Folder: {folder_path}, Base name: {base_name}, Exception: {exc}"
        )


def process_files(folder_path: str, logger: Any) -> Optional[List[Dict]]:
    """Determine folder structure and route to the appropriate scanning logic.

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
        item_count = (
            sum(len(asset.get("files", [])) for asset in assets_dict)
            if assets_dict
            else 0
        )
        items_per_second = item_count / elapsed_time if elapsed_time > 0 else 0
        if logger:
            logger.info(
                f"Processed {item_count} files in {elapsed_time:.2f} seconds ({items_per_second:.2f} items/s) "
                f"in folder '{os.path.basename(folder_path.rstrip('/'))}'"
            )
        return assets_dict
    return None


def _is_asset_folders(folder_path: str, logger: Any) -> bool:
    """Check if the folder contains asset folders.

    Args:
      folder_path (str): The path to the folder to check.
      logger (Any): Logger instance for debug output.

    Returns:
      bool: True if the folder contains asset folders, False otherwise.
    """
    try:
        if not os.path.exists(folder_path):
            return False
        for item in os.listdir(folder_path):
            if (
                (len(item) > 1 and item[0] == "." and item[1] != ".")
                or item.startswith("@")
                or item == "tmp"
            ):
                logger.debug(f"Skipping hidden item: {item}")
                continue
            if os.path.isdir(os.path.join(folder_path, item)):
                return True
        return False
    except Exception as exc:
        logger.error(f"Error checking asset folders in {folder_path}: {exc}")
        return False


def process_selected_files(
    file_paths: List[str], logger: Any, asset_folders: bool = False
) -> List[Dict]:
    """Group and parse selected file paths into assets_dict.

    Args:
      file_paths (List[str]): List of file paths.
      logger (Any): Logger instance.
      asset_folders (bool): Whether files are grouped in asset folders.

    Returns:
      List[Dict]: List of structured asset dictionaries.
    """
    assets_dict = []
    if asset_folders:
        folder_groups = defaultdict(list)
        for file_path in file_paths:
            if file_path.startswith("."):
                continue
            folder_name = os.path.basename(os.path.dirname(file_path))
            folder_groups[folder_name].append(file_path)
        for folder_name, files in folder_groups.items():
            folder_path = os.path.dirname(files[0])
            base_files = [os.path.basename(f) for f in files]
            try:
                assets_dict.append(
                    parse_folder_group(folder_path, folder_name, base_files)
                )
            except Exception as exc:
                logger.error(
                    f"Error parsing folder group '{folder_name}' in folder '{folder_path}': {exc}"
                )
                continue
    else:
        groups = defaultdict(list)
        normalized_map = {}
        for file_path in file_paths:
            filename = os.path.basename(file_path)
            if filename.startswith("."):
                continue
            title = filename.rsplit(".", 1)[0]
            title = unidecode(html.unescape(title))
            title = re.sub(illegal_chars_regex, "", title)
            raw_title = season_pattern.split(title)[0].strip()
            normalized_title = remove_special_chars.sub("", raw_title.lower())
            if normalized_title in normalized_map:
                match_key = normalized_map[normalized_title]
                groups[match_key].append(file_path)
            else:
                groups[raw_title].append(file_path)
                normalized_map[normalized_title] = raw_title
        for base_name, files in groups.items():
            folder = os.path.dirname(files[0]) if files else ""
            base_files = [os.path.basename(f) for f in files]
            try:
                assets_dict.append(parse_file_group(folder, base_name, base_files))
            except Exception as exc:
                logger.error(
                    f"Error parsing file group '{base_name}' in folder '{folder}': {exc}"
                )
                continue
    return assets_dict
