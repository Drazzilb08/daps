import os
import builtins
import sys
import logging
import atexit
from datetime import datetime
from typing import Optional, ClassVar

class Logger:
    """
    Logger class for structured logging in DAPS modules.

    Automatically handles log rotation, console streaming, and end-of-run reporting.
    When instantiated, returns a preconfigured logger instance.
    """
    _outro_registered: ClassVar[bool] = False
    log_level: str
    module_name: str
    max_logs: int
    logger: logging.Logger
    is_setup: bool
    start: str

    def __new__(cls, log_level: str, module_name: str, max_logs: int = 9) -> logging.Logger:
        """
        Create and configure a logger instance for the given module.

        Args:
            log_level (str): Logging level (e.g., 'debug', 'info').
            module_name (str): Name of the module using the logger.
            max_logs (int): Number of rotated logs to retain.

        Returns:
            logging.Logger: Configured logger instance.
        """
        instance = super().__new__(cls)
        instance.log_level = log_level.lower()
        instance.module_name = module_name
        instance.max_logs = max_logs
        instance.logger = logging.getLogger(f"{module_name}_{os.getpid()}")
        instance.is_setup = False
        instance._setup()
        def _log_outro():
            from util.utility import create_bar
            duration = datetime.now() - datetime.strptime(instance.start, "%Y-%m-%d %H:%M:%S")
            hours, remainder = divmod(duration.total_seconds(), 3600)
            minutes, seconds = divmod(remainder, 60)
            formatted_duration = f"{int(hours)}h {int(minutes)}m {int(seconds)}s"
            instance.logger.info(create_bar(f"{module_name.replace('_', ' ').upper()} | Run Time: {formatted_duration}"))
        # Register shutdown hook for logging total runtime once per session
        if not cls._outro_registered:
            atexit.register(_log_outro)
            cls._outro_registered = True
        return instance.logger

    def _setup(self) -> None:
        """
        Set up file and console logging handlers, rotate old logs, and emit versioned header.
        """
        import pathlib
        from logging.handlers import RotatingFileHandler
        from util.utility import create_bar

        # Determine appropriate logging directory (supporting Docker or local)
        if os.environ.get('DOCKER_ENV'):
            config_dir = os.getenv('CONFIG_DIR', '/config')
            log_dir = f"{config_dir}/logs/{self.module_name}"
        else:
            log_dir = os.path.join(pathlib.Path(__file__).parents[1], 'logs', self.module_name)

        os.makedirs(log_dir, exist_ok=True)

        # Define base log path and extension
        base = os.path.join(log_dir, self.module_name)
        log_file = f"{base}.log"

        # Rotate old logs (e.g., move module.log to module.1.log, etc.)
        if os.path.isfile(log_file):
            for i in range(self.max_logs - 1, 0, -1):
                old = f"{base}.{i}.log"
                new = f"{base}.{i + 1}.log"
                if os.path.exists(old):
                    os.rename(old, new)
            os.rename(log_file, f"{base}.1.log")

        self.logger = logging.getLogger(f"{self.module_name}_{os.getpid()}")
        self.logger.handlers.clear()
        self.logger.propagate = False
        self.logger.setLevel(getattr(logging, self.log_level.upper(), logging.INFO))

        formatter = logging.Formatter(fmt='%(asctime)s %(levelname)s: %(message)s', datefmt='%m/%d/%y %I:%M:%S %p')
        
        file_handler = RotatingFileHandler(log_file, mode="w", backupCount=self.max_logs)
        file_handler.setFormatter(formatter)
        self.logger.addHandler(file_handler)

        # Console handler for info/debug (main or when LOG_TO_CONSOLE is enabled)
        if self.module_name == "main" or os.environ.get('LOG_TO_CONSOLE', '').lower() in ('1', 'true', 'yes'):
            console = logging.StreamHandler()
            console.setLevel(self.logger.level)
            # Only handle records below ERROR here; errors go to the error_console handler
            console.addFilter(lambda record: record.levelno < logging.ERROR)
            # Only show message for info/debug; no level, module, or timestamp
            console.setFormatter(logging.Formatter('%(message)s'))
            self.logger.addHandler(console)

        # Always attach an error-level console handler so ERROR+ logs always appear
        error_console = logging.StreamHandler()
        error_console.setLevel(logging.ERROR)
        # Only show level, module, and message for errors; no timestamp
        error_console.setFormatter(logging.Formatter(f'%(levelname)s [{self.module_name}]: %(message)s'))
        self.logger.addHandler(error_console)
        if not hasattr(logging, self.log_level.upper()):
            self.logger.warning(f"Invalid log level '{self.log_level}', defaulting to INFO")

        # Log header
        from util.version import get_version
        version = get_version()
        self.start = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.logger.info(create_bar(f"{self.module_name.replace('_', ' ').upper()} Version: {version}"))
        self.is_setup = True

_orig_print = builtins.print
def _print(*args: object, file: Optional[object] = None, **kwargs: object) -> None:
    """Custom print that respects LOG_TO_CONSOLE env variable for stdout; stderr always allowed."""
    # Determine the output stream; default to stdout if None
    target = file if file is not None else sys.stdout
    log_console = os.environ.get('LOG_TO_CONSOLE', '').lower() in ('1', 'true', 'yes')
    if target in (sys.stderr, sys.__stderr__):
        # Always allow printing to stderr
        _orig_print(*args, file=target, **kwargs)
    elif target in (sys.stdout, sys.__stdout__):
        # Only print to stdout if LOG_TO_CONSOLE is enabled
        if log_console:
            _orig_print(*args, file=target, **kwargs)
    else:
        # For any other file-like object, print unconditionally
        _orig_print(*args, file=target, **kwargs)
builtins.print = _print
