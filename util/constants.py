"""
Constants and regular expressions for parsing and cleaning media titles,
extracting season and episode information, and handling IDs and years.
"""

import re
from typing import List, Set, Pattern

season_pattern: Pattern = re.compile(
    r"(?:\s*-\s*Season\s*\d+|_Season\d{1,2}|\s*-\s*Specials|_Specials)", re.IGNORECASE
)

season_number_regex: Pattern = re.compile(
    r"(?:[-\s_]+)?Season\s*(\d{1,2})", re.IGNORECASE
)

season_regex: str = r"Season (\d{1,2})"
episode_regex: str = r"(?:E|e)(\d{1,2})"

tmdb_id_extractor: Pattern = re.compile(r"tmdbid (\d+)")
tvdb_id_extractor: Pattern = re.compile(r"tvdbid (\d+)")

folder_year_regex: Pattern = re.compile(r"(.*)\s\((\d{4})\)")

illegal_chars_regex: Pattern = re.compile(r"[<>:\"/\\|?*\x00-\x1f]+")
remove_special_chars: Pattern = re.compile(r"[^a-zA-Z0-9\s]+")

title_regex: str = r".*\/([^/]+)\s\((\d{4})\).*"
year_regex: Pattern = re.compile(r"\s?\((\d{4})\)(?!.*Collection).*")

words_to_remove: List[str] = [
    "(US)", "(UK)", "(AU)", "(CA)", "(NZ)", "(FR)", "(NL)"
]

common_words: Set[str] = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to"
}

prefixes: List[str] = [
    "The",
    "A",
    "An",
]

suffixes: List[str] = [
    "Collection",
    "Saga",
]

tmdb_id_regex: Pattern = re.compile(r"tmdb[-_\s](\d+)")
tvdb_id_regex: Pattern = re.compile(r"tvdb[-_\s](\d+)")
imdb_id_regex: Pattern = re.compile(r"imdb[-_\s](tt\d+)")

year_regex_search: Pattern = re.compile(r"\s?\(\d{4}\)")

windows_path_regex: Pattern = re.compile(r"^([A-Z]:\\)")

year_removal_regex: Pattern = re.compile(r"\s?\(\d{4}\)")
bracketed_content_regex = re.compile(r'\s*[\{\[][^{}\[\]]*[\}\]]', flags=re.IGNORECASE)