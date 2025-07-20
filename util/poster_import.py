import os
from typing import Any, List, Optional

from util.constants import id_content_regex, season_number_regex, year_regex
from util.helper import (
    extract_ids,
    extract_year,
    is_match,
    normalize_titles,
)


def get_assets_files(source_dir: str) -> List[dict]:
    """
    Scan a directory for asset files and build a list of records with normalized and alternate titles.
    """

    asset_records = []
    for root, dirs, files in os.walk(source_dir):
        for fname in files:
            if not fname.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                continue
            fpath = os.path.join(root, fname)
            folder = os.path.basename(root)
            filename, _ = os.path.splitext(fname)

            # Try to extract title (pre-parenthesis, pre-brace, else whole filename)
            title_base = id_content_regex.sub("", filename).strip()
            title = year_regex.sub("", title_base).strip()

            # Get year, ids, and season number
            year = extract_year(fname) or extract_year(title) or extract_year(folder)
            tmdb_id, tvdb_id, imdb_id = extract_ids(fname)
            if not (tmdb_id or tvdb_id or imdb_id):
                tmdb_id, tvdb_id, imdb_id = extract_ids(folder)
            match = season_number_regex.search(fname) or season_number_regex.search(
                folder
            )
            season_number = int(match.group(1)) if match else None

            # Only collections without year get alternate titles (per your spec)

            record = {
                "title": title,
                "normalized_title": normalize_titles(title),
                "year": year,
                "tmdb_id": tmdb_id,
                "tvdb_id": tvdb_id,
                "imdb_id": imdb_id,
                "season_number": season_number,
                "folder": folder,
                "file": fpath,
            }
            asset_records.append(record)
    return asset_records


def merge_assets(db: Any, source_dirs: List[str], logger: Optional[Any] = None) -> None:
    """
    For each directory (low->high priority), scan assets and upsert them so that
    higher priority assets overwrite lower priority ones in the DB.
    This version deletes any previous matches (by ID or normalized title/year/season_number)
    before inserting the new asset.
    """

    for src_idx, source_dir in enumerate(source_dirs):
        assets = get_assets_files(source_dir)

        for asset in assets:
            # Always delete all possible matches, so only highest-priority wins

            # 1. Delete by IDs, if present
            for id_field in ["imdb_id", "tmdb_id", "tvdb_id"]:
                id_val = asset.get(id_field)
                if id_val:
                    db.delete_poster_cache_by_id(
                        id_field, id_val, asset.get("season_number")
                    )

            # 2. Delete by normalized_title/year/season_number
            db.delete_poster_cache_by_title(
                asset["normalized_title"], asset.get("year"), asset.get("season_number")
            )

            # 3. Try to find a match for ID propagation (e.g. old record with an ID, new without)
            matched = None
            id_fields = [
                ("imdb_id", asset.get("imdb_id")),
                ("tmdb_id", asset.get("tmdb_id")),
                ("tvdb_id", asset.get("tvdb_id")),
            ]
            for id_field, id_val in id_fields:
                if id_val:
                    matched = db.get_poster_cache_by_id(
                        id_field, id_val, asset.get("season_number")
                    )
                    if matched:
                        break
            if not matched:
                matched = db.get_poster_cache_by_normalized_title(
                    asset["normalized_title"],
                    asset.get("year"),
                    asset.get("season_number"),
                )
            if matched and not is_match(matched, asset)[0]:
                matched = None

            # 4. Propagate IDs if needed (old had ID, new didn't)
            if matched:
                for id_field in ["imdb_id", "tmdb_id", "tvdb_id"]:
                    if matched.get(id_field) and not asset.get(id_field):
                        asset[id_field] = matched[id_field]
                # For shows: propagate IDs to all seasons if this is a season poster
                db.propagate_ids_for_show(asset["title"], asset.get("year"), asset)
            # 5. Upsert the new asset (now the only entry for this logical asset)
            db.upsert_poster_cache(asset)
