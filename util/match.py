import re
import os
import time
from util.utility import progress
from util.normalization import normalize_titles
from util.index import search_matches
from util.constants import folder_year_regex, season_pattern
from typing import Any, Dict, List, Optional

def compare_strings(string1: str, string2: str) -> bool:
    """
    Loosely compare two strings by removing non-alphanumeric characters and comparing lowercase versions.

    Args:
        string1: First string to compare.
        string2: Second string to compare.

    Returns:
        True if the processed strings are equal, False otherwise.
    """
    string1 = re.sub(r'\W+', '', string1)
    string2 = re.sub(r'\W+', '', string2)
    return string1.lower() == string2.lower()

def is_match(
    asset: Dict[str, Any],
    media: Dict[str, Any],
    logger: Any,
    log: bool = True
) -> bool:
    """
    Determine if a media entry and an asset match based on ID, title, and year heuristics.

    Args:
        asset: Asset dictionary.
        media: Media dictionary.
        logger: Logger instance.
        log: If True, logs match information.

    Returns:
        True if asset matches media, otherwise False.
    """
    if media.get('folder'):
        folder_base_name = os.path.basename(media['folder'])
        match = re.search(folder_year_regex, folder_base_name)
        if match:
            media['folder_title'], media['folder_year'] = match.groups()
            media['folder_year'] = int(media['folder_year']) if media['folder_year'] else None
            media['normalized_folder_title'] = normalize_titles(media['folder_title'])

    def year_matches() -> bool:
        asset_year = asset.get('year')
        media_years = [media.get(key) for key in ['year', 'secondary_year', 'folder_year']]
        if asset_year is None and all(year is None for year in media_years):
            return True
        return any(asset_year == year for year in media_years if year is not None)

    has_asset_ids = any(asset.get(k) for k in ['tvdb_id', 'tmdb_id', 'imdb_id'])
    has_media_ids = any(media.get(k) for k in ['tvdb_id', 'tmdb_id', 'imdb_id'])

    if has_asset_ids and has_media_ids:
        # Prefer direct ID matches if IDs are available
        id_match_criteria = [
            (media.get('tvdb_id') is not None and asset.get('tvdb_id') is not None and media['tvdb_id'] == asset['tvdb_id'],
             f"Media ID {media.get('tvdb_id')} matches asset TVDB ID {asset.get('tvdb_id')}"),
            (media.get('tmdb_id') is not None and asset.get('tmdb_id') is not None and media['tmdb_id'] == asset['tmdb_id'],
             f"Media ID {media.get('tmdb_id')} matches asset TMDB ID {asset.get('tmdb_id')}"),
            (media.get('imdb_id') is not None and asset.get('imdb_id') is not None and media['imdb_id'] == asset['imdb_id'],
             f"Media ID {media.get('imdb_id')} matches asset IMDB ID {asset.get('imdb_id')}")
        ]
        for condition, message in id_match_criteria:
            if condition:
                if log and logger:
                    logger.debug(
                        f"Match found: {message} -> Asset: {asset.get('title', '')} ({asset.get('year', '')}), "
                        f"Media: {media.get('title', '')} ({media.get('year', '')})"
                    )
                return True

    # Title-based matching heuristics
    match_criteria = [
        (asset.get('title') == media.get('title'), "Asset title equals media title"),
        (asset.get('title') in media.get('alternate_titles', []), "Asset title found in media's alternate titles"),
        (asset.get('title') == media.get('folder_title'), "Asset title equals media folder title"),
        (asset.get('title') == media.get('original_title'), "Asset title equals media original title"),
        (asset.get('normalized_title') == media.get('normalized_title'), "Asset normalized title equals media normalized title"),
        (asset.get('normalized_title') == media.get('normalized_folder_title'), "Asset normalized title equals media folder title"),
        (asset.get('normalized_title') in media.get('normalized_alternate_titles', []), "Asset normalized title found in media's normalized alternate titles"),
        (any(assets == media.get('title') for assets in asset.get('alternate_titles', [])), "One of asset's alternate_titles matches media title"),
        (any(assets == media.get('normalized_title') for assets in asset.get('normalized_alternate_titles', [])), "One of asset's normalized_alternate_titles matches media normalized title"),
        (any(media_alt == asset.get('title') for media_alt in media.get('alternate_titles', [])), "One of media's alternate_titles matches asset title"),
        (any(media_alt == asset.get('normalized_title') for media_alt in media.get('normalized_alternate_titles', [])), "One of media's normalized_alternate_titles matches asset normalized title"),
        (compare_strings(media.get('title', ''), asset.get('title', '')), "Titles match under loose string comparison"),
        (compare_strings(media.get('normalized_title', ''), asset.get('normalized_title', '')), "Normalized titles match under loose string comparison"),
    ]
    for condition, message in match_criteria:
        # Only consider title matches if years match as well
        if condition and year_matches():
            if log and logger:
                logger.debug(
                    f"Match found: {message} -> Asset: {asset.get('title', '')} ({asset.get('year', '')}), "
                    f"Media: {media.get('title', '')} ({media.get('year', '')})"
                )
            return True
    return False
def match_media_to_assets(
    media_dict: Dict[str, List[Dict[str, Any]]],
    prefix_index: Dict[str, Any],
    ignore_root_folders: List[str],
    logger: Any
) -> Dict[str, Dict[str, List[Dict[str, Any]]]]:
    """
    Match media entries against known asset entries and return unmatched assets by type.

    Args:
        media_dict: Dictionary of media grouped by type.
        prefix_index: Search index for assets.
        ignore_root_folders: List of folder names or paths to ignore.
        logger: Logger instance.

    Returns:
        Dictionary of unmatched entries by type and location.
    """
    unmatched: Dict[str, Dict[str, List[Dict[str, Any]]]] = {'movies': {}, 'series': {}, 'collections': {}}
    for media_type in ['movies', 'series', 'collections']:
        unmatched[media_type] = {}
        media_list = media_dict.get(media_type, [])
        with progress(media_list, desc=f"Matching {media_type}", total=len(media_list), unit="media", logger=logger) as pbar:
            for media_data in pbar:
                # Skip unreleased/unmonitored media
                if media_type in ['series', 'movies'] and media_data.get('status') not in ['released', 'ended', 'continuing']:
                    logger.debug(f"Skipping {media_type} '{media_data.get('title')}' with status '{media_data.get('status')}'")
                    continue
                location = media_data.get('location') if media_type == 'collections' else media_data.get('root_folder')
                if not location:
                    continue
                root = os.path.basename(location.rstrip('/')).lower()
                if ignore_root_folders and (root in ignore_root_folders or location in ignore_root_folders):
                    continue
                unmatched[media_type].setdefault(location, [])
                media_seasons: List[int] = []
                if media_type == 'series':
                    media_seasons = [
                        s['season_number']
                        for s in media_data.get('seasons', [])
                        if s.get('season_has_episodes')
                    ]
                found = False
                # Try ID-based search first, fallback to title search if not found
                tmdb_id = media_data.get('tmdb_id')
                tvdb_id = media_data.get('tvdb_id')
                assets_found = []
                id_assets_found = []
                if tmdb_id or tvdb_id:
                    id_assets_found = search_matches(prefix_index, media_data.get('title', ''), logger, tmdb_id=tmdb_id, tvdb_id=tvdb_id)
                if id_assets_found:
                    asset_data = id_assets_found[0]
                    found = True
                    if media_type == 'series':
                        # Identify missing seasons
                        missing = [s for s in media_seasons
                                if s not in asset_data.get('season_numbers', [])]
                        # Check for a main series poster
                        has_main_poster = any(
                            not season_pattern.search(os.path.basename(f))
                            for f in asset_data.get('files', [])
                        )
                        missing_main_poster = not has_main_poster

                        # Append if we're missing the main poster or any season posters
                        if missing or missing_main_poster:
                            entry = {
                                'title': media_data.get('title'),
                                'year': media_data.get('year'),
                                'missing_seasons': missing,
                                'missing_main_poster': missing_main_poster
                            }
                            unmatched[media_type][location].append(entry)
                else:
                    # Fallback to title search
                    titles_to_try = [media_data.get('title')] + media_data.get('alternate_titles', [])
                    for title in titles_to_try:
                        assets_found = search_matches(prefix_index, title, logger)
                        if assets_found:
                            break
                    for asset_data in assets_found:
                        if is_match(asset_data, media_data, logger):
                            found = True
                            if media_type == 'series' and media_seasons:
                                # Identify missing seasons
                                missing = [
                                    s for s in media_seasons
                                    if s not in asset_data.get('season_numbers', [])
                                ]
                                if missing:
                                    # Check for a main series poster (any file without season indicator)
                                    has_main_poster = any(
                                        not season_pattern.search(os.path.basename(f))
                                        for f in asset_data.get('files', [])
                                    )
                                    missing_main_poster = not has_main_poster
                                    unmatched[media_type][location].append({
                                        'title': media_data.get('title'),
                                        'year': media_data.get('year'),
                                        'missing_seasons': missing,
                                        'missing_main_poster': missing_main_poster
                                    })
                            break
                if not found:
                    has_main_poster = any(
                                        not season_pattern.search(os.path.basename(f))
                                        for f in asset_data.get('files', [])
                                    )
                    entry = {
                        'title': media_data.get('title'),
                        'year': media_data.get('year'),
                        # If no asset at all, the main poster is definitely missing
                        'missing_main_poster': has_main_poster
                    }
                    if media_type == 'series':
                        entry['missing_seasons'] = media_seasons
                    unmatched[media_type][location].append(entry)
    return unmatched

def match_assets_to_media(
    media_dict: Dict[str, List[Dict[str, Any]]],
    prefix_index: Dict[str, Any],
    logger: Optional[Any] = None
) -> Dict[str, Dict[str, List[Dict[str, Any]]]]:
    """
    Match asset files against known media entries using title and ID heuristics.

    Args:
        media_dict: Dictionary of media data by type.
        prefix_index: Asset search index.
        logger: Logger instance.

    Returns:
        Dictionary with matched and unmatched media entries by type.
    """
    combined_dict: Dict[str, Dict[str, List[Dict[str, Any]]]] = {
        'matched': {'collections': [], 'movies': [], 'series': []},
        'unmatched': {'collections': [], 'movies': [], 'series': []}
    }
    asset_types = [t for t in media_dict if media_dict[t] is not None]
    total_comparisons = 0
    total_items = 0
    matches = 0
    non_matches = 0
    with progress(asset_types, desc="Matching assets...", total=len(asset_types), unit="asset types", logger=logger) as pbar_outer:
        for asset_type in pbar_outer:
            if asset_type in media_dict:
                unmatched_media: List[Dict[str, Any]] = []
                matched_dict: List[Dict[str, Any]] = []
                media_data = media_dict[asset_type]
                start_time = time.time()
                with progress(media_data, desc=f"Matching {asset_type}", total=len(media_data), unit="media", logger=logger) as pbar_inner:
                    for media in pbar_inner:
                        search_match = None
                        total_items += 1
                        matched = False
                        search_asset = None
                        seasons = media.get('seasons') or []
                        media_seasons_numbers = [season['season_number'] for season in seasons]
                        tmdb_id = media.get('tmdb_id')
                        tvdb_id = media.get('tvdb_id')
                        candidates = []
                        id_candidates = []
                        # 1. Try ID-based matching
                        if tmdb_id or tvdb_id:
                            id_candidates = search_matches(prefix_index, media.get('title', ''), logger, tmdb_id=tmdb_id, tvdb_id=tvdb_id)
                            for candidate in id_candidates:
                                total_comparisons += 1
                                result = is_match(candidate, media, logger)
                                if result:
                                    search_asset = candidate
                                    matched = True
                                    asset_season_numbers = search_asset.get('season_numbers', None)
                                    if asset_season_numbers and media_seasons_numbers:
                                        handle_series_match(search_asset, media_seasons_numbers, asset_season_numbers)
                                    break
                        # 2. Fallback: Try title-based search (DO NOT pass IDs)
                        if not matched:
                            titles_to_check = [media['title']] + media.get('alternate_titles', [])
                            for title in titles_to_check:
                                candidates = search_matches(prefix_index, title, logger)  # no tmdb_id or tvdb_id
                                if candidates:
                                    break
                            # Prefer assets originally classified as this media type
                            type_candidates = [a for a in candidates if a.get('type') == asset_type]
                            if type_candidates:
                                candidates = type_candidates
                            for search_asset in candidates:
                                total_comparisons += 1
                                result = is_match(search_asset, media, logger)
                                if result:
                                    asset_season_numbers = search_asset.get('season_numbers', None)
                                    # Only consider series match if seasons are compatible
                                    if not asset_season_numbers or not media_seasons_numbers or (asset_season_numbers and media_seasons_numbers):
                                        matched = True
                                        if asset_season_numbers and media_seasons_numbers:
                                            handle_series_match(search_asset, media_seasons_numbers, asset_season_numbers)
                                        break
                        if matched:
                            matches += 1
                            matched_dict.append({
                                'title': media['title'],
                                'year': media['year'],
                                'folder': media.get('folder'),
                                'files': search_asset['files'],
                                'seasons_numbers': search_asset.get('season_numbers', None) if search_asset else None,
                                'asset_ref': search_asset,
                            })
                        else:
                            non_matches += 1
                            unmatched_media.append(media)
                        combined_dict['matched'][asset_type] = matched_dict
                        combined_dict['unmatched'][asset_type] = unmatched_media
                elapsed_time = time.time() - start_time
                items_per_second = len(media_data) / elapsed_time if elapsed_time > 0 else 0
                logger.debug(f"Completed matching for {asset_type}: {len(media_data)} items in {elapsed_time:.2f} seconds ({items_per_second:.2f} items/s)")
    logger.debug(f"{total_items} total_items")
    logger.debug(f"{total_comparisons} total_comparisons")
    logger.debug(f"{matches} total_matches")
    logger.debug(f"{non_matches} non_matches")
    return combined_dict

def handle_series_match(
    asset: Dict[str, Any],
    media_seasons_numbers: List[int],
    asset_season_numbers: List[int]
) -> None:
    """
    Prune asset data to remove files and seasons that do not exist in the corresponding media entry.

    Args:
        asset: Asset dictionary with file and season data.
        media_seasons_numbers: List of seasons found in the media source.
        asset_season_numbers: List of seasons declared in the asset.
    """
    files_to_remove = []
    seasons_to_remove = []
    for file in asset.get('files', []):
        if re.search(r' - Season| - Specials', file):
            # Extract season number or treat "Specials" as season 0
            match = re.search(r"Season (\d+)", file)
            if match:
                season_number = int(match.group(1))
            elif "Specials" in file:
                season_number = 0
            else:
                continue
            if season_number not in media_seasons_numbers:
                files_to_remove.append(file)
    for file in files_to_remove:
        asset['files'].remove(file)
    for season in asset_season_numbers:
        if season not in media_seasons_numbers:
            seasons_to_remove.append(season)
    for season in seasons_to_remove:
        asset_season_numbers.remove(season)