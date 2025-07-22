import sqlite3
import threading
from typing import Any


class DatabaseBase:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.row_factory = self._dict_factory
        self.lock = threading.Lock()

    def _dict_factory(self, cursor: Any, row: Any) -> dict:
        """Return rows as dictionaries."""
        return {col[0]: row[idx] for idx, col in enumerate(cursor.description)}

    def close(self):
        if self.conn:
            self.conn.close()
            self.conn = None

    @staticmethod
    def init_schema(db_path: str):
        import util.database.schema as schema

        conn = sqlite3.connect(db_path)
        schema.init_db_schema(conn)
        conn.close()
