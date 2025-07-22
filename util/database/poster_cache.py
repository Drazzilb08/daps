import json
from typing import Optional

from .db_base import DatabaseBase


class PosterCache(DatabaseBase):
    """
    Handles CRUD operations and logic for the poster_cache table.
    """

    @staticmethod
    def _canonical_key(item: dict) -> tuple:
        """Returns a tuple key matching the UNIQUE constraint on poster_cache."""

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

    def upsert(self, record: dict) -> None:
        """Insert or update a record in poster_cache table."""
        for key in ("alternate_titles", "normalized_alternate_titles"):
            if isinstance(record.get(key), (list, dict)):
                record[key] = json.dumps(record[key])
            elif record.get(key) is None:
                record[key] = json.dumps([])

        key = self._canonical_key(record)
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
                ),
            )

    def get_all(self) -> list:
        """Return all records from poster_cache as a list of dicts."""
        with self.lock, self.conn:
            cur = self.conn.execute("SELECT * FROM poster_cache")
            return [dict(row) for row in cur.fetchall()]

    def get_by_id(self, id_field: str, id_val, season_number=None) -> Optional[dict]:
        """Return a single record from poster_cache by id_field (and season_number, if provided)."""
        sql = f"SELECT * FROM poster_cache WHERE {id_field}=?"
        params = [id_val]
        if season_number is not None:
            sql += " AND season_number=?"
            params.append(season_number)
        with self.lock, self.conn:
            cur = self.conn.execute(sql, params)
            row = cur.fetchone()
            return dict(row) if row else None

    def get_by_normalized_title(
        self,
        normalized_title: str,
        year: Optional[int] = None,
        season_number: Optional[int] = None,
    ) -> Optional[dict]:
        """Return a record by normalized_title (optionally year/season_number)."""
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

    def delete_by_id(self, id_field, id_value, season_number):
        """Delete a record by id_field (and season_number, or IS NULL)."""
        sql = f"DELETE FROM poster_cache WHERE {id_field}=?"
        params = [id_value]
        if season_number is not None:
            sql += " AND season_number=?"
            params.append(season_number)
        else:
            sql += " AND season_number IS NULL"
        with self.lock, self.conn:
            cursor = self.conn.cursor()
            cursor.execute(sql, params)
            return cursor.rowcount

    def delete_by_title(self, normalized_title, year, season_number):
        """Delete a record by normalized_title/year/season_number."""
        sql = "DELETE FROM poster_cache WHERE normalized_title=? AND year IS ? AND season_number IS ?"
        with self.lock, self.conn:
            cursor = self.conn.cursor()
            cursor.execute(sql, (normalized_title, year, season_number))
            return cursor.rowcount

    def clear(self) -> None:
        """Delete all rows from poster_cache."""
        with self.lock, self.conn:
            self.conn.execute("DELETE FROM poster_cache")

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
