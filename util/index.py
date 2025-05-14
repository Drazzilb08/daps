from util.normalization import preprocess_name
from typing import Any, Dict, List, Optional

Asset = Dict[str, Any]
PrefixIndex = Dict[str, Dict[str, List[Asset]]]

prefix_length: int = 3

def create_new_empty_index() -> PrefixIndex:
    """
    Create and return an empty search index structure with categories for movies, series, and collections.

    Returns:
        PrefixIndex: An empty dictionary with keys 'movies', 'series', and 'collections', each mapping to an empty dictionary.
    """
    return {
        'movies': {},
        'series': {},
        'collections': {},
    }

def build_search_index(prefix_index: PrefixIndex, title: str, asset: Asset, asset_type: str, logger: Optional[Any], debug_items: Optional[List[str]] = None) -> None:
    """
    Populate the search index with normalized forms of the asset title for efficient lookup.

    Args:
        prefix_index (PrefixIndex): The overall index to update.
        title (str): Original title to normalize and index.
        asset (Asset): Dictionary containing asset metadata.
        asset_type (str): One of 'movies', 'series', or 'collections'.
        logger (Optional[Any]): Logger instance for debug output.
        debug_items (Optional[List[str]]): List of normalized titles to enable debug logging on.
    """
    asset_type_processed_forms: Dict[str, List[Asset]] = prefix_index[asset_type]
    processed: str = preprocess_name(title)
    debug_build_index: bool = bool(debug_items and len(debug_items) > 0 and processed in debug_items)

    if debug_build_index and logger:
        logger.info('debug_build_search_index')
        logger.info(processed)
        logger.info(asset_type)
        logger.info(asset)

    # Break normalized title into words for indexing
    words: List[str] = processed.split()
    if debug_build_index and logger:
        logger.info(words)

    # Index only the first word and its prefix for compact index footprint
    for word in words:
        if word not in asset_type_processed_forms:
            asset_type_processed_forms[word] = []
        asset_type_processed_forms[word].append(asset)

        # Also add the prefix if the word is longer than prefix_length
        if len(word) > prefix_length:
            prefix: str = word[0:prefix_length]
            if debug_build_index and logger:
                logger.info(prefix)
            if prefix not in asset_type_processed_forms:
                asset_type_processed_forms[prefix] = []
            asset_type_processed_forms[prefix].append(asset)
        break

def search_matches(prefix_index: PrefixIndex, title: str, asset_type: str, logger: Optional[Any]) -> List[Asset]:
    """
    Search for matching assets in the index using normalized title prefixes.

    Args:
        prefix_index (PrefixIndex): The populated search index.
        title (str): The title to search for.
        asset_type (str): The media type being searched (e.g., 'series').
        logger (Optional[Any]): Logger instance for optional logging.

    Returns:
        List[Asset]: List of matching assets from the index.
    """
    matches: List[Asset] = []
    processed_title: str = preprocess_name(title)
    asset_type_processed_forms: Dict[str, List[Asset]] = prefix_index[asset_type]
    words: List[str] = processed_title.split()

    # Match based on prefix or full word for efficiency
    for word in words:
        if len(word) > prefix_length:
            prefix: str = word[:prefix_length]
            if prefix in asset_type_processed_forms:
                matches.extend(asset_type_processed_forms[prefix])
                return matches
        if word in asset_type_processed_forms:
            matches.extend(asset_type_processed_forms[word])
        break

    return matches