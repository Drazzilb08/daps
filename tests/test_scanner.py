import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from util.scanner import parse_file_group, parse_folder_group


def test_parse_file_group_basic():
    result = parse_file_group("/fake/path", "Hulu (US) Shows", ["poster.jpg"])
    assert result["title"] == "Hulu (US) Shows"
    assert "poster.jpg" in result["files"][0]

def test_parse_folder_group_normalized_title():
    result = parse_folder_group("/fake/path", "Max Movies", ["poster.jpg"])
    assert result["normalized_title"] == "maxmovies"