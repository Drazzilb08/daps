# util/database/schema.py

import logging
import sqlite3
from typing import Set

logger = logging.getLogger(__name__)


class SchemaManager:
    """Manages database schema creation and updates safely."""

    # Define all tables with their schemas
    TABLES = {
        "plex_media_cache": """
            CREATE TABLE IF NOT EXISTS plex_media_cache (
                plex_id TEXT,
                instance_name TEXT,
                asset_type TEXT,
                library_name TEXT,
                title TEXT,
                normalized_title TEXT,
                season_number INTEGER,
                year TEXT,
                guids TEXT,
                labels TEXT,
                PRIMARY KEY (plex_id, instance_name)
            )
        """,
        "media_cache": """
            CREATE TABLE IF NOT EXISTS media_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                identity_key TEXT NOT NULL,
                asset_type TEXT,
                title TEXT,
                normalized_title TEXT,
                year TEXT,
                tmdb_id INTEGER,
                tvdb_id INTEGER,
                imdb_id TEXT,
                folder TEXT,
                tags TEXT,
                season_number INTEGER,
                matched BOOL,
                instance_name TEXT,
                source TEXT,
                original_file TEXT,
                renamed_file TEXT,
                file_hash TEXT,
                poster_url TEXT,
                UNIQUE(identity_key)
            )
        """,
        "collections_cache": """
            CREATE TABLE IF NOT EXISTS collections_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                asset_type TEXT,
                title TEXT,
                normalized_title TEXT,
                alternate_titles TEXT,
                normalized_alternate_titles TEXT,
                year INTEGER,
                tmdb_id INTEGER,
                tvdb_id INTEGER,
                imdb_id TEXT,
                folder TEXT,
                library_name TEXT,
                instance_name TEXT,
                matched INTEGER DEFAULT 0,
                original_file TEXT,
                renamed_file TEXT,
                UNIQUE (title, library_name, instance_name)
            )
        """,
        "gdrive_stats": """
            CREATE TABLE IF NOT EXISTS gdrive_stats (
                location TEXT PRIMARY KEY,
                owner TEXT,
                folder_name TEXT,
                file_count INTEGER,
                size_bytes INTEGER,
                last_updated TEXT
            )
        """,
        "orphaned_posters": """
            CREATE TABLE IF NOT EXISTS orphaned_posters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                asset_type TEXT,
                title TEXT,
                year TEXT,
                season INTEGER,
                file_path TEXT UNIQUE,
                date_orphaned TEXT
            )
        """,
        "poster_cache": """
            CREATE TABLE IF NOT EXISTS poster_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT,
                normalized_title TEXT,
                year INTEGER,
                tmdb_id INTEGER,
                tvdb_id INTEGER,
                imdb_id TEXT,
                season_number INTEGER,
                folder TEXT,
                file TEXT,
                UNIQUE(title, year, tmdb_id, tvdb_id, imdb_id, season_number, file)
            )
        """,
        "holiday_status": """
            CREATE TABLE IF NOT EXISTS holiday_status (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                last_active_holiday TEXT
            )
        """,
        "run_state": """
            CREATE TABLE IF NOT EXISTS run_state (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                module_name TEXT NOT NULL UNIQUE,
                last_run TEXT,
                last_run_successful INTEGER DEFAULT 0,
                last_run_status TEXT,
                last_run_message TEXT,
                last_duration INTEGER,
                last_run_by TEXT
            )
        """,
        "jobs": """
            CREATE TABLE IF NOT EXISTS jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                received_at TEXT,
                payload TEXT,
                status TEXT DEFAULT 'pending',
                result TEXT,
                error TEXT,
                attempts INTEGER DEFAULT 0,
                max_attempts INTEGER DEFAULT 3,
                scheduled_at TEXT DEFAULT NULL,
                priority INTEGER DEFAULT 0,
                progress INTEGER DEFAULT 0
            )
        """,
    }

    # Define indexes to be created
    INDEXES = {
        "poster_cache_normalized_title_idx": """
            CREATE INDEX IF NOT EXISTS poster_cache_normalized_title_idx
                ON poster_cache (normalized_title)
        """,
        "poster_cache_tmdb_id_idx": """
            CREATE INDEX IF NOT EXISTS poster_cache_tmdb_id_idx
                ON poster_cache (tmdb_id)
        """,
        "poster_cache_tvdb_id_idx": """
            CREATE INDEX IF NOT EXISTS poster_cache_tvdb_id_idx
                ON poster_cache (tvdb_id)
        """,
        "poster_cache_imdb_id_idx": """
            CREATE INDEX IF NOT EXISTS poster_cache_imdb_id_idx
                ON poster_cache (imdb_id)
        """,
    }

    @classmethod
    def get_existing_tables(cls, conn: sqlite3.Connection) -> Set[str]:
        """Get list of existing tables in the database."""
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        return {row[0] for row in cursor.fetchall()}

    @classmethod
    def get_existing_indexes(cls, conn: sqlite3.Connection) -> Set[str]:
        """Get list of existing indexes in the database."""
        cursor = conn.cursor()
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='index' AND name IS NOT NULL"
        )
        return {row[0] for row in cursor.fetchall()}

    @classmethod
    def sync_schema(cls, conn: sqlite3.Connection) -> None:
        """
        Synchronize database schema with the defined tables and indexes.
        SIMPLIFIED: Only creates missing tables/indexes - no automatic dropping.
        """
        logger.debug("Synchronizing database schema...")

        existing_tables = cls.get_existing_tables(conn)
        existing_indexes = cls.get_existing_indexes(conn)

        with conn:
            # Create/update all defined tables
            for table_name, create_sql in cls.TABLES.items():
                if table_name not in existing_tables:
                    logger.debug(f"Creating table: {table_name}")
                conn.execute(create_sql)

            # Create all defined indexes
            for index_name, create_sql in cls.INDEXES.items():
                if index_name not in existing_indexes:
                    logger.debug(f"Creating index: {index_name}")
                conn.execute(create_sql)

            # Log orphaned tables for manual review (don't auto-drop)
            orphaned_tables = (
                existing_tables
                - set(cls.TABLES.keys())
                - {"sqlite_master", "sqlite_sequence", "sqlite_stat1"}
            )
            if orphaned_tables:
                logger.info(
                    f"Found orphaned tables (manual cleanup needed): {orphaned_tables}"
                )

            # Log orphaned indexes for manual review (don't auto-drop)
            system_indexes = {
                idx for idx in existing_indexes if idx.startswith("sqlite_")
            }
            orphaned_indexes = (
                existing_indexes - set(cls.INDEXES.keys()) - system_indexes
            )
            if orphaned_indexes:
                logger.debug(
                    f"Found orphaned indexes (manual cleanup needed): {orphaned_indexes}"
                )

        logger.debug("Schema synchronization complete")

    @classmethod
    def init_database(cls, conn: sqlite3.Connection) -> None:
        """Initialize database with proper settings and schema."""
        # Set database pragmas for better performance and reliability
        with conn:
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA synchronous=NORMAL")
            conn.execute("PRAGMA temp_store=MEMORY")
            conn.execute("PRAGMA mmap_size=268435456")  # 256MB

        # Sync schema
        cls.sync_schema(conn)

    @classmethod
    def manual_cleanup_tables(cls, conn: sqlite3.Connection, table_names: list) -> None:
        """
        Manually drop specified tables - use with caution!

        Args:
            conn: Database connection
            table_names: List of table names to drop
        """
        logger.warning(f"Manual table cleanup requested for: {table_names}")

        with conn:
            for table_name in table_names:
                logger.warning(f"Dropping table: {table_name}")
                conn.execute(f"DROP TABLE IF EXISTS {table_name}")

        logger.warning("Manual table cleanup completed")

    @classmethod
    def manual_cleanup_indexes(
        cls, conn: sqlite3.Connection, index_names: list
    ) -> None:
        """
        Manually drop specified indexes - use with caution!

        Args:
            conn: Database connection
            index_names: List of index names to drop
        """
        logger.warning(f"Manual index cleanup requested for: {index_names}")

        with conn:
            for index_name in index_names:
                logger.warning(f"Dropping index: {index_name}")
                conn.execute(f"DROP INDEX IF EXISTS {index_name}")

        logger.warning("Manual index cleanup completed")
