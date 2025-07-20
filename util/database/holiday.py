from .db_base import DatabaseBase
from typing import Optional

class HolidayStatus(DatabaseBase):
    """
    Interface for the holiday_status table (tracks last active holiday).
    """
    def get_status(self) -> dict:
        """Get the last_active_holiday row (or None if not set)."""
        with self.lock, self.conn:
            cur = self.conn.execute(
                "SELECT last_active_holiday FROM holiday_status WHERE id=1"
            )
            row = cur.fetchone()
            if row:
                return {"last_active_holiday": row["last_active_holiday"]}
            else:
                return {"last_active_holiday": None}

    def set_status(self, last_active_holiday: Optional[str]) -> None:
        """Set last_active_holiday to the given value (or None)."""
        with self.lock, self.conn:
            self.conn.execute(
                """
                INSERT INTO holiday_status (id, last_active_holiday)
                VALUES (1, ?)
                ON CONFLICT(id) DO UPDATE SET last_active_holiday=excluded.last_active_holiday
                """,
                (last_active_holiday,),
            )