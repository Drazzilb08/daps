import logging
import os
import time
from logging.handlers import TimedRotatingFileHandler
import pathlib


base_dir = pathlib.Path(__file__).parent.parent


class Logger:
    def __init__(self, log_level, log_name):
        """
        :param log_level: The log level to use (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        :param log_name: The name of the log file (without extension)
        """
        self.log_level = log_level.upper()
        self.log_name = log_name
        self.log_dir = f'{base_dir}/logs'
        self.log_file = self._generate_log_file_name()

        self._create_log_dir()
        self._setup_logger()

    def log(self, level, message):
        """
        Log a message to the log file and console
        
        :param level: The log level to use (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        :param message: The message to log
        """
        logger = logging.getLogger(self.log_name)
        logger.log(level, message)

    def info(self, message):
        """
        Log a message with level INFO to the log file and console

        :param message: The message to log
        """
        self.log(logging.INFO, message)

    def debug(self, message):
        """
        Log a message with level DEBUG to the log file and console

        :param message: The message to log
        """
        self.log(logging.DEBUG, message)

    def warning(self, message):
        """
        Log a message with level WARNING to the log file and console
        
        :param message: The message to log
        """
        self.log(logging.WARNING, message)

    def error(self, message):
        """
        Log a message with level ERROR to the log file and console
        
        :param message: The message to log
        """
        self.log(logging.ERROR, message)

    def critical(self, message):
        """
        Log a message with level CRITICAL to the log file and console
        
        :param message: The message to log
        """
        self.log(logging.CRITICAL, message)

    def _generate_log_file_name(self):
        """
        Generate the log file name based on the log name and the current date
        
        :return: The log file name
        """
        today = time.strftime('%Y-%m-%d')
        return os.path.join(self.log_dir, f'{self.log_name}_{today}.log')

    def _create_log_dir(self):
        """
        Create the log directory if it does not exist
        """
        if not os.path.exists(self.log_dir):
            os.makedirs(self.log_dir)

    def _setup_logger(self):
        """
        Setup the logger
        """
        logger = logging.getLogger(self.log_name)
        logger.setLevel(self._get_log_level())
        formatter = logging.Formatter(fmt='%(asctime)s %(levelname)s: %(message)s', datefmt='%I:%M %p')
        handler = TimedRotatingFileHandler(self.log_file, when='midnight', interval=1, backupCount=3)
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        console_formatter = logging.Formatter(fmt='%(message)s')
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(console_formatter)
        logger.addHandler(console_handler)

    def _get_log_level(self):
        """
        Get the log level based on the log level string
        """
        if self.log_level == 'DEBUG':
            return logging.DEBUG
        elif self.log_level == 'CRITICAL':
            return logging.CRITICAL
        else:
            return logging.INFO