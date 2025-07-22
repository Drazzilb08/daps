import hashlib
import json
from typing import Any, List, Optional, Tuple

from util.config import Config
from util.connector import update_plex_database
from util.database import DapsDB
from util.helper import progress
from util.logger import Logger
from util.normalization import normalize_titles
from util.plex import PlexClient


def upload_posters(config: Config, db: DapsDB, logger: Logger, manifest: dict) -> None:
    """
    Syncs poster assets to Plex using a database-cached media index for matching.
    Avoids unnecessary uploads by comparing hashes. Supports dry-run.
    """
    dry_run = config.dry_run

    for i in config.instances:
        if isinstance(i, dict):
            instance_name, instance_data = next(iter(i.items()))
            if (
                instance_name in config.instances_config["plex"]
                and instance_data["add_posters"]
            ):
                update_plex_database(db, config, logger)
                url = config.instances_config["plex"][instance_name]["url"]
                api = config.instances_config["plex"][instance_name]["api"]
                plex_client = PlexClient(url, api, logger)
                if plex_client.is_connected():
                    assets = []
                    plex_media_cache = db.plex.get_by_instance(instance_name)
                    all_ids = [
                        ("media_cache", i) for i in manifest.get("media_cache", [])
                    ] + [
                        ("collections_cache", i)
                        for i in manifest.get("collections_cache", [])
                    ]
                    for source, asset_id in all_ids:
                        if source == "media_cache":
                            asset = db.media.get_by_id(asset_id)
                        else:
                            asset = db.collection.get_by_id(asset_id)
                        if not asset:
                            logger.warning(
                                f"Asset ID {asset_id} not found in {source}. Skipping."
                            )
                            continue
                        assets.append(asset)
                    movie_index, show_index, collection_index = _build_indexes(
                        plex_media_cache
                    )
                    updated, skipped, failed = [], [], []
                    updated += _sync_movies(
                        assets,
                        db,
                        plex_client,
                        movie_index,
                        dry_run,
                        skipped,
                        failed,
                        logger,
                    )
                    updated += _sync_series(
                        assets,
                        db,
                        plex_client,
                        show_index,
                        dry_run,
                        skipped,
                        failed,
                        logger,
                    )
                    updated += _sync_collections(
                        assets,
                        db,
                        plex_client,
                        collection_index,
                        dry_run,
                        skipped,
                        failed,
                        logger,
                    )

                    logger.info(
                        f"[POSTER SYNC] Uploads: {len(updated)}, Skipped: {len(skipped)}, Failed: {len(failed)}"
                    )
                    if updated:
                        logger.info("[POSTER SYNC] Uploaded:")
                        for x in updated:
                            logger.info(f"  - {x}")
                    if skipped:
                        logger.info("[POSTER SYNC] Skipped (unchanged/dry run):")
                        for x in skipped:
                            logger.info(f"  - {x}")
                    if failed:
                        logger.info("[POSTER SYNC] Failed:")
                        for x in failed:
                            logger.info(f"  - {x}")
                else:
                    logger.warning(f"Skipping sync for {instance_name} (not connected)")
            else:
                logger.info(f"Skipping sync for {instance_name} (not enabled)")


def has_overlay(item: dict) -> bool:
    return "Overlay" in item.get("labels", [])


def _build_indexes(media_cache: List[dict]) -> Tuple[dict, dict, dict]:
    movie_index, show_index, collection_index = {}, {}, {}
    for entry in media_cache:
        typ = entry["asset_type"]
        norm_title = entry["normalized_title"]
        folder = entry["folder"]
        guids = {}
        try:
            guids = json.loads(entry["guids"])
        except Exception:
            pass
        if typ == "movie":
            if folder:
                movie_index[f"folder:{folder}"] = entry
            if norm_title:
                movie_index[f"title:{norm_title}"] = entry
            if "tmdb" in guids:
                movie_index[f"tmdb:{guids['tmdb']}"] = entry
            if "imdb" in guids:
                movie_index[f"imdb:{guids['imdb']}"] = entry
        elif typ in ("show", "tvshow"):
            if folder:
                show_index[f"folder:{folder}"] = entry
            if norm_title:
                show_index[f"title:{norm_title}"] = entry
            if "tmdb" in guids:
                show_index[f"tmdb:{guids['tmdb']}"] = entry
            if "imdb" in guids:
                show_index[f"imdb:{guids['imdb']}"] = entry
            if "tvdb" in guids:
                show_index[f"tvdb:{guids['tvdb']}"] = entry
        elif typ == "collection":
            if norm_title:
                collection_index[f"title:{norm_title}"] = entry
            if folder:
                collection_index[f"folder:{folder}"] = entry
    return movie_index, show_index, collection_index


def _sync_movies(
    records: List[dict],
    db: DapsDB,
    plex_client: Any,
    movie_index: dict,
    dry_run: bool,
    skipped: List[str],
    failed: List[str],
    logger: Any,
) -> List[str]:
    updated = []
    movie_records = [
        a for a in records if a.get("asset_type") == "movie" and a.get("matched") == 1
    ]

    with progress(
        movie_records,
        desc="Syncing Movie Posters",
        total=len(movie_records),
        unit="movie",
        logger=logger,
    ) as bar:
        for record in bar:
            asset_title = record.get("title")
            asset_year = record.get("year")
            poster_path = record.get("renamed_file")
            asset_tmdb = str(record.get("tmdb_id")) if record.get("tmdb_id") else None
            asset_imdb = record.get("imdb_id")
            asset_folder = record.get("folder") or record.get("source_folder")
            library_name = record.get("library_name")
            norm_title = normalize_titles(asset_title)
            record_hash = record.get("file_hash")
            instance_name = record.get("instance_name")
            matched_entry, match_type = match_asset(
                movie_index,
                ["tmdb", "imdb", "folder", "title"],
                {
                    "tmdb": asset_tmdb,
                    "imdb": asset_imdb,
                    "folder": asset_folder,
                    "title": norm_title,
                },
            )

            if not matched_entry:
                failed.append(f"{asset_title} (movie) [NO MATCH]")
                continue

            current_file_hash = compute_file_hash(
                poster_path, asset_title, logger, failed, dry_run
            )

            if current_file_hash == record_hash:
                skipped.append(
                    f"{asset_title} ({match_type}, {matched_entry['library_name']}) [UNCHANGED]"
                )
                continue

            upload_ok = plex_client.upload_poster(
                matched_entry["library_name"],
                matched_entry["title"],
                poster_path,
                year=matched_entry.get("year"),
                dry_run=dry_run,
            )
            if upload_ok:
                if has_overlay(matched_entry):
                    plex_client.remove_label(matched_entry, "Overlay", dry_run)

                db.media.update(
                    "movie",
                    asset_title,
                    asset_year,
                    library_name,
                    instance_name,
                    None,
                    None,
                    None,
                    None,
                    current_file_hash,
                )
                updated.append(
                    f"{asset_title} ({match_type}, {matched_entry['library_name']})"
                )
            else:
                failed.append(
                    f"{asset_title} ({match_type}, {matched_entry['library_name']}) [UPLOAD FAILED]"
                )
    return updated


def _sync_series(
    records: List[dict],
    db: DapsDB,
    plex_client: Any,
    show_index: dict,
    dry_run: bool,
    skipped: List[str],
    failed: List[str],
    logger: Any,
) -> List[str]:
    updated = []
    series_records = [
        a for a in records if a.get("asset_type") == "show" and a.get("matched") == 1
    ]

    with progress(
        series_records,
        desc="Syncing Series Posters",
        total=len(series_records),
        unit="series",
        logger=logger,
    ) as bar:
        for record in bar:
            asset_title = record.get("title")
            asset_year = record.get("year")
            poster_path = record.get("renamed_file")
            asset_tmdb = str(record.get("tmdb_id")) if record.get("tmdb_id") else None
            asset_imdb = record.get("imdb_id")
            asset_tvdb = str(record.get("tvdb_id")) if record.get("tvdb_id") else None
            asset_folder = record.get("folder") or record.get("source_folder")
            library_name = record.get("library_name")
            norm_title = normalize_titles(asset_title)
            record_hash = record.get("file_hash")
            season_number = record.get("season_number")
            instance_name = record.get("instance_name")

            matched_entry, match_type = match_asset(
                show_index,
                ["tvdb", "tmdb", "imdb", "folder", "title"],
                {
                    "tvdb": asset_tvdb,
                    "tmdb": asset_tmdb,
                    "imdb": asset_imdb,
                    "folder": asset_folder,
                    "title": norm_title,
                },
            )
            if not matched_entry:
                failed.append(f"{asset_title} (series) [NO MATCH]")
                continue

            if season_number:
                suffix = f"S{int(season_number):02d}"
                season_display = f"Season {season_number}"
            else:
                suffix = ""
                season_display = "Main Series Poster"

            current_file_hash = compute_file_hash(
                poster_path, asset_title, logger, failed, dry_run
            )
            if current_file_hash == record_hash:
                skipped.append(
                    f"{asset_title}{(' ' + suffix) if suffix else ''} ({season_display}, {match_type}, {matched_entry['library_name']}) [UNCHANGED]"
                )
                continue

            upload_ok = plex_client.upload_poster(
                matched_entry["library_name"],
                matched_entry["title"],
                poster_path,
                year=matched_entry.get("year"),
                is_collection=False,
                season_number=season_number,
                dry_run=dry_run,
            )

            if upload_ok:
                if has_overlay(matched_entry) and not season_number:
                    plex_client.remove_label(matched_entry, "Overlay", dry_run)

                db.media.update(
                    "show",
                    asset_title,
                    asset_year,
                    library_name,
                    instance_name,
                    None,
                    season_number,
                    None,
                    None,
                    current_file_hash,
                )
                updated.append(
                    f"{asset_title}{(' ' + suffix) if suffix else ''} ({match_type}, {matched_entry['library_name']})"
                )
            else:
                failed.append(
                    f"{asset_title}{(' ' + suffix) if suffix else ''} ({match_type}, {matched_entry['library_name']}) [UPLOAD FAILED]"
                )
    return updated


def _sync_collections(
    records: List[dict],
    db: DapsDB,
    plex_client: Any,
    collection_index: dict,
    dry_run: bool,
    skipped: List[str],
    failed: List[str],
    logger: Any,
) -> List[str]:
    updated = []
    collection_records = [
        a
        for a in records
        if a.get("asset_type") == "collection" and a.get("matched") == 1
    ]
    with progress(
        collection_records,
        desc="Syncing Collection Posters",
        total=len(collection_records),
        unit="collection",
        logger=logger,
    ) as bar:
        for record in bar:
            asset_title = record.get("title")
            asset_year = record.get("year")
            poster_path = record.get("renamed_file")
            asset_folder = record.get("folder") or record.get("source_folder")
            library_name = record.get("library_name")
            norm_title = normalize_titles(asset_title)
            record_hash = record.get("file_hash")
            instance_name = record.get("instance_name")
            matched_entry, match_type = match_asset(
                collection_index,
                ["title", "folder"],
                {
                    "title": norm_title,
                    "folder": asset_folder,
                },
            )
            if not matched_entry:
                failed.append(f"{asset_title} (collection) [NO MATCH]")
                continue

            current_file_hash = compute_file_hash(
                poster_path, asset_title, logger, failed, dry_run
            )

            if current_file_hash == record_hash:
                skipped.append(
                    f"{asset_title} ({match_type}, {matched_entry['library_name']}) [UNCHANGED]"
                )
                continue

            upload_ok = plex_client.upload_poster(
                matched_entry["library_name"],
                matched_entry["title"],
                poster_path,
                year=None,
                is_collection=True,
                dry_run=dry_run,
            )
            if upload_ok:
                if has_overlay(matched_entry):
                    plex_client.remove_label(matched_entry, "Overlay", dry_run)

                db.media.update(
                    "collection",
                    asset_title,
                    asset_year,
                    library_name,
                    instance_name,
                    None,
                    None,
                    None,
                    None,
                    current_file_hash,
                )
                updated.append(
                    f"{asset_title} ({match_type}, {matched_entry['library_name']})"
                )
            else:
                failed.append(
                    f"{asset_title} ({match_type}, {matched_entry['library_name']}) [UPLOAD FAILED]"
                )
    return updated


def match_asset(
    index: dict, priority_keys: List[str], values: dict
) -> Tuple[Optional[dict], Optional[str]]:
    """
    Generic matching function for assets.

    Args:
        index (dict): The prebuilt index (e.g., movie_index).
        priority_keys (list): Priority order for matching, e.g., ["tmdb", "imdb", "folder", "title"].
        values (dict): Dict of values like {"tmdb": "1234", "title": "foobar"}.

    Returns:
        tuple: (matched_record, match_type) or (None, None)
    """
    for key in priority_keys:
        value = values.get(key)
        if value and f"{key}:{value}" in index:
            return index[f"{key}:{value}"], key.upper()
    return None, None


def compute_file_hash(
    poster_path: str,
    asset_title: str,
    logger: Any,
    failed: List[str],
    dry_run: bool = False,
) -> Optional[str]:
    """
    Compute SHA-256 hash of the poster file, or return dummy hash if dry run.
    Appends to failed list and logs error if the file is unreadable.

    Returns:
        str|None: File hash or None if file couldn't be read (only on real run).
    """
    if dry_run:
        return "1234567890"

    try:
        with open(poster_path, "rb") as f:
            return hashlib.sha256(f.read()).hexdigest()
    except Exception as e:
        logger.error(f"Cannot read poster for {asset_title}: {poster_path} -- {e}")
        failed.append(f"{asset_title} [FILE NOT FOUND]")
        return None
