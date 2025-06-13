import os
import builtins
import sys
import logging
import atexit
from datetime import datetime
from typing import Optional
from pathlib import Path
from logging.handlers import RotatingFileHandler
from util.utility import create_bar

class Logger:
    def __init__(self, log_level: str, module_name: str, max_logs: int = 9):
        """
        Set up file and console logging handlers, rotate old logs, and emit versioned header.
        Stores start_time and sets up self._logger.
        """
        # Determine appropriate logging directory (supporting Docker or local)
        log_base = os.getenv('LOG_DIR')
        if log_base:
            log_dir = Path(log_base) / module_name
        else:
            log_dir = Path(__file__).resolve().parents[1] / 'logs' / module_name

        os.makedirs(log_dir, exist_ok=True)

        # Define base log path and extension
        base = os.path.join(log_dir, module_name)
        log_file = f"{base}.log"

        # Rotate old logs (e.g., move module.log to module.1.log, etc.)
        if os.path.isfile(log_file):
            for i in range(max_logs - 1, 0, -1):
                old = f"{base}.{i}.log"
                new = f"{base}.{i + 1}.log"
                if os.path.exists(old):
                    os.rename(old, new)
            os.rename(log_file, f"{base}.1.log")

        self._logger = logging.getLogger(f"{module_name}_{os.getpid()}")
        self._logger.handlers.clear()
        self._logger.propagate = False
        self._logger.setLevel(getattr(logging, log_level.lower().upper(), logging.INFO))

        formatter = logging.Formatter(fmt='%(asctime)s %(levelname)s: %(message)s', datefmt='%m/%d/%y %I:%M:%S %p')
        
        file_handler = RotatingFileHandler(log_file, mode="w", backupCount=max_logs)
        file_handler.setFormatter(formatter)
        self._logger.addHandler(file_handler)

        # Console handler for info/debug (main or when LOG_TO_CONSOLE is enabled)
        if module_name == "main" or os.environ.get('LOG_TO_CONSOLE', '').lower() in ('1', 'true', 'yes'):
            console = logging.StreamHandler()
            console.setLevel(self._logger.level)
            # Only handle records below ERROR here; errors go to the error_console handler
            console.addFilter(lambda record: record.levelno < logging.ERROR)
            # Only show message for info/debug; no level, module, or timestamp
            console.setFormatter(logging.Formatter('%(message)s'))
            self._logger.addHandler(console)

        # Always attach an error-level console handler so ERROR+ logs always appear
        error_console = logging.StreamHandler()
        error_console.setLevel(logging.ERROR)
        # Only show level, module, and message for errors; no timestamp
        error_console.setFormatter(logging.Formatter(f'%(levelname)s [{module_name}]: %(message)s'))
        self._logger.addHandler(error_console)
        if not hasattr(logging, log_level.lower().upper()):
            self._logger.warning(f"Invalid log level '{log_level}', defaulting to INFO")

        # Log header
        from util.version import get_version
        version = get_version()
        self.start_time = datetime.now()
        self._logger.start_time = self.start_time
        self._logger.info(create_bar(f"{module_name.replace('_', ' ').upper()} Version: {version}"))

    def log_outro(self) -> None:
        """
        Computes and logs outro using self.start_time.
        """
        from util.utility import create_bar
        start = getattr(self, "start_time", None)
        if start is None:
            return
        duration = datetime.now() - start
        hours, remainder = divmod(duration.total_seconds(), 3600)
        minutes, seconds = divmod(remainder, 60)
        formatted_duration = f"{int(hours)}h {int(minutes)}m {int(seconds)}s"
        module_name = self._logger.name.rsplit('_', 1)[0].replace('_', ' ').upper()
        self._logger.info(create_bar(f"{module_name} | Run Time: {formatted_duration}"))

    def __getattr__(self, name):
        return getattr(self._logger, name)

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
