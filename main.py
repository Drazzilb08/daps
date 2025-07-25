import argparse
import importlib
import json
import multiprocessing
import os
import sys
import time

from prettytable import PrettyTable
from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

from util.config import Config, manage_config
from util.logger import Logger
from util.notification import ErrorNotifyHandler
from util.scheduler import check_schedule
from util.utility import create_bar
from util.version import get_version, start_version_check

list_of_python_modules = [
    "border_replacerr",
    "health_checkarr",
    "labelarr",
    "nohl",
    "poster_cleanarr",
    "poster_renamerr",
    "renameinatorr",
    "sync_gdrive",
    "upgradinatorr",
    "unmatched_assets",
    "jduparr",
]


class ScheduleFileHandler(FileSystemEventHandler):
    def __init__(self, callback, debounce_interval=1):
        super().__init__()
        self.callback = callback
        self.last_modified = 0
        self.debounce_interval = debounce_interval

    def on_modified(self, event):
        sys.stderr.write(f"[WATCHDOG] Detected change in: {event.src_path}\n")
        if event.src_path.endswith("config.yml"):
            now = time.time()
            if now - self.last_modified > self.debounce_interval:
                self.last_modified = now
                self.callback()


def start_schedule_watcher(callback):
    observer = Observer()
    observer.daemon = True
    handler = ScheduleFileHandler(callback)
    # Determine config directory and ensure it exists
    config_path = os.environ.get("CONFIG_DIR", "./config")
    if not os.path.isdir(config_path):
        os.makedirs(config_path, exist_ok=True)
    observer.schedule(handler, path=config_path, recursive=False)
    observer.start()
    return observer


class ModuleManager:
    def __init__(self, logger):
        self.running_modules = {}
        self.module_start_times = {}
        self.logger = logger
        self.last_run_times = {}

    def run(self, module_name, run_module):
        process = run_module(module_name, self.logger)
        if process:
            self.running_modules[module_name] = process
            self.module_start_times[module_name] = time.time()

    def run_if_due(self, module_name, schedule_time, check_schedule_func, run_module):
        if check_schedule_func(module_name, schedule_time, self.logger):
            import time

            now = time.time()
            last_run = self.last_run_times.get(module_name, 0)
            # Prevent multiple runs within the same schedule window (60 seconds)
            if now - last_run >= 60:
                self.logger.info(
                    f"[SCHEDULE] Running module: {module_name} at {schedule_time}"
                )
                self.last_run_times[module_name] = now
                self.run(module_name, run_module)

    def is_already_running(self, module_name):
        return module_name in self.running_modules

    def cleanup(self):
        processes_to_remove = []
        for module_name, process in self.running_modules.items():
            if process and not process.is_alive():
                duration = time.time() - self.module_start_times.pop(module_name)
                self.logger.info(
                    f"[SCHEDULE] module: {module_name.upper()} has finished in {duration:.2f} seconds"
                )
                processes_to_remove.append(module_name)

        for module_name in processes_to_remove:
            del self.running_modules[module_name]

    def has_running_modules(self):
        return bool(self.running_modules)


def load_schedule():
    # Do not merge defaults here; only read existing config
    config = Config("main")
    schedule = config.scheduler
    return schedule


def run_module(module_to_run, output=False, logger=None):
    config = Config(module_to_run).module_config

    def run_python_module(module_to_run):
        config.instances_config = Config(module_to_run).instances_config
        module = importlib.import_module(f"modules.{module_to_run}")
        process = multiprocessing.Process(target=module.main, args=(config,))
        process.start()
        return process

    if module_to_run in list_of_python_modules:
        return run_python_module(module_to_run)


def print_schedule(logger, modules_schedules):
    logger.info(create_bar("SCHEDULE"))
    table = PrettyTable(["module", "Schedule"])
    table.align = "l"
    table.padding_width = 1
    for module_name, schedule_time in modules_schedules.items():
        table.add_row([module_name, schedule_time])
    logger.info(f"{table}")
    logger.info(create_bar("SCHEDULE"))


def main():
    # CLI argument parsing
    parser = argparse.ArgumentParser(description="Run DAPS modules or start web UI.")
    parser.add_argument(
        "modules", nargs="*", help="Module names to run once (cli mode)."
    )
    parser.add_argument(
        "--version",
        action="version",
        version=f"%(prog)s {get_version()}",
        help="Show the DAPS version and exit.",
    )

    args = parser.parse_args()

    # Set console logging: modules only when explicitly requested via CLI,
    if args.modules:
        os.environ["LOG_TO_CONSOLE"] = "true"
    else:
        os.environ["LOG_TO_CONSOLE"] = "false"

    if args.modules:
        # CLI mode: run specified modules and exit
        for name in args.modules:
            if name in list_of_python_modules:
                run_module(name, output=True)
            else:
                print(f"Error: module '{name}' not found.")
                sys.exit(1)
        return

    try:
        main_config = Config("main").module_config
    except Exception as e:
        print(f"Error loading main config for logger: {e}")
        sys.exit(1)
    logger = Logger(main_config.log_level, "main")

    main_logger = logger._logger if hasattr(logger, "_logger") else logger
    error_notify_handler = ErrorNotifyHandler(
        main_config, module_name="main", logger=main_logger
    )
    main_logger.addHandler(error_notify_handler)

    manage_config(logger)
    # Web mode: no modules passed
    initial_run = True
    waiting_message_shown = False

    # Load main config once and reuse for scheduling reloads
    main_cfg = Config("main")

    def on_schedule_change():
        try:
            main_cfg.load_config()
            new_schedule = main_cfg.scheduler
        except Exception as e:
            logger.error(f"[MAIN] Error reloading config: {e}", exc_info=True)
            return
        nonlocal current_schedule
        if new_schedule != current_schedule:
            current_schedule = new_schedule
            schedule_changed.set()

    try:
        current_schedule = main_cfg.scheduler
    except Exception as e:
        logger.error(f"Error loading schedule: {e}", exc_info=True)
        sys.exit(1)
    if not isinstance(current_schedule, dict):
        print(f"❌ Schedule is not a dictionary: {current_schedule}")
        sys.exit(1)

    import atexit
    import threading

    schedule_changed = threading.Event()
    observer = start_schedule_watcher(on_schedule_change)
    atexit.register(observer.stop)
    # Give the observer up to 2 seconds to finish
    atexit.register(lambda: observer.join(timeout=2))
    try:
        from web.server import start_web_server

        if main_config.update_notifications:
            start_version_check(main_config, logger, interval=3600)
        start_web_server(logger)

        manager = ModuleManager(logger)
        # Expose the ModuleManager to the web server for status/cancel of scheduled tasks
        import web.server

        web.server.app.state.manager = manager

        while True:
            if initial_run or schedule_changed.is_set():
                print_schedule(logger, current_schedule)
                logger.debug(
                    f"📋 Current schedule contents:\n{json.dumps(current_schedule, indent=4)}"
                )
                schedule_changed.clear()
                initial_run = False
                waiting_message_shown = False

            if not waiting_message_shown:
                logger.info("[SCHEDULE] Waiting for scheduled modules...")
                waiting_message_shown = True

            for module_name, schedule_time in current_schedule.items():

                if manager.is_already_running(module_name) or not schedule_time:
                    continue

                if module_name in list_of_python_modules:
                    manager.run_if_due(
                        module_name, schedule_time, check_schedule, run_module
                    )

            manager.cleanup()

            time.sleep(5)

    except KeyboardInterrupt:
        logger.info("Keyboard Interrupt detected. Shutting DAPS down...")
        sys.exit()

    except Exception:
        logger.error("\n\nAn error occurred:\n", exc_info=True)


if __name__ == "__main__":
    main()
