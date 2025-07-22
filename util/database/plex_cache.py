import datetime
import json
from typing import Any, List, Optional

from .db_base import DatabaseBase


class PlexCache(DatabaseBase):
    """
    CRUD and sync interface for the plex_media_cache table.
    """

    @staticmethod
    def _canonical_key(item: dict) -> tuple:
        """Returns the unique key for plex_media_cache."""

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

    def upsert(self, items: List[dict]) -> None:
        """
        Bulk insert/update media items into plex_media_cache.
        Each item must include all required fields.
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

    def update_labels(
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
            self.conn.execute(
                query, (labels_json, title, year, library_name, instance_name, plex_id)
            )

    def clear(self) -> None:
        """Delete all rows from the plex_media_cache table."""
        with self.lock, self.conn:
            self.conn.execute("DELETE FROM plex_media_cache")

    def clear_instance(self, instance_name: str) -> None:
        """
        Delete all records for a single instance from plex_media_cache.
        """
        with self.lock, self.conn:
            self.conn.execute(
                "DELETE FROM plex_media_cache WHERE instance_name=?", (instance_name,)
            )

    def get_by_instance(self, instance_name: str) -> Optional[list]:
        """
        Return all records for a given instance_name as a list of dicts.
        """
        with self.lock, self.conn:
            cur = self.conn.execute(
                "SELECT * FROM plex_media_cache WHERE instance_name=?", (instance_name,)
            )
            rows = cur.fetchall()
            if not rows:
                return None
            return [dict(row) for row in rows]

    def get_by_instance_and_library(
        self, instance_name: str, library_name: str
    ) -> Optional[list]:
        """
        Return all records for a given instance_name and library_name as a list of dicts.
        """
        with self.lock, self.conn:
            cur = self.conn.execute(
                "SELECT * FROM plex_media_cache WHERE instance_name=? AND library_name=?",
                (instance_name, library_name),
            )
            rows = cur.fetchall()
            if not rows:
                return None
            return [dict(row) for row in rows]

    def get_for_library(
        self, instance_name: str, library_name: str, max_age_hours: int = 6
    ) -> Optional[list]:
        """
        Return records for a single library (in a single Plex instance) if not stale, else None.
        """
        cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(
            hours=max_age_hours
        )
        with self.lock, self.conn:
            cur = self.conn.execute(
                "SELECT * FROM plex_media_cache WHERE instance_name=? AND library_name=?",
                (instance_name, library_name),
            )
            rows = cur.fetchall()
            if not rows:
                return None
            times = [
                datetime.datetime.fromisoformat(row["last_indexed"]) for row in rows
            ]
            if not all(t > cutoff for t in times):
                return None
            return [dict(row) for row in rows]

    def delete(self, item: dict, logger: Optional[Any] = None) -> None:
        """
        Delete a single record from plex_media_cache using the canonical key (title, year, library_name, plex_id).
        """
        key = self._canonical_key(item)
        sql = """
            DELETE FROM plex_media_cache
            WHERE title=? AND year IS ? AND library_name IS ? AND plex_id IS ?
        """
        with self.lock, self.conn:
            cursor = self.conn.execute(sql, key)
            rows_deleted = cursor.rowcount
            if logger:
                logger.info(f"[DELETE] Plex Key: {key} | Rows deleted: {rows_deleted}")

    def sync_for_library(
        self,
        instance_name: str,
        library_name: str,
        fresh_media: list,
        logger: Optional[Any] = None,
    ) -> None:
        """
        Sync the plex_media_cache table for a specific instance and library
        to match fresh_media. Deletes stale, adds/updates changed.
        """
        with self.lock, self.conn:
            cur = self.conn.execute(
                "SELECT * FROM plex_media_cache WHERE instance_name=? AND library_name=?",
                (instance_name, library_name),
            )
            db_rows = cur.fetchall()

        db_map = {self._canonical_key(row): row for row in db_rows}
        fresh_map = {self._canonical_key(item): item for item in fresh_media}

        # Add or update new/changed items
        for key, item in fresh_map.items():
            if key not in db_map:
                self.upsert([item])
                if logger:
                    logger.debug(
                        f"[ADD] New Plex asset '{item['title']}' in '{library_name}' ({instance_name})"
                    )
            else:
                self.upsert([item])

        # Remove items no longer present
        keys_to_remove = set(db_map.keys()) - set(fresh_map.keys())
        for key in keys_to_remove:
            row = db_map[key]
            self.delete(row, logger=logger)

        if logger:
            logger.debug(
                f"[SYNC] Plex media cache for {instance_name} ({library_name}) synchronized. {len(fresh_media)} items present."
            )
