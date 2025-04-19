
from util.normalization import normalize_titles
from util.constants import prefixes, suffixes
from typing import Optional

def generate_title_variants(title: str) -> dict[str, str]:
    stripped_prefix = next((title[len(p) + 1:].strip() for p in prefixes if title.startswith(p + " ")), title)
    stripped_suffix = next((title[:-(len(s) + 1)].strip() for s in suffixes if title.endswith(" " + s)), title)
    stripped_both = next((stripped_prefix[:-(len(s) + 1)].strip() for s in suffixes if stripped_prefix.endswith(" " + s)), stripped_prefix)
    alternate_titles = [stripped_prefix, stripped_suffix, stripped_both]
    normalized_alternate_titles = [normalize_titles(alt) for alt in alternate_titles]
    alternate_titles = list(dict.fromkeys(alternate_titles))
    normalized_alternate_titles = list(dict.fromkeys(normalized_alternate_titles))

    return {
        'alternate_titles': alternate_titles,
        'normalized_alternate_titles': normalized_alternate_titles
    }

def create_collection(title: str, normalized_title: str, files: list[str]) -> dict:
    variants = generate_title_variants(title)
    return {
        'type': 'collections',
        'title': title,
        'year': None,
        'normalized_title': normalized_title,
        'files': files,
        'alternate_titles': variants['alternate_titles'],
        'normalized_alternate_titles': variants['normalized_alternate_titles'],
    }

def create_series(title: str, year: Optional[int], tvdb_id: Optional[int], imdb_id: Optional[str], normalized_title: str, files: list[str]) -> dict:
    return {
        'type': 'series',
        'title': title,
        'year': year,
        'tvdb_id': tvdb_id,
        'imdb_id': imdb_id,
        'normalized_title': normalized_title,
        'files': files,
        'season_numbers': [],
    }

def create_movie(title: str, year: Optional[int], tmdb_id: Optional[int], imdb_id: Optional[str], normalized_title: str, files: list[str]) -> dict:
    return {
        'type': 'movies',
        'title': title,
        'year': year,
        'tmdb_id': tmdb_id,
        'imdb_id': imdb_id,
        'normalized_title': normalized_title,
        'files': files,
    }