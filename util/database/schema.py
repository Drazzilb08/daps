# util/database/schema.py

import hashlib
import json
import logging
import sqlite3
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set

logger = logging.getLogger(__name__)


@dataclass
class ColumnDefinition:
    """Represents a database column definition."""

    name: str
    type: str
    nullable: bool = True
    primary_key: bool = False
    foreign_key: Optional[str] = None
    default: Optional[Any] = None
    unique: bool = False
    check_constraint: Optional[str] = None

    def to_sql(self) -> str:
        """Convert column definition to SQL DDL."""
        sql = f"{self.name} {self.type}"

        if self.primary_key:
            sql += " PRIMARY KEY"
            if self.type.upper() == "INTEGER":
                sql += " AUTOINCREMENT"

        if not self.nullable:
            sql += " NOT NULL"

        if self.default is not None:
            if isinstance(self.default, str) and self.default != "CURRENT_TIMESTAMP":
                sql += f" DEFAULT '{self.default}'"
            else:
                sql += f" DEFAULT {self.default}"

        if self.unique:
            sql += " UNIQUE"

        if self.check_constraint:
            sql += f" CHECK ({self.check_constraint})"

        if self.foreign_key:
            sql += f" REFERENCES {self.foreign_key}"

        return sql


@dataclass
class TableDefinition:
    """Represents a database table definition."""

    name: str
    columns: List[ColumnDefinition] = field(default_factory=list)
    indexes: List[str] = field(default_factory=list)
    constraints: List[str] = field(default_factory=list)

    def get_column(self, name: str) -> Optional[ColumnDefinition]:
        """Get column definition by name."""
        return next((col for col in self.columns if col.name == name), None)

    def to_create_sql(self) -> str:
        """Generate CREATE TABLE SQL."""
        columns_sql = [col.to_sql() for col in self.columns]

        # Add table-level constraints
        for constraint in self.constraints:
            columns_sql.append(constraint)

        joined_columns = ",\n            ".join(columns_sql)
        return (
            f"CREATE TABLE IF NOT EXISTS {self.name} (\n"
            f"            {joined_columns}\n"
            f"        )"
        )


class SchemaManager:
    """Enhanced schema manager with automatic column management and change tracking."""

    def __init__(self):
        self.tables: Dict[str, TableDefinition] = {}
        self._schema_hash: Optional[str] = None
        self._define_schema()

    def _define_schema(self) -> None:
        """Define the complete DAPS database schema using structured definitions."""

        # Plex Media Cache
        plex_media_cache = TableDefinition(
            name="plex_media_cache",
            columns=[
                ColumnDefinition("id", "INTEGER", primary_key=True, nullable=False),
                ColumnDefinition("plex_id", "TEXT", nullable=False),
                ColumnDefinition("instance_name", "TEXT", nullable=False),
                ColumnDefinition("asset_type", "TEXT"),
                ColumnDefinition("library_name", "TEXT"),
                ColumnDefinition("title", "TEXT"),
                ColumnDefinition("normalized_title", "TEXT"),
                ColumnDefinition("season_number", "INTEGER"),
                ColumnDefinition("year", "TEXT"),
                ColumnDefinition("guids", "TEXT"),
                ColumnDefinition("labels", "TEXT"),
            ],
            constraints=["UNIQUE (plex_id, instance_name)"],
        )
        self._add_table(plex_media_cache)

        # Media Cache
        media_cache = TableDefinition(
            name="media_cache",
            columns=[
                ColumnDefinition("id", "INTEGER", primary_key=True, nullable=False),
                ColumnDefinition("identity_key", "TEXT", nullable=False, unique=True),
                ColumnDefinition("asset_type", "TEXT"),
                ColumnDefinition("title", "TEXT"),
                ColumnDefinition("normalized_title", "TEXT"),
                ColumnDefinition("year", "TEXT"),
                ColumnDefinition("tmdb_id", "INTEGER"),
                ColumnDefinition("tvdb_id", "INTEGER"),
                ColumnDefinition("imdb_id", "TEXT"),
                ColumnDefinition("folder", "TEXT"),
                ColumnDefinition("tags", "TEXT"),
                ColumnDefinition("season_number", "INTEGER"),
                ColumnDefinition("matched", "BOOLEAN"),
                ColumnDefinition("instance_name", "TEXT"),
                ColumnDefinition("source", "TEXT"),
                ColumnDefinition("original_file", "TEXT"),
                ColumnDefinition("renamed_file", "TEXT"),
                ColumnDefinition("file_hash", "TEXT"),
                ColumnDefinition("poster_url", "TEXT"),
                ColumnDefinition(
                    "arr_id", "INTEGER"
                ),  # ARR media ID for direct API operations
                ColumnDefinition(
                    "plex_mapping_id", "INTEGER"
                ),  # Foreign key to plex_media_cache.id
            ],
            indexes=[
                "CREATE INDEX IF NOT EXISTS media_cache_plex_mapping_idx ON media_cache (plex_mapping_id)",
                "CREATE INDEX IF NOT EXISTS media_cache_instance_idx ON media_cache (instance_name)",
            ],
        )
        self._add_table(media_cache)

        # Collections Cache
        collections_cache = TableDefinition(
            name="collections_cache",
            columns=[
                ColumnDefinition("id", "INTEGER", primary_key=True, nullable=False),
                ColumnDefinition("asset_type", "TEXT"),
                ColumnDefinition("title", "TEXT"),
                ColumnDefinition("normalized_title", "TEXT"),
                ColumnDefinition("alternate_titles", "TEXT"),
                ColumnDefinition("normalized_alternate_titles", "TEXT"),
                ColumnDefinition("year", "INTEGER"),
                ColumnDefinition("tmdb_id", "INTEGER"),
                ColumnDefinition("tvdb_id", "INTEGER"),
                ColumnDefinition("imdb_id", "TEXT"),
                ColumnDefinition("folder", "TEXT"),
                ColumnDefinition("library_name", "TEXT"),
                ColumnDefinition("instance_name", "TEXT"),
                ColumnDefinition("matched", "INTEGER", default=0),
                ColumnDefinition("original_file", "TEXT"),
                ColumnDefinition("renamed_file", "TEXT"),
            ],
            constraints=["UNIQUE (title, library_name, instance_name)"],
        )
        self._add_table(collections_cache)

        # Google Drive Stats
        gdrive_stats = TableDefinition(
            name="gdrive_stats",
            columns=[
                ColumnDefinition("location", "TEXT", primary_key=True, nullable=False),
                ColumnDefinition("owner", "TEXT"),
                ColumnDefinition("folder_name", "TEXT"),
                ColumnDefinition("file_count", "INTEGER"),
                ColumnDefinition("size_bytes", "INTEGER"),
                ColumnDefinition("last_updated", "TEXT"),
            ],
        )
        self._add_table(gdrive_stats)

        # Orphaned Posters
        orphaned_posters = TableDefinition(
            name="orphaned_posters",
            columns=[
                ColumnDefinition("id", "INTEGER", primary_key=True, nullable=False),
                ColumnDefinition("asset_type", "TEXT"),
                ColumnDefinition("title", "TEXT"),
                ColumnDefinition("year", "TEXT"),
                ColumnDefinition("season", "INTEGER"),
                ColumnDefinition("file_path", "TEXT", unique=True),
                ColumnDefinition("date_orphaned", "TEXT"),
            ],
        )
        self._add_table(orphaned_posters)

        # Poster Cache
        poster_cache = TableDefinition(
            name="poster_cache",
            columns=[
                ColumnDefinition("id", "INTEGER", primary_key=True, nullable=False),
                ColumnDefinition("title", "TEXT"),
                ColumnDefinition("normalized_title", "TEXT"),
                ColumnDefinition("year", "INTEGER"),
                ColumnDefinition("tmdb_id", "INTEGER"),
                ColumnDefinition("tvdb_id", "INTEGER"),
                ColumnDefinition("imdb_id", "TEXT"),
                ColumnDefinition("season_number", "INTEGER"),
                ColumnDefinition("folder", "TEXT"),
                ColumnDefinition("file", "TEXT"),
            ],
            constraints=[
                "UNIQUE(title, year, tmdb_id, tvdb_id, imdb_id, season_number, file)"
            ],
            indexes=[
                "CREATE INDEX IF NOT EXISTS poster_cache_normalized_title_idx ON poster_cache (normalized_title)",
                "CREATE INDEX IF NOT EXISTS poster_cache_tmdb_id_idx ON poster_cache (tmdb_id)",
                "CREATE INDEX IF NOT EXISTS poster_cache_tvdb_id_idx ON poster_cache (tvdb_id)",
                "CREATE INDEX IF NOT EXISTS poster_cache_imdb_id_idx ON poster_cache (imdb_id)",
            ],
        )
        self._add_table(poster_cache)

        # Holiday Status
        holiday_status = TableDefinition(
            name="holiday_status",
            columns=[
                ColumnDefinition(
                    "id",
                    "INTEGER",
                    primary_key=True,
                    nullable=False,
                    check_constraint="id = 1",
                ),
                ColumnDefinition("last_active_holiday", "TEXT"),
            ],
        )
        self._add_table(holiday_status)

        # Run State
        run_state = TableDefinition(
            name="run_state",
            columns=[
                ColumnDefinition("id", "INTEGER", primary_key=True, nullable=False),
                ColumnDefinition("module_name", "TEXT", nullable=False, unique=True),
                ColumnDefinition("last_run", "TEXT"),
                ColumnDefinition("last_run_successful", "INTEGER", default=0),
                ColumnDefinition("last_run_status", "TEXT"),
                ColumnDefinition("last_run_message", "TEXT"),
                ColumnDefinition("last_duration", "INTEGER"),
                ColumnDefinition("last_run_by", "TEXT"),
            ],
        )
        self._add_table(run_state)

        # Jobs
        jobs = TableDefinition(
            name="jobs",
            columns=[
                ColumnDefinition("id", "INTEGER", primary_key=True, nullable=False),
                ColumnDefinition("type", "TEXT", nullable=False),
                ColumnDefinition("received_at", "TEXT"),
                ColumnDefinition("payload", "TEXT"),
                ColumnDefinition("status", "TEXT", default="pending"),
                ColumnDefinition("result", "TEXT"),
                ColumnDefinition("error", "TEXT"),
                ColumnDefinition("attempts", "INTEGER", default=0),
                ColumnDefinition("max_attempts", "INTEGER", default=3),
                ColumnDefinition("scheduled_at", "TEXT"),
                ColumnDefinition("priority", "INTEGER", default=0),
                ColumnDefinition("progress", "INTEGER", default=0),
            ],
            indexes=[
                "CREATE INDEX IF NOT EXISTS jobs_status_idx ON jobs(status)",
                "CREATE INDEX IF NOT EXISTS jobs_type_idx ON jobs(type)",
                "CREATE INDEX IF NOT EXISTS jobs_priority_idx ON jobs(priority, status)",
                "CREATE INDEX IF NOT EXISTS jobs_scheduled_idx ON jobs(scheduled_at)",
            ],
        )
        self._add_table(jobs)

        # Calculate schema hash for change detection
        self._calculate_schema_hash()

    def _add_table(self, table: TableDefinition) -> None:
        """Add table definition to schema."""
        self.tables[table.name] = table

    def _calculate_schema_hash(self) -> str:
        """Calculate hash of current schema definition."""
        schema_data = {}
        for table_name, table in self.tables.items():
            schema_data[table_name] = {
                "columns": [
                    (
                        col.name,
                        col.type,
                        col.nullable,
                        col.primary_key,
                        col.foreign_key,
                        col.default,
                        col.unique,
                        col.check_constraint,
                    )
                    for col in table.columns
                ],
                "indexes": table.indexes,
                "constraints": table.constraints,
            }

        schema_json = json.dumps(schema_data, sort_keys=True)
        self._schema_hash = hashlib.sha256(schema_json.encode()).hexdigest()
        return self._schema_hash

    @classmethod
    def get_existing_tables(cls, conn: sqlite3.Connection) -> Set[str]:
        """Get list of existing tables in the database."""
        cursor = conn.cursor()
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        )
        return {row[0] for row in cursor.fetchall()}

    @classmethod
    def get_existing_indexes(cls, conn: sqlite3.Connection) -> Set[str]:
        """Get list of existing indexes in the database."""
        cursor = conn.cursor()
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='index' AND name IS NOT NULL AND name NOT LIKE 'sqlite_%'"
        )
        return {row[0] for row in cursor.fetchall()}

    def get_table_columns(
        self, conn: sqlite3.Connection, table_name: str
    ) -> Dict[str, Dict]:
        """Get current column structure for a specific table."""
        cursor = conn.cursor()
        try:
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = {}
            for row in cursor.fetchall():
                columns[row[1]] = {  # row[1] is column name
                    "cid": row[0],
                    "name": row[1],
                    "type": row[2],
                    "notnull": bool(row[3]),
                    "default_value": row[4],
                    "pk": bool(row[5]),
                }
            return columns
        except sqlite3.Error as e:
            logger.error(f"Failed to get columns for table {table_name}: {e}")
            return {}

    def add_missing_columns(self, conn: sqlite3.Connection) -> List[str]:
        """Add columns that exist in schema but not in database."""
        changes = []
        existing_tables = self.get_existing_tables(conn)
        cursor = conn.cursor()

        for table_name, table_def in self.tables.items():
            if table_name not in existing_tables:
                continue  # Will be handled by add_missing_tables

            current_columns = self.get_table_columns(conn, table_name)

            for column_def in table_def.columns:
                if column_def.name not in current_columns:
                    # Add missing column
                    alter_sql = (
                        f"ALTER TABLE {table_name} ADD COLUMN {column_def.to_sql()}"
                    )
                    try:
                        cursor.execute(alter_sql)
                        changes.append(
                            f"Added column {column_def.name} to {table_name}"
                        )
                        logger.info(
                            f"Added column {column_def.name} to table {table_name}"
                        )
                    except sqlite3.Error as e:
                        logger.error(
                            f"Failed to add column {column_def.name} to {table_name}: {e}"
                        )

        return changes

    def add_missing_tables(self, conn: sqlite3.Connection) -> List[str]:
        """Create tables that exist in schema but not in database."""
        changes = []
        existing_tables = self.get_existing_tables(conn)
        cursor = conn.cursor()

        for table_name, table_def in self.tables.items():
            if table_name not in existing_tables:
                # Create missing table
                create_sql = table_def.to_create_sql()
                try:
                    cursor.execute(create_sql)
                    changes.append(f"Created table {table_name}")
                    logger.info(f"Created table {table_name}")

                    # Create indexes for new table
                    for index_sql in table_def.indexes:
                        try:
                            cursor.execute(index_sql)
                            changes.append(f"Created index for {table_name}")
                        except sqlite3.Error as e:
                            logger.warning(
                                f"Failed to create index for {table_name}: {e}"
                            )

                except sqlite3.Error as e:
                    logger.error(f"Failed to create table {table_name}: {e}")

        return changes

    def add_missing_indexes(self, conn: sqlite3.Connection) -> List[str]:
        """Create indexes that exist in schema but not in database."""
        changes = []
        existing_indexes = self.get_existing_indexes(conn)
        cursor = conn.cursor()

        for table_name, table_def in self.tables.items():
            for index_sql in table_def.indexes:
                # Extract index name from SQL
                try:
                    index_name = index_sql.split()[
                        5
                    ]  # "CREATE INDEX IF NOT EXISTS index_name ..."
                    if index_name not in existing_indexes:
                        cursor.execute(index_sql)
                        changes.append(f"Created index: {index_name}")
                        logger.info(f"Created index: {index_name}")
                except (IndexError, sqlite3.Error) as e:
                    logger.warning(
                        f"Failed to create index from SQL: {index_sql} - {e}"
                    )

        return changes

    def sync_schema(
        self, conn: sqlite3.Connection, add_missing_columns: bool = True
    ) -> Dict[str, List[str]]:
        """
        Synchronize database schema with the defined tables and indexes.
        Enhanced version with automatic column addition support.

        Args:
            conn: Database connection
            add_missing_columns: Whether to automatically add missing columns

        Returns:
            Dictionary of changes made by category
        """
        logger.debug("Synchronizing database schema...")

        changes = {
            "tables_added": [],
            "columns_added": [],
            "indexes_added": [],
            "orphaned_tables": [],
            "orphaned_indexes": [],
        }

        existing_tables = self.get_existing_tables(conn)
        existing_indexes = self.get_existing_indexes(conn)

        with conn:
            # Add missing tables
            changes["tables_added"] = self.add_missing_tables(conn)

            # Add missing columns (if enabled)
            if add_missing_columns:
                changes["columns_added"] = self.add_missing_columns(conn)

            # Add missing indexes
            changes["indexes_added"] = self.add_missing_indexes(conn)

            # Log orphaned tables for manual review (don't auto-drop)
            orphaned_tables = (
                existing_tables
                - set(self.tables.keys())
                - {"sqlite_master", "sqlite_sequence", "sqlite_stat1"}
            )
            if orphaned_tables:
                changes["orphaned_tables"] = list(orphaned_tables)
                logger.debug(
                    f"Found orphaned tables (manual cleanup needed): {orphaned_tables}"
                )

            # Log orphaned indexes for manual review (don't auto-drop)
            schema_indexes = set()
            for table_def in self.tables.values():
                for index_sql in table_def.indexes:
                    try:
                        index_name = index_sql.split()[5]  # Extract index name
                        schema_indexes.add(index_name)
                    except IndexError:
                        pass

            orphaned_indexes = existing_indexes - schema_indexes
            if orphaned_indexes:
                changes["orphaned_indexes"] = list(orphaned_indexes)
                logger.debug(
                    f"Found orphaned indexes (manual cleanup needed): {orphaned_indexes}"
                )

        # Log summary
        total_changes = (
            len(changes["tables_added"])
            + len(changes["columns_added"])
            + len(changes["indexes_added"])
        )
        if total_changes > 0:
            logger.info(
                f"Schema synchronization complete: {total_changes} changes made"
            )
        else:
            logger.debug("Schema already up to date")

        return changes

    @classmethod
    def init_database(
        cls, conn: sqlite3.Connection, add_missing_columns: bool = True
    ) -> Dict[str, List[str]]:
        """
        Initialize database with proper settings and schema.

        Args:
            conn: Database connection
            add_missing_columns: Whether to automatically add missing columns

        Returns:
            Dictionary of changes made during synchronization
        """
        # Set database pragmas for better performance and reliability
        with conn:
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA synchronous=NORMAL")
            conn.execute("PRAGMA temp_store=MEMORY")
            conn.execute("PRAGMA mmap_size=268435456")  # 256MB
            conn.execute("PRAGMA foreign_keys=ON")

        # Create schema manager and sync
        schema_manager = cls()
        return schema_manager.sync_schema(conn, add_missing_columns=add_missing_columns)

    @classmethod
    def manual_cleanup_tables(
        cls, conn: sqlite3.Connection, table_names: List[str]
    ) -> None:
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
        cls, conn: sqlite3.Connection, index_names: List[str]
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

    def get_schema_status(self, conn: sqlite3.Connection) -> Dict[str, Any]:
        """Get comprehensive schema status and differences."""
        existing_tables = self.get_existing_tables(conn)
        existing_indexes = self.get_existing_indexes(conn)

        # Get schema indexes
        schema_indexes = set()
        for table_def in self.tables.values():
            for index_sql in table_def.indexes:
                try:
                    index_name = index_sql.split()[5]
                    schema_indexes.add(index_name)
                except IndexError:
                    pass

        # Check for missing columns
        missing_columns = {}
        for table_name, table_def in self.tables.items():
            if table_name in existing_tables:
                current_columns = self.get_table_columns(conn, table_name)
                missing = [
                    col.name
                    for col in table_def.columns
                    if col.name not in current_columns
                ]
                if missing:
                    missing_columns[table_name] = missing

        return {
            "schema_hash": self._schema_hash,
            "tables": {
                "defined": set(self.tables.keys()),
                "existing": existing_tables,
                "missing": set(self.tables.keys()) - existing_tables,
                "orphaned": existing_tables
                - set(self.tables.keys())
                - {"sqlite_master", "sqlite_sequence", "sqlite_stat1"},
            },
            "indexes": {
                "defined": schema_indexes,
                "existing": existing_indexes,
                "missing": schema_indexes - existing_indexes,
                "orphaned": existing_indexes - schema_indexes,
            },
            "columns": {"missing_by_table": missing_columns},
        }


# Convenience function for easy usage
def ensure_schema_current(
    db_path: str, add_missing_columns: bool = True
) -> Dict[str, List[str]]:
    """
    Ensure database schema is current with definition.

    Args:
        db_path: Path to SQLite database
        add_missing_columns: Whether to automatically add missing columns

    Returns:
        Dictionary of changes made
    """
    with sqlite3.connect(db_path) as conn:
        return SchemaManager.init_database(
            conn, add_missing_columns=add_missing_columns
        )
