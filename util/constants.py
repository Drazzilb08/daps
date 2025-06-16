import re
from typing import List, Set, Pattern

# Matches suffixes like " - Season X" or "_SeasonX" (where X is 1–4 digits), as well as "- Specials" or "_Specials" (case-insensitive)
season_pattern: Pattern = re.compile(
    r"(?:\s*-\s*Season\s*\d+|_Season\d{1,4}|\s*-\s*Specials|_Specials)", re.IGNORECASE
)

# Matches optional leading hyphens, underscores, or spaces before "Season" followed by 1–4 digits (e.g. "- Season 2", "_Season10"), capturing the digits as group 1
season_number_regex: Pattern = re.compile(
    r"(?:[-\s_]+)?Season\s*(\d{1,4})", re.IGNORECASE
)

# Matches the literal "Season " followed by 1–4 digits (e.g. "Season 1", "Season 12", up to "Season 9999"), capturing those digits as group 1
season_regex: str = r"Season (\d{1,4})"

# Matches strings like "E01" or "e5", capturing 1–2 digits as the episode number
episode_regex: str = r"(?:E|e)(\d{1,2})"

# Matches any text (group 1) followed by a space and a 4-digit year in parentheses (group 2), e.g. "Movie Title (2022)"
folder_year_regex: Pattern = re.compile(r"(.*)\s\((\d{4})\)")

# Matches an optional space, a 4-digit year in parentheses (captured as group 1), ensures “Collection” does not appear later, and consumes any trailing text
year_regex: Pattern = re.compile(r"\s?\((\d{4})\)(?!.*Collection).*")

# Matches one or more illegal filename characters—including < > : " / \ | ? * and control characters U+0000–U+001F
illegal_chars_regex: Pattern = re.compile(r"[<>:\"/\\|?*\x00-\x1f]+")

# Matches one or more characters that are not letters (A–Z, a–z), digits (0–9), or whitespace, i.e., special symbols and punctuation
remove_special_chars: Pattern = re.compile(r"[^a-zA-Z0-9\s]+")

# Matches any path ending in “/Title (YYYY)” (possibly with characters after), capturing the title (everything after the last slash up to the space) as group 1 and the 4-digit year as group 2
title_regex: str = r".*\/([^/]+)\s\((\d{4})\).*"

# matches "tmdbid 12345"  or  "tmdb-12345"  or  "tmdb_12345"  or  "tmdb 12345"
tmdb_id_regex = re.compile(r"(?i)\btmdb(?:id|[-_\s])(\d+)\b")

# matches "tvdbid 67890"  or  "tvdb-67890"  or  "tvdb_67890"  or  "tvdb 67890"
tvdb_id_regex = re.compile(r"(?i)\btvdb(?:id|[-_\s])(\d+)\b")

# Matches strings like "imdb-tt1234567", "imdb_tt1234567", or "imdb tt1234567", capturing the "tt" plus digits as the IMDb ID
imdb_id_regex: Pattern = re.compile(r"imdb[-_\s](tt\d+)")

# Matches the start of a Windows drive path like "C:\" or "D:\", capturing the drive letter and colon
windows_path_regex: Pattern = re.compile(r"^([A-Z]:\\)")

# Remove curly‐brace blocks containing TMDB, TVDB, or IMDb IDs
id_content_regex = re.compile(
    r"\s*\{\s*(?:"
    r"tmdb(?:[-_\s]\d+)|"
    r"tvdb(?:[-_\s]\d+)|"
    r"imdb(?:[-_\s](?:tt)?\d+)"
    r")\s*\}",
    flags=re.IGNORECASE,
)

words_to_remove: List[str] = [
    "(US)",
    "(UK)",
    "(AU)",
    "(CA)",
    "(NZ)",
    "(FR)",
    "(NL)",
    "DC's",
]

common_words: Set[str] = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to"}

prefixes: List[str] = [
    "The",
    "A",
    "An",
]

suffixes: List[str] = [
    "Collection",
    "Saga",
]
