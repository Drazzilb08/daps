from datetime import datetime
from croniter import croniter

last_run = {}

def check_schedule(script_name, schedule):
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
        return False
    elif frequency == "weekly":
        days = [day.split("@")[0] for day in data.split("|")]
        times = [day.split("@")[1] for day in data.split("|")]
        if now.strftime("%A").lower() in days:
            for time, day in zip(times, days):
                hour, minute = map(int, time.split(":"))
            if now.hour == hour and now.minute == minute and (now.strftime("%A").lower() == day or
            (now.strftime("%A").lower() == "sunday" and day == "saturday")):
                return True
        return False
    elif frequency == "monthly":
        day, time = data.split("@")
        if now.day == int(day) and now.hour == int(time.split(":")[0]) and now.minute == int(time.split(":")[1]):
            return True
        return False
    elif frequency == "range":
        ranges = data.split("|")
        for start_end in ranges:
            start, end = start_end.split("-")
            start_month, start_day = map(int, start.split("/"))
            end_month, end_day = map(int, end.split("/"))
            current_month, current_day = map(int, now.strftime("%m/%d").split("/"))

            if start_month <= current_month <= end_month and start_day <= current_day <= end_day:
                return True
        return False
    elif frequency == "cron":
        cron = croniter(data)
        next_run = cron.get_next(datetime)
        if last_run.get(script_name) is None:
            last_run[script_name] = next_run
            return False
        if next_run > last_run[script_name]:
            last_run[script_name] = next_run
            return True
        return False

    else:
        raise ValueError(f"Invalid frequency: {frequency}")