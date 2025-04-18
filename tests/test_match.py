import pytest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from util.match import is_match, compare_strings

def test_compare_strings_loose_match():
    assert compare_strings("Hulu Shows", "hulu shows")
    assert not compare_strings("Hulu", "Netflix")

def test_is_match_by_normalized_title():
    asset = {
        "title": "Hulu (US) Shows",
        "normalized_title": "hulushows",
        "files": [],
        "type": "collections"
    }
    media = {
        "title": "Hulu Shows",
        "normalized_title": "hulushows",
        "alternate_titles": [],
        "normalized_alternate_titles": [],
        "year": None
    }
    
    assert is_match(asset, media, logger=None, log=None)