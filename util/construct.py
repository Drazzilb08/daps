
from util.normalization import normalize_titles
from util.constants import prefixes, suffixes
from typing import Optional

def generate_title_variants(title: str) -> dict[str, str]:
    stripped_prefix = next((title[len(p):].strip() for p in prefixes if title.startswith(p + " ")), title)
    stripped_suffix = next((title[:-len(s)].strip() for s in suffixes if title.endswith(" " + s)), title)

    return {
        'no_prefix': stripped_prefix,
        'no_suffix': stripped_suffix,
        'no_prefix_normalized': normalize_titles(stripped_prefix),
        'no_suffix_normalized': normalize_titles(stripped_suffix)
    }

def create_collection(title: str, normalized_title: str, files: list[str]) -> dict:
    variants = generate_title_variants(title)
    return {
        'type': 'collections',
        'title': title,
        'year': None,
        'normalized_title': normalized_title,
        'files': files,
        'no_prefix': [variants['no_prefix']],
        'no_suffix': [variants['no_suffix']],
        'no_prefix_normalized': [variants['no_prefix_normalized']],
        'no_suffix_normalized': [variants['no_suffix_normalized']],
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