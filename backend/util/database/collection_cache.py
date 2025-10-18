import datetime
import json
from typing import Any, Optional

from .db_base import DatabaseBase


class CollectionCache(DatabaseBase):
    """
    Interface for the collections_cache table.
    Provides CRUD and sync operations.
    """

    def upsert(self, record: dict, instance_name: str) -> None:
        """Insert or update a collection record for a given instance."""
        record["instance_name"] = instance_name
        record["asset_type"] = "collection"

        # Serialize list/dict fields to JSON
        for key in ("alternate_titles", "normalized_alternate_titles"):
            if isinstance(record.get(key), (list, dict)):
                record[key] = json.dumps(record[key])
            elif record.get(key) is None:
                record[key] = json.dumps([])

        self.execute_query(
            """
            INSERT INTO collections_cache
                (asset_type, title, normalized_title, alternate_titles, normalized_alternate_titles, year,
                tmdb_id, tvdb_id, imdb_id, folder, library_name, instance_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(title, library_name, instance_name)
            DO UPDATE SET
                year=excluded.year,
                normalized_title=excluded.normalized_title,
                alternate_titles=excluded.alternate_titles,
                normalized_alternate_titles=excluded.normalized_alternate_titles,
                folder=excluded.folder
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
            ),
        )

    @staticmethod
    def _canonical_collection_key(item: dict) -> tuple:
        """Returns the unique key for collections_cache."""

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

    def get_by_instance(self, instance_name: str) -> list:
        """Return all collection rows for the given instance."""
        return (
            self.execute_query(
                "SELECT * FROM collections_cache WHERE instance_name=?",
                (instance_name,),
                fetch_all=True,
            )
            or []
        )

    def get_by_instance_and_library(
        self, instance_name: str, library_name: str
    ) -> list:
        """Return all collection rows for the given instance and library."""
        return (
            self.execute_query(
                "SELECT * FROM collections_cache WHERE instance_name=? AND library_name=?",
                (instance_name, library_name),
                fetch_all=True,
            )
            or []
        )

    def get_by_id(self, id: int) -> Optional[dict]:
        """Return a single collection row by its unique integer ID."""
        return self.execute_query(
            "SELECT * FROM collections_cache WHERE id=?", (id,), fetch_one=True
        )

    def get_all(self) -> list:
        """Return all records from collections_cache as a list of dicts."""
        return (
            self.execute_query("SELECT * FROM collections_cache", fetch_all=True) or []
        )

    def get_unmatched(self) -> list:
        """Return all collections_cache records where matched=0."""
        return (
            self.execute_query(
                "SELECT * FROM collections_cache WHERE matched=0", fetch_all=True
            )
            or []
        )

    def clear(self) -> None:
        """Delete all rows from collections_cache."""
        self.execute_query("DELETE FROM collections_cache")

    def delete_by_id(self, id: int) -> None:
        """Delete a single record by its unique integer ID."""
        self.execute_query("DELETE FROM collections_cache WHERE id=?", (id,))

    def delete(
        self, item: dict, instance_name: str, logger: Optional[Any] = None
    ) -> None:
        """Delete a single record by its unique key; records orphaned poster if applicable."""
        key_params = self._canonical_collection_key(
            {**item, "instance_name": instance_name}
        )
        sql = """
            DELETE FROM collections_cache
            WHERE title=? AND year IS ? AND tmdb_id IS ? AND tvdb_id IS ? AND imdb_id IS ? AND library_name IS ? AND instance_name=?
        """

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
                    "collection",
                    item.get("title"),
                    item.get("year"),
                    None,
                    renamed_file,
                    now,
                ),
            )

        rows_deleted = self.execute_query(sql, key_params)
        if logger:
            logger.info(
                f"[DELETE] Collection Key: {key_params} | Rows deleted: {rows_deleted}"
            )

    def update(
        self,
        title: str,
        year: Optional[Any],
        library_name: Optional[str],
        instance_name: str,
        matched_value: Optional[Any] = None,
        original_file: Optional[Any] = None,
        renamed_file: Optional[Any] = None,
    ) -> None:
        """Update fields for a given collection."""
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

        self.execute_query(query, tuple(params))

    def sync_collections_cache(
        self,
        instance_name: str,
        library_name: str,
        fresh_collections: list,
        logger=None,
    ):
        """
        Syncs the collections table for a specific instance to match fresh_collections.
        Removes missing, updates existing, adds new.
        """
        db_rows = (
            self.execute_query(
                "SELECT * FROM collections_cache WHERE instance_name=? AND library_name=?",
                (instance_name, library_name),
                fetch_all=True,
            )
            or []
        )

        db_map = {self._canonical_collection_key(row): row for row in db_rows}
        fresh_map = {
            self._canonical_collection_key(
                {**item, "instance_name": instance_name}
            ): item
            for item in fresh_collections
        }

        # Add/update items that are present in fresh_collections
        for key, item in fresh_map.items():
            self.upsert(item, instance_name)
            if key not in db_map and logger:
                logger.debug(
                    f"[ADD] New collection '{item['title']}' for {instance_name}"
                )

        # Remove items that are no longer present
        keys_to_remove = set(db_map.keys()) - set(fresh_map.keys())
        for key in keys_to_remove:
            row = db_map[key]
            self.delete(row, instance_name, logger)

        if logger:
            logger.debug(
                f"[SYNC] Collections table for {instance_name} synchronized. {len(fresh_collections)} items present."
            )
