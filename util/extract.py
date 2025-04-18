import re
from typing import Optional
from util.constants import year_regex

def extract_year(text: str) -> Optional[int]:
    try:
        return int(year_regex.search(text).group(1))
    except:
        return None

def extract_ids(text: str) -> tuple[Optional[int], Optional[int], Optional[str]]:
    tmdb = next((int(m.group(1)) for m in [re.search(r'tmdb[-_\s](\d+)', text)] if m), None)
    tvdb = next((int(m.group(1)) for m in [re.search(r'tvdb[-_\s](\d+)', text)] if m), None)
    imdb = next((m.group(1) for m in [re.search(r'imdb[-_\s](tt\d+)', text)] if m), None)
    return tmdb, tvdb, imdb