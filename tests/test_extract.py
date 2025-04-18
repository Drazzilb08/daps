import pytest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from util.extract import extract_year, extract_ids

def test_extract_year():
    assert extract_year("Inception (2010)") == 2010
    assert extract_year("No Year Present") is None

def test_extract_ids():
    assert extract_ids("tmdb-12345") == (12345, None, None)
    assert extract_ids("tvdb_54321") == (None, 54321, None)
    assert extract_ids("imdb tt7654321") == (None, None, "tt7654321")