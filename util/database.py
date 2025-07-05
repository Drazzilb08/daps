import datetime
import json
import os
import sqlite3
import threading
from typing import Any, Optional

from util.helper import get_config_dir


class DapsDB:
    """
    Manages a persistent SQLite database for DAPS state and tracking.
    Stores all poster sync/match info, poster source stats, and Plex media cache.
    """

    def __init__(self) -> None:
        self.config_dir = get_config_dir()
        self.db_path = os.path.join(self.config_dir, "daps.db")
        self.conn = None
        self.lock = threading.Lock()
        self._connect()
        self._init_tables()

    def _connect(self) -> None:
        """Connect to the SQLite database, enabling WAL mode."""
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.row_factory = self._dict_factory
        with self.conn:
            self.conn.execute("PRAGMA journal_mode=WAL;")

    def _init_tables(self) -> None:
        """Create required tables if not exist."""
        with self.lock, self.conn:
            # Plex media cache
            self.conn.execute(
                """
                CREATE TABLE IF NOT EXISTS plex_media_cache (
                    plex_id TEXT,
                    instance_name TEXT,
                    asset_type TEXT,
                    library_name TEXT,
                    title TEXT,
                    normalized_title TEXT,
                    folder TEXT,
                    year TEXT,
                    guids TEXT,
                    labels TEXT,
                    last_indexed TEXT,
                    PRIMARY KEY (plex_id, instance_name)
                );
                """
            )
            # ARR Database
            self.conn.execute(
                """
                CREATE TABLE IF NOT EXISTS media_cache (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    asset_type TEXT,
                    title TEXT,
                    normalized_title TEXT,
                    year TEXT,
                    tmdb_id INTEGER,
                    tvdb_id INTEGER,
                    imdb_id TEXT,
                    folder TEXT,
                    tags TEXT,
                    season_number INTEGER,
                    matched BOOL,
                    last_indexed TEXT,
                    instance_name TEXT,
                    source TEXT,
                    original_file TEXT,
                    renamed_file TEXT,
                    file_hash TEXT,
                    UNIQUE(asset_type, title, year, tmdb_id, tvdb_id, imdb_id, season_number, instance_name)
                );
                """
            )
            # Collection table
            self.conn.execute(
                """
                CREATE TABLE IF NOT EXISTS collections_cache (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    asset_type TEXT,
                    title TEXT,
                    normalized_title TEXT,
                    alternate_titles TEXT,
                    normalized_alternate_titles TEXT,
                    year INTEGER,
                    tmdb_id INTEGER,
                    tvdb_id INTEGER,
                    imdb_id TEXT,
                    folder TEXT,
                    library_name TEXT,
                    instance_name TEXT,
                    last_indexed TEXT,
                    matched INTEGER DEFAULT 0,
                    original_file TEXT,
                    renamed_file TEXT,
                    UNIQUE (title, library_name, instance_name)
                )
                """
            )
            # Poster source stats (for frontend stats and analytics)
            self.conn.execute(
                """
                CREATE TABLE IF NOT EXISTS poster_source_stats (
                    source_folder TEXT PRIMARY KEY,
                    poster_count INTEGER,
                    last_updated TEXT
                );
                """
            )
            # Orphaned posters table
            self.conn.execute(
                """
                CREATE TABLE IF NOT EXISTS orphaned_posters (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    asset_type TEXT,
                    title TEXT,
                    year TEXT,
                    season INTEGER,
                    file_path TEXT UNIQUE,
                    date_orphaned TEXT
                );
                """
            )
            # Poster cache table
            self.conn.execute(
                """
                CREATE TABLE IF NOT EXISTS poster_cache (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT,
                    normalized_title TEXT,
                    year INTEGER,
                    tmdb_id INTEGER,
                    tvdb_id INTEGER,
                    imdb_id TEXT,
                    season_number INTEGER,
                    folder TEXT,
                    file TEXT,
                    UNIQUE(title, year, tmdb_id, tvdb_id, imdb_id, season_number, file)
                );
            """
            )
            # Holiday status table
            self.conn.execute(
            """
            CREATE TABLE IF NOT EXISTS holiday_status (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                last_active_holiday TEXT
            );
            """
        )

    def close(self) -> None:
        if self.conn:
            self.conn.close()

    def _dict_factory(self, cursor: Any, row: Any) -> dict:
        """Return rows as dictionaries."""
        return {col[0]: row[idx] for idx, col in enumerate(cursor.description)}

    def clear_plex_media_cache_instance(self, instance_name: str) -> None:
        """
        Clears the Plex media cache for a single instance.
        """
        with self.lock, self.conn:
            self.conn.execute(
                "DELETE FROM plex_media_cache WHERE instance_name=?", (instance_name,)
            )
    
    def report_orphaned_posters(self, logger: Optional[Any] = None) -> dict:
        """
        Logs all orphaned posters and returns a JSON-ready summary for the frontend.
        """
        with self.lock, self.conn:
            cur = self.conn.execute("SELECT * FROM orphaned_posters")
            rows = cur.fetchall()

        if not rows:
            if logger:
                logger.info("No orphaned posters found.")
            return {
                "total": 0,
                "orphaned": [],
                "summary": {"by_type": {}, "by_year": {}, "by_season": {}},
            }

        header = ["ID", "Type", "Title", "Year", "Season", "File Path", "Date Orphaned"]
        if logger:
            logger.info("Orphaned Posters:")
            logger.info(" | ".join(header))
            logger.info("-" * 80)
            for row in rows:
                logger.info(
                    f"{row['id']:>3} | {row['asset_type']:<8} | {row['title']:<40} | {str(row['year'] or ''):<6} | "
                    f"{str(row['season'] or ''):<6} | {row['file_path']:<60} | {row['date_orphaned']}"
                )
            logger.info("")

        # Prepare data for frontend
        orphaned = []
        by_type = {}
        by_year = {}
        by_season = {}
        for row in rows:
            d = dict(row)
            orphaned.append(d)
            # Stats by type
            typ = d.get("asset_type", "unknown")
            by_type[typ] = by_type.get(typ, 0) + 1
            # Stats by year
            year = d.get("year") or "unknown"
            by_year[year] = by_year.get(year, 0) + 1
            # Stats by season (if present)
            season = d.get("season")
            if season is not None:
                by_season[season] = by_season.get(season, 0) + 1

        result = {
            "total": len(orphaned),
            "orphaned": orphaned,
            "summary": {
                "by_type": by_type,
                "by_year": by_year,
                "by_season": by_season,
            },
        }
        return result

    def handle_orphaned_posters(
        self, logger: Optional[Any] = None, dry_run: bool = False
    ) -> None:
        """
        Handles deletion/reporting of orphaned posters in the orphaned_posters table.
        Logs summary and detailed info for each item, deletes file and removes row if not dry_run.
        """
        with self.lock, self.conn:
            cur = self.conn.execute("SELECT * FROM orphaned_posters")
            rows = cur.fetchall()

        if not rows:
            if logger:
                logger.info("No orphaned posters found.")
            return

        header = ["ID", "Type", "Title", "Year", "Season", "File Path", "Date Orphaned"]
        if logger:
            logger.info("Orphaned Posters:")
            logger.info(" | ".join(header))
            logger.info("-" * 80)
            for row in rows:
                logger.info(
                    f"{row['id']:>3} | {row['asset_type']:<8} | {row['title']:<40} | {str(row['year'] or ''):<6} | "
                    f"{str(row['season'] or ''):<6} | {row['file_path']:<60} | {row['date_orphaned']}"
                )
            logger.info("")

        deleted = 0
        kept = 0
        for row in rows:
            file_path = row["file_path"]
            summary = f"[{row['asset_type']}] {row['title']} (year={row['year']} season={row['season']}) -> {file_path}"
            if dry_run:
                if logger:
                    logger.info(f"[DRY RUN] Would delete: {summary}")
                kept += 1
            else:
                try:
                    if file_path and os.path.exists(file_path):
                        os.remove(file_path)
                        if logger:
                            logger.info(f"Deleted orphaned poster: {summary}")
                        deleted += 1
                    else:
                        if logger:
                            logger.info(f"File already missing: {summary}")
                except Exception as e:
                    if logger:
                        logger.error(f"Failed to delete {file_path}: {e}")

                with self.lock, self.conn:
                    self.conn.execute(
                        "DELETE FROM orphaned_posters WHERE id=?", (row["id"],)
                    )

        if logger:
            logger.info(
                f"Orphaned posters handled: {deleted} deleted, {kept} kept (dry run)"
            )

    @staticmethod
    def _canonical_collection_key(item: dict) -> tuple:
        """
        Returns a tuple key matching the UNIQUE constraint on collections.
        Used for DB key and SQL parameter order.
        """
        def norm_int(val):
            if val in (None, "", "None"):
                return None
            try:
                return int(val)
            except Exception:
                return None

        def norm_str(val):
            if val in (None, "", "None"):
                return None
            return str(val).strip() if isinstance(val, str) else val

        return (
            norm_str(item.get("title")),
            norm_int(item.get("year")),
            norm_int(item.get("tmdb_id")),
            norm_int(item.get("tvdb_id")),
            norm_str(item.get("imdb_id")),
            norm_str(item.get("library_name")),
            norm_str(item.get("instance_name")),
        )

    @staticmethod
    def _canonical_media_key(item: dict, asset_type: str, instance_name: str) -> tuple:
        """
        Returns a tuple key matching the UNIQUE constraint on media_cache.
        Used for both DB key and SQL parameter order.
        """

        def norm_int(val):
            if val in (None, "", "None"):
                return None
            try:
                return int(val)
            except Exception:
                return None

        def norm_str(val):
            if val in (None, "", "None"):
                return None
            return str(val).strip() if isinstance(val, str) else val

        return (
            asset_type,
            norm_str(item.get("title", "")),
            norm_int(item.get("year")),
            norm_int(item.get("tmdb_id")),
            norm_int(item.get("tvdb_id")),
            norm_str(item.get("imdb_id")),
            norm_int(item.get("season_number")),
            str(instance_name),
        )
    
    @staticmethod
    def _canonical_plex_key(item: dict) -> tuple:
        """
        Returns a tuple key for unique identification in plex_media_cache.
        Typically uses (title, year, library_name, plex_id).
        """
        def norm_str(val):
            if val in (None, "", "None"):
                return None
            return str(val).strip() if isinstance(val, str) else val

        def norm_int(val):
            if val in (None, "", "None"):
                return None
            try:
                return int(val)
            except Exception:
                return None

        return (
            norm_str(item.get("title")),
            norm_int(item.get("year")),
            norm_str(item.get("library_name")),
            norm_str(item.get("plex_id")),
        )
    
    @staticmethod
    def _canonical_poster_key(item: dict) -> tuple:
        """
        Returns a tuple key matching the UNIQUE constraint on poster_cache.
        Used for DB key and SQL parameter order.
        """
        def norm_int(val):
            if val in (None, "", "None"):
                return None
            try:
                return int(val)
            except Exception:
                return None

        def norm_str(val):
            if val in (None, "", "None"):
                return None
            return str(val).strip() if isinstance(val, str) else val

        return (
            norm_str(item.get("title")),
            norm_int(item.get("year")),
            norm_int(item.get("tmdb_id")),
            norm_int(item.get("tvdb_id")),
            norm_str(item.get("imdb_id")),
            norm_int(item.get("season_number")),
            norm_str(item.get("file")),
        )
    
    def upsert_collection(self, record: dict, instance_name: str) -> None:
        """
        Insert or update a record in the collections table using canonical collection key.
        Only updates non-unique columns on conflict.
        """

        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        record['instance_name'] = instance_name
        record['asset_type'] = "collection"
        # Serialize lists/dicts to JSON before inserting
        for key in ("alternate_titles", "normalized_alternate_titles"):
            if isinstance(record.get(key), (list, dict)):
                record[key] = json.dumps(record[key])
            elif record.get(key) is None:
                record[key] = json.dumps([])

        key = self._canonical_collection_key(record)
        with self.lock, self.conn:
            self.conn.execute(
                """
                INSERT INTO collections_cache
                    (asset_type, title, normalized_title, alternate_titles, normalized_alternate_titles, year,
                    tmdb_id, tvdb_id, imdb_id, folder, library_name, instance_name, last_indexed)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(title, library_name, instance_name)
                DO UPDATE SET
                    year=excluded.year,
                    normalized_title=excluded.normalized_title,
                    alternate_titles=excluded.alternate_titles,
                    normalized_alternate_titles=excluded.normalized_alternate_titles,
                    folder=excluded.folder,
                    last_indexed=excluded.last_indexed
                """,
                (
                    record.get("asset_type"),
                    record.get("title"),
                    record.get("normalized_title"),
                    record.get("alternate_titles"),
                    record.get("normalized_alternate_titles"),
                    record.get("year"),
                    record.get("tmdb_id"),
                    record.get("tvdb_id"),
                    record.get("imdb_id"),
                    record.get("folder"),
                    record.get("library_name"),
                    record.get("instance_name"),
                    now,
                ),
            )

    def upsert_media_record(
        self,
        item: dict,
        asset_type: str,
        instance_type: str,
        instance_name: str,
        max_age_hours: int = 6,
    ) -> None:
        """
        Upsert a single media record (ARR, Plex, etc) into media_cache table.
        Only update if not present or older than max_age_hours.
        """
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        required_keys = [
            "title",
            "normalized_title",
            "year",
            "tmdb_id",
            "tvdb_id",
            "imdb_id",
            "folder",
            "location",
            "tags",
            "season_number",
        ]
        record = {k: item.get(k) for k in required_keys}
        record["asset_type"] = asset_type
        record["last_indexed"] = now
        record["instance_name"] = instance_name
        record["source"] = instance_type

        for field in [
            "year",
            "tmdb_id",
            "tvdb_id",
            "imdb_id",
            "season_number",
        ]:
            if record[field] == "" or (
                isinstance(record[field], str) and record[field].strip() == ""
            ):
                record[field] = None

        # Make sure tags is always a list (JSON-encoded)
        tags_value = item.get("tags")
        if tags_value is None:
            record["tags"] = json.dumps([])
        elif isinstance(tags_value, str):
            # Already encoded, just store as-is (maybe legacy)
            record["tags"] = tags_value
        else:
            # If it's a list or other type, encode as JSON
            record["tags"] = json.dumps(tags_value)

        key_params = self._canonical_media_key(record, asset_type, instance_name)

        with self.lock, self.conn:
            cur = self.conn.execute(
                """
                SELECT last_indexed FROM media_cache
                WHERE asset_type=? AND title=? AND year IS ?
                AND tmdb_id IS ? AND tvdb_id IS ? AND imdb_id IS ?
                AND season_number IS ? AND instance_name=?
                """,
                key_params,
            )
            row = cur.fetchone()
            update = True
            if row and row["last_indexed"]:
                last_indexed = datetime.datetime.fromisoformat(row["last_indexed"])
                age = (
                    datetime.datetime.now(datetime.timezone.utc) - last_indexed
                ).total_seconds() / 3600
                if age < max_age_hours:
                    update = False
            if update:
                self.conn.execute(
                    """
                    INSERT INTO media_cache
                        (asset_type, title, normalized_title,
                        year, tmdb_id, tvdb_id, imdb_id, folder, tags,
                        season_number, matched, last_indexed, instance_name, source, original_file, renamed_file, file_hash)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(asset_type, title, year, tmdb_id, tvdb_id, imdb_id, season_number, instance_name)
                    DO UPDATE SET
                        normalized_title=excluded.normalized_title,
                        folder=excluded.folder,
                        tags=excluded.tags,
                        matched=excluded.matched,
                        last_indexed=excluded.last_indexed,
                        source=excluded.source,
                        original_file=excluded.original_file,
                        renamed_file=excluded.renamed_file,
                        file_hash=excluded.file_hash
                    """,
                    (
                        record["asset_type"],
                        record["title"],
                        record["normalized_title"],
                        record["year"],
                        record["tmdb_id"],
                        record["tvdb_id"],
                        record["imdb_id"],
                        record["folder"],
                        record["tags"],
                        record["season_number"],
                        0,
                        now,
                        instance_name,
                        instance_type,
                        record.get("original_file") or None,
                        record.get("renamed_file") or None,
                        record.get("file_hash") or None,
                    ),
                )

    def upsert_plex_record(self, items: list) -> None:
        """
        Bulk insert/update media items into the cache for all instances.
        Each item must include 'instance_name' and all required fields.
        """
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        expected_cols = [
            "plex_id",
            "instance_name",
            "asset_type",
            "library_name",
            "title",
            "normalized_title",
            "folder",
            "year",
            "guids",
            "labels",
        ]
        with self.lock, self.conn:
            for item in items:

                missing = [k for k in expected_cols if k not in item]
                assert not missing, f"Missing columns in cache_plex_data: {missing}"
                self.conn.execute(
                    """
                    INSERT OR REPLACE INTO plex_media_cache
                        (plex_id, instance_name, asset_type, library_name, title, normalized_title, folder, year, guids, labels, last_indexed)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        item["plex_id"],
                        item["instance_name"],
                        item["asset_type"],
                        item["library_name"],
                        item["title"],
                        item["normalized_title"],
                        item["folder"],
                        item["year"],
                        json.dumps(item["guids"]),
                        json.dumps(item["labels"]),
                        now,
                    ),
                )

    def upsert_poster_cache(self, record: dict) -> None:
        """
        Insert or update a record in poster_cache table using canonical poster key.
        Only updates non-unique columns on conflict.
        """
        # Serialize lists/dicts to JSON before inserting
        for key in ("alternate_titles", "normalized_alternate_titles"):
            if isinstance(record.get(key), (list, dict)):
                record[key] = json.dumps(record[key])
            elif record.get(key) is None:
                record[key] = json.dumps([])

        # Everything else remains the same
        key = self._canonical_poster_key(record)
        with self.lock, self.conn:
            self.conn.execute(
                """
                INSERT INTO poster_cache
                    (title, normalized_title, year,
                    tmdb_id, tvdb_id, imdb_id, season_number, folder, file)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(title, year, tmdb_id, tvdb_id, imdb_id, season_number, file)
                DO UPDATE SET
                    normalized_title=excluded.normalized_title,
                    folder=excluded.folder
                """,
                (
                    record["title"],
                    record["normalized_title"],
                    record["year"],
                    record["tmdb_id"],
                    record["tvdb_id"],
                    record["imdb_id"],
                    record["season_number"],
                    record["folder"],
                    record["file"],
                )
            )

    def delete_media_record(
        self,
        item: dict,
        instance_name: str,
        asset_type: str,
        logger: Optional[Any] = None,
    ) -> None:
        key_params = self._canonical_media_key(item, asset_type, instance_name)
        sql = """
            DELETE FROM media_cache
            WHERE asset_type=? AND title=? AND year IS ?
            AND tmdb_id IS ? AND tvdb_id IS ? AND imdb_id IS ?
            AND library_name IS ? AND season_number IS ? AND instance_name=?
        """

        renamed_file = item.get("renamed_file")
        if renamed_file:
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            self.conn.execute(
                """
                INSERT OR IGNORE INTO orphaned_posters
                    (asset_type, title, year, season, file_path, date_orphaned)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    item.get("asset_type"),
                    item.get("title"),
                    item.get("year"),
                    item.get("season_number"),
                    renamed_file,
                    now,
                ),
            )
        with self.lock, self.conn:
            cursor = self.conn.execute(sql, key_params)
            rows_deleted = cursor.rowcount
            if logger:
                logger.info(
                    f"[DELETE] Key: {key_params} | Rows deleted: {rows_deleted}"
                )
    def delete_collections_record(
        self,
        item: dict,
        instance_name: str,
        logger: Optional[Any] = None,
    ) -> None:
        """
        Delete a single record from collections_cache using canonical collection key.
        If the record had a renamed_file, insert it as orphaned.
        """
        key_params = self._canonical_collection_key({**item, "instance_name": instance_name})
        sql = """
            DELETE FROM collections_cache
            WHERE title=? AND year IS ? AND tmdb_id IS ? AND tvdb_id IS ? AND imdb_id IS ? AND library_name IS ? AND instance_name=?
        """

        renamed_file = item.get("renamed_file")
        if renamed_file:
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            self.conn.execute(
                """
                INSERT OR IGNORE INTO orphaned_posters
                    (asset_type, title, year, season, file_path, date_orphaned)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    "collection",
                    item.get("title"),
                    item.get("year"),
                    None,
                    renamed_file,
                    now,
                ),
            )
        with self.lock, self.conn:
            cursor = self.conn.execute(sql, key_params)
            rows_deleted = cursor.rowcount
            if logger:
                logger.info(
                    f"[DELETE] Collection Key: {key_params} | Rows deleted: {rows_deleted}"
                )

    def delete_plex_record(
        self,
        item: dict,
        logger: Optional[Any] = None,
    ) -> None:
        """
        Delete a single record from plex_media_cache using canonical plex key (title, year, library_name, plex_id).
        """
        key = self._canonical_plex_key(item)
        sql = """
            DELETE FROM plex_media_cache
            WHERE title=? AND year IS ? AND library_name IS ? AND plex_id IS ?
        """

        with self.lock, self.conn:
            cursor = self.conn.execute(sql, key)
            rows_deleted = cursor.rowcount
            if logger:
                logger.info(f"[DELETE] Plex Key: {key} | Rows deleted: {rows_deleted}")

    def sync_collections_cache(self, instance_name: str, library_name: str, fresh_collections: list, logger=None):
        """
        Syncs the collections table for a specific instance to match fresh_collections.
        Removes missing, updates existing, adds new.
        """
        with self.lock, self.conn:
            cur = self.conn.execute(
                "SELECT * FROM collections_cache WHERE instance_name=? AND library_name=?",
                (instance_name, library_name)
            )
            db_rows = cur.fetchall()

        db_map = {self._canonical_collection_key(row): row for row in db_rows}
        fresh_map = {self._canonical_collection_key({**item, "instance_name": instance_name}): item for item in fresh_collections}

        # Upsert new/changed collections
        for key, item in fresh_map.items():
            if key not in db_map:
                self.upsert_collection(item, instance_name)
                if logger:
                    logger.debug(f"[ADD] New collection '{item['title']}' for {instance_name}")
            else:
                self.upsert_collection(item, instance_name)

        # Remove collections no longer present
        keys_to_remove = set(db_map.keys()) - set(fresh_map.keys())
        if keys_to_remove:
            for key in keys_to_remove:
                row = db_map[key]
                self.delete_collections_record(row, instance_name, logger)
        if logger:
            logger.debug(f"[SYNC] Collections table for {instance_name} synchronized. {len(fresh_collections)} items present.")

    def sync_plex_media_cache_for_library(
        self,
        instance_name: str,
        library_name: str,
        fresh_media: list,
        logger: Optional[Any] = None,
    ) -> None:
        """
        Syncs the plex_media_cache table for a specific instance and library to match fresh_media.
        Deletes stale rows, adds new, updates changed. Only for the given instance and library.
        """
        with self.lock, self.conn:
            cur = self.conn.execute(
                "SELECT * FROM plex_media_cache WHERE instance_name=? AND library_name=?",
                (instance_name, library_name),
            )
            db_rows = cur.fetchall()

        db_map = {self._canonical_plex_key(row): row for row in db_rows}
        fresh_map = {self._canonical_plex_key(item): item for item in fresh_media}

        # Upsert or add new/changed items
        for key, item in fresh_map.items():
            if key not in db_map:
                self.upsert_plex_record([item])
                if logger:
                    logger.debug(f"[ADD] New Plex asset '{item['title']}' in '{library_name}' ({instance_name})")
            else:
                self.upsert_plex_record([item])

        # Remove items no longer present
        keys_to_remove = set(db_map.keys()) - set(fresh_map.keys())
        if keys_to_remove:
            for key in keys_to_remove:
                row = db_map[key]
                self.delete_plex_record(row, logger=logger)

        if logger:
            logger.debug(
                f"[SYNC] Plex media cache for {instance_name} ({library_name}) synchronized. {len(fresh_media)} items present."
            )
            
    def sync_media_cache_for_instance(
        self,
        instance_name: str,
        instance_type: str,
        asset_type: str,
        fresh_media: list,
        logger: Optional[Any] = None,
    ) -> None:
        """
        Syncs the media_cache table for a specific instance and asset_type to match fresh_media.
        Deletes stale rows from the DB directly.
        """

        with self.lock, self.conn:
            cur = self.conn.execute(
                "SELECT * FROM media_cache WHERE instance_name=? AND asset_type=?",
                (instance_name, asset_type),
            )
            db_rows = cur.fetchall()
        db_map = {
            self._canonical_media_key(row, asset_type, instance_name): row
            for row in db_rows
        }
        fresh_map = {
            self._canonical_media_key(item, asset_type, instance_name): item
            for item in fresh_media
        }

        for key, item in fresh_map.items():
            if key not in db_map:
                self.upsert_media_record(item, asset_type, instance_type, instance_name, asset_type)
                if logger:
                    logger.debug(
                        f"[ADD] New asset '{item['title']}' ({asset_type}), {item.get('year')}, from {instance_name}"
                    )
            else:
                self.upsert_media_record(item, asset_type, instance_type, instance_name, asset_type)

        keys_to_remove = set(db_map.keys()) - set(fresh_map.keys())
        if keys_to_remove:
            for key in keys_to_remove:
                row = db_map[key]
                self.delete_media_record(row, instance_name, asset_type, logger)

        if logger:
            logger.debug(
                f"[SYNC] Media cache for {instance_name} ({asset_type}) synchronized. {len(fresh_media)} items present."
            )

    def update_plex_media_cache_item(
        self,
        title: str,
        year: str,
        library_name: str,
        instance_name: str,
        plex_id: str,
        labels: list,
    ) -> None:
        """
        Update only the labels field for a plex_media_cache row (identified by title, year, library_name, instance_name, plex_id).
        """
        query = """
            UPDATE plex_media_cache
            SET labels=?
            WHERE title=? AND year IS ? AND library_name=? AND instance_name=? AND plex_id=?
        """
        labels_json = json.dumps(labels)
        with self.lock, self.conn:
            self.conn.execute(query, (labels_json, title, year, library_name, instance_name, plex_id))

    def update_media_cache_item(
        self,
        asset_type: str,
        title: str,
        year: Optional[Any],
        instance_name: str,
        matched_value: Optional[Any] = None,
        season_number: Optional[Any] = None,
        original_file: Optional[Any] = None,
        renamed_file: Optional[Any] = None,
        file_hash: Optional[Any] = None,
    ) -> None:
        set_clauses = []
        params = []

        if matched_value is not None:
            set_clauses.append("matched=?")
            params.append(int(bool(matched_value)))

        if original_file is not None:
            set_clauses.append("original_file=?")
            params.append(original_file)

        if renamed_file is not None:
            set_clauses.append("renamed_file=?")
            params.append(renamed_file)

        if file_hash is not None:
            set_clauses.append("file_hash=?")
            params.append(file_hash)

        if not set_clauses:
            return

        query = f"""
            UPDATE media_cache
            SET {', '.join(set_clauses)}
            WHERE asset_type=? AND title=? AND instance_name=?
        """
        params.extend([asset_type, title, instance_name])

        if year is None:
            query += " AND year IS NULL"
        else:
            query += " AND year=?"
            params.append(year)

        if season_number is None:
            query += " AND season_number IS NULL"
        else:
            query += " AND season_number=?"
            params.append(season_number)

        with self.lock, self.conn:
            self.conn.execute(query, tuple(params))

    def update_collections_cache_item(
        self,
        title: str,
        year: Optional[Any],
        library_name: Optional[str],
        instance_name: str,
        matched_value: Optional[Any] = None,
        original_file: Optional[Any] = None,
        renamed_file: Optional[Any] = None,
    ) -> None:
        set_clauses = []
        params = []

        if matched_value is not None:
            set_clauses.append("matched=?")
            params.append(int(bool(matched_value)))

        if original_file is not None:
            set_clauses.append("original_file=?")
            params.append(original_file)

        if renamed_file is not None:
            set_clauses.append("renamed_file=?")
            params.append(renamed_file)

        if not set_clauses:
            return

        query = f"""
            UPDATE collections_cache
            SET {', '.join(set_clauses)}
            WHERE title=? AND instance_name=?
        """
        params.extend([title, instance_name])

        if year is None:
            query += " AND year IS NULL"
        else:
            query += " AND year=?"
            params.append(year)

        if library_name is None:
            query += " AND library_name IS NULL"
        else:
            query += " AND library_name=?"
            params.append(library_name)

        with self.lock, self.conn:
            self.conn.execute(query, tuple(params))
        
    def get_last_holiday_status(self) -> dict:
        with self.lock, self.conn:
            cur = self.conn.execute(
                "SELECT last_active_holiday FROM holiday_status WHERE id=1"
            )
            row = cur.fetchone()
            if row:
                return {"last_active_holiday": row["last_active_holiday"]}
            else:
                return {"last_active_holiday": None}

    def set_last_holiday_status(self, last_active_holiday: Optional[str]) -> None:
        with self.lock, self.conn:
            self.conn.execute(
                """
                INSERT INTO holiday_status (id, last_active_holiday)
                VALUES (1, ?)
                ON CONFLICT(id) DO UPDATE SET last_active_holiday=excluded.last_active_holiday
                """,
                (last_active_holiday,),
            )
    
    # THIS SECTION IS FOR RETURNING NONE IF CACHE STALE
    def get_plex_media_cache_for_library(
            self, 
            instance_name: str, 
            library_name: str, 
            max_age_hours: int = 6
            ) -> Optional[list]:
        """
        Returns cached media for a single library (within a single Plex instance) if not stale (or None if stale or missing).
        """
        cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=max_age_hours)
        with self.lock, self.conn:
            cur = self.conn.execute(
                "SELECT * FROM plex_media_cache WHERE instance_name=? AND library_name=?",
                (instance_name, library_name)
            )
            rows = cur.fetchall()
            if not rows:
                return None
            times = [datetime.datetime.fromisoformat(row["last_indexed"]) for row in rows]
            if not all(t > cutoff for t in times):
                return None
            return rows


    def get_media_cache_for_instance(
            self, 
            instance_name: str, 
            asset_type: str, 
            max_age_hours: int = 6
        ) -> Optional[list]:
        """
        Returns cached media for a single ARR instance and asset type if not stale (or None if stale or missing).
        """
        cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=max_age_hours)
        with self.lock, self.conn:
            cur = self.conn.execute(
                "SELECT * FROM media_cache WHERE instance_name=? AND asset_type=?",
                (instance_name, asset_type)
            )
            rows = cur.fetchall()
            if not rows:
                return None
            times = [datetime.datetime.fromisoformat(row["last_indexed"]) for row in rows]
            if not all(t > cutoff for t in times):
                return None
            return rows
        
    def get_collections_cache_for_library(
        self,
        instance_name: str,
        library_name: str = None,
        max_age_hours: int = 6
    ) -> Optional[list]:
        """
        Returns cached collections for a single instance (and optionally a single library)
        if not stale (or None if stale or missing).
        """
        cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=max_age_hours)
        with self.lock, self.conn:
            cur = self.conn.execute(
                "SELECT * FROM collections_cache WHERE instance_name=? AND library_name=?",
                (instance_name, library_name)
            )
            rows = cur.fetchall()
            if not rows:
                return None
            times = [datetime.datetime.fromisoformat(row["last_indexed"]) for row in rows]
            if not all(t > cutoff for t in times):
                return None
            return rows
    ########################
        
    def get_plex_media_cache_by_instance(self, instance_name: str) -> Optional[list]:
        """
        Returns all cached Plex media for the given instance_name as a list of dicts.
        Returns None if no records are found.
        """
        with self.lock, self.conn:
            cur = self.conn.execute(
                "SELECT * FROM plex_media_cache WHERE instance_name=?",
                (instance_name,)
            )
            rows = cur.fetchall()
            if not rows:
                return None
            return rows

    def get_plex_media_cache_by_instance_and_library(self, instance_name: str, library_name: str) -> Optional[list]:
        """
        Returns all cached Plex media for the given instance_name and library_name as a list of dicts.
        Returns None if no records are found.
        """
        with self.lock, self.conn:
            cur = self.conn.execute(
                "SELECT * FROM plex_media_cache WHERE instance_name=? AND library_name=?",
                (instance_name, library_name)
            )
            rows = cur.fetchall()
            if not rows:
                return None
            return rows

    def get_poster_cache(self) -> list:
        """
        Return all records from poster_cache as a list of dicts.
        """
        with self.lock, self.conn:
            cur = self.conn.execute("SELECT * FROM poster_cache")
            rows = cur.fetchall()
            return [dict(row) for row in rows]

    def get_poster_cache_by_id(self, id_field: str, id_val, season_number=None) -> Optional[dict]:
        # Example SQLite logic; adjust as needed
        sql = f"SELECT * FROM poster_cache WHERE {id_field}=?"
        params = [id_val]
        if season_number is not None:
            sql += " AND season_number=?"
            params.append(season_number)
        with self.lock, self.conn:
            cur = self.conn.execute(sql, params)
            row = cur.fetchone()
            return dict(row) if row else None

    def get_poster_cache_by_normalized_title(self, normalized_title: str, year: Optional[int] = None, season_number: Optional[int] = None) -> Optional[dict]:
        sql = "SELECT * FROM poster_cache WHERE normalized_title=?"
        params = [normalized_title]
        if year is not None:
            sql += " AND year=?"
            params.append(year)
        if season_number is not None:
            sql += " AND season_number=?"
            params.append(season_number)
        with self.lock, self.conn:
            cur = self.conn.execute(sql, params)
            row = cur.fetchone()
            return dict(row) if row else None

    def propagate_ids_for_show(self, title, year, asset):
        """
        Propagate IDs (tmdb_id, tvdb_id, imdb_id) to all rows with the same normalized_title/year,
        for all season_numbers (including NULL).
        """
        from util.helper import normalize_titles

        normalized_title = normalize_titles(title)
        sql = """
            UPDATE poster_cache
            SET imdb_id = COALESCE(imdb_id, ?),
                tmdb_id = COALESCE(tmdb_id, ?),
                tvdb_id = COALESCE(tvdb_id, ?)
            WHERE normalized_title = ?
            AND year IS ?
            AND file != ?
        """
        params = [
            asset.get("imdb_id"),
            asset.get("tmdb_id"),
            asset.get("tvdb_id"),
            normalized_title,
            year,
            asset.get("file"),
        ]
        with self.lock, self.conn:
            self.conn.execute(sql, params)

    def delete_poster_cache_by_id(self, id_field, id_value, season_number):
        sql = f"DELETE FROM poster_cache WHERE {id_field}=?"
        params = [id_value]
        if season_number is not None:
            sql += " AND season_number=?"
            params.append(season_number)
        else:
            sql += " AND season_number IS NULL"
        with self.lock, self.conn:
            self.conn.execute(sql, params)

    def delete_poster_cache_by_title(self, normalized_title, year, season_number):
        sql = "DELETE FROM poster_cache WHERE normalized_title=? AND year IS ? AND season_number IS ?"
        with self.lock, self.conn:
            self.conn.execute(sql, (normalized_title, year, season_number))

    def get_media_cache_by_instance(self, instance_name: str) -> list:
        """
        Returns all records from media_cache for the given instance_name as a list of dicts.
        """
        with self.lock, self.conn:
            cur = self.conn.execute(
                "SELECT * FROM media_cache WHERE instance_name=?", (instance_name,)
            )
            return cur.fetchall()
        
    def get_collections_cache_by_instance(self, instance_name: str) -> list:
        with self.lock, self.conn:
            cur = self.conn.execute(
                "SELECT * FROM collections_cache WHERE instance_name=?", (instance_name,)
            )
            return cur.fetchall()
    
    def get_collections_cache_by_instance_and_library(self, instance_name: str, library_name: str) -> list:
        with self.lock, self.conn:
            cur = self.conn.execute(
                "SELECT * FROM collections_cache WHERE instance_name=? AND library_name=?",
                (instance_name, library_name)
            )
            return cur.fetchall()
        
    def get_media_cache_from_id(self, id: int) -> Optional[dict]:
        """
        Retrieve a single media_cache row by its unique integer ID.
        Returns None if no row is found.
        """
        with self.lock, self.conn:
            cur = self.conn.execute("SELECT * FROM media_cache WHERE id=?", (id,))
            row = cur.fetchone()
            return dict(row) if row else None
    
    def get_collections_cache_from_id(self, id: int) -> Optional[dict]:
        """
        Retrieve a single collections_cache row by its unique integer ID.
        Returns None if no row is found.
        """
        with self.lock, self.conn:
            cur = self.conn.execute("SELECT * FROM collections_cache WHERE id=?", (id,))
            row = cur.fetchone()
            return dict(row) if row else None
        
    def get_media_cache(self) -> list:
        """Return all records from media_cache as a list of dicts."""
        with self.lock, self.conn:
            cur = self.conn.execute("SELECT * FROM media_cache")
            return cur.fetchall()
    
    def get_collection_cache(self) -> list:
        """Return all records from collections_cache as a list of dicts."""
        with self.lock, self.conn:
            cur = self.conn.execute("SELECT * FROM collections_cache")
            return cur.fetchall()

    def get_unmatched_media(self):
        with self.lock, self.conn:
            cur = self.conn.execute("SELECT * FROM media_cache WHERE matched=0")
            return cur.fetchall()

    def get_unmatched_collections(self):
        with self.lock, self.conn:
            cur = self.conn.execute("SELECT * FROM collections_cache WHERE matched=0")
            return cur.fetchall()

    def clear_plex_media_cache(self) -> None:
        """Delete all rows from the plex_media_cache table."""
        with self.lock, self.conn:
            self.conn.execute("DELETE FROM plex_media_cache")

    def clear_media_cache(self) -> None:
        """Delete all rows from the media_cache table."""
        with self.lock, self.conn:
            self.conn.execute("DELETE FROM media_cache")

    def clear_poster_source_stats(self) -> None:
        """Delete all rows from the poster_source_stats table."""
        with self.lock, self.conn:
            self.conn.execute("DELETE FROM poster_source_stats")

    def clear_orphaned_posters(self) -> None:
        """Delete all rows from the orphaned_posters table."""
        with self.lock, self.conn:
            self.conn.execute("DELETE FROM orphaned_posters")

    def clear_poster_cache(self) -> None:
            """Delete all rows from poster_cache."""
            with self.lock, self.conn:
                self.conn.execute("DELETE FROM poster_cache")