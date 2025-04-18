from datetime import datetime
from croniter import croniter
from dateutil import tz

next_run_times = {}

def check_schedule(script_name, schedule, logger):
    """
    Checks if a given name is currently active based on its schedule.

    Args:
        name: Name of the schedule.
        script_name: Name of the script. (Used for cron schedule)
        schedule: Schedule string in the format "frequency(data)".
        - frequency: Can be "hourly", "daily", "weekly", or "monthly".
        - data: Depends on the frequency:
            - hourly: Hour of the day (e.g., "10").
            - daily: Time of the day (e.g., "11:05"). Can be multiple times separated by commas.
            - weekly: Day of the week and time of the day (e.g., "monday@12:00", "tuesday@12:30"). Can be multiple times separated by commas.
            - monthly: Day of the month and time of the day (e.g., "15@12:00").
            - range: Date range (e.g., "01/01-12/31"). Can be multiple ranges separated by pipes.
            - cron: Cron expression (e.g., "0 0 * * *").

    Returns:
        bool: True if the schedule is active, False otherwise.
    """
    
    try:
        now = datetime.now()
        frequency, data = schedule.split("(")
        data = data[:-1]
        if frequency == "hourly":
            return int(data) == now.minute
        elif frequency == "daily":
            times = data.split("|")
            for time in times:
                hour, minute = map(int, time.split(":"))
                if now.hour == hour and now.minute == minute:
                    return True
        elif frequency == "weekly":
            days = [day.split("@")[0] for day in data.split("|")]
            times = [day.split("@")[1] for day in data.split("|")]
            if now.strftime("%A").lower() in days:
                for time, day in zip(times, days):
                    hour, minute = map(int, time.split(":"))
                    if now.hour == hour and now.minute == minute and (now.strftime("%A").lower() == day or
                    (now.strftime("%A").lower() == "sunday" and day == "saturday")):
                        return True
        elif frequency == "monthly":
            day, time = data.split("@")
            if now.day == int(day) and now.hour == int(time.split(":")[0]) and now.minute == int(time.split(":")[1]):
                return True
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
        elif frequency == "cron":
            local_tz = tz.tzlocal()
            local_date = datetime.now(local_tz)

            current_time = datetime.now(local_tz).replace(second=0, microsecond=0)

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
            

    except ValueError as e:
        logger.error(f"Invalid schedule: {schedule} for script: {script_name}")
        logger.error(f"Error: {e}")
        return False