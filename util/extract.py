from typing import Optional, Tuple
from util.constants import year_regex, tmdb_id_regex, tvdb_id_regex, imdb_id_regex


def extract_year(text: str) -> Optional[int]:
    """Extract the first 4-digit year from text.

    Args:
        text: Input string to search for a year.

    Returns:
        The extracted year as an integer, or None if not found.
    """
    try:
        return int(year_regex.search(text).group(1))
    except Exception:
        return None


def extract_ids(text: str) -> Tuple[Optional[int], Optional[int], Optional[str]]:
    """Extract TMDB, TVDB, and IMDB IDs from text.

    Args:
        text: Input string containing IDs.

    Returns:
        Tuple of TMDB ID (int or None), TVDB ID (int or None), IMDB ID (str or None).
    """
    tmdb_match = tmdb_id_regex.search(text)
    tmdb = int(tmdb_match.group(1)) if tmdb_match else None
    tvdb_match = tvdb_id_regex.search(text)
    tvdb = int(tvdb_match.group(1)) if tvdb_match else None
    imdb_match = imdb_id_regex.search(text)
    imdb = imdb_match.group(1) if imdb_match else None
    return tmdb, tvdb, imdb
