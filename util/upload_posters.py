import hashlib
import json
from typing import Any, List, Optional, Tuple

from util.config import load_config
from util.connector import Connector
from util.database import DapsDB
from util.helper import progress
from util.logger import Logger
from util.normalization import normalize_titles
from util.plex import PlexClient


# Manifest expected: {'media_cache': [int]], 'collections_cache': [int]}
class PosterUploader:
    def __init__(
        self,
        logger: Logger = None,
        manifest: dict = None,
    ):
        self.full_config = load_config()
        self.config = self.full_config.poster_renamerr
        self.db = DapsDB()
        self.logger = logger or Logger(self.config.log_level, "poster_uploader")
        self.logger = self.logger.get_adapter("poster_uploader")
        self.manifest = manifest or {}

    def upload_posters(self):
        """
        Syncs poster assets to Plex using a database-cached media index for matching.
        Avoids unnecessary uploads by comparing hashes. Supports dry-run.
        Returns a summary dict for programmatic consumption.
        """
        dry_run = self.config.dry_run
        instances = self.config.instances
        instance_list = {
            "arrs": [i for i in instances if isinstance(i, str)],
            "plex": {
                name: (opts.library_names or [])
                for i in instances
                if isinstance(i, dict)
                for name, opts in i.items()
                if getattr(opts, "add_posters", False)
            },
        }
        Connector(
            self.db, self.full_config, self.logger, instance_list
        ).update_plex_database()
        overall_updated = []
        overall_skipped = []
        overall_failed = []
        any_instance_processed = False
        try:
            for i in self.config.instances:
                if isinstance(i, dict):
                    instance_name, instance_data = next(iter(i.items()))
                    plex_config = self.full_config.instances.plex.get(instance_name)
                    add_posters = instance_data.add_posters
                    if plex_config and add_posters:
                        any_instance_processed = True
                        url = plex_config.url
                        api = plex_config.api
                        plex_client = PlexClient(url, api, self.logger)
                        if plex_client.is_connected():
                            assets = []
                            plex_media_cache = self.db.plex.get_by_instance(
                                instance_name
                            )
                            all_ids = [
                                ("media_cache", i)
                                for i in self.manifest.get("media_cache", [])
                            ] + [
                                ("collections_cache", i)
                                for i in self.manifest.get("collections_cache", [])
                            ]
                            for source, asset_id in all_ids:
                                if source == "media_cache":
                                    asset = self.db.media.get_by_id(asset_id)
                                else:
                                    asset = self.db.collection.get_by_id(asset_id)
                                if not asset:
                                    self.logger.warning(
                                        f"Asset ID {asset_id} not found in {source}. Skipping."
                                    )
                                    continue
                                assets.append(asset)
                            if not plex_media_cache:
                                self.logger.error(
                                    f"No media cache found for Plex instance '{instance_name}'. Skipping instance."
                                )
                                overall_failed.append(
                                    f"{instance_name}: No media cache."
                                )
                                continue
                            movie_index, show_index, season_index, collection_index = (
                                self._build_indexes(plex_media_cache)
                            )
                            updated, skipped, failed = [], [], []
                            updated += self._sync_movies(
                                assets,
                                self.db,
                                plex_client,
                                movie_index,
                                dry_run,
                                skipped,
                                failed,
                                self.logger,
                            )
                            updated += self._sync_shows_and_seasons(
                                assets,
                                self.db,
                                plex_client,
                                show_index,
                                season_index,
                                dry_run,
                                skipped,
                                failed,
                                self.logger,
                            )
                            updated += self._sync_collections(
                                assets,
                                self.db,
                                plex_client,
                                collection_index,
                                dry_run,
                                skipped,
                                failed,
                                self.logger,
                            )
                            overall_updated.extend(updated)
                            overall_skipped.extend(skipped)
                            overall_failed.extend(failed)
                        else:
                            msg = f"Skipping sync for {instance_name} (not connected)"
                            self.logger.warning(msg)
                            overall_failed.append(msg)
                    else:
                        msg = f"Skipping sync for {instance_name} (not enabled)"
                        self.logger.info(msg)
                        overall_skipped.append(msg)
            # Compose result
            if not any_instance_processed:
                self.logger.error(
                    "No Plex instances enabled or configured for poster upload."
                )
                return {
                    "success": False,
                    "message": "No Plex instances enabled or configured for poster upload.",
                    "error_code": "NO_ENABLED_INSTANCE",
                    "payload": {
                        "manifest": self.manifest,
                    },
                }
            if overall_failed:
                # Partial or total failure; include everything needed to retry in 'payload'
                self.logger.error(
                    f"Some uploads failed. Updated: {len(overall_updated)}, Skipped: {len(overall_skipped)}, Failed: {len(overall_failed)}"
                )
                return {
                    "success": False,
                    "message": f"Some uploads failed. Updated: {len(overall_updated)}, Skipped: {len(overall_skipped)}, Failed: {len(overall_failed)}",
                    "error_code": "UPLOAD_FAILED",
                    "payload": {
                        "manifest": self.manifest,
                        "updated": overall_updated,
                        "skipped": overall_skipped,
                        "failed": overall_failed,
                    },
                }
            # If here, all succeeded or were skipped
            return {
                "success": True,
                "message": f"Uploads completed. Updated: {len(overall_updated)}, Skipped: {len(overall_skipped)}",
                "error_code": None,
                "payload": {
                    "manifest": self.manifest,
                    "updated": overall_updated,
                    "skipped": overall_skipped,
                },
            }
        except Exception as exc:
            self.logger.error(f"Exception during poster upload: {exc}", exc_info=True)
            return {
                "success": False,
                "message": f"Exception occurred: {exc}",
                "error_code": "EXCEPTION",
                "payload": {
                    "manifest": self.manifest,
                },
            }

    @staticmethod
    def has_overlay(item: dict) -> bool:
        return "Overlay" in item.get("labels", [])

    @staticmethod
    def _build_indexes(media_cache: List[dict]) -> Tuple[dict, dict, dict, dict]:
        """
        Build indexes for fast asset lookups by type.
        Returns (movie_index, show_index, season_index, collection_index).
        Keys are prioritized by tmdb, imdb, tvdb, title (normalized), season_number.
        """
        movie_index, show_index, season_index, collection_index = {}, {}, {}, {}
        for entry in media_cache:
            typ = entry["asset_type"]
            norm_title = entry["normalized_title"]
            guids = entry.get("guids", {})
            # Support for JSON-encoded guids if needed
            if isinstance(guids, str):
                try:
                    guids = json.loads(guids)
                except Exception:
                    guids = {}

            if typ == "movie":
                if norm_title:
                    movie_index[f"title:{norm_title}"] = entry
                if "tmdb" in guids:
                    movie_index[f"tmdb:{guids['tmdb']}"] = entry
                if "imdb" in guids:
                    movie_index[f"imdb:{guids['imdb']}"] = entry

            elif typ in ("show", "tvshow"):
                # Series main entry (season_number is None)
                if norm_title and entry.get("season_number") in (None, "null"):
                    show_index[f"title:{norm_title}"] = entry
                if "tmdb" in guids and entry.get("season_number") in (None, "null"):
                    show_index[f"tmdb:{guids['tmdb']}"] = entry
                if "imdb" in guids and entry.get("season_number") in (None, "null"):
                    show_index[f"imdb:{guids['imdb']}"] = entry
                if "tvdb" in guids and entry.get("season_number") in (None, "null"):
                    show_index[f"tvdb:{guids['tvdb']}"] = entry

                # Season entries: include season_number in the key
                if entry.get("season_number") not in (None, "null"):
                    snum = entry["season_number"]
                    # By normalized title and season_number
                    if norm_title:
                        season_index[f"title:{norm_title}:S{snum}"] = entry
                    if "tmdb" in guids:
                        season_index[f"tmdb:{guids['tmdb']}:S{snum}"] = entry
                    if "imdb" in guids:
                        season_index[f"imdb:{guids['imdb']}:S{snum}"] = entry
                    if "tvdb" in guids:
                        season_index[f"tvdb:{guids['tvdb']}:S{snum}"] = entry

            elif typ == "collection":
                if norm_title:
                    collection_index[f"title:{norm_title}"] = entry

        return movie_index, show_index, season_index, collection_index

    def _sync_movies(
        self,
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
            a
            for a in records
            if a.get("asset_type") == "movie" and a.get("matched") == 1
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
                asset_tmdb = (
                    str(record.get("tmdb_id")) if record.get("tmdb_id") else None
                )
                asset_imdb = record.get("imdb_id")

                norm_title = normalize_titles(asset_title)
                record_hash = record.get("file_hash")
                instance_name = record.get("instance_name")
                matched_entry, match_type = self.match_asset(
                    movie_index,
                    ["tmdb", "imdb", "title"],
                    {
                        "tmdb": asset_tmdb,
                        "imdb": asset_imdb,
                        "title": norm_title,
                    },
                )

                if not matched_entry:
                    failed.append(f"{asset_title} (movie) [NO MATCH]")
                    continue

                current_file_hash = self.compute_file_hash(
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
                    if self.has_overlay(matched_entry):
                        plex_client.remove_label(matched_entry, "Overlay", dry_run)

                    db.media.update(
                        asset_type="movie",
                        title=asset_title,
                        year=asset_year,
                        instance_name=instance_name,
                        matched_value=None,
                        season_number=None,
                        original_file=None,
                        renamed_file=None,
                        file_hash=current_file_hash,
                    )
                    updated.append(
                        f"{asset_title} ({match_type}, {matched_entry['library_name']})"
                    )
                else:
                    failed.append(
                        f"{asset_title} ({match_type}, {matched_entry['library_name']}) [UPLOAD FAILED]"
                    )
        return updated

    def _sync_shows_and_seasons(
        self,
        records: List[dict],
        db: DapsDB,
        plex_client: Any,
        show_index: dict,
        season_index: dict,
        dry_run: bool,
        skipped: List[str],
        failed: List[str],
        logger: Any,
    ) -> List[str]:
        updated = []
        # Process series main posters (season_number is None)
        series_records = [
            a
            for a in records
            if a.get("asset_type") == "show"
            and a.get("matched") == 1
            and not a.get("season_number")
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
                asset_tmdb = (
                    str(record.get("tmdb_id")) if record.get("tmdb_id") else None
                )
                asset_imdb = record.get("imdb_id")
                asset_tvdb = (
                    str(record.get("tvdb_id")) if record.get("tvdb_id") else None
                )

                norm_title = normalize_titles(asset_title)
                record_hash = record.get("file_hash")
                instance_name = record.get("instance_name")
                matched_entry, match_type = self.match_asset(
                    show_index,
                    ["tvdb", "tmdb", "imdb", "title"],
                    {
                        "tvdb": asset_tvdb,
                        "tmdb": asset_tmdb,
                        "imdb": asset_imdb,
                        "title": norm_title,
                    },
                )
                if not matched_entry:
                    failed.append(f"{asset_title} (series) [NO MATCH]")
                    continue

                current_file_hash = self.compute_file_hash(
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
                    is_collection=False,
                    season_number=None,
                    dry_run=dry_run,
                )
                if upload_ok:
                    if self.has_overlay(matched_entry):
                        plex_client.remove_label(matched_entry, "Overlay", dry_run)
                    db.media.update(
                        asset_type="show",
                        title=asset_title,
                        year=asset_year,
                        instance_name=instance_name,
                        matched_value=None,
                        season_number=None,
                        original_file=None,
                        renamed_file=None,
                        file_hash=current_file_hash,
                    )
                    updated.append(
                        f"{asset_title} ({match_type}, {matched_entry['library_name']})"
                    )
                else:
                    failed.append(
                        f"{asset_title} ({match_type}, {matched_entry['library_name']}) [UPLOAD FAILED]"
                    )
        # Now process season posters (season_number is set)
        season_records = [
            a
            for a in records
            if a.get("asset_type") == "show"
            and a.get("matched") == 1
            and a.get("season_number")
        ]
        with progress(
            season_records,
            desc="Syncing Season Posters",
            total=len(season_records),
            unit="season",
            logger=logger,
        ) as bar:
            for record in bar:
                asset_title = record.get("title")
                asset_year = record.get("year")
                poster_path = record.get("renamed_file")
                asset_tmdb = (
                    str(record.get("tmdb_id")) if record.get("tmdb_id") else None
                )
                asset_imdb = record.get("imdb_id")
                asset_tvdb = (
                    str(record.get("tvdb_id")) if record.get("tvdb_id") else None
                )

                norm_title = normalize_titles(asset_title)
                record_hash = record.get("file_hash")
                season_number = record.get("season_number")
                instance_name = record.get("instance_name")
                matched_entry, match_type = self.match_asset(
                    season_index,
                    ["tvdb", "tmdb", "imdb", "title"],
                    {
                        "tvdb": asset_tvdb,
                        "tmdb": asset_tmdb,
                        "imdb": asset_imdb,
                        "title": f"{norm_title}:S{season_number}",
                    },
                )
                if not matched_entry:
                    failed.append(f"{asset_title} (season {season_number}) [NO MATCH]")
                    continue

                current_file_hash = self.compute_file_hash(
                    poster_path, asset_title, logger, failed, dry_run
                )
                if current_file_hash == record_hash:
                    skipped.append(
                        f"{asset_title} S{season_number} ({match_type}, {matched_entry['library_name']}) [UNCHANGED]"
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
                    db.media.update(
                        asset_type="show",
                        title=asset_title,
                        year=asset_year,
                        instance_name=instance_name,
                        matched_value=None,
                        season_number=season_number,
                        original_file=None,
                        renamed_file=None,
                        file_hash=current_file_hash,
                    )
                    updated.append(
                        f"{asset_title} S{season_number} ({match_type}, {matched_entry['library_name']})"
                    )
                else:
                    failed.append(
                        f"{asset_title} S{season_number} ({match_type}, {matched_entry['library_name']}) [UPLOAD FAILED]"
                    )
        return updated

    def _sync_collections(
        self,
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

                norm_title = normalize_titles(asset_title)
                record_hash = record.get("file_hash")
                instance_name = record.get("instance_name")
                matched_entry, match_type = self.match_asset(
                    collection_index,
                    ["title"],
                    {
                        "title": norm_title,
                    },
                )
                if not matched_entry:
                    failed.append(f"{asset_title} (collection) [NO MATCH]")
                    continue

                current_file_hash = self.compute_file_hash(
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
                    if self.has_overlay(matched_entry):
                        plex_client.remove_label(matched_entry, "Overlay", dry_run)

                    db.media.update(
                        asset_type="collection",
                        title=asset_title,
                        year=asset_year,
                        instance_name=instance_name,
                        matched_value=None,
                        season_number=None,
                        original_file=None,
                        renamed_file=None,
                        file_hash=current_file_hash,
                    )
                    updated.append(
                        f"{asset_title} ({match_type}, {matched_entry['library_name']})"
                    )
                else:
                    failed.append(
                        f"{asset_title} ({match_type}, {matched_entry['library_name']}) [UPLOAD FAILED]"
                    )
        return updated

    @staticmethod
    def match_asset(
        index: dict, priority_keys: List[str], values: dict
    ) -> Tuple[Optional[dict], Optional[str]]:
        """
        Generic matching function for assets.

        Args:
            index (dict): The prebuilt index (e.g., movie_index).
            priority_keys (list): Priority order for matching, e.g., ["tmdb", "imdb", "title"].
            values (dict): Dict of values like {"tmdb": "1234", "title": "foobar"}.

        Returns:
            tuple: (matched_record, match_type) or (None, None)
        """
        for key in priority_keys:
            value = values.get(key)
            if value and f"{key}:{value}" in index:
                return index[f"{key}:{value}"], key.upper()
        return None, None

    @staticmethod
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
