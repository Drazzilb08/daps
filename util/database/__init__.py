"""
DAPS Database Module

Provides a clean, context-manager-based database interface with automatic schema management.

Usage:
    with DapsDB() as db:
        db.media.upsert(item, "movie", "Radarr", "instance1")
        records = db.media.get_by_instance("instance1")
"""

import os

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
        with DapsDB() as db:
            db.media.upsert(item, "movie", "Radarr", "instance1")
    """

    def __init__(self, logger: Logger, db_path: str = None):

        self.logger = logger

        config_dir = get_config_dir()
        db_path = os.path.join(config_dir, "daps.db")

        self.db_path = db_path
        self._initialized = False

        # Initialize schema
        DatabaseBase(logger=self.logger, db_path=self.db_path).init_schema(self.db_path)

        # Database interfaces (created on first access)
        self._media = None
        self._plex = None
        self._collection = None
        self._poster = None
        self._orphaned = None
        self._run_state = None
        self._stats = None
        self._holiday = None
        self._worker = None

        # Track created workers for cleanup
        self.created_workers = []

    def __enter__(self):
        """Context manager entry."""
        self._initialized = True
        self.logger.debug("[DATABASE] Initializing database context")
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        """Context manager exit - ensures proper cleanup."""
        self.logger.debug("[DATABASE] Cleaning up database context")

        # Close any created workers
        for worker in self.created_workers:
            try:
                if hasattr(worker, "running") and worker.running:
                    worker.close()
            except Exception as e:
                self.logger.debug(f"Error closing worker: {e}")

        self.created_workers.clear()
        self._initialized = False

    @property
    def media(self) -> MediaCache:
        """Access to media cache operations."""
        if not self._initialized:
            raise RuntimeError("DapsDB must be used within a context manager")
        if self._media is None:
            self._media = MediaCache(logger=self.logger, db_path=self.db_path)
        return self._media

    @property
    def plex(self) -> PlexCache:
        """Access to Plex cache operations."""
        if not self._initialized:
            raise RuntimeError("DapsDB must be used within a context manager")
        if self._plex is None:
            self._plex = PlexCache(logger=self.logger, db_path=self.db_path)
        return self._plex

    @property
    def collection(self) -> CollectionCache:
        """Access to collection cache operations."""
        if not self._initialized:
            raise RuntimeError("DapsDB must be used within a context manager")
        if self._collection is None:
            self._collection = CollectionCache(logger=self.logger, db_path=self.db_path)
        return self._collection

    @property
    def poster(self) -> PosterCache:
        """Access to poster cache operations."""
        if not self._initialized:
            raise RuntimeError("DapsDB must be used within a context manager")
        if self._poster is None:
            self._poster = PosterCache(logger=self.logger, db_path=self.db_path)
        return self._poster

    @property
    def orphaned(self) -> OrphanedPosters:
        """Access to orphaned posters operations."""
        if not self._initialized:
            raise RuntimeError("DapsDB must be used within a context manager")
        if self._orphaned is None:
            self._orphaned = OrphanedPosters(logger=self.logger, db_path=self.db_path)
        return self._orphaned

    @property
    def run_state(self) -> RunState:
        """Access to run state operations."""
        if not self._initialized:
            raise RuntimeError("DapsDB must be used within a context manager")
        if self._run_state is None:
            self._run_state = RunState(logger=self.logger, db_path=self.db_path)
        return self._run_state

    @property
    def stats(self) -> Stats:
        """Access to statistics operations."""
        if not self._initialized:
            raise RuntimeError("DapsDB must be used within a context manager")
        if self._stats is None:
            self._stats = Stats(logger=self.logger, db_path=self.db_path)
        return self._stats

    @property
    def holiday(self) -> HolidayStatus:
        """Access to holiday status operations."""
        if not self._initialized:
            raise RuntimeError("DapsDB must be used within a context manager")
        if self._holiday is None:
            self._holiday = HolidayStatus(logger=self.logger, db_path=self.db_path)
        return self._holiday

    @property
    def worker(self) -> DBWorker:
        """Access to default worker operations."""
        if not self._initialized:
            raise RuntimeError("DapsDB must be used within a context manager")
        if self._worker is None:
            self._worker = DBWorker(
                logger=self.logger, db_path=self.db_path, worker_name="DEFAULT"
            )
        return self._worker

    def create_worker(
        self,
        logger: Logger,
        num_workers: int = 1,
        poll_interval: int = 2,
        worker_name: str = "UNNAMED",
        job_type_filter: str = None,
    ) -> DBWorker:
        """Create a new database worker for background operations."""
        if not self._initialized:
            raise RuntimeError("DapsDB must be used within a context manager")

        self.logger.debug(f"Creating: '{worker_name}' worker")

        worker = DBWorker(
            db_path=self.db_path,
            logger=logger or self.logger,
            num_workers=num_workers,
            poll_interval=poll_interval,
            worker_name=worker_name,
            job_type_filter=job_type_filter,
        )

        # Track created workers for cleanup
        self.created_workers.append(worker)
        return worker


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
]
