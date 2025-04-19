import pytest
import json
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import os
import pytest
from util.assets import get_assets_files

def _write_empty(path):
    path.write_bytes(b"")

def test_assets(tmp_path):
    # ── Setup two source directories ────────────────────────
    dir_a = tmp_path / "DirA"
    dir_b = tmp_path / "DirB"
    dir_c = tmp_path / "DirC"
    dir_a.mkdir()
    dir_b.mkdir()
    dir_c.mkdir()

    # In DirA, pretend these are “movie” posters
    for fname in [
        # "Disney.jpg",
        "Disney+.jpg",
        # "Mission- Impossible.jpg",
        # "Mission Impossible Collection.jpg",
        # "The Lord of the Rings Collection.jpg",
        "FX Collection.jpg",
        # "FXX Collection.jpg",
        ]:
        _write_empty(dir_a / fname)

    # In DirB, two more “movie” posters
    for fname in [
        # "Disney.jpg",
        # "Mission- Impossible.jpg",
        "Disney+.jpg",
        # "Disney.jpg",
        # "F-X Collection.jpg"
        # "Mission Impossible Collection.jpg",
        ]:
        _write_empty(dir_b / fname)
    
    # In DirC, pretend these are “movie” posters
    for fname in [
        # "F-X Collection.jpg",
    ]:
        _write_empty(dir_c / fname)

    # ── Run the asset scanner & merger ──────────────────── 
    # Note: dirB is higher priority than dirA
    # because it is the last one in the list.
    assets_dict, prefix_index = get_assets_files([str(dir_a), str(dir_b), str(dir_c)], logger=None)
    # ── Check the results of Prefix Index ─────────────────────
    print(f"Prefix index:")
    for key, value in prefix_index.items():
        print(f"{key}: {json.dumps(value, indent=2)}")
    # Print setup:
    print("Source directories:")
    print(f"DirA contents: {os.listdir(dir_a)}")
    print(f"DirB contents: {os.listdir(dir_b)}")
    print(f"DirC contents: {os.listdir(dir_c)}")
    for asset_type, assets in assets_dict.items():
        if assets:
            print(f"\nAsset Type: {asset_type}")
        for asset in assets:
            print(json.dumps(asset, indent=2))

    # ── Check the results of the merger ─────────────────────
    assert assets_dict is not None
    assert prefix_index is not None
