from util.normalization import normalize_titles
from typing import Any, Dict, List, Optional

Asset = Dict[str, Any]
PrefixIndex = Dict[str, List[Asset]]

prefix_length: int = 3

def create_new_empty_index() -> PrefixIndex:
    """
    Create and return an empty search index structure.
    Returns:
        PrefixIndex: An empty dictionary.
    """
    return {}

def build_search_index(
    prefix_index: PrefixIndex, 
    title: str, 
    asset: Asset, 
    logger: Optional[Any], 
    debug_items: Optional[List[str]] = None
) -> None:
    """
    Populate the search index with normalized forms of the asset title and TMDB/TVDB IDs for efficient lookup.

    Args:
        prefix_index (PrefixIndex): The overall index to update.
        title (str): Original title to normalize and index.
        asset (Asset): Dictionary containing asset metadata.
        logger (Optional[Any]): Logger instance for debug output.
        debug_items (Optional[List[str]]): List of normalized titles to enable debug logging on.
    """
    processed: str = normalize_titles(title)
    debug_build_index: bool = bool(debug_items and len(debug_items) > 0 and processed in debug_items)

    if debug_build_index and logger:
        logger.info('debug_build_search_index')
        logger.info(processed)
        logger.info(asset)

    # Index by TMDB or TVDB ID if present
    if asset.get("tmdb_id"):
        key = f"tmdb:{asset['tmdb_id']}"
        prefix_index.setdefault(key, []).append(asset)
        if debug_build_index and logger:
            logger.info(f"Indexed by {key}")

    if asset.get("tvdb_id"):
        key = f"tvdb:{asset['tvdb_id']}"
        prefix_index.setdefault(key, []).append(asset)
        if debug_build_index and logger:
            logger.info(f"Indexed by {key}")

    words: List[str] = processed.split()
    if debug_build_index and logger:
        logger.info(words)

    for word in words:
        prefix_index.setdefault(word, []).append(asset)
        if len(word) > prefix_length:
            prefix = word[:prefix_length]
            if debug_build_index and logger:
                logger.info(prefix)
            prefix_index.setdefault(prefix, []).append(asset)
        break  # Only use first word


def search_matches(
    prefix_index: PrefixIndex,
    title: str,
    logger: Optional[Any],
    tmdb_id: Optional[int] = None,
    tvdb_id: Optional[int] = None
) -> List[Asset]:
    """
    Search for matching assets in the index.

    If a TMDB or TVDB ID is provided, search strictly by that ID and return results (even if empty).
    Only perform title-based search if neither ID is provided.
    These search modes are strictly separated ("oil and water").

    Args:
        prefix_index (PrefixIndex): The populated search index.
        title (str): The title to search for.
        logger (Optional[Any]): Logger instance for optional logging.
        tmdb_id (Optional[int]): TMDB ID for direct lookup.
        tvdb_id (Optional[int]): TVDB ID for direct lookup.

    Returns:
        List[Asset]: List of matching assets from the index.
    """
    # If a TMDB or TVDB ID is provided, search only by that ID and return results (even if empty).
    if tmdb_id is not None:
        key = f"tmdb:{tmdb_id}"
        filtered_assets = [a for a in prefix_index.get(key, []) if a.get("tmdb_id") == tmdb_id]
        if filtered_assets and logger:
            titles = [a.get('title', '<no-title>') for a in filtered_assets]
            msg = (
                f"[ID-MATCH] Type: tmdb_id | Value: {tmdb_id} | "
                f"Matches: {len(filtered_assets)} | Titles: {titles} | Searched title: '{title}'"
            )
            if hasattr(logger, "debug"):
                logger.debug(msg)
            else:
                logger.info(msg)
        return filtered_assets
    if tvdb_id is not None:
        key = f"tvdb:{tvdb_id}"
        filtered_assets = [a for a in prefix_index.get(key, []) if a.get("tvdb_id") == tvdb_id]
        if filtered_assets and logger:
            titles = [a.get('title', '<no-title>') for a in filtered_assets]
            msg = (
                f"[ID-MATCH] Type: tvdb_id | Value: {tvdb_id} | "
                f"Matches: {len(filtered_assets)} | Titles: {titles} | Searched title: '{title}'"
            )
            if hasattr(logger, "debug"):
                logger.debug(msg)
            else:
                logger.info(msg)
        return filtered_assets

    # Only perform title-based search if neither ID is provided
    processed_title = normalize_titles(title)
    words = processed_title.split()
    matches: List[Asset] = []
    for word in words:
        if len(word) > prefix_length:
            prefix = word[:prefix_length]
            if prefix in prefix_index:
                matches.extend(prefix_index[prefix])
                return matches
        if word in prefix_index:
            matches.extend(prefix_index[word])
        break
    return matches