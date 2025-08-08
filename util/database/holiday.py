from typing import Optional

from .db_base import DatabaseBase


class HolidayStatus(DatabaseBase):
    """
    Interface for the holiday_status table (tracks last active holiday).
    """

    def get_status(self) -> dict:
        """Get the last_active_holiday row (or None if not set)."""
        result = self.execute_query(
            "SELECT last_active_holiday FROM holiday_status WHERE id=1", fetch_one=True
        )

        if result:
            return {"last_active_holiday": result["last_active_holiday"]}
        else:
            return {"last_active_holiday": None}

    def set_status(self, last_active_holiday: Optional[str]) -> None:
        """Set last_active_holiday to the given value (or None)."""
        self.execute_query(
            """
            INSERT INTO holiday_status (id, last_active_holiday)
            VALUES (1, ?)
            ON CONFLICT(id) DO UPDATE SET last_active_holiday=excluded.last_active_holiday
            """,
            (last_active_holiday,),
        )
