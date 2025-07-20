from .db_base import DatabaseBase
from typing import Any, Dict

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
            }
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

    # Add any additional stat queries needed for your UI/dashboard