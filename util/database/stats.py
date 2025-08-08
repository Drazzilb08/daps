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
        return (
            self.execute_query("SELECT * FROM poster_source_stats", fetch_all=True)
            or []
        )

    def get_unmatched_assets_stats(self) -> Dict[str, Any]:
        """
        Returns a summary dict with unmatched media, unmatched collections, and totals.
        """
        unmatched_media = (
            self.execute_query(
                "SELECT * FROM media_cache WHERE matched=0", fetch_all=True
            )
            or []
        )

        unmatched_collections = (
            self.execute_query(
                "SELECT * FROM collections_cache WHERE matched=0", fetch_all=True
            )
            or []
        )

        all_media = (
            self.execute_query("SELECT * FROM media_cache", fetch_all=True) or []
        )

        all_collections = (
            self.execute_query("SELECT * FROM collections_cache", fetch_all=True) or []
        )

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
        result = self.execute_query(
            "SELECT COUNT(*) as cnt FROM poster_cache", fetch_one=True
        )
        return result["cnt"] if result else 0

    def count_orphaned_posters(self) -> int:
        """
        Returns the number of orphaned posters.
        """
        result = self.execute_query(
            "SELECT COUNT(*) as cnt FROM orphaned_posters", fetch_one=True
        )
        return result["cnt"] if result else 0

    def upsert_gdrive_stat(
        self, location, folder_name, owner, file_count, size_bytes, last_updated
    ):
        """
        Upsert (insert or update) a GDrive stat record for the given location.
        """
        self.execute_query(
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
        return self.execute_query("SELECT * FROM gdrive_stats", fetch_all=True) or []

    def get_matched_posters_stats(self):
        """Get statistics about matched posters by owner."""
        # Fetch media records
        media = (
            self.execute_query(
                "SELECT matched, original_file FROM media_cache WHERE original_file IS NOT NULL AND original_file != ''",
                fetch_all=True,
            )
            or []
        )

        # Fetch collection records
        collections = (
            self.execute_query(
                "SELECT matched, original_file FROM collections_cache WHERE original_file IS NOT NULL AND original_file != ''",
                fetch_all=True,
            )
            or []
        )

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
