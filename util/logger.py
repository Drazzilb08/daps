import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path

from util.constants import DOCKER_ENV
from util.hoorn_lib_common.log_rotator import LogRotator
from util.utility import create_bar
from util.version import get_version


def setup_logger(log_level, script_name, max_logs=10):
    """
    Setup the logger.
    
    Parameters:
        log_level (str): The log level to use
        script_name (str): The name of the script
        max_logs (int): Maximum number of log files to keep
    
    Returns:
        A logger object for logging messages.
    """

    if DOCKER_ENV:
        config_dir = os.getenv('CONFIG_DIR', '/config')
        log_dir: str = f"{config_dir}/logs/{script_name}"
    else:
        log_dir = f"{os.path.join(Path(__file__).parents[1], 'logs', script_name)}"

    if log_level not in ['debug', 'info', 'critical']:
        log_level = 'info'
        print(f"Invalid log level '{log_level}', defaulting to 'info'")
    
    # Create the log directory if it doesn't exist
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)

    rotator: LogRotator = LogRotator(log_directory=Path(log_dir), max_logs_to_keep=max_logs, create_directory=True)
    rotator.increment_logs()
    log_file = rotator.get_log_file()
    
    # Create a logger object with the script name
    logger = logging.getLogger(script_name)
    logger.propagate = False 
    
    # Set the log level based on the provided parameter
    log_level = log_level.upper()
    if log_level == 'DEBUG':
        logger.setLevel(logging.DEBUG)
    elif log_level == 'INFO':
        logger.setLevel(logging.INFO)
    elif log_level == 'CRITICAL':
        logger.setLevel(logging.CRITICAL)
    else:
        logger.critical(f"Invalid log level '{log_level}', defaulting to 'INFO'")
        logger.setLevel(logging.INFO)
    
    # Define the log message format
    formatter = logging.Formatter(fmt='%(asctime)s %(levelname)s: %(message)s', datefmt='%m/%d/%y %I:%M %p')
    
    # Create a RotatingFileHandler for log files
    handler = RotatingFileHandler(log_file, delay=True, mode="w", backupCount=max_logs)
    handler.encoding = "utf-8"
    handler.setFormatter(formatter)
    
    # Add the file handler to the logger
    logger.addHandler(handler)

    # Configure console logging with the specified log level
    console_handler = logging.StreamHandler()
    if log_level == 'DEBUG':
        console_handler.setLevel(logging.DEBUG)
    elif log_level == 'INFO':
        console_handler.setLevel(logging.INFO)
    elif log_level == 'CRITICAL':
        console_handler.setLevel(logging.CRITICAL)
    
    # Add the console handler to the logger
    logger.addHandler(console_handler)

    # Overwrite previous logger if exists
    logging.getLogger(script_name).handlers.clear()
    logging.getLogger(script_name).addHandler(handler)
    logging.getLogger(script_name).addHandler(console_handler)

    # Insert version number at the head of every log file   
    version = get_version()
    name = script_name.replace("_", " ").upper()
    logger.info(create_bar(f"{name} Version: {version}"))


    return logger
