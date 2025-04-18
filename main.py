import time
import datetime
import multiprocessing
import importlib
import sys
from prettytable import PrettyTable
from util.config import Config
from util.scheduler import check_schedule
from util.logger import setup_logger
from util.utility import *
from util.version import version_check
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import threading


list_of_python_scripts = [
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
]

list_of_bash_scripts = [
    "jduparr",
    "nohl_bash",
]


class ScheduleFileHandler(FileSystemEventHandler):
    def __init__(self, callback, debounce_interval=1):
        super().__init__()
        self.callback = callback
        self.last_modified = 0
        self.debounce_interval = debounce_interval

    def on_modified(self, event):
        if event.src_path.endswith("config.yml"):
            now = time.time()
            if now - self.last_modified > self.debounce_interval:
                self.last_modified = now
                self.callback()

def start_schedule_watcher(callback):
    observer = Observer()
    handler = ScheduleFileHandler(callback)
    observer.schedule(handler, path="config", recursive=False)
    observer.start()
    return observer

class ScriptManager:
    def __init__(self, logger):
        self.already_run = {}
        self.running_scripts = {}
        self.script_start_times = {}
        self.logger = logger

    def run(self, script_name, run_module):
        process = run_module(script_name, self.logger)
        if process:
            self.running_scripts[script_name] = process
            self.script_start_times[script_name] = time.time()
            self.logger.debug(f"Setting already_run[{script_name}] to True")
            self.already_run[script_name] = True

    def run_if_due(self, script_name, schedule_time, check_schedule_func, run_module):
        if schedule_time == "run":
            if not self.already_run.get(script_name, False):
                self.run(script_name, run_module)
                self.already_run[script_name] = True
        elif check_schedule_func(script_name, schedule_time, self.logger):
            self.run(script_name, run_module)

    def is_already_running(self, script_name):
        return script_name in self.running_scripts

    def cleanup(self):
        processes_to_remove = []
        for script_name, process in self.running_scripts.items():
            if process and not process.is_alive():
                duration = time.time() - self.script_start_times.pop(script_name)
                self.logger.info(f"Script: {script_name.upper()} has finished in {duration:.2f} seconds")
                processes_to_remove.append(script_name)

        for script_name in processes_to_remove:
            del self.running_scripts[script_name]

    def reset_flags(self, script_name):
        if script_name in self.already_run:
            if self.already_run[script_name]:
                self.logger.debug(f"Script: {script_name} has already run setting already_run[{script_name}] to False")
            self.already_run[script_name] = False

    def has_running_scripts(self):
        return bool(self.running_scripts)


def load_schedule():
    config = Config("main")
    schedule = config.scheduler
    return schedule

def run_module(script_to_run, logger):
    def run_python_module(script_to_run):
        config = Config(script_to_run)
        module = importlib.import_module(f"modules.{script_to_run}")
        process = multiprocessing.Process(target=module.main, args=(config,))
        process.start()
        return process

    def run_bash_module(script_to_run):
        config = Config("bash_scripts")
        module = importlib.import_module("modules.bash_scripts")
        process = multiprocessing.Process(target=module.main, args=(script_to_run, config))
        process.start()
        return process

    if script_to_run in list_of_python_scripts:
        return run_python_module(script_to_run)
    elif script_to_run in list_of_bash_scripts:
        return run_bash_module(script_to_run)
    else:
        if logger:
            logger.error(f"Script: {script_to_run} not found in known script lists.")
        return None

def print_schedule(logger, scripts_schedules):
    logger.info(create_bar("SCHEDULE"))
    table = PrettyTable(["Script", "Schedule"])
    table.align = "l"
    table.padding_width = 1
    for script_name, schedule_time in scripts_schedules.items():
        table.add_row([script_name, schedule_time])
    logger.info(f"{table}")
    logger.info(create_bar("SCHEDULE"))

def should_check_version(last_check):
    return last_check is None or last_check.date() < datetime.datetime.now().date()


def main():
    initial_run = True
    last_check = None
    waiting_message_shown = False

    # Start schedule watcher
    current_schedule = load_schedule()
    schedule_changed = threading.Event()

    def on_schedule_change():
        new_schedule = load_schedule()
        nonlocal current_schedule
        if new_schedule != current_schedule:
            current_schedule = new_schedule
            schedule_changed.set()
    observer = start_schedule_watcher(on_schedule_change)

    if "--help" in sys.argv:
        print("Usage: python main.py [script_name ...]")
        sys.exit()

    if len(sys.argv) > 1:
        for input_name in sys.argv[1:]:
            if input_name in list_of_bash_scripts or input_name in list_of_python_scripts:
                run_module(input_name, None)
            else:
                print(f"Script: {input_name} does not exist")
                return
    else:
        try:
            main_config = Config("main")
            log_level = main_config.log_level
            logger = setup_logger(log_level, "main")
            logger.info("Starting the script...")
            manager = ScriptManager(logger)

            branch = get_current_git_branch()

            while True:
                if should_check_version(last_check):
                    version_check(logger, branch)
                    last_check = datetime.datetime.now()
                    next_check = (last_check + datetime.timedelta(days=1)).strftime("%A %I:%M %p")
                    logger.info(f"Next version check: {next_check}")

                if initial_run or schedule_changed.is_set():
                    if initial_run:
                        logger.info(create_bar("START"))
                    for script in current_schedule:
                        manager.reset_flags(script)
                    print_schedule(logger, current_schedule)
                    schedule_changed.clear()
                    initial_run = False
                    waiting_message_shown = False

                if not waiting_message_shown:
                    logger.info("Waiting for scheduled scripts...")
                    waiting_message_shown = True

                for script_name, schedule_time in current_schedule.items():
                    manager.reset_flags(script_name)
 
                    if manager.is_already_running(script_name) or not schedule_time:
                        continue
 
                    if script_name in list_of_python_scripts or script_name in list_of_bash_scripts:
                        manager.run_if_due(script_name, schedule_time, check_schedule, run_module)
                    elif not manager.is_already_running(script_name) and schedule_time:
                        logger.debug(f"Skipping script: {script_name}, reason: {schedule_time}")
                    else:
                        logger.debug(f"Skipping script: {script_name}, reason: {schedule_time} (unknown script)")

                manager.cleanup()

                
                time.sleep(5)

        except KeyboardInterrupt:
            logger.info("Keyboard Interrupt detected. Exiting...")
            sys.exit()

        except Exception:
            logger.error(f"\n\nAn error occurred:\n", exc_info=True)

        finally:
            logger.info(create_bar("END"))

if __name__ == '__main__':
    main()
