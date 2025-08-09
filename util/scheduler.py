# util/scheduler.py

import time
from datetime import datetime
from logging import Logger
from typing import Dict

from croniter import croniter
from dateutil import tz

from util.helper import create_table


def check_schedule(script_name: str, schedule: str, logger: Logger) -> bool:
    """Check if the current time matches the given schedule for a script."""
    next_run_times: Dict[str, datetime] = {}
    try:
        now: datetime = datetime.now()
        try:
            frequency, data = schedule.split("(")
        except ValueError:
            logger.error(
                f"Invalid schedule format: {schedule} for script: {script_name}"
            )
            return False
        data = data[:-1]

        if frequency == "hourly":
            return int(data) == now.minute

        if frequency == "daily":
            times = data.split("|")
            for time_ in times:
                hour, minute = map(int, time_.split(":"))
                if now.hour == hour and now.minute == minute:
                    return True

        if frequency == "weekly":
            days = [day.split("@")[0] for day in data.split("|")]
            times = [day.split("@")[1] for day in data.split("|")]
            current_day = now.strftime("%A").lower()
            for day, time_ in zip(days, times):
                hour, minute = map(int, time_.split(":"))
                if current_day == day or (
                    current_day == "sunday" and day == "saturday"
                ):
                    if now.hour == hour and now.minute == minute:
                        return True

        if frequency == "monthly":
            day_str, time_str = data.split("@")
            day = int(day_str)
            hour, minute = map(int, time_str.split(":"))
            if now.day == day and now.hour == hour and now.minute == minute:
                return True

        if frequency == "range":
            ranges = data.split("|")
            for start_end in ranges:
                start, end = start_end.split("-")
                start_month, start_day = map(int, start.split("/"))
                end_month, end_day = map(int, end.split("/"))
                start_date = datetime(now.year, start_month, start_day)
                end_date = datetime(now.year, end_month, end_day)
                if start_date <= now <= end_date:
                    return True

        if frequency == "cron":
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
            logger.debug(
                f"Next run time for script {script_name}: {next_run} is in the future\n"
            )
            return False

        return False

    except ValueError as e:
        logger.error(f"Invalid schedule: {schedule} for script: {script_name}")
        logger.error(f"Error: {e}", exc_info=True)
        return False


def print_schedule_table(logger, schedule):
    """Print the current schedule table using util.helper.create_table for consistency."""
    if logger is None:
        return
    table_data = [["Module", "Schedule"]] + [
        [module_name, schedule_time] for module_name, schedule_time in schedule.items()
    ]
    logger.info(create_table(table_data))


class DapsScheduler:
    """Pure scheduling logic - delegates execution to ModuleRunner"""

    def __init__(self, config, logger, module_runner):
        self.config = config
        self.logger = logger
        self.module_runner = module_runner
        self.running = False

    def start(self):
        """Start the scheduler loop"""
        schedule = self.config.schedule

        if self.logger:
            self.logger.get_adapter("SCHEDULER").info("Starting scheduler loop...")
            log_adapter = self.logger.get_adapter("SCHEDULER")
        else:
            print("[SCHEDULER] Starting scheduler loop...")
            log_adapter = None

        print_schedule_table(log_adapter, schedule)

        if self.logger:
            self.logger.get_adapter("SCHEDULER").info(
                "Waiting for scheduled modules..."
            )
        else:
            print("[SCHEDULER] Waiting for scheduled modules...")

        self.running = True
        start_time = time.monotonic()

        try:
            while self.running:
                self._tick(schedule)
                time.sleep(5)

                # Periodic uptime log
                elapsed = int(time.monotonic() - start_time)
                if elapsed % 60 == 0:
                    minutes = elapsed // 60
                    seconds = elapsed % 60
                    if self.logger:
                        self.logger.get_adapter("SCHEDULER").debug(
                            f"Scheduler is alive. Uptime: {minutes}m {seconds}s"
                        )
        except Exception as e:
            import traceback

            if self.logger:
                self.logger.get_adapter("SCHEDULER").error(
                    f"FATAL error in scheduler loop: {e}", exc_info=True
                )
            else:
                print(f"[SCHEDULER] FATAL error: {e}")
            traceback.print_exc()
            raise
        finally:
            if self.logger:
                self.logger.get_adapter("SCHEDULER").info("Scheduler loop ended")
            else:
                print("[SCHEDULER] Scheduler loop ended")

    def stop(self):
        """Stop the scheduler"""
        self.running = False

    def _tick(self, schedule):
        """Check for due modules and clean up finished ones"""
        try:
            for name, sched in schedule.items():
                if not sched:
                    continue

                # Skip if already running
                running_modules = self.module_runner.get_running()
                if (
                    name in running_modules
                    and running_modules[name] is not None
                    and running_modules[name]["proc"].is_alive()
                ):
                    continue

                # Check if module should run
                log_adapter = (
                    self.logger.get_adapter("scheduler") if self.logger else None
                )
                if check_schedule(name, sched, log_adapter):
                    if self.logger:
                        self.logger.get_adapter("SCHEDULER").info(
                            f"Running scheduled module: {name}"
                        )
                    else:
                        print(f"[SCHEDULER] Running scheduled module: {name}")
                    self.module_runner.launch_module_tracked(name, "scheduled")

            # Clean up finished processes
            self.module_runner.cleanup_finished()

        except Exception as e:
            if self.logger:
                self.logger.get_adapter("SCHEDULER").error(
                    f"Exception in tick(): {e}", exc_info=True
                )
            else:
                print(f"[SCHEDULER] Exception in tick(): {e}")
            raise
