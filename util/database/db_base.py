# util/database/db_base.py

import os
import sqlite3
import threading
from contextlib import contextmanager
from typing import Any

from util.logger import Logger


class DatabaseBase:
    """Base class for all database operations with proper resource management."""

    def __init__(self, logger: Logger, db_path: str):
        self.db_path = db_path
        self._ensure_db_directory()
        self.lock = threading.Lock()
        self.logger = logger

    def _ensure_db_directory(self) -> None:
        """Ensure the database directory exists."""
        db_dir = os.path.dirname(self.db_path)
        if db_dir and not os.path.exists(db_dir):
            os.makedirs(db_dir, exist_ok=True)

    @contextmanager
    def get_connection(self):
        """
        Context manager for database connections.
        Ensures proper connection cleanup and thread safety.
        """
        conn = None
        try:
            with self.lock:
                conn = sqlite3.connect(self.db_path, check_same_thread=False)
                conn.row_factory = self._dict_factory
                yield conn
        except Exception as e:
            if conn:
                try:
                    conn.rollback()
                except Exception:
                    pass
            self.logger.error(f"Database error: {e}")
            raise
        finally:
            if conn:
                try:
                    conn.close()
                except Exception:
                    pass

    def _dict_factory(self, cursor: Any, row: Any) -> dict:
        """Return rows as dictionaries."""
        return {col[0]: row[idx] for idx, col in enumerate(cursor.description)}

    def execute_query(
        self,
        sql: str,
        params: tuple = (),
        fetch_all: bool = False,
        fetch_one: bool = False,
        last_row_id: bool = False,
    ):
        """
        Execute a query with proper connection handling.

        Args:
            sql: SQL query to execute
            params: Parameters for the query
            fetch_all: Return all results
            fetch_one: Return one result

        Returns:
            Query results or None
        """
        with self.get_connection() as conn:
            cursor = conn.execute(sql, params)
            if fetch_all:
                return cursor.fetchall()
            if last_row_id:
                conn.commit()
                return cursor.lastrowid
            elif fetch_one:
                return cursor.fetchone()
            else:
                conn.commit()
                return cursor.rowcount

    def execute_transaction(self, operations: list) -> None:
        """
        Execute multiple operations in a single transaction.

        Args:
            operations: List of (sql, params) tuples
        """
        with self.get_connection() as conn:
            for sql, params in operations:
                conn.execute(sql, params)
            conn.commit()

    @staticmethod
    def init_schema(db_path: str) -> None:
        """Initialize database schema - called by DapsDB."""
        from .schema import SchemaManager

        conn = sqlite3.connect(db_path)
        try:
            SchemaManager.init_database(conn)
        finally:
            conn.close()
