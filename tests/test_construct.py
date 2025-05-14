import pytest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from util.construct import create_collection, create_series, create_movie, generate_title_variants

def test_create_collection():
    result = create_collection("Hulu (US) Shows", "hulushows", ["poster.jpg"])
    assert result["type"] == "collections"
    assert result["normalized_title"] == "hulushows"

def test_generate_title_variants_logic():
    v = generate_title_variants("The Matrix Collection")
    assert v["no_prefix"] == "Matrix Collection"
    assert v["no_suffix"] == "The Matrix"