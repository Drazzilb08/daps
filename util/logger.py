import os
import time
import logging
import pathlib
from logging.handlers import RotatingFileHandler

def setup_logger(log_level, script_name, max_logs=9):
    """
    Setup the logger.
    
    Parameters:
        log_level (str): The log level to use
        script_name (str): The name of the script
        max_logs (int): Maximum number of log files to keep
    
    Returns:
        A logger object for logging messages.
    """

    if os.environ.get('DOCKER_ENV'):
        config_dir = os.getenv('CONFIG_DIR', '/config')
        log_dir = f"{config_dir}/logs/{script_name}"
    else:
        log_dir = f"{os.path.join(pathlib.Path(__file__).parents[1], 'logs', script_name)}"

    if log_level not in ['debug', 'info', 'critical']:
        log_level = 'info'
        print(f"Invalid log level '{log_level}', defaulting to 'info'")
    
    # Create the log directory if it doesn't exist
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    # Get today's date for log file naming
    today = time.strftime("%Y-%m-%d")
    
    # Define the log file path with the current date
    log_file = f"{log_dir}/{script_name}.log"
    
    # Check if log file already exists
    if os.path.isfile(log_file):
        # Rename existing log files and rotate logs
        for i in range(max_logs - 1, 0, -1):
            old_log = f"{log_dir}/{script_name}.log.{i}"
            new_log = f"{log_dir}/{script_name}.log.{i + 1}"
            if os.path.exists(old_log):
                os.rename(old_log, new_log)
        os.rename(log_file, f"{log_dir}/{script_name}.log.1")
    
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
    formatter = logging.Formatter(fmt='%(asctime)s %(levelname)s: %(message)s', datefmt='%I:%M %p')
    
    # Create a RotatingFileHandler for log files
    handler = RotatingFileHandler(log_file, delay=True, mode="w", backupCount=max_logs)
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
    
    return logger
