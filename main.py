import json
import sys
import os
from util.config import Config
from util.scheduler import check_schedule
from util.logger import setup_logger
from modules.bash_scripts import main as bash_script
from util.utility import *
from prettytable import PrettyTable
import importlib
import multiprocessing
import time
import datetime

# Set the script name
script_name = "main"
# Set the current time
current_time = datetime.datetime.now().strftime("%H:%M")

already_run = {}

list_of_python_scripts = [
    "border_replacerr",
    "health_checkarr",
    "labelarr",
    "nohl",
    "poster_cleanarr",
    "poster_renamerr",
    "queinatorr",
    "renameinatorr",
    "sync_gdrive",
    "upgradinatorr",
    "unmatched_assets",
]

list_of_bash_scripts = [
    "backup_folder",
    "backup_appdata",
    "backup_plex",
    "jduparr",
    "noHL",
]

branch = get_current_git_branch()

def run_module(module_name, logger):
    if module_name in list_of_python_scripts:
        try:
            module = importlib.import_module(f"modules.{module_name}")
            module.main()
        except ModuleNotFoundError:
            logger.error(f"Script: {module_name} does not exist")
            return
    elif module_name and any(script in module_name for script in list_of_bash_scripts):
        bash_script(module_name)
    else:
        logger.error(f"Script: {module_name} does not exist")

def load_config(logger):
    """
    Load the config file

    Args:
        logger (obj): The logger object

    Returns:
        config (obj): The config object
        schedule (dict): The schedule dictionary
        logger (obj): The logger object
    """

    # Load the config file
    config = Config(script_name)

    # Get log level from config
    log_level = config.log_level

    # Setup the logger
    logger = setup_logger(log_level, script_name)

    # Get the schedule from the config
    schedule = config.scheduler

    return config, schedule, logger

def main():
    """
    Main function
    """
    logger = None
    try:
        config, scripts_schedules, logger = load_config(logger)
        if len(sys.argv) > 1:
            logger.info(create_bar("START"))
            for input_name in sys.argv[1:]:
                if input_name and any(script in input_name for script in list_of_bash_scripts):
                    bash_script(input_name)
                elif input_name in list_of_python_scripts:
                    run_module(input_name, logger)
                elif input_name not in list_of_python_scripts or (input_name and not any(script in input_name for script in list_of_bash_scripts)):
                    logger.error(f"Script: {input_name} does not exist")
        else:
            # If config file is not found
            last_check = None
            initial_run = True
            running_scripts = {}
            while True:
                config, scripts_schedules, logger = load_config(logger)
                
                # Check for new version
                if last_check is None or last_check.date() < datetime.datetime.now().date():
                    logger.debug("Checking for new version...")
                    from util.version import version_check
                    version_check(logger, branch)
                    last_check = datetime.datetime.now()
                    next_check = (last_check + datetime.timedelta(days=1)).strftime("%A %I:%M %p")
                    logger.info(f"Next version check: {next_check}")

                # Print the start message on the first run
                if initial_run:
                    logger.info(create_bar("START"))

                    # Print the schedule
                    logger.info(create_bar("SCHEDULE"))
                    table = PrettyTable(["Script", "Schedule"])
                    table.align = "l"
                    table.padding_width = 1
                    table.add_row(["Script", "Schedule"])
                    for script_name, schedule_time in scripts_schedules.items():
                        if isinstance(schedule_time, dict):
                            for instance, schedule_time in schedule_time.items():
                                table.add_row([instance, schedule_time])
                        else:
                            table.add_row([script_name, schedule_time])
                    logger.info(f"{table}")
                    logger.info(create_bar("SCHEDULE"))
                    logger.info("Waiting for scheduled scripts...")
                    initial_run = False

                
                # Check for scheduled scripts
                for script_name, schedule_time in scripts_schedules.items():
                    # Check if the script is scheduled to run
                    if not schedule_time:
                        continue
                    
                    # Check if the script is a bash script
                    if script_name in config.bash_config:
                        from modules import bash_scripts
                        # Check if the script has instances
                        if isinstance(schedule_time, dict):
                            for instance, schedule_time in schedule_time.items():
                                
                                # Check if the instance is scheduled to run
                                if not schedule_time:
                                    continue

                                # Check if the instance is scheduled to run
                                if schedule_time != "run" and check_schedule(schedule_time) and script_name not in running_scripts:
                                    logger.debug(f"Running: {instance.capitalize()} Schedule: {schedule_time} started")
                                    process = multiprocessing.Process(target=bash_scripts.main, args=(script_name))
                                    running_scripts[script_name] = process  # Store the process in the dictionary
                                    logger.debug(f"Script: {script_name.capitalize()} ended")
                        else:

                            # Check if the script is scheduled to run
                            if schedule_time != "run" and check_schedule(schedule_time) and script_name not in running_scripts:
                                logger.debug(f"Running: {script_name.capitalize()} Schedule: {schedule_time} started")
                                process = multiprocessing.Process(target=bash_scripts.main, args=(script_name))
                                running_scripts[script_name] = process  # Store the process in the dictionary
                                logger.debug(f"Script: {script_name.capitalize()} ended")
                    else:

                        # Check if the script is scheduled to run
                        if schedule_time != "run" and check_schedule(schedule_time) and script_name not in running_scripts:
                            # Prevent duplicate processes
                            logger.debug(f"Python Script {script_name.capitalize()} Schedule: {schedule_time} started")
                            process = multiprocessing.Process(target=run_module, args=(script_name, logger))
                            process.start()
                            running_scripts[script_name] = process  # Store the process in the dictionary
                            logger.debug(f"{script_name.capitalize()} has been ended")

                        # Check if the script is scheduled to run
                        if schedule_time == "run" and not already_run.get(script_name, False) and script_name not in running_scripts:
                            logger.debug(f"Python Script {script_name.capitalize()} Schedule: {schedule_time} started")
                            process = multiprocessing.Process(target=run_module, args=(script_name, logger))
                            process.start()  # Start the process without joining
                            running_scripts[script_name] = process  # Store the process in the dictionary
                            already_run[script_name] = True
                            logger.debug(f"{script_name.capitalize()} has been ended")
                
                # Remove the from running_scripts if the process is done
                processes_to_remove = []
                for script_name, process in running_scripts.items():
                    if not process.is_alive():
                        processes_to_remove.append(script_name)

                for script_name in processes_to_remove:
                    logger.info(f"Script: {script_name.capitalize()} has finished")
                    del running_scripts[script_name]

                time.sleep(15)

        
    # If the script is interrupted
    except KeyboardInterrupt:
        print("Keyboard Interrupt detected. Exiting...")
        sys.exit()
    
    # If an error occurs
    except Exception:
        logger.error(f"\n\nAn error occurred:\n", exc_info=True)
        logger.error(f"\n\n")

    # If the script is stopped
    finally:
        logger.info(create_bar("END"))


if __name__ == '__main__':
    """
    Main function
    """
    main()
