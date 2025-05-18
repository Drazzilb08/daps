import pytest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from util.normalization import normalize_titles, normalize_file_names

# def test_normalize_titles_removes_junk():
#     assert normalize_titles("The Matrix (1999)") == "thematrix"

# def test_preprocess_name_removes_common_words():
#     assert preprocess_name("The Fast and the Furious") == "fastfurious"


def test_normalize_file():
    data = [
        "M*A*S*H (1972) - Season 1.jpg",
        "MASH (1972) - Season 1.jpg",
        "Birds of Prey (and the Fantabulous Emancipation of One Harley Quinn) (2020).jpg",
        "Birds of Prey and the Fantabulous Emancipation of One Harley Quinn (2020).jpg"
    ]
    print("")
    for i in data:
        normalize_file_names(i)
        print("")