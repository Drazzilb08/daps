import logging
import os
import time
from logging.handlers import TimedRotatingFileHandler
import pathlib


base_dir = pathlib.Path(__file__).parent.parent


class Logger:
    def __init__(self, log_level, log_name):
        self.log_level = log_level.upper()
        self.log_name = log_name
        self.log_dir = f'{base_dir}/logs'
        self.log_file = self._generate_log_file_name()

        self._create_log_dir()
        self._setup_logger()

    def log(self, level, message):
        logger = logging.getLogger(self.log_name)
        logger.log(level, message)

    def info(self, message):
        self.log(logging.INFO, message)

    def debug(self, message):
        self.log(logging.DEBUG, message)

    def warning(self, message):
        self.log(logging.WARNING, message)

    def error(self, message):
        self.log(logging.ERROR, message)

    def critical(self, message):
        self.log(logging.CRITICAL, message)

    def _generate_log_file_name(self):
        today = time.strftime('%Y-%m-%d')
        return os.path.join(self.log_dir, f'{self.log_name}_{today}.log')

    def _create_log_dir(self):
        if not os.path.exists(self.log_dir):
            os.makedirs(self.log_dir)

    def _setup_logger(self):
        logger = logging.getLogger(self.log_name)
        logger.setLevel(self._get_log_level())

        # Formatter for the log file
        formatter = logging.Formatter(fmt='%(asctime)s %(levelname)s: %(message)s', datefmt='%I:%M %p')

        # Log to file
        handler = TimedRotatingFileHandler(self.log_file, when='midnight', interval=1, backupCount=3)
        handler.setFormatter(formatter)
        logger.addHandler(handler)

        # Formatter for the console output (without timestamp and log level)
        console_formatter = logging.Formatter(fmt='%(message)s')

        # Log to console
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(console_formatter)
        logger.addHandler(console_handler)

    def _get_log_level(self):
        if self.log_level == 'DEBUG':
            return logging.DEBUG
        elif self.log_level == 'CRITICAL':
            return logging.CRITICAL
        else:
            return logging.INFO