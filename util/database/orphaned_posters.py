# orphaned_posters.py

import datetime
import os
from typing import Any, Optional
from .db_base import DatabaseBase

class OrphanedPosters(DatabaseBase):
    """
    Handles querying and cleaning up orphaned posters.
    """

    def list_orphaned_posters(self) -> list:
        """Returns all orphaned posters as a list of dicts."""
        with self.lock, self.conn:
            cur = self.conn.execute("SELECT * FROM orphaned_posters")
            return [dict(row) for row in cur.fetchall()]

    def report_orphaned_posters(self, logger: Optional[Any] = None) -> dict:
        """
        Logs all orphaned posters and returns a JSON-ready summary for the frontend.
        """
        rows = self.list_orphaned_posters()
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
            orphaned.append(row)
            typ = row.get("asset_type", "unknown")
            by_type[typ] = by_type.get(typ, 0) + 1
            year = row.get("year") or "unknown"
            by_year[year] = by_year.get(year, 0) + 1
            season = row.get("season")
            if season is not None:
                by_season[season] = by_season.get(season, 0) + 1

        return {
            "total": len(orphaned),
            "orphaned": orphaned,
            "summary": {
                "by_type": by_type,
                "by_year": by_year,
                "by_season": by_season,
            },
        }

    def handle_orphaned_posters(
        self, logger: Optional[Any] = None, dry_run: bool = False
    ) -> None:
        """
        Deletes (or reports) orphaned posters from the file system and database.
        """
        rows = self.list_orphaned_posters()
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

    def clear_orphaned_posters(self) -> None:
        """Delete all rows from orphaned_posters."""
        with self.lock, self.conn:
            self.conn.execute("DELETE FROM orphaned_posters")