import os
import datetime
from util.utility import progress
from util.index import create_new_empty_index
from util.scanner import process_files
from util.index import build_search_index, search_matches
from util.match import is_match
from util.normalization import normalize_file_names
from util.construct import generate_title_variants
from typing import Any, Dict, List, Optional, Tuple, Union


def get_assets_files(
    source_dirs: str | list[str],
    logger: Any,
    merge: bool = True
) -> tuple[list[dict] | None, dict[str, Any] | None]:
    """
    Process one or more directories to extract and organize media assets.

    Args:
        source_dirs (str | list[str]): One or more paths to media source directories.
        logger (Any): Logger instance for debug/info messages.
        merge (bool): Whether to merge/deduplicate assets by content and title (default True).

    Returns:
        tuple[list[dict] | None, dict[str, Any] | None]:
            A tuple containing a flat asset list and a search index.
    """
    source_dirs = [source_dirs] if isinstance(source_dirs, str) else source_dirs
    final_assets: list[dict] = []
    prefix_index: dict[str, Any] = create_new_empty_index()

    start_time = datetime.datetime.now()

    for source_dir in source_dirs:
        new_assets = process_files(source_dir, logger)
        if new_assets:
            if merge:
                merge_assets(new_assets, final_assets, prefix_index, logger)
            else:
                # Just add them and index individually (no deduplication)
                for asset in new_assets:
                    asset['files'].sort()
                    final_assets.append(asset)
                    build_search_index(prefix_index, asset['title'], asset, logger)

    end_time = datetime.datetime.now()
    elapsed_time = (end_time - start_time).total_seconds()
    items_per_second = len(source_dirs) / elapsed_time if elapsed_time > 0 else 0
    if logger:
        logger.debug(f"Processed {len(source_dirs)} source directories in {elapsed_time:.2f} seconds ({items_per_second:.2f} items/s)")

    # Return flat assets list and flat prefix index
    if not final_assets:
        if logger:
            logger.warning(f"No valid files were found in any of the source directories: {source_dirs}")
        return None, None

    return final_assets, prefix_index


def merge_assets(new_assets: List[dict], final_assets: List[dict], prefix_index: Dict[str, Any], logger: Any) -> None:
    """
    Merge newly discovered assets into the main asset list, deduplicating by content and title match.

    Args:
        new_assets (List[dict]): Newly discovered assets.
        final_assets (List[dict]): Aggregated list of final assets to update.
        prefix_index (Dict[str, Any]): Title prefix index to accelerate lookups.
        logger (Any): Logger instance for debug/info messages.
    """
    with progress(new_assets, desc="Processing assets", total=len(new_assets), unit="asset", logger=logger, leave=False) as pbar:
        for new in pbar:
            search_matched_assets = search_matches(prefix_index, new['title'], logger)
            for final in search_matched_assets:
                # Skip merging if both new and final assets come from the same directory
                new_dirs = {os.path.dirname(f) for f in new['files']}
                final_dirs = {os.path.dirname(f) for f in final['files']}
                if new_dirs & final_dirs:
                    continue
                if is_match(final, new, logger, log=True) and (final['type'] == new['type'] or final.get('season_numbers') or new.get('season_numbers')):
                    # Promote to series if either asset has seasons
                    if new.get('season_numbers') or final.get('season_numbers'):
                        final['type'] = 'series'
                    for new_file in new['files']:
                        normalized_new_file = normalize_file_names(os.path.basename(new_file))
                        for final_file in final['files']:
                            normalized_final_file = normalize_file_names(os.path.basename(final_file))
                            # Handle collections with variant titles for deduplication
                            if final.get('type') == 'collections':
                                final_base = os.path.splitext(os.path.basename(final_file))[0]
                                final_file_variants = generate_title_variants(final_base)['normalized_alternate_titles']
                            if (
                                normalized_final_file == normalized_new_file
                                or (final.get('type') == 'collections' and normalized_new_file in final_file_variants)
                            ):
                                final['files'].remove(final_file)
                                final['files'].append(new_file)
                                break
                        else:
                            final['files'].append(new_file)

                    new_season_numbers = new.get('season_numbers')
                    if new_season_numbers:
                        final_season_numbers = final.get('season_numbers')
                        if final_season_numbers:
                            # Merge season numbers ensuring uniqueness
                            final['season_numbers'] = list(set(final_season_numbers + new_season_numbers))
                        else:
                            final['season_numbers'] = new_season_numbers
                    final['files'].sort()
                    # Ensure ID data is preserved from the file that exists
                    for key in ['tmdb_id', 'tvdb_id', 'imdb_id']:
                        if not final.get(key) and new.get(key):
                            final[key] = new[key]
                    break
            else:
                # Add new asset if no match found and index it
                new['files'].sort()
                final_assets.append(new)
                build_search_index(prefix_index, new['title'], new, logger)