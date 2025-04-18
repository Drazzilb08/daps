import re
from util.normalization import preprocess_name

prefix_length = 3

def create_new_empty_index():
    return {
        'movies': {},
        'series': {},
        'collections': {},
    }

def build_search_index(prefix_index, title, asset, asset_type, logger, debug_items=None):
    """
    Build an index of preprocessed movie names for efficient lookup
    Returns both the index and preprocessed forms
    """
    asset_type_processed_forms = prefix_index[asset_type]
    processed = preprocess_name(title)
    debug_build_index = debug_items and len(debug_items) > 0 and processed in debug_items
    
    if debug_build_index:
        logger.info('debug_build_search_index')
        logger.info(processed)
        logger.info(asset_type)
        logger.info(asset)

    # Store word-level index for partial matches
    words = processed.split()
    if debug_build_index:
        logger.info(words)

    # only need to do the first word here
    # also - store add to a prefix to expand possible matches
    for word in words:
    # if len(word) > 2 or len(words)==1:  # Only index words longer than 2 chars unless it's the only word
        if word not in asset_type_processed_forms:
            asset_type_processed_forms[word] = list() #maybe consider moving to dequeue?
        asset_type_processed_forms[word].append(asset)
        

        # also add the prefix.  if shorter than prefix_length then it was already added above.
        if len(word) > prefix_length:
            prefix = word[0:prefix_length]
            if debug_build_index:
                logger.info(prefix)
            if prefix not in asset_type_processed_forms:
                asset_type_processed_forms[prefix] = list()
            asset_type_processed_forms[prefix].append(asset)
        break

    return

def search_matches(prefix_index, title, asset_type, logger, debug_search=False):
    matches = []
    processed_title = preprocess_name(title)
    asset_type_processed_forms = prefix_index[asset_type]

    if debug_search:
        logger.info('debug_search_matches')
        logger.info(processed_title)

    words = processed_title.split()
    if debug_search:
        logger.info(words)

    for word in words:
        if len(word) > prefix_length:
            prefix = word[:prefix_length]
            if debug_search:
                logger.info(prefix)
                logger.info(prefix in asset_type_processed_forms)

            if prefix in asset_type_processed_forms:
                matches.extend(asset_type_processed_forms[prefix])
                return matches

        if word in asset_type_processed_forms:
            matches.extend(asset_type_processed_forms[word])

        if debug_search:
            logger.info(matches)
        break

    return matches