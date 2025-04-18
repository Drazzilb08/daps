import pytest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from util.utility import *

@pytest.mark.parametrize("input_title,expected", [
    ("The Matrix (1999)", "thematrix"),
    ("Up (2009)", "up"),
    ("The Lord of the Rings: The Return of the King", "thelordoftheringsthereturnoftheking"),
    ("Dune: Part Two (2024)", "duneparttwo"),
    ("The Fast & The Furious", "thefastandthefurious"),
    ("An Unexpected Journey", "anunexpectedjourney"),
    ("Spider-Man: No Way Home!", "spidermannowayhome"),
])
def test_normalize_titles(input_title, expected):
    assert normalize_titles(input_title) == expected

@pytest.mark.parametrize("input_name,expected", [
    ("The Matrix [US].jpg", "thematrix"),
    ("Interstellar (2014).png", "interstellar2014"),
    ("The Office {Complete}.jpeg", "theoffice"),
])
def test_normalize_file_names(input_name, expected):
    assert normalize_file_names(input_name) == expected

@pytest.mark.parametrize("input_name,expected", [
    ("The Fast & The Furious", "fastfurious"),
    ("An Unexpected Journey", "unexpectedjourney"),
    ("Spider-Man: No Way Home!", "spidermannowayhome"),
])
def test_preprocess_name(input_name, expected):
    assert preprocess_name(input_name) == expected

def test_extract_year():
    assert extract_year("The Matrix (1999)") == 1999
    assert extract_year("Dune (2024)") == 2024
    assert extract_year("Random Title") is None

def test_extract_ids():
    tmdb = "tmdb-12345"
    tvdb = "tvdb_54321"
    imdb = "imdb tt1234567"

    assert extract_ids(tmdb) == (12345, None, None)
    assert extract_ids(tvdb) == (None, 54321, None)
    assert extract_ids(imdb) == (None, None, "tt1234567")

def test_generate_title_variants():
    variants = generate_title_variants("The Matrix Collection")
    assert variants['no_prefix'] == "Matrix Collection"
    assert variants['no_suffix'] == "The Matrix"
    assert variants['no_prefix_normalized'] == "matrixcollection"
    assert variants['no_suffix_normalized'] == "thematrix"


@pytest.mark.parametrize("a,b,expected", [
    ("The.Matrix", "The Matrix", True),
    ("Matrix-Reloaded", "matrix reloaded", True),
    ("Hello", "World", False),
])
def test_compare_strings(a, b, expected):
    assert compare_strings(a, b) == expected


def test_categorize_assets():
    test_assets = [
        {"type": "movies", "files": ["z.mp4"]},
        {"type": "series", "files": ["a.mkv"]},
        {"type": "collections", "files": ["b.png"]},
    ]
    result = categorize_assets(test_assets)
    assert len(result["movies"]) == 1
    assert len(result["series"]) == 1
    assert len(result["collections"]) == 1

def test_search_matches():
    index = create_new_empty_index()
    test_asset = {
        "title": "The Matrix Collection",
        "type": "collections",
        "normalized_title": "thematrixcollection",
        "files": ["The Matrix Collection.jpg"]
    }
    build_search_index(index, test_asset["title"], test_asset, test_asset["type"], logger=None)
    matches = search_matches(index, "Matrix Collection", "collections", logger=None)
    assert len(matches) == 1
    assert matches[0]["title"] == "The Matrix Collection"

def test_is_match_title_normalized():
    asset = {
        "title": "The Matrix",
        "normalized_title": "thematrix",
        "year": 1999,
        "files": [],
    }
    media = {
        "title": "Matrix",
        "normalized_title": "thematrix",
        "year": 1999,
        "alternate_titles": [],
        "normalized_alternate_titles": [],
    }
    assert is_match(asset, media, logger=None, log=False)

def test_is_match_with_ids():
    asset = {
        "title": "Blade Runner",
        "tmdb_id": 123,
        "tvdb_id": None,
        "imdb_id": None,
        "year": 1982,
        "files": [],
    }
    media = {
        "title": "Blade Runner (1982)",
        "tmdb_id": 123,
        "tvdb_id": None,
        "imdb_id": None,
        "year": 1982,
    }
    assert is_match(asset, media, logger=None, log=False)

    def test_merge_assets_deduplication():
        index = create_new_empty_index()
        logger = None

        asset_1 = {
            "title": "Stranger Things",
            "type": "series",
            "normalized_title": "strangerthings",
            "tvdb_id": 123,
            "files": ["Stranger Things - Season 01.jpg"],
            "season_numbers": ["01"],
        }

        asset_2 = {
            "title": "Stranger Things",
            "type": "series",
            "normalized_title": "strangerthings",
            "tvdb_id": 123,
            "files": ["Stranger Things - Season 02.jpg"],
            "season_numbers": ["02"],
        }

        final_assets = []
        merge_assets([asset_1], final_assets, index, logger)
        merge_assets([asset_2], final_assets, index, logger)

        # Ensure only one asset group was merged
        assert len(final_assets) == 1

        merged_asset = final_assets[0]
        assert "Stranger Things - Season 01.jpg" in merged_asset["files"]
        assert "Stranger Things - Season 02.jpg" in merged_asset["files"]
        assert set(merged_asset["season_numbers"]) == {"01", "02"}

