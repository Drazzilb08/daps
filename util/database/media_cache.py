import datetime
import json
from typing import Any, List, Optional

from .db_base import DatabaseBase


class MediaCache(DatabaseBase):
    """
    Interface for the media_cache table.
    Provides CRUD and sync operations for tracked media assets.
    """

    @staticmethod
    def _identity_key(item: dict, asset_type: str, instance_name: str) -> str:
        """Build a stable, non-NULL identity string for media items.
        Rules:
          - Prefer imdb; else tmdb (movies); else tvdb (shows); else title+year fallback.
          - Omit the season segment entirely when there is no season; include `|s:0` for specials, `|s:N` for seasons.
        """

        def norm_int(v):
            if v in (None, "", "None"):
                return None
            try:
                return int(v)
            except Exception:
                return None

        def norm_str(v):
            if v in (None, "", "None"):
                return None
            return str(v).strip()

        tmdb = norm_int(item.get("tmdb_id"))
        tvdb = norm_int(item.get("tvdb_id"))
        imdb = norm_str(item.get("imdb_id"))
        title_key = norm_str(item.get("normalized_title") or item.get("title")) or ""
        year_key = norm_int(item.get("year")) or -1

        # choose stable cross-source id
        if imdb:
            id_tag = f"imdb:{imdb.lower()}"
        elif asset_type == "movie" and tmdb:
            id_tag = f"tmdb:{tmdb}"
        elif asset_type != "movie" and tvdb:
            id_tag = f"tvdb:{tvdb}"
        else:
            id_tag = f"title:{title_key}|y:{year_key}"

        # Season segment only when present (0..N). Omit for movies and series-root.
        season_raw = item.get("season_number")
        season_val = norm_int(season_raw)
        has_season = (asset_type != "movie") and (season_val is not None)
        season_seg = f"|s:{season_val}" if has_season else ""

        return f"{instance_name}|{asset_type}|{id_tag}{season_seg}"

    def upsert(
        self,
        item: dict,
        asset_type: str,
        instance_type: str,
        instance_name: str,
    ) -> None:
        """
        Insert or update a single media record for a given instance/asset_type.
        """
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
        record["instance_name"] = instance_name
        record["source"] = instance_type
        if asset_type == "movie":
            record["season_number"] = None

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

        tags_value = item.get("tags")
        if tags_value is None:
            record["tags"] = json.dumps([])
        elif isinstance(tags_value, str):
            record["tags"] = tags_value
        else:
            record["tags"] = json.dumps(tags_value)

        identity_key = self._identity_key(record, asset_type, instance_name)

        self.execute_query(
            """
            INSERT INTO media_cache
                (identity_key, asset_type, title, normalized_title,
                year, tmdb_id, tvdb_id, imdb_id, folder, tags,
                season_number, matched, instance_name, source, original_file, renamed_file, file_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(identity_key)
            DO UPDATE SET
                normalized_title=excluded.normalized_title,
                folder=excluded.folder,
                tags=excluded.tags,
                matched=excluded.matched,
                source=excluded.source,
                original_file=excluded.original_file,
                renamed_file=excluded.renamed_file,
                file_hash=excluded.file_hash
            """,
            (
                identity_key,
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
                instance_name,
                instance_type,
                record.get("original_file") or None,
                record.get("renamed_file") or None,
                record.get("file_hash") or None,
            ),
        )

    @staticmethod
    def _canonical_key(item: dict, asset_type: str, instance_name: str) -> tuple:
        """Returns the unique key for media_cache."""
        if asset_type == "movie":
            item["season_number"] = None

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

    def get_by_instance(self, instance_name: str) -> list:
        """Return all media_cache records for the given instance."""
        return (
            self.execute_query(
                "SELECT * FROM media_cache WHERE instance_name=?",
                (instance_name,),
                fetch_all=True,
            )
            or []
        )

    def get_by_id(self, id: int) -> Optional[dict]:
        """Return a single media_cache row by its unique integer ID."""
        return self.execute_query(
            "SELECT * FROM media_cache WHERE id=?", (id,), fetch_one=True
        )

    def get_all(self) -> list:
        """Return all records from media_cache as a list of dicts."""
        return self.execute_query("SELECT * FROM media_cache", fetch_all=True) or []

    def get_unmatched(self) -> list:
        """Return all media_cache records where matched=0."""
        return (
            self.execute_query(
                "SELECT * FROM media_cache WHERE matched=0", fetch_all=True
            )
            or []
        )

    def clear(self) -> None:
        """Delete all rows from media_cache."""
        self.execute_query("DELETE FROM media_cache")

    def clear_by_instance_and_type(self, instance_name, asset_type) -> None:
        """Delete all rows from media_cache for a given instance and asset_type."""
        self.execute_query(
            "DELETE FROM media_cache WHERE instance_name=? AND asset_type=?",
            (instance_name, asset_type),
        )

    def delete(
        self,
        item: dict,
        instance_name: str,
        asset_type: str,
        logger: Optional[Any] = None,
    ) -> None:
        """Delete a single record by its identity key; records orphaned poster if applicable."""
        # Handle orphaned poster if applicable
        renamed_file = item.get("renamed_file")
        if renamed_file:
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            self.execute_query(
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
            identity_key = self._identity_key(item, asset_type, instance_name)
            self.execute_query(
                "DELETE FROM media_cache WHERE identity_key = ?",
                (identity_key,),
            )
        if logger:
            season = item.get("season_number")
            season_str = f" Season: {season}," if season is not None else ""
            logger.info(
                f"[DELETE] Title: {item.get('title')} ({item.get('year')}) ({asset_type}),{season_str} from {instance_name}"
            )

    def get_by_title_year_instance(
        self, title: str, year: int = None, instance_name: str = None
    ):
        """
        Get media records by title, year, and instance name.
        Returns list of records including seasons for shows.
        """
        query = """
            SELECT * FROM media_cache 
            WHERE title = ? AND instance_name = ?
        """
        params = [title, instance_name]

        if year is not None:
            query += " AND year = ?"
            params.append(year)

        query += " ORDER BY season_number ASC NULLS FIRST"

        return self.execute_query(query, tuple(params), fetch_all=True)

    def delete_by_id(self, id: int) -> None:
        """Delete a single record by its unique integer ID."""
        self.execute_query("DELETE FROM media_cache WHERE id=?", (id,))

    def get_by_keys(
        self,
        asset_type: str,
        title: str,
        year: str,
        tmdb_id: int,
        tvdb_id: int,
        imdb_id: str,
        season_number: int,
        instance_name: str,
    ) -> List[dict]:
        """Get records by specific keys - handles shows with multiple seasons."""
        # If asset_type is 'show' and season_number is None, get all seasons and the show record
        if asset_type == "show" and season_number is None:
            query = """
            SELECT * FROM media_cache
            WHERE asset_type=? AND title=? AND year IS ?
            AND tmdb_id IS ? AND tvdb_id IS ? AND imdb_id IS ?
            AND instance_name=?
            """
            params = (
                asset_type,
                title,
                year if year not in ("", None) else None,
                tmdb_id if tmdb_id not in ("", None) else None,
                tvdb_id if tvdb_id not in ("", None) else None,
                imdb_id if imdb_id not in ("", None) else None,
                instance_name,
            )
            rows = self.execute_query(query, params, fetch_all=True)
            return rows or []
        else:
            # regular case: one record
            query = """
            SELECT * FROM media_cache
            WHERE asset_type=? AND title=? AND year IS ?
            AND tmdb_id IS ? AND tvdb_id IS ? AND imdb_id IS ?
            AND season_number IS ? AND instance_name=?
            """
            params = (
                asset_type,
                title,
                year if year not in ("", None) else None,
                tmdb_id if tmdb_id not in ("", None) else None,
                tvdb_id if tvdb_id not in ("", None) else None,
                imdb_id if imdb_id not in ("", None) else None,
                season_number if season_number not in ("", None) else None,
                instance_name,
            )
            rows = self.execute_query(query, params, fetch_all=True)
            return rows or []

    def update(
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
        """Update fields for a given media record."""
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

        self.execute_query(query, tuple(params))

    def sync_for_instance(
        self,
        instance_name: str,
        instance_type: str,
        asset_type: str,
        fresh_media: list,
        logger: Optional[Any] = None,
    ) -> None:
        """
        Syncs the media_cache table for a specific instance and asset_type to match fresh_media.
        Adds/updates as needed, deletes stale records not present in fresh_media.
        """
        db_rows = (
            self.execute_query(
                "SELECT * FROM media_cache WHERE instance_name=? AND asset_type=?",
                (instance_name, asset_type),
                fetch_all=True,
            )
            or []
        )

        def row_identity(row):
            return row["identity_key"]

        db_map = {row_identity(row): row for row in db_rows}
        fresh_map = {
            self._identity_key(item, asset_type, instance_name): item
            for item in fresh_media
        }

        # Add/update items that are present in fresh_media
        for key, item in fresh_map.items():
            self.upsert(item, asset_type, instance_type, instance_name)
            if key not in db_map and logger:
                season = item.get("season_number")
                season_str = f" Season: {season}," if season is not None else ""
                logger.debug(
                    f"[ADD] Title: {item.get('title')} ({item.get('year')}) ({asset_type}),{season_str} from {instance_name}"
                )

        # Remove items that are no longer present
        keys_to_remove = set(db_map.keys()) - set(fresh_map.keys())
        for key in keys_to_remove:
            row = db_map[key]
            self.delete(row, instance_name, asset_type, logger)

        if logger:
            logger.debug(
                f"[SYNC] Media cache for {instance_name} ({asset_type}) synchronized. {len(fresh_media)} items present."
            )
