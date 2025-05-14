from typing import Optional, Tuple
from util.constants import year_regex, tmdb_id_regex, tvdb_id_regex, imdb_id_regex

def extract_year(text: str) -> Optional[int]:
    """
    Extract the first valid 4-digit year from the given text using a regular expression.

    Args:
        text: The input string to search for a year.

    Returns:
        The extracted year as an integer, or None if no valid year is found.
    """
    try:
        # Search for a year pattern and convert to integer if found
        return int(year_regex.search(text).group(1))
    except Exception:
        # Return None if no match or conversion fails
        return None

def extract_ids(text: str) -> Tuple[Optional[int], Optional[int], Optional[str]]:
    """
    Extract TMDB, TVDB, and IMDB IDs from the given text using regex patterns.

    Args:
        text: The input string that may contain IDs in formats like 'tmdb-123456', 'tvdb_98765', 'imdb tt1234567'.

    Returns:
        A tuple containing TMDB ID (int or None), TVDB ID (int or None), and IMDB ID (str or None).
    """
    tmdb_match = tmdb_id_regex.search(text)
    tmdb = int(tmdb_match.group(1)) if tmdb_match else None

    tvdb_match = tvdb_id_regex.search(text)
    tvdb = int(tvdb_match.group(1)) if tvdb_match else None

    imdb_match = imdb_id_regex.search(text)
    imdb = imdb_match.group(1) if imdb_match else None

    return tmdb, tvdb, imdb