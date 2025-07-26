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

        DatabaseBase.init_schema(db_path)

        self.plex = PlexCache(db_path)
        self.collection = CollectionCache(db_path)
        self.poster = PosterCache(db_path)
        self.media = MediaCache(db_path)
        self.orphaned = OrphanedPosters(db_path)
        self.run_state = RunState(db_path)
        self.stats = Stats(db_path)
        self.holiday = HolidayStatus(db_path)
        self.worker = DBWorker(db_path)

    def close_all(self):
        if self.logger:
            self.logger.debug("[DATABASE] Closing database connections")
        self.plex.close()
        self.collection.close()
        self.poster.close()
        self.media.close()
        self.orphaned.close()
        self.run_state.close()
        self.stats.close()
        self.holiday.close()
        self.worker.close()


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
