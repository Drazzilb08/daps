import os
import re
from typing import Any, Dict, List, Optional

from util.constants import prefixes, season_number_regex, suffixes
from util.normalization import normalize_titles


def generate_title_variants(title: str) -> Dict[str, List[str]]:
    """Generate alternate and normalized title variants for a given media title.

    Args:
        title (str): The original media title.

    Returns:
        Dict[str, List[str]]: Dictionary with 'alternate_titles' and
            'normalized_alternate_titles' keys.
    """
    stripped_prefix = next(
        (title[len(p) + 1 :].strip() for p in prefixes if title.startswith(p + " ")),
        title,
    )
    stripped_suffix = next(
        (title[: -(len(s) + 1)].strip() for s in suffixes if title.endswith(" " + s)),
        title,
    )
    stripped_both = next(
        (
            stripped_prefix[: -(len(s) + 1)].strip()
            for s in suffixes
            if stripped_prefix.endswith(" " + s)
        ),
        stripped_prefix,
    )
    alternate_titles = [stripped_prefix, stripped_suffix, stripped_both]
    if not title.lower().endswith("collection"):
        alternate_titles.append(f"{title} Collection")
    normalized_alternate_titles = [normalize_titles(alt) for alt in alternate_titles]
    alternate_titles = list(dict.fromkeys(alternate_titles))
    normalized_alternate_titles = list(dict.fromkeys(normalized_alternate_titles))
    return {
        "alternate_titles": alternate_titles,
        "normalized_alternate_titles": normalized_alternate_titles,
    }


def create_collection(
    title: str,
    tmdb_id: int,
    normalized_title: str,
    files: List[str],
    parent_folder: Optional[str] = None,
    media_folder: Optional[str] = None,
) -> Dict[str, Any]:
    """Construct a standardized dictionary representing a collection entry.

    Args:
        title (str): Display title of the collection.
        tmdb_id (int): TMDB identifier.
        normalized_title (str): Normalized version of the title.
        files (List[str]): Associated media file paths.
        parent_folder (Optional[str]): Folder containing the files.

    Returns:
        Dict[str, Any]: Dictionary with metadata fields for a collection.
    """
    variants = generate_title_variants(title)
    return {
        "type": "collections",
        "title": title,
        "year": None,
        "normalized_title": normalized_title,
        "files": [files[-1]],
        "alternate_titles": variants["alternate_titles"],
        "normalized_alternate_titles": variants["normalized_alternate_titles"],
        "tmdb_id": tmdb_id,
        "folder": parent_folder,
        "media_folder": media_folder,
    }


def create_series(
    title: str,
    year: Optional[int],
    tvdb_id: Optional[int],
    imdb_id: Optional[str],
    normalized_title: str,
    files: List[str],
    parent_folder: Optional[str] = None,
    media_folder: Optional[str] = None,
) -> Dict[str, Any]:
    """Construct a standardized dictionary representing a series entry.

    Args:
        title (str): Series title.
        year (Optional[int]): Release year of the series.
        tvdb_id (Optional[int]): TVDB identifier.
        imdb_id (Optional[str]): IMDB identifier.
        normalized_title (str): Normalized version of the title.
        files (List[str]): List of associated media file paths.
        parent_folder (Optional[str]): Folder containing the files.

    Returns:
        Dict[str, Any]: Dictionary with metadata fields for a series.
    """
    season_numbers_dict = {}
    series_poster = None
    for file_path in files:
        base = os.path.basename(file_path)
        if "Specials" in base:
            season_numbers_dict[0] = file_path
        else:
            match = re.search(season_number_regex, base)
            if match:
                season_numbers_dict[int(match.group(1))] = file_path
            else:
                series_poster = file_path

    season_numbers = sorted(season_numbers_dict.keys())
    final_files = list(season_numbers_dict.values())
    if series_poster:
        final_files.append(series_poster)
    return {
        "type": "series",
        "title": title,
        "year": year,
        "tvdb_id": tvdb_id,
        "imdb_id": imdb_id,
        "normalized_title": normalized_title,
        "files": final_files,
        "season_numbers": season_numbers,
        "folder": parent_folder,
        "media_folder": media_folder,
    }


def create_movie(
    title: str,
    year: Optional[int],
    tmdb_id: Optional[int],
    imdb_id: Optional[str],
    normalized_title: str,
    files: List[str],
    parent_folder: Optional[str] = None,
    media_folder: Optional[str] = None,
) -> Dict[str, Any]:
    """Construct a standardized dictionary representing a movie entry.

    Args:
        title (str): Movie title.
        year (Optional[int]): Release year of the movie.
        tmdb_id (Optional[int]): TMDB identifier.
        imdb_id (Optional[str]): IMDB identifier.
        normalized_title (str): Normalized version of the title.
        files (List[str]): List of associated media file paths.
        parent_folder (Optional[str]): Folder containing the files.

    Returns:
        Dict[str, Any]: Dictionary with metadata fields for a movie.
    """
    return {
        "type": "movies",
        "title": title,
        "year": year,
        "tmdb_id": tmdb_id,
        "imdb_id": imdb_id,
        "normalized_title": normalized_title,
        "files": [files[-1]],
        "folder": parent_folder,
        "media_folder": media_folder,
    }
