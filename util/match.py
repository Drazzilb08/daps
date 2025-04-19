import re
import os
from util.normalization import normalize_titles
from util.constants import folder_year_regex
from typing import Any, Dict

def compare_strings(string1: str, string2: str) -> bool:
    string1 = re.sub(r'\W+', '', string1)
    string2 = re.sub(r'\W+', '', string2)
    return string1.lower() == string2.lower()

def is_match(asset: Dict[str, Any], media: Dict[str, Any], logger: Any, log: bool = True) -> bool:
    """
    Check if the asset matches the media

    Args:
        asset (dict): The asset to check
        media (dict): The media to check

    Returns:
        bool: True if the asset matches the media, False otherwise
    """
    if media.get('folder'):
        folder_base_name = os.path.basename(media['folder'])
        match = re.search(folder_year_regex, folder_base_name)
        if match:
            media['folder_title'], media['folder_year'] = match.groups()
            media['folder_year'] = int(media['folder_year']) if media['folder_year'] else None
            media['normalized_folder_title'] = normalize_titles(media['folder_title'])

    def year_matches():
        asset_year = asset.get('year')
        media_years = [media.get(year_key) for year_key in ['year', 'secondary_year', 'folder_year']]

        if asset_year is None and all(year is None for year in media_years):
            return True

        return any(asset_year == year for year in media_years if year is not None)

    has_asset_ids = any(asset.get(k) for k in ['tvdb_id', 'tmdb_id', 'imdb_id'])
    has_media_ids = any(media.get(k) for k in ['tvdb_id', 'tmdb_id', 'imdb_id'])
    
    if has_asset_ids and has_media_ids:
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
                    logger.debug(f"Match found: {message} -> Asset: {asset.get('title', '')} ({asset.get('year', '')}), Media: {media.get('title', '')} ({media.get('year', '')})")
                return True

        return False
    else:
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
            if condition and year_matches():
                if log and logger:
                    logger.debug(f"Match found: {message} -> Asset: {asset.get('title', '')} ({asset.get('year', '')}), Media: {media.get('title', '')} ({media.get('year', '')})")
                return True

        return False