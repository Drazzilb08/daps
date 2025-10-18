import json
from typing import Any, Optional

from .db_base import DatabaseBase


class PlexCache(DatabaseBase):
    """
    CRUD and sync interface for the plex_media_cache table.
    """

    @staticmethod
    def _canonical_key(item: dict) -> tuple:
        """Returns the unique key for plex_media_cache matching database UNIQUE constraint (plex_id, instance_name)."""

        def norm_str(val):
            if val in (None, "", "None"):
                return None
            return str(val).strip() if isinstance(val, str) else val

        return (
            norm_str(item.get("plex_id")),
            norm_str(item.get("instance_name")),
        )

    def upsert(self, item: dict) -> None:
        """
        Insert/update a single media item into plex_media_cache.
        The item must include all required fields.
        """
        expected_cols = [
            "plex_id",
            "instance_name",
            "asset_type",
            "library_name",
            "title",
            "normalized_title",
            "year",
            "guids",
            "labels",
            "season_number",
        ]
        missing = [k for k in expected_cols if k not in item]
        assert not missing, f"Missing columns in cache_plex_data: {missing}"

        self.execute_query(
            """
            INSERT INTO plex_media_cache
                (plex_id, instance_name, asset_type, library_name, title, normalized_title, season_number, year, guids, labels)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(plex_id, instance_name) DO UPDATE SET
                asset_type = excluded.asset_type,
                library_name = excluded.library_name,
                title = excluded.title,
                normalized_title = excluded.normalized_title,
                season_number = excluded.season_number,
                year = excluded.year,
                guids = excluded.guids,
                labels = excluded.labels
            """,
            (
                item["plex_id"],
                item["instance_name"],
                item["asset_type"],
                item["library_name"],
                item["title"],
                item["normalized_title"],
                item["season_number"],
                item["year"],
                json.dumps(item["guids"]),
                json.dumps(item["labels"]),
            ),
        )

    def get_by_id(self, id: int) -> Optional[dict]:
        """Return a single plex_media_cache row by its unique integer ID."""
        return self.execute_query(
            "SELECT * FROM plex_media_cache WHERE id=?", (id,), fetch_one=True
        )

    def get_all(self) -> list:
        """Return all records from plex_media_cache as a list of dicts."""
        return (
            self.execute_query("SELECT * FROM plex_media_cache", fetch_all=True) or []
        )

    def clear(self) -> None:
        """Delete all rows from the plex_media_cache table."""
        self.execute_query("DELETE FROM plex_media_cache")

    def clear_instance(self, instance_name: str) -> None:
        """
        Delete all records for a single instance from plex_media_cache.
        """
        self.execute_query(
            "DELETE FROM plex_media_cache WHERE instance_name=?", (instance_name,)
        )

    def get_by_instance(self, instance_name: str) -> Optional[list]:
        """
        Return all records for a given instance_name as a list of dicts.
        """
        rows = self.execute_query(
            "SELECT * FROM plex_media_cache WHERE instance_name=?",
            (instance_name,),
            fetch_all=True,
        )
        return rows if rows else None

    def get_by_instance_and_library(
        self, instance_name: str, library_name: str
    ) -> Optional[list]:
        """
        Return all records for a given instance_name and library_name as a list of dicts.
        """
        rows = self.execute_query(
            "SELECT * FROM plex_media_cache WHERE instance_name=? AND library_name=?",
            (instance_name, library_name),
            fetch_all=True,
        )
        return rows if rows else None

    def delete(
        self, item: dict, logger: Optional[Any] = None, instance_name: str = None
    ) -> None:
        """
        Delete a single record from plex_media_cache using the canonical key (plex_id, instance_name).
        """
        key = self._canonical_key(item)
        sql = """
            DELETE FROM plex_media_cache
            WHERE plex_id=? AND instance_name=?
        """

        self.execute_query(sql, key)
        if logger:
            season = item.get("season_number")
            season_str = f" Season: {season}," if season is not None else ""
            logger.info(
                f"[DELETE] Title: {item.get('title')} ({item.get('year')}),{season_str} from {instance_name}"
            )

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
        db_rows = (
            self.execute_query(
                "SELECT * FROM plex_media_cache WHERE instance_name=? AND library_name=?",
                (instance_name, library_name),
                fetch_all=True,
            )
            or []
        )

        db_map = {self._canonical_key(row): row for row in db_rows}
        fresh_map = {self._canonical_key(item): item for item in fresh_media}

        # Add/update items that are present in fresh_media
        for key, item in fresh_map.items():
            self.upsert(item)
            if key not in db_map and logger:
                season = item.get("season_number")
                season_str = f" Season: {season}," if season is not None else ""
                logger.debug(
                    f"[ADD] Title: {item.get('title')} ({item.get('year')}),{season_str} from {instance_name}"
                )

        # Remove items that are no longer present
        keys_to_remove = set(db_map.keys()) - set(fresh_map.keys())
        for key in keys_to_remove:
            row = db_map[key]
            self.delete(row, logger=logger, instance_name=instance_name)

        if logger:
            logger.debug(
                f"[SYNC] Plex media cache for {instance_name} ({library_name}) synchronized. {len(fresh_media)} items present."
            )
