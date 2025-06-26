import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from util import constants


def test_year_regex_matches():
    assert constants.year_regex.search("The Matrix (1999)")
    assert not constants.year_regex.search("Matrix Reloaded")

def test_common_words():
    assert "the" in constants.common_words
    assert "banana" not in constants.common_words