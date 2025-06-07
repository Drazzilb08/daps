import pytest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from util.normalization import normalize_titles, normalize_file_names

# def test_normalize_titles_removes_junk():
#     assert normalize_titles("The Matrix (1999)") == "thematrix"

# def test_preprocess_name_removes_common_words():
#     assert preprocess_name("The Fast and the Furious") == "fastfurious"

def test_normalize_titles():
    data = [
        "In/Spectre (2020)",
        "The Fast and the Furious",
        "Spider-Man: Into the Spider-Verse (2018)",
        "Schindler’s List",
        "Pokémon Detective Pikachu",
        "Birds of Prey (and the Fantabulous Emancipation of One Harley Quinn) (2020)"
    ]
    print("\nResults for normalize_titles:")
    for s in data:
        print(f"{s!r} -> {normalize_titles(s)}")

def test_normalize_file():
    data = [
        "In/Spectre (2020).jpg",
        "M*A*S*H (1972) - Season 1.jpg",
        "MASH (1972) - Season 1.jpg",
        "Birds of Prey (and the Fantabulous Emancipation of One Harley Quinn) (2020).jpg",
        "Birds of Prey and the Fantabulous Emancipation of One Harley Quinn (2020).jpg"
    ]
    print("")
    for i in data:
        print(normalize_file_names(i))