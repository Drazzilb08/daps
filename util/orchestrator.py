# util/orchestrator.py

import multiprocessing
import time
from datetime import datetime
from logging import Logger
from typing import Dict

from croniter import croniter
from dateutil import tz
from prettytable import PrettyTable

from modules import MODULES
from util.config import Config


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
    if logger is None:
        return
    logger.info("=" * 64)
    logger.info("Current DAPS Schedule")
    table = PrettyTable(["Module", "Schedule"])
    table.align = "l"
    table.padding_width = 1
    for module_name, schedule_time in schedule.items():
        table.add_row([module_name, schedule_time])
    logger.info("\n" + str(table))
    logger.info("=" * 64)


class DapsOrchestrator:
    """
    Orchestrator class to manage running DAPS modules (CLI, schedule, web UI).
    """

    def __init__(self, logger):
        self.logger = logger
        self.running: Dict[str, multiprocessing.Process] = {}

    def _log(self, level, *args, **kwargs):
        if self.logger:
            log_method = getattr(self.logger, level, None)
            if log_method:
                log_method(*args, **kwargs)

    def run(self, args):
        self._log("debug", f"[ORCH] run() entry with args: {args}")
        try:
            if args.modules:
                self.run_cli_modules(args.modules)
            else:
                self._log("info", "[MAIN] Starting DAPS...")
                self._start_web_thread()
                self.run_schedule()
        except Exception as e:
            import traceback

            self._log("error", f"[ORCH] FATAL error in run(): {e}", exc_info=True)
            traceback.print_exc()
            raise

    def run_cli_modules(self, modules):
        self._log("info", f"[ORCH] CLI mode: Running modules {modules}")
        try:
            for name in modules:
                self.launch_module(name)
            for proc in multiprocessing.active_children():
                proc.join()
            self._log("info", "[ORCH] All CLI modules completed.")
        except Exception as e:
            self._log("error", f"[ORCH] Error in run_cli_modules: {e}", exc_info=True)
            raise

    def run_schedule(self):
        schedule = Config("schedule")

        self._log("info", "[SCHEDULER] Starting scheduler loop...")
        print_schedule_table(self.logger, schedule)
        self._log("info", "[SCHEDULER] Waiting for scheduled modules...")
        loop_count = 0
        try:
            while True:
                self.tick(schedule)
                time.sleep(5)
                loop_count += 1
                # Log "waiting" and heartbeat every 12 loops (1 minute)
                if loop_count % 12 == 0:
                    self._log(
                        "debug",
                        f"[SCHEDULER] Scheduler is alive. Loop count: {loop_count}",
                    )
        except Exception as e:
            import traceback

            self._log(
                "error", f"[SCHEDULER] FATAL error in schedule loop: {e}", exc_info=True
            )
            traceback.print_exc()
            raise

    def tick(self, schedule):
        """Run due modules and clean up finished ones."""
        try:
            for name, sched in schedule.items():
                if not sched:
                    continue
                if name not in MODULES:
                    self._log("error", f"Unknown module in schedule: {name}")
                    continue
                if (
                    name in self.running
                    and self.running[name] is not None
                    and self.running[name].is_alive()
                ):
                    continue
                if check_schedule(name, sched, self.logger):
                    self._log("info", f"[SCHEDULER] Running scheduled module: {name}")
                    self.running[name] = self.launch_module(name)
            # Cleanup finished
            for name in list(self.running):
                proc = self.running[name]
                if proc is not None and not proc.is_alive():
                    self._log("info", f"[SCHEDULER] Module {name} finished")
                    del self.running[name]
        except Exception as e:
            self._log("error", f"[SCHEDULER] Exception in tick(): {e}", exc_info=True)
            raise

    def _start_web_thread(self):
        try:
            import threading

            from web.server import start_web_server

            web_thread = threading.Thread(
                target=start_web_server, args=(self.logger,), daemon=True
            )
            web_thread.start()
            self._log("info", "[ORCH] Web server started in background thread.")
        except Exception as e:
            self._log("error", f"[ORCH] Failed to start web server: {e}", exc_info=True)

    def start_web(self):
        # (For direct web-only mode if you ever need it)
        try:
            from web.server import start_web_server

            self._log("info", "[ORCH] Starting web server (blocking)...")
            start_web_server(self.logger)
        except Exception as e:
            self._log("error", f"[ORCH] Failed to start web server: {e}", exc_info=True)
            raise

    def launch_module(self, name):
        try:
            if name not in MODULES:
                self._log("error", f"Unknown module: {name}")
                return None

            target_func = MODULES[name]
            self._log("info", f"[SCHEDULER] Launching module '{name}'...")
            proc = multiprocessing.Process(target=target_func)
            proc.start()
            self._log(
                "info",
                f"[SCHEDULER] Process for '{name}' started: alive={proc.is_alive()}",
            )
            return proc
        except Exception as e:
            import traceback

            self._log(
                "error",
                f"[SCHEDULER] Failed to launch module '{name}': {e}",
                exc_info=True,
            )
            traceback.print_exc()
            return None

    def get_running(self):
        """Return dict of running module names -> process."""
        return self.running.copy()
