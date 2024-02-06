import json
import sys
import os
from util.config import Config
from util.scheduler import scheduler
from util.logger import setup_logger, remove_logger
from modules.bash_scripts import main as bash_script
import importlib
import multiprocessing
import time
import datetime

# Set the script name
script_name = "main"
# Set the current time
current_time = datetime.datetime.now().strftime("%H:%M")

already_run = {
    "border_replacerr": False,
    "labelarr": False,
    "nohl": False,
    "poster_cleanarr": False,
    "poster_renamerr": False,
    "queinatorr": False,
    "renameinatorr": False,
    "upgradinatorr": False,
    "backup_folder": False,
    "gdrive": False,
    "backup_plex": False,
    "backup_appdata": False,
}

python_scripts = [
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



def run_module(module_name, logger):
    """
    Run a module
    
    Args:
        module_name (str): The name of the module to run
        
    Returns:
        None
    """

    # Import the module
    try:
        module = importlib.import_module(f"modules.{module_name}")
    except ModuleNotFoundError:
        logger.error(f"Script: {module_name} does not exist")
        return
    # Run the module
    module.main()

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

    # Remove the logger if it exists
    if logger:
        remove_logger(logger)

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
    config, schedule, logger = load_config(logger)
    if len(sys.argv) > 1:
        for input_name in sys.argv[1:]:
            if input_name in config.bash_config:
                settings = config.bash_config.get(input_name, {})
                bash_script(settings, input_name)
            elif input_name not in config.bash_config:
                if input_name in python_scripts:
                    print(f"Running: {input_name}")
                    run_module(input_name, logger)
                for script_name, script_value in config.bash_config.items():
                    if isinstance(script_value, dict):
                        for instance, instance_value in script_value.items():
                            if input_name == instance:
                                settings = config.bash_config.get(script_name, {}).get(instance, {})
                                bash_script(settings, script_name)
            if input_name not in config.bash_config and input_name not in python_scripts:
                logger.error(f"Script: {input_name} does not exist")
    else:
        # If config file is not found
        try:
            last_check = None
            initial_run = True
            count = 0
            while True:
                config, schedule, logger = load_config(logger)
                
                # Print the start message on the first run
                if initial_run:
                    logger.info(f"\n{'*' * 40} START {'*' * 40}\n")
                    initial_run = False

                # Check for new version
                processes = []
                if last_check is None or last_check.date() < datetime.datetime.now().date():
                    logger.debug("Checking for new version...")
                    from util.version import version_check
                    version_check(logger)
                    last_check = datetime.datetime.now()
                    next_check = (last_check + datetime.timedelta(days=1)).strftime("%A %I:%M %p")
                    logger.info(f"Next version check: {next_check}")
                
                # Check for scheduled scripts
                for script_name, schedule_time in schedule.items():
                    # Check if the script is scheduled to run
                    if not schedule_time:
                        continue
                    
                    # Check if the script is a bash script
                    if script_name in config.bash_config:
                        from modules import bash_scripts
                        script_settings = config.bash_config.get(script_name, {})

                        # Check if the script has instances
                        if isinstance(schedule_time, dict):
                            for instance, schedule_time in schedule_time.items():
                                
                                # Check if the instance is scheduled to run
                                if not schedule_time:
                                    continue

                                # Check if the instance is scheduled to run
                                if schedule_time != "run" and schedule:
                                    sub_script_settings = script_settings.get(instance, {})
                                    logger.debug(f"Running: {instance.capitalize()} Schedule: {schedule_time} started")
                                    logger.debug(json.dumps(script_settings, indent=4))
                                    process = multiprocessing.Process(target=bash_scripts.main, args=(sub_script_settings, script_name))
                                    process.startscript_settings, script_name  # Start the process without joining
                                    processes.append(process)
                                    logger.debug(f"Script: {script_name.capitalize()} ended")
                        else:

                            # Check if the script is scheduled to run
                            if schedule_time != "run" and scheduler(schedule_time, logger=logger):
                                logger.debug(f"Running: {script_name.capitalize()} Schedule: {schedule_time} started")
                                logger.debug(json.dumps(script_settings, indent=4))
                                process = multiprocessing.Process(target=bash_scripts.main, args=(script_settings, script_name))
                                process.startscript_settings, script_name  # Start the process without joining
                                processes.append(process)
                                logger.debug(f"Script: {script_name.capitalize()} ended")
                    else:

                        # Check if the script is scheduled to run
                        if schedule_time != "run" and scheduler(schedule_time, logger=logger):
                            logger.debug(f"Python Script {script_name.capitalize()} Schedule: {schedule_time} started")
                            process = multiprocessing.Process(target=run_module, args=(script_name, logger))
                            process.start()   # Start the process without joining

                            # Only add the process to the list if it was created
                            if process:
                                processes.append(process)
                            logger.debug(f"{script_name.capitalize()} has been ended")

                        # Check if the script is scheduled to run
                        if schedule_time == "run" and not already_run.get(script_name, False):
                            logger.debug(f"Python Script {script_name.capitalize()} Schedule: {schedule_time} started")
                            process = multiprocessing.Process(target=run_module, args=(script_name, logger))
                            process.start()  # Start the process without joining

                            # Only add the process to the list if it was created
                            if process:  # Only add the process to the list if it was created
                                processes.append(process)
                            already_run[script_name] = True
                            logger.debug(f"{script_name.capitalize()} has been ended")
                
                # If processes are not running
                if not processes:
                    if count % 10 == 0:
                        logger.info(f"Sleeping... I'll check again later...")
                    count += 1
                time.sleep(60)  # Check for scheduled scripts every 60 seconds
        
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
            logger.info(f"\n{'*' * 40} END {'*' * 40}\n")


if __name__ == '__main__':
    """
    Main function
    """
    main()
