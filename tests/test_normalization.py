import pytest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from util.normalization import normalize_titles, normalize_file_names, preprocess_name

def test_normalize_titles_removes_junk():
    assert normalize_titles("The Matrix (1999)") == "thematrix"

def test_preprocess_name_removes_common_words():
    assert preprocess_name("The Fast and the Furious") == "fastfurious"

def test_normalize_file_names_strips_tags():
    assert normalize_file_names("Hulu [US].jpg") == "hulu"