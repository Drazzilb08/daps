import datetime
from typing import Any, Dict, List, Optional

from .db_base import DatabaseBase


class RunState(DatabaseBase):
    """
    Methods for tracking the last run, status, and stats for each module.
    """

    def record_run_start(self, module_name: str, run_by: str = "manual") -> None:
        """
        Mark the start of a module run (sets last_run, last_run_by; resets other fields).
        """
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        with self.lock, self.conn:
            self.conn.execute(
                """
                INSERT INTO run_state (module_name, last_run, last_run_successful, last_run_status, last_run_message, last_duration, last_run_by)
                VALUES (?, ?, NULL, NULL, NULL, NULL, ?)
                ON CONFLICT(module_name) DO UPDATE SET
                    last_run=excluded.last_run,
                    last_run_successful=NULL,
                    last_run_status=NULL,
                    last_run_message=NULL,
                    last_duration=NULL,
                    last_run_by=excluded.last_run_by
                """,
                (module_name, now, run_by),
            )

    def record_run_finish(
        self,
        module_name: str,
        success: bool,
        status: Optional[str] = None,
        message: Optional[str] = None,
        duration: Optional[int] = None,
        run_by: Optional[str] = None,
    ) -> None:
        """
        Mark the finish of a module run, recording status, message, duration, etc.
        """
        with self.lock, self.conn:
            self.conn.execute(
                """
                UPDATE run_state
                SET last_run_successful = ?,
                    last_run_status = ?,
                    last_run_message = ?,
                    last_duration = ?,
                    last_run_by = ?
                WHERE module_name = ?
                """,
                (int(success), status, message, duration, run_by, module_name),
            )

    def get_run_state(self, module_name: str) -> Optional[Dict[str, Any]]:
        """
        Return run state for a single module.
        """
        with self.lock, self.conn:
            cur = self.conn.execute(
                "SELECT * FROM run_state WHERE module_name=?", (module_name,)
            )
            row = cur.fetchone()
            return dict(row) if row else None

    def get_all(self) -> List[Dict[str, Any]]:
        """
        Return run state for all modules.
        """
        with self.lock, self.conn:
            cur = self.conn.execute("SELECT * FROM run_state")
            return [dict(row) for row in cur.fetchall()]

    def clear_run_state(self) -> None:
        """
        Delete all rows from run_state (for testing/dev).
        """
        with self.lock, self.conn:
            self.conn.execute("DELETE FROM run_state")
