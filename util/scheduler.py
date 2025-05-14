from typing import Dict
from logging import Logger
from datetime import datetime
from croniter import croniter
from dateutil import tz

"""
Module to determine if the current time matches specified scheduling criteria for scripts.
Supports multiple scheduling strategies including hourly, daily, weekly, monthly, range, and cron expressions.
"""

next_run_times: Dict[str, datetime] = {}

def check_schedule(script_name: str, schedule: str, logger: Logger) -> bool:
    """
    Check if the current time matches the given schedule for a script.

    Args:
        script_name (str): The name of the script being checked.
        schedule (str): The scheduling string defining when the script should run.
        logger (Logger): Logger instance for logging debug and error messages.

    Returns:
        bool: True if the current time matches the schedule, False otherwise.
    """
    try:
        now: datetime = datetime.now()
        try:
            frequency, data = schedule.split("(")
        except ValueError:
            logger.error(f"Invalid schedule format: {schedule} for script: {script_name}")
            return False
        data = data[:-1]

        # Hourly: match if current minute equals scheduled minute
        if frequency == "hourly":
            return int(data) == now.minute

        # Daily: check against one or more HH:MM entries
        elif frequency == "daily":
            times = data.split("|")
            for time in times:
                hour, minute = map(int, time.split(":"))
                if now.hour == hour and now.minute == minute:
                    return True

        # Weekly: check against weekday and time (e.g., monday@14:00)
        elif frequency == "weekly":
            days = [day.split("@")[0] for day in data.split("|")]
            times = [day.split("@")[1] for day in data.split("|")]
            current_day = now.strftime("%A").lower()
            for day, time in zip(days, times):
                hour, minute = map(int, time.split(":"))
                if (current_day == day or (current_day == "sunday" and day == "saturday")):
                    if now.hour == hour and now.minute == minute:
                        return True

        # Monthly: match if today is the correct day and time
        elif frequency == "monthly":
            day_str, time_str = data.split("@")
            day = int(day_str)
            hour, minute = map(int, time_str.split(":"))
            if now.day == day and now.hour == hour and now.minute == minute:
                return True

        # Range: check if current date is within specified MM/DD-MM/DD ranges
        elif frequency == "range":
            ranges = data.split("|")
            for start_end in ranges:
                start, end = start_end.split("-")
                start_month, start_day = map(int, start.split("/"))
                end_month, end_day = map(int, end.split("/"))
                start_date = datetime(now.year, start_month, start_day)
                end_date = datetime(now.year, end_month, end_day)
                if start_date <= now <= end_date:
                    return True

        # Cron: use croniter to determine if current time matches cron schedule
        elif frequency == "cron":
            local_tz = tz.tzlocal()
            local_date = datetime.now(local_tz)
            current_time = local_date.replace(second=0, microsecond=0)
            logger.debug(f"Local time: {current_time}")
            next_run = next_run_times.get(script_name)
            if next_run is None:
                next_run = croniter(data, local_date).get_next(datetime)
                next_run_times[script_name] = next_run
                logger.debug(f"Next run for {script_name}: {next_run}")
            if next_run <= current_time:
                next_run = croniter(data, local_date).get_next(datetime)
                next_run_times[script_name] = next_run
                logger.debug(f"Next run for {script_name}: {next_run}\n")
                return True
            else:
                logger.debug(f"Next run time for script {script_name}: {next_run} is in the future\n")
                return False

        return False

    except ValueError as e:
        logger.error(f"Invalid schedule: {schedule} for script: {script_name}")
        logger.error(f"Error: {e}", exc_info=True)
        return False