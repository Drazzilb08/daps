# util/database/__init__.py

import os
from typing import List, Optional

from util.helper import get_config_dir
from util.logger import Logger

from .collection_cache import CollectionCache
from .db_base import DatabaseBase
from .holiday import HolidayStatus
from .media_cache import MediaCache
from .orphaned_posters import OrphanedPosters
from .plex_cache import PlexCache
from .poster_cache import PosterCache
from .run_state import RunState
from .schema import SchemaManager
from .stats import Stats
from .worker import DBWorker


class DapsDB:
    """
    Main database context manager providing clean access to all database operations.

    Usage:
        with DapsDB(logger) as db:
            results = db.run_state.get_all()

    Features:
    - Lazy initialization of database interfaces
    - Automatic worker cleanup on exit
    - Schema initialization on first use
    - Quiet mode for frequently polled operations
    """

    def __init__(
        self, logger: Logger, db_path: Optional[str] = None, quiet: bool = False
    ):
        """
        Initialize database context manager.

        Args:
            logger: Logger instance for database operations
            db_path: Optional custom database path (defaults to config/daps.db)
            quiet: Suppress debug logging for frequently polled operations
        """
        self.logger = logger
        self.quiet = quiet
        self._initialized = False
        self._schema_initialized = False

        # Determine database path
        if db_path:
            self.db_path = db_path
        else:
            config_dir = get_config_dir()
            self.db_path = os.path.join(config_dir, "daps.db")

        # Database interfaces (lazy-loaded)
        self._interfaces = {}

        # Track created workers for cleanup
        self.created_workers: List[DBWorker] = []

    def __enter__(self) -> "DapsDB":
        """Context manager entry - marks database as ready for use."""
        self._initialized = True
        if not self.quiet:
            self.logger.get_adapter("DATABASE").debug("Database context initialized")
        return self

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        """Context manager exit - ensures proper cleanup of resources."""
        if not self.quiet:
            self.logger.get_adapter("DATABASE").debug("Cleaning up database context")

        # Clean up workers
        self._cleanup_workers()

        # Clear interfaces
        self._interfaces.clear()
        self._initialized = False

    def _ensure_initialized(self) -> None:
        """Ensure database context is properly initialized."""
        if not self._initialized:
            raise RuntimeError("DapsDB must be used within a context manager")

    def _ensure_schema_initialized(self) -> None:
        """Lazy initialization of database schema."""
        if not self._schema_initialized:
            try:
                DatabaseBase(logger=self.logger, db_path=self.db_path).init_schema(
                    self.db_path
                )
                self._schema_initialized = True
                if not self.quiet:
                    self.logger.get_adapter("DATABASE").debug(
                        "Database schema initialized"
                    )
            except Exception as e:
                self.logger.get_adapter("DATABASE").error(
                    f"Failed to initialize database schema: {e}"
                )
                raise

    def _get_interface(self, interface_name: str, interface_class):
        """
        Generic interface getter with lazy loading.

        Args:
            interface_name: Name of the interface for caching
            interface_class: Class to instantiate for the interface

        Returns:
            Database interface instance
        """
        self._ensure_initialized()
        self._ensure_schema_initialized()

        if interface_name not in self._interfaces:
            self._interfaces[interface_name] = interface_class(
                logger=self.logger, db_path=self.db_path
            )

        return self._interfaces[interface_name]

    def _cleanup_workers(self) -> None:
        """Clean up all created workers with proper error handling."""
        for worker in self.created_workers:
            try:
                if hasattr(worker, "running") and worker.running:
                    worker.close()
                    if not self.quiet:
                        self.logger.get_adapter("DATABASE").debug(
                            f"Closed worker: {getattr(worker, 'worker_name', 'UNKNOWN')}"
                        )
            except Exception as e:
                self.logger.get_adapter("DATABASE").warning(
                    f"Error closing worker: {e}"
                )

        self.created_workers.clear()

    # Database interface properties with lazy loading
    @property
    def media(self) -> MediaCache:
        """Access to media cache operations."""
        return self._get_interface("media", MediaCache)

    @property
    def plex(self) -> PlexCache:
        """Access to Plex cache operations."""
        return self._get_interface("plex", PlexCache)

    @property
    def collection(self) -> CollectionCache:
        """Access to collection cache operations."""
        return self._get_interface("collection", CollectionCache)

    @property
    def poster(self) -> PosterCache:
        """Access to poster cache operations."""
        return self._get_interface("poster", PosterCache)

    @property
    def orphaned(self) -> OrphanedPosters:
        """Access to orphaned posters operations."""
        return self._get_interface("orphaned", OrphanedPosters)

    @property
    def run_state(self) -> RunState:
        """Access to run state operations."""
        return self._get_interface("run_state", RunState)

    @property
    def stats(self) -> Stats:
        """Access to statistics operations."""
        return self._get_interface("stats", Stats)

    @property
    def holiday(self) -> HolidayStatus:
        """Access to holiday status operations."""
        return self._get_interface("holiday", HolidayStatus)

    @property
    def worker(self) -> DBWorker:
        """Access to default worker operations."""
        return self._get_interface(
            "worker", lambda **kwargs: DBWorker(worker_name="DEFAULT", **kwargs)
        )

    def create_worker(
        self,
        logger: Optional[Logger] = None,
        num_workers: int = 1,
        poll_interval: int = 2,
        worker_name: str = "UNNAMED",
        job_type_filter: Optional[str] = None,
    ) -> DBWorker:
        """
        Create a new database worker for background operations.

        Args:
            logger: Optional logger (defaults to database logger)
            num_workers: Number of worker threads
            poll_interval: Polling interval in seconds
            worker_name: Name for the worker (for logging/debugging)
            job_type_filter: Optional filter for specific job types

        Returns:
            Configured DBWorker instance

        Raises:
            RuntimeError: If called outside context manager
        """
        self._ensure_initialized()

        worker_logger = logger or self.logger

        if not self.quiet:
            self.logger.get_adapter("DATABASE").debug(
                f"Creating worker: '{worker_name}'"
            )

        try:
            worker = DBWorker(
                db_path=self.db_path,
                logger=worker_logger,
                num_workers=num_workers,
                poll_interval=poll_interval,
                worker_name=worker_name,
                job_type_filter=job_type_filter,
            )

            # Track for cleanup
            self.created_workers.append(worker)
            return worker

        except Exception as e:
            self.logger.get_adapter("DATABASE").error(
                f"Failed to create worker '{worker_name}': {e}"
            )
            raise

    def close(self) -> None:
        """
        Manually close the database context.
        Useful for cleanup without exiting context manager.
        """
        if self._initialized:
            self._cleanup_workers()
            self._interfaces.clear()


# Utility function for simple database operations
def with_database(logger: Logger, quiet: bool = False):
    """
    Decorator/context helper for simple database operations.

    Args:
        logger: Logger instance
        quiet: Suppress debug logging

    Returns:
        DapsDB context manager

    Usage:
        # As context manager
        with with_database(logger) as db:
            results = db.run_state.get_all()

        # As decorator (for future use)
        @with_database(logger)
        def my_db_operation(db):
            return db.stats.get_summary()
    """
    return DapsDB(logger=logger, quiet=quiet)


__all__ = [
    "DatabaseBase",
    "SchemaManager",
    "PlexCache",
    "CollectionCache",
    "PosterCache",
    "OrphanedPosters",
    "RunState",
    "Stats",
    "DapsDB",
    "DBWorker",
    "HolidayStatus",
    "MediaCache",
    "with_database",
]
