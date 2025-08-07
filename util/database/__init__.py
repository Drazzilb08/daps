import os

from .collection_cache import CollectionCache
from .db_base import DatabaseBase
from .holiday import HolidayStatus
from .media_cache import MediaCache
from .orphaned_posters import OrphanedPosters
from .plex_cache import PlexCache
from .poster_cache import PosterCache
from .run_state import RunState
from .stats import Stats
from .worker import DBWorker


class DapsDB:
    def __init__(self, logger=None, db_path=None):
        self.logger = logger
        if db_path is None:
            from util.helper import get_config_dir

            config_dir = get_config_dir()
            db_path = os.path.join(config_dir, "daps.db")
        self.db_path = db_path
        DatabaseBase.init_schema(self.db_path)

        self.plex = PlexCache(db_path)
        self.collection = CollectionCache(db_path)
        self.poster = PosterCache(db_path)
        self.media = MediaCache(db_path)
        self.orphaned = OrphanedPosters(db_path)
        self.run_state = RunState(db_path)
        self.stats = Stats(db_path)
        self.holiday = HolidayStatus(db_path)

        # Create a default worker but don't start it (it's just for compatibility)
        self.worker = DBWorker(db_path, logger=self.logger, worker_name="DEFAULT")

        # Keep track of created workers for cleanup
        self.created_workers = []

    def create_worker(
        self,
        logger=None,
        num_workers=1,
        poll_interval=2,
        worker_name="UNNAMED",
        job_type_filter=None,
    ):
        if logger:
            logger.debug(f"Creating: '{worker_name}' worker")
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

    def close_all(self):
        if self.logger:
            self.logger.debug("[DATABASE] Closing database connections")

        # Close created workers first (these are the active ones)
        for worker in self.created_workers:
            try:
                if hasattr(worker, "running") and worker.running:
                    worker.close()
            except Exception as e:
                if self.logger:
                    self.logger.debug(
                        f"Error closing worker {getattr(worker, 'worker_name', 'UNKNOWN')}: {e}"
                    )

        # Clear the list
        self.created_workers.clear()

        # Close other database connections
        self.plex.close()
        self.collection.close()
        self.poster.close()
        self.media.close()
        self.orphaned.close()
        self.run_state.close()
        self.stats.close()
        self.holiday.close()

        # Close the default worker (but it should not be running)
        try:
            if hasattr(self.worker, "conn") and self.worker.conn:
                self.worker.conn.close()
        except Exception as e:
            if self.logger:
                self.logger.debug(f"Error closing default worker connection: {e}")


__all__ = [
    "DatabaseBase",
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
