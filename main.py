import json
import sys
from util.config import Config
from util.scheduler import scheduler
from util.logger import setup_logger
import importlib
import multiprocessing
import time
import datetime

script_name = "main"

config = Config(script_name)
log_level = config.log_level
logger = setup_logger(log_level, script_name)
schedule = config.scheduler
current_time = datetime.datetime.now().strftime("%H:%M")
last_check = None

already_run = {
    "border_replacerr": False,
    "labelarr": False,
    "nohl": False,
    "poster_cleanarr": False,
    "poster_renamerr": False,
    "queinatorr": False,
    "renaminatorr": False,
    "upgradinatorr": False,
    "backup_folder": False,
    "gdrive": False,
    "backup_plex": False,
    "backup_appdata": False,
}


def run_module(module_name):
    """
    Run a module
    
    Args:
        module_name (str): The name of the module to run
        
    Returns:
        None
    """

    # Import the module
    module = importlib.import_module(f"modules.{module_name}")
    # Run the module
    module.main()

def run_bash_script(script_name):
    """
    Run a bash script
    
    Args:
        script_name (str): The name of the bash script to run
        
    Returns:
        None
    """
    bash_configs = config.bash_config
    if script_name in bash_configs:
        from modules import bash_scripts
        script_settings = bash_configs.get(script_name, {})
        bash_scripts.main(script_settings, script_name)

def main():
    while True:
        processes = []
        if last_check is None or last_check.date() < datetime.datetime.now().date():
            logger.debug("Checking for new version...")
            from util.version import version_check
            version_check(logger, config)
            last_check = datetime.datetime.now()
            next_check = (last_check + datetime.timedelta(days=1)).strftime("%A %I:%M %p")
            logger.info(f"Next version check: {next_check}")
        for script_name, schedule_time in schedule.items():
            if not schedule_time:
                continue
            if script_name in config.bash_config:
                from modules import bash_scripts
                script_settings = config.bash_config.get(script_name, {})
                if isinstance(schedule_time, dict):
                    for instance, schedule_time in schedule_time.items():
                        if not schedule_time:
                            continue
                        if schedule_time != "run" and schedule:
                            sub_script_settings = script_settings.get(instance, {})
                            logger.debug(f"Running: {instance.capitalize()} Schedule: {schedule_time} started")
                            logger.debug(json.dumps(script_settings, indent=4))
                            process = multiprocessing.Process(target=bash_scripts.main, args=(sub_script_settings, script_name))
                            process.startscript_settings, script_name  # Start the process without joining
                            processes.append(process)
                            logger.debug(f"Script: {script_name.capitalize()} ended")
                else:
                    if schedule_time != "run" and scheduler(schedule_time, logger=logger):
                        logger.debug(f"Running: {script_name.capitalize()} Schedule: {schedule_time} started")
                        logger.debug(json.dumps(script_settings, indent=4))
                        process = multiprocessing.Process(target=bash_scripts.main, args=(script_settings, script_name))
                        process.startscript_settings, script_name  # Start the process without joining
                        processes.append(process)
                        logger.debug(f"Script: {script_name.capitalize()} ended")
            else:
                if schedule_time != "run" and scheduler(schedule_time, logger=logger):
                    logger.debug(f"Python Script {script_name.capitalize()} Schedule: {schedule_time} started")
                    process = multiprocessing.Process(target=run_module, args=(script_name,))
                    process.start()   # Start the process without joining
                    if process:
                        processes.append(process)
                    logger.debug(f"{script_name.capitalize()} has been ended")
                if schedule_time == "run" and not already_run.get(script_name, False):
                    logger.debug(f"Python Script {script_name.capitalize()} Schedule: {schedule_time} started")
                    process = multiprocessing.Process(target=run_module, args=(script_name,))
                    process.start()  # Start the process without joining
                    if process:  # Only add the process to the list if it was created
                        processes.append(process)
                    already_run[script_name] = True
                    logger.debug(f"{script_name.capitalize()} has been ended")
        if not processes:  # Check if there are no running processes
            print("Sleeping...")
        time.sleep(60)  # Check for scheduled scripts every 60 seconds


if __name__ == '__main__':
    """
    Main function
    """
    # If arguments are passed to the script, run the script with those arguments
    if len(sys.argv) > 1:
        for script_name in sys.argv[1:]:
            if script_name not in config.bash_config:
                run_module(script_name)
            elif script_name in config.bash_config or script_name in config.bash_config.values():
                if script_name in config.bash_config:
                    run_bash_script(script_name)
                else:
                    for key, value in config.bash_config.items():
                        if script_name == value:
                            run_bash_script(value)
                run_bash_script(script_name)
    else:
        main()
