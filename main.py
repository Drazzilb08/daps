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
    "backup_appdata",
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
    elif script_to_run and any(script in script_to_run for script in list_of_bash_scripts):
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
            if input_name and any(script in input_name for script in list_of_bash_scripts):
                run_module(input_name, None)
            elif input_name in list_of_python_scripts:
                run_module(input_name, None)
            elif input_name not in list_of_python_scripts or (input_name and not any(script in input_name for script in list_of_bash_scripts)):
                print(f"Script: {input_name} does not exist")
                return
    else:
        try:
            logger = setup_logger("info", "main")
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
                        if isinstance(schedule_time, dict):
                            for instance, schedule_time in schedule_time.items():
                                table.add_row([instance, schedule_time])
                        else:
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
                    if isinstance(schedule_time, dict):
                        for instance, instance_schedule_time in schedule_time.items():
                            script_name = instance
                            schedule_time = instance_schedule_time
                            
                            if script_name in running_scripts or not schedule_time:
                                continue

                            if (script_name in list_of_python_scripts or any(script in script_name for script in list_of_bash_scripts)) and (schedule_time == "run" and script_name not in already_run) or (schedule_time != "run" and check_schedule(script_name, schedule_time, logger)):
                                if schedule_time == "run":
                                    already_run[script_name] = True
                                process = run_module(script_name, logger)
                                running_scripts[script_name] = process
                    else:
                        if script_name in running_scripts or not schedule_time:
                            continue

                        if (script_name in list_of_python_scripts or any(script in script_name for script in list_of_bash_scripts)) and (schedule_time == "run" and script_name not in already_run) or (schedule_time != "run" and check_schedule(script_name, schedule_time, logger)):
                            if schedule_time == "run":
                                already_run[script_name] = True
                            process = run_module(script_name, logger)
                            running_scripts[script_name] = process

                # Remove the from running_scripts if the process is done
                processes_to_remove = []
                for script_name, process in running_scripts.items():
                    if process and not process.is_alive():
                        processes_to_remove.append(script_name)

                for script_name in processes_to_remove:
                    if script_name in processes_to_remove:
                        logger.info(f"Script: {script_name.capitalize()} has finished")
                        del running_scripts[script_name]
                    if script_name in already_run:
                        # Check script_schedule to see if it's set to run still 
                        if script_name in scripts_schedules:
                            schedule_time = scripts_schedules[script_name]
                            if isinstance(schedule_time, dict):
                                for instance, instance_schedule_time in schedule_time.items():
                                    if instance_schedule_time == "run":
                                        break
                                else:
                                    del already_run[script_name]
                            else:
                                if schedule_time != "run":
                                    del already_run[script_name]
                        else:
                            del already_run[script_name]
                        waiting_message_shown = False

                old_schedule = scripts_schedules
                time.sleep(60)
        
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
