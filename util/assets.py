import os
import datetime
from typing import Any, List, Dict, Optional, Tuple

from util.utility import progress
from util.index import create_new_empty_index, build_search_index, search_matches
from util.scanner import process_files
from util.match import is_match
from util.normalization import normalize_file_names
from util.construct import generate_title_variants


def get_assets_files(
    source_dirs: str | List[str],
    logger: Optional[Any],
    merge: bool = True,
) -> Tuple[Optional[List[Dict]], Optional[Dict[str, Any]]]:
    """Process one or more directories to extract and organize media assets.

    Args:
        source_dirs (str or List[str]): One or more paths to media source directories.
        merge (bool): Whether to merge/deduplicate assets by content and title.
        logger (Any, optional): Logger instance for debug/info messages.

    Returns:
        Tuple[Optional[List[Dict]], Optional[Dict[str, Any]]]: A tuple containing a flat
            asset list and a search index.
    """
    if isinstance(source_dirs, str):
        source_dirs = [source_dirs]

    final_assets: List[Dict] = []
    prefix_index: Dict[str, Any] = create_new_empty_index()

    start_time = datetime.datetime.now()

    for source_dir in source_dirs:
        new_assets = process_files(source_dir, logger)
        if new_assets:
            if merge:
                merge_assets(new_assets, final_assets, prefix_index, logger)
            else:
                for asset in new_assets:
                    asset["files"].sort()
                    final_assets.append(asset)
                    build_search_index(prefix_index, asset["title"], asset, logger)

    end_time = datetime.datetime.now()
    elapsed_time = (end_time - start_time).total_seconds()
    items_per_second = len(source_dirs) / elapsed_time if elapsed_time > 0 else 0
    if logger:
        logger.debug(
            f"Processed {len(source_dirs)} source directories in {elapsed_time:.2f} seconds "
            f"({items_per_second:.2f} items/s)"
        )

    if not final_assets:
        if logger:
            logger.warning(
                f"No valid files were found in any of the source directories: {source_dirs}"
            )
        return None, None

    return final_assets, prefix_index


def merge_assets(
    new_assets: List[Dict], final_assets: List[Dict], prefix_index: Dict, logger: Any
) -> None:
    """Merge new asset entries into the final asset list, collapsing duplicates,
    handling upgrades, and indexing.

    Args:
        new_assets (List[Dict]): List of new asset dictionaries.
        final_assets (List[Dict]): List to append/merge assets into.
        prefix_index (Dict): Index for fast search/lookup.
        logger (Any): Logger instance.
    """
    with progress(
        new_assets,
        desc="Processing assets",
        total=len(new_assets),
        unit="asset",
        logger=logger,
        leave=False,
    ) as pbar:
        for new in pbar:
            search_matched_assets = search_matches(prefix_index, new["title"], logger)
            merged = False
            for final in search_matched_assets:
                new_dirs = {os.path.dirname(f) for f in new["files"]}
                final_dirs = {os.path.dirname(f) for f in final["files"]}
                if new_dirs & final_dirs:
                    continue

                is_matched, reason = is_match(final, new)
                if is_matched and (
                    final["type"] == new["type"]
                    or final.get("season_numbers")
                    or new.get("season_numbers")
                ):
                    if new.get("season_numbers") or final.get("season_numbers"):
                        final["type"] = "series"
                    pre_files = list(final["files"])
                    upgrades = []
                    for new_file in new["files"]:
                        normalized_new_file = normalize_file_names(
                            os.path.basename(new_file)
                        )
                        for final_file in final["files"]:
                            normalized_final_file = normalize_file_names(
                                os.path.basename(final_file)
                            )
                            if final.get("type") == "collections":
                                final_base = os.path.splitext(
                                    os.path.basename(final_file)
                                )[0]
                                final_file_variants = generate_title_variants(
                                    final_base
                                )["normalized_alternate_titles"]
                            if normalized_final_file == normalized_new_file or (
                                final.get("type") == "collections"
                                and normalized_new_file in final_file_variants
                            ):
                                final["files"].remove(final_file)
                                final["files"].append(new_file)
                                upgrades.append((final_file, new_file))
                                break
                        else:
                            final["files"].append(new_file)

                    new_season_numbers = new.get("season_numbers")
                    if new_season_numbers:
                        final_season_numbers = final.get("season_numbers")
                        if final_season_numbers:
                            final["season_numbers"] = list(
                                set(final_season_numbers + new_season_numbers)
                            )
                        else:
                            final["season_numbers"] = new_season_numbers
                    final["files"].sort()
                    for key in ["tmdb_id", "tvdb_id", "imdb_id"]:
                        if not final.get(key) and new.get(key):
                            final[key] = new[key]
                    post_files = list(final["files"])
                    src_parent = os.path.basename(os.path.dirname(new["files"][0]))
                    reason_str = f"  Reason: {reason}."
                    files_str = f"  Files: {len(pre_files)} → {len(post_files)}"

                    pre_basenames = {os.path.basename(f): f for f in pre_files}
                    post_basenames = {os.path.basename(f): f for f in post_files}
                    new_basenames = {os.path.basename(f): f for f in new["files"]}

                    upgrade_lines = []
                    for pre_base, pre_full in pre_basenames.items():
                        if pre_base in new_basenames:
                            new_full = new_basenames[pre_base]
                            pre_dir = os.path.basename(os.path.dirname(pre_full))
                            new_dir = os.path.basename(os.path.dirname(new_full))
                            if pre_full != new_full:
                                upgrade_lines.append(
                                    f"    - Replaced: {pre_base} [{pre_dir}]\n"
                                    f"        → {os.path.basename(new_full)} [{new_dir}]"
                                )
                    for post_base, post_full in post_basenames.items():
                        if post_base not in pre_basenames:
                            post_dir = os.path.basename(os.path.dirname(post_full))
                            upgrade_lines.append(
                                f"    - Added:    {post_base} [{post_dir}]"
                            )

                    logger.debug(
                        f"[MERGE] '{final['title']}' ({final['type']}) from [{src_parent}]\n"
                        f"{reason_str}\n"
                        f"{files_str}\n"
                        + ("\n".join(upgrade_lines) if upgrade_lines else "")
                    )
                    merged = True
                    break
            if not merged:
                new["files"].sort()
                final_assets.append(new)
                build_search_index(prefix_index, new["title"], new, logger)
                src_parent = os.path.basename(os.path.dirname(new["files"][0]))
                logger.debug(
                    f"[ADD] New asset '{new['title']}' ({new['type']}), {len(new['files'])} file(s), from {src_parent}"
                )
