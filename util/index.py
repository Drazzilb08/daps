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

def build_search_index(prefix_index: PrefixIndex, title: str, asset: Asset, logger: Optional[Any], debug_items: Optional[List[str]] = None) -> None:
    """
    Populate the search index with normalized forms of the asset title for efficient lookup.

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
        break

def search_matches(prefix_index: PrefixIndex, title: str, logger: Optional[Any]) -> List[Asset]:
    """
    Search for matching assets in the index using normalized title prefixes.

    Args:
        prefix_index (PrefixIndex): The populated search index.
        title (str): The title to search for.
        logger (Optional[Any]): Logger instance for optional logging.

    Returns:
        List[Asset]: List of matching assets from the index.
    """
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