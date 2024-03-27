import json
import sys
import os
from util.config import Config
from util.scheduler import check_schedule
from util.logger import setup_logger
from util.utility import *
from prettytable import PrettyTable
import importlib
import multiprocessing
import time
import datetime

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
    "jduparr",
    "nohl_bash",
]

ran_modules = {}

branch = get_current_git_branch()

def get_logger(config, script_name):
    """
    Get the logger for the script

    Args:
        log_level (str): The log level to use
        script_name (str): The name of the script
        config (dict): The config file

    Returns:
        logger: The logger for the script
    """
    # Get loglevel from script config
    log_level = config.log_level
    logger = setup_logger(log_level, script_name)

    return logger

def get_config(script_to_run):
    """
    Get the config for the script

    Args:
        script_name (str): The name of the script

    Returns:
        dict: The config for the script
    """

    # Load the config file
    config = Config(script_to_run)

    return config

def run_module(script_to_run, logger):
    process = None
    if script_to_run in list_of_python_scripts:
        try:
            config = get_config(script_to_run)
            module = importlib.import_module(f"modules.{script_to_run}")
            process = multiprocessing.Process(target=module.main, args=(config,))
            if process:
                if script_to_run == "poster_renamerr":
                    config = Config(script_to_run)
                    script_config = config.script_config
                    sync_posters = script_config.get("sync_posters", False)
                    border_replacerr = script_config.get("border_replacerr", False)
                    posters = ", also running gdrive_sync" if sync_posters else ""
                    border = ", also running border_replacerr" if border_replacerr else ""
                    additional_scripts = f"{posters}{border}"
                    if logger: logger.info(f"Running script: {script_to_run}{additional_scripts}.")
                    else: print(f"Running script: {script_to_run}{additional_scripts}.")
                else:
                    if logger: logger.info(f"Running script: {script_to_run}.")
                    else: print(f"Running script: {script_to_run}.")
                process.start()
                return process
        except ModuleNotFoundError:
            if logger: logger.error(f"Script: {script_to_run} does not exist")
            else: print(f"Script: {script_to_run} does not exist")
            return
        except Exception as e:
            if logger: logger.error(f"An error occurred while running the script: {script_to_run}.", exc_info=True)
            else: print(f"An error occurred while running the script: {script_to_run}.\n{e}")
            return
    elif script_to_run in list_of_bash_scripts:
        module = "bash_scripts"
        try:
            config = get_config(module)
            module = importlib.import_module(f"modules.{module}")
            process = multiprocessing.Process(target=module.main, args=(script_to_run, config))
            if process:
                if logger: logger.info(f"Running script: {script_to_run}")
                else: print(f"Running script: {script_to_run}")
                process.start()
                return process
        except ModuleNotFoundError:
            if logger: logger.error(f"Script: {script_to_run} does not exist in the list of bash scripts.")
            else: print(f"Script: {script_to_run} does not exist in the list of bash scripts.")
            return
        except Exception as e:
            if logger: logger.error(f"An error occurred while running the script: {script_to_run}.", exc_info=True)
            else: print(f"An error occurred while running the script: {script_to_run}.\n{e}")
            return
    else:
        if logger: logger.error(f"Script: {script_to_run} does not exist in either bash or python scripts")
        else: print(f"Script: {script_to_run} does not exist in either bash or python scripts")
        return

def load_schedule():
    """
    Load the schedule from the config file

    Returns:
        dict: The schedule from the config file
    """

    # Load the config file
    config = Config("main")

    # Get the schedule from the config
    schedule = config.scheduler

    return schedule


def main():
    """
    Main function
    """
    # Set the script name

    initial_run = True
    last_check = None
    old_schedule = None
    running_scripts = {}
    waiting_message_shown = False
    scripts_schedules=load_schedule()
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
            # If config file is not found
            while True:
                scripts_schedules= load_schedule()
                
                # Check for new version
                if last_check is None or last_check.date() < datetime.datetime.now().date():
                    from util.version import version_check
                    version_check(logger, branch)
                    last_check = datetime.datetime.now()
                    next_check = (last_check + datetime.timedelta(days=1)).strftime("%A %I:%M %p")
                    logger.info(f"Next version check: {next_check}")
                # Print the start message on the first run
                if initial_run or old_schedule != scripts_schedules:
                    if initial_run:
                        logger.info(create_bar("START"))

                    # Print the schedule
                    logger.info(create_bar("SCHEDULE"))
                    table = PrettyTable(["Script", "Schedule"])
                    table.align = "l"
                    table.padding_width = 1
                    for script_name, schedule_time in scripts_schedules.items():
                        table.add_row([script_name, schedule_time])
                    logger.info(f"{table}")
                    logger.info(create_bar("SCHEDULE"))
                    initial_run = False
                    waiting_message_shown = False

                if not waiting_message_shown:
                    logger.info("Waiting for scheduled scripts...")
                    waiting_message_shown = True
                
                # Check for scheduled scripts
                for script_name, schedule_time in scripts_schedules.items():

                    # Check if script_name is in already_run or not
                    if script_name in already_run and schedule_time != "run" and already_run[script_name]:
                        logger.debug(f"Script: {script_name} has already run setting already_run[{script_name}] to False")
                        already_run[script_name] = False
                    elif script_name in already_run and schedule_time == "run" and already_run[script_name]:
                        logger.debug(f"Script is still set to run: {script_name}")
                    
                    if script_name in running_scripts or not schedule_time:
                        continue

                    if script_name in list_of_python_scripts or script_name in list_of_bash_scripts:
                        if schedule_time == "run" and (script_name not in already_run or not already_run[script_name]):
                            process = run_module(script_name, logger)
                            running_scripts[script_name] = process
                            logger.debug(f"Setting already_run[{script_name}] to True")
                            already_run[script_name] = True
                        elif schedule_time != "run" and check_schedule(script_name, schedule_time, logger):
                            process = run_module(script_name, logger)
                            running_scripts[script_name] = process

                # Remove the from running_scripts if the process is done
                processes_to_remove = []
                for script_name, process in running_scripts.items():
                    if process and not process.is_alive():
                        processes_to_remove.append(script_name)
                logger.debug(f"already_run:\n{json.dumps(already_run, indent=4)}")
                for script_name in processes_to_remove:
                    logger.info(f"Script: {script_name.upper()} has finished")
                    if script_name in running_scripts:
                        del running_scripts[script_name]
                        waiting_message_shown = False

                old_schedule = scripts_schedules
                time.sleep(30)
        
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
