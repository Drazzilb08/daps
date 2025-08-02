import os
from collections import defaultdict
from typing import Any, Dict

from .db_base import DatabaseBase


class Stats(DatabaseBase):
    """
    Methods for fetching statistical/summary data about posters, collections, and other media.
    """

    def get_poster_source_stats(self) -> list:
        """
        Returns all poster source stats as a list of dicts.
        """
        with self.lock, self.conn:
            cur = self.conn.execute("SELECT * FROM poster_source_stats")
            return [dict(row) for row in cur.fetchall()]

    def get_unmatched_assets_stats(self) -> Dict[str, Any]:
        """
        Returns a summary dict with unmatched media, unmatched collections, and totals.
        """
        with self.lock, self.conn:
            cur = self.conn.execute("SELECT * FROM media_cache WHERE matched=0")
            unmatched_media = [dict(row) for row in cur.fetchall()]
            cur = self.conn.execute("SELECT * FROM collections_cache WHERE matched=0")
            unmatched_collections = [dict(row) for row in cur.fetchall()]
            cur = self.conn.execute("SELECT * FROM media_cache")
            all_media = [dict(row) for row in cur.fetchall()]
            cur = self.conn.execute("SELECT * FROM collections_cache")
            all_collections = [dict(row) for row in cur.fetchall()]

        return {
            "unmatched": unmatched_media,
            "unmatched_collections": unmatched_collections,
            "all_media": all_media,
            "all_collections": all_collections,
            "summary": {
                "unmatched_count": len(unmatched_media),
                "unmatched_collections_count": len(unmatched_collections),
                "total_media_count": len(all_media),
                "total_collections_count": len(all_collections),
            },
        }

    def count_poster_cache(self) -> int:
        """
        Returns the total number of records in the poster_cache table.
        """
        with self.lock, self.conn:
            cur = self.conn.execute("SELECT COUNT(*) as cnt FROM poster_cache")
            row = cur.fetchone()
            return row["cnt"] if row else 0

    def count_orphaned_posters(self) -> int:
        """
        Returns the number of orphaned posters.
        """
        with self.lock, self.conn:
            cur = self.conn.execute("SELECT COUNT(*) as cnt FROM orphaned_posters")
            row = cur.fetchone()
            return row["cnt"] if row else 0

    def upsert_gdrive_stat(
        self, location, folder_name, owner, file_count, size_bytes, last_updated
    ):
        """
        Upsert (insert or update) a GDrive stat record for the given location.
        """
        with self.lock, self.conn:
            self.conn.execute(
                """
                INSERT INTO gdrive_stats (location, folder_name, owner, file_count, size_bytes, last_updated)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(location) DO UPDATE SET
                    folder_name=excluded.folder_name,
                    owner=excluded.owner,
                    file_count=excluded.file_count,
                    size_bytes=excluded.size_bytes,
                    last_updated=excluded.last_updated
                """,
                (location, folder_name, owner, file_count, size_bytes, last_updated),
            )

    def get_gdrive_stats(self) -> list:
        """
        Returns all GDrive stats as a list of dicts.
        """
        with self.lock, self.conn:
            cur = self.conn.execute("SELECT * FROM gdrive_stats")
            return [dict(row) for row in cur.fetchall()]

    def get_matched_posters_stats(self):
        with self.lock, self.conn:
            # MEDIA
            media = self.conn.execute(
                "SELECT matched, original_file FROM media_cache WHERE original_file IS NOT NULL AND original_file != ''"
            ).fetchall()
            # COLLECTIONS
            collections = self.conn.execute(
                "SELECT matched, original_file FROM collections_cache WHERE original_file IS NOT NULL AND original_file != ''"
            ).fetchall()

        owner_stats = defaultdict(
            lambda: {
                "media_matched": 0,
                "media_total": 0,
                "collections_matched": 0,
                "collections_total": 0,
            }
        )

        # Aggregate media
        for row in media:
            owner = os.path.basename(os.path.dirname(row["original_file"])) or "unknown"
            owner_stats[owner]["media_total"] += 1
            if row["matched"]:
                owner_stats[owner]["media_matched"] += 1

        # Aggregate collections
        for row in collections:
            owner = os.path.basename(os.path.dirname(row["original_file"])) or "unknown"
            owner_stats[owner]["collections_total"] += 1
            if row["matched"]:
                owner_stats[owner]["collections_matched"] += 1

        # Calculate percentages
        results = []
        for owner, stats in sorted(owner_stats.items()):
            media_pct = (
                round((stats["media_matched"] / stats["media_total"] * 100), 1)
                if stats["media_total"]
                else 0
            )
            collections_pct = (
                round(
                    (stats["collections_matched"] / stats["collections_total"] * 100), 1
                )
                if stats["collections_total"]
                else 0
            )
            overall_matched = stats["media_matched"] + stats["collections_matched"]
            overall_total = stats["media_total"] + stats["collections_total"]
            overall_pct = (
                round((overall_matched / overall_total * 100), 1)
                if overall_total
                else 0
            )
            results.append(
                {
                    "owner": owner,
                    "media_matched": stats["media_matched"],
                    "media_total": stats["media_total"],
                    "media_pct": media_pct,
                    "collections_matched": stats["collections_matched"],
                    "collections_total": stats["collections_total"],
                    "collections_pct": collections_pct,
                    "overall_matched": overall_matched,
                    "overall_total": overall_total,
                    "overall_pct": overall_pct,
                }
            )

        return results
