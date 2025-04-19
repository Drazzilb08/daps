import os
import datetime
from tqdm import tqdm
from util.index import create_new_empty_index
from util.scanner import process_files
from util.index import build_search_index, search_matches
from util.match import is_match
from util.normalization import normalize_file_names
from util.construct import generate_title_variants
from typing import Any, Dict, List, Tuple, Union, Optional


def get_assets_files(source_dirs: Union[str, List[str]], logger: Any) -> Tuple[Optional[Dict[str, List[dict]]], Optional[Dict[str, Any]]]:
    """
    Get assets files from source directories.

    Args:
        source_dirs (list): List of paths to source directories.
        logger (logger): Logger for output.

    Returns:
        tuple: (assets_dict, prefix_index)
    """
    source_dirs = [source_dirs] if isinstance(source_dirs, str) else source_dirs
    final_assets = []
    prefix_index = create_new_empty_index()
    start_time = datetime.datetime.now()

    for source_dir in source_dirs:
        new_assets = process_files(source_dir, logger)
        if new_assets:
            merge_assets(new_assets, final_assets, prefix_index, logger)
        else:
            if logger:
                logger.warning(f"No files found in the folder: {os.path.basename(source_dir)}")

    assets_dict = categorize_assets(final_assets)

    if all(not v for v in assets_dict.values()):
        if logger:
            logger.warning(f"No files were found in any of the source directories: {source_dirs}")
        return None, None

    end_time = datetime.datetime.now()
    elapsed_time = (end_time - start_time).total_seconds()
    items_per_second = len(source_dirs) / elapsed_time if elapsed_time > 0 else 0
    if logger:
        logger.debug(f"Processed {len(source_dirs)} source directories in {elapsed_time:.2f} seconds ({items_per_second:.2f} items/s)")

    return assets_dict, prefix_index

def merge_assets(new_assets: List[dict], final_assets: List[dict], prefix_index: Dict[str, Any], logger: Any) -> None:
    """Merge and deduplicate new assets into the final asset list."""
    with tqdm(total=len(new_assets), desc="Processing assets", leave=False) as progress_bar:
        for new in new_assets:
            search_matched_assets = search_matches(prefix_index, new['title'], new['type'], logger)
            for final in search_matched_assets:
                if is_match(final, new, logger, log=True) and final['type'] == new['type']:
                    for new_file in new['files']:
                        normalized_new_file = normalize_file_names(os.path.basename(new_file))
                        for final_file in final['files']:
                            normalized_final_file = normalize_file_names(os.path.basename(final_file))
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

                    new_season_numbers = new.get('season_numbers', None)
                    if new_season_numbers:
                        final_season_numbers = final.get('season_numbers', None)
                        if final_season_numbers:
                            final['season_numbers'] = list(set(final_season_numbers + new_season_numbers))
                        else:
                            final['season_numbers'] = new_season_numbers
                    final['files'].sort()
                    break
            else:
                new['files'].sort()
                final_assets.append(new)
                build_search_index(prefix_index, new['title'], new, new['type'], logger)
            progress_bar.update(1)

def categorize_assets(final_assets: List[dict]) -> Dict[str, List[dict]]:
    """Organize final assets into categorized dictionary."""
    assets_dict = {'movies': [], 'series': [], 'collections': []}
    for item in final_assets:
        item['files'].sort(key=lambda x: os.path.basename(x).lower())
        if item['type'] in assets_dict:
            assets_dict[item['type']].append(item)
    return assets_dict