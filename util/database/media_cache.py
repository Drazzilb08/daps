from .db_base import DatabaseBase
import json
import datetime
from typing import Any, Optional

class MediaCache(DatabaseBase):
    """
    Interface for the media_cache table.
    Provides CRUD and sync operations for tracked media assets.
    """

    def upsert(self, item: dict, asset_type: str, instance_type: str, instance_name: str, max_age_hours: int = 6) -> None:
        """Insert or update a media record for a given instance/asset_type if not present or stale."""
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
        if asset_type == "movie":
            record["season_number"] = None

        for field in ["year", "tmdb_id", "tvdb_id", "imdb_id", "season_number"]:
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

        key_params = self._canonical_key(record, asset_type, instance_name)
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

    def get_for_instance(self, instance_name: str, asset_type: str, max_age_hours: int = 6) -> Optional[list]:
        """Return all cached media for a given instance and asset_type, if not stale."""
        cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(
            hours=max_age_hours
        )
        with self.lock, self.conn:
            cur = self.conn.execute(
                "SELECT * FROM media_cache WHERE instance_name=? AND asset_type=?",
                (instance_name, asset_type),
            )
            rows = cur.fetchall()
            if not rows:
                return None
            times = [
                datetime.datetime.fromisoformat(row["last_indexed"]) for row in rows
            ]
            if not all(t > cutoff for t in times):
                return None
            return rows

    def get_by_instance(self, instance_name: str) -> list:
        """Return all media_cache records for the given instance."""
        with self.lock, self.conn:
            cur = self.conn.execute(
                "SELECT * FROM media_cache WHERE instance_name=?", (instance_name,)
            )
            return cur.fetchall()

    def get_by_id(self, id: int) -> Optional[dict]:
        """Return a single media_cache row by its unique integer ID."""
        with self.lock, self.conn:
            cur = self.conn.execute("SELECT * FROM media_cache WHERE id=?", (id,))
            row = cur.fetchone()
            return dict(row) if row else None

    def get_all(self) -> list:
        """Return all records from media_cache as a list of dicts."""
        with self.lock, self.conn:
            cur = self.conn.execute("SELECT * FROM media_cache")
            return cur.fetchall()

    def get_unmatched(self) -> list:
        """Return all media_cache records where matched=0."""
        with self.lock, self.conn:
            cur = self.conn.execute("SELECT * FROM media_cache WHERE matched=0")
            return cur.fetchall()

    def clear(self) -> None:
        """Delete all rows from media_cache."""
        with self.lock, self.conn:
            self.conn.execute("DELETE FROM media_cache")

    def clear_by_instance_and_type(self, instance_name, asset_type) -> None:
        """Delete all rows from media_cache for a given instance and asset_type."""
        with self.lock, self.conn:
            self.conn.execute(
                "DELETE FROM media_cache WHERE instance_name=? AND asset_type=?",
                (instance_name, asset_type),
            )

    def delete(self, item: dict, instance_name: str, asset_type: str, logger: Optional[Any] = None) -> None:
        """Delete a single record by its unique key; records orphaned poster if applicable."""
        key_params = self._canonical_key(item, asset_type, instance_name)
        sql = """
            DELETE FROM media_cache
            WHERE asset_type=? AND title=? AND year IS ?
            AND tmdb_id IS ? AND tvdb_id IS ? AND imdb_id IS ?
            AND season_number IS ? AND instance_name=?
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
                logger.info(f"[DELETE] Key: {key_params} | Rows deleted: {rows_deleted}")

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

        with self.lock, self.conn:
            self.conn.execute(query, tuple(params))
    
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
        with self.lock, self.conn:
            cur = self.conn.execute(
                "SELECT * FROM media_cache WHERE instance_name=? AND asset_type=?",
                (instance_name, asset_type),
            )
            db_rows = cur.fetchall()
        db_map = {
            self._canonical_key(row, asset_type, instance_name): row
            for row in db_rows
        }
        fresh_map = {
            self._canonical_key(item, asset_type, instance_name): item
            for item in fresh_media
        }

        # Add or update records
        for key, item in fresh_map.items():
            if key not in db_map:
                self.upsert(item, asset_type, instance_type, instance_name)
                if logger:
                    logger.debug(
                        f"[ADD] New asset '{item['title']}' ({asset_type}), {item.get('year')}, from {instance_name}"
                    )
            else:
                self.upsert(item, asset_type, instance_type, instance_name)

        # Remove stale records
        keys_to_remove = set(db_map.keys()) - set(fresh_map.keys())
        for key in keys_to_remove:
            row = db_map[key]
            self.delete(row, instance_name, asset_type, logger)

        if logger:
            logger.debug(
                f"[SYNC] Media cache for {instance_name} ({asset_type}) synchronized. {len(fresh_media)} items present."
            )