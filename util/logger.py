import logging
import os
from datetime import datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path

from util.helper import create_bar
from util.version import get_version


class Logger:
    """Logger with file rotation, console output, and versioned header."""

    def __init__(self, log_level: str, module_name: str, max_logs: int = 9):
        """Set up file and console logging handlers and emit versioned header."""
        log_base = os.getenv("LOG_DIR")
        if log_base:
            log_dir = Path(log_base) / module_name
        else:
            log_dir = Path(__file__).resolve().parents[1] / "logs" / module_name
        os.makedirs(log_dir, exist_ok=True)

        base = os.path.join(log_dir, module_name)
        log_file = f"{base}.log"

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

        formatter = logging.Formatter(
            fmt="%(asctime)s %(levelname)s: %(message)s", datefmt="%m/%d/%y %I:%M:%S %p"
        )
        file_handler = RotatingFileHandler(log_file, mode="w", backupCount=max_logs)
        file_handler.setFormatter(formatter)
        self._logger.addHandler(file_handler)

        if module_name == "general" or os.environ.get("LOG_TO_CONSOLE", "").lower() in (
            "1",
            "true",
            "yes",
        ):
            console = logging.StreamHandler()
            console.setLevel(self._logger.level)
            console.addFilter(lambda record: record.levelno < logging.ERROR)
            console.setFormatter(logging.Formatter("%(message)s"))
            self._logger.addHandler(console)

        error_console = logging.StreamHandler()
        error_console.setLevel(logging.ERROR)
        error_console.setFormatter(
            logging.Formatter(f"%(levelname)s [{module_name.upper()}]: %(message)s")
        )
        self._logger.addHandler(error_console)

        if not hasattr(logging, log_level.lower().upper()):
            self._logger.warning(f"Invalid log level '{log_level}', defaulting to INFO")

        version = get_version()
        self.start_time = datetime.now()
        self._logger.start_time = self.start_time
        self._logger.info(
            create_bar(f"{module_name.replace('_', ' ').upper()} Version: {version}")
        )

    def log_outro(self) -> None:
        """Log runtime duration since start_time."""
        start = getattr(self, "start_time", None)
        if start is None:
            return
        duration = datetime.now() - start
        hours, remainder = divmod(duration.total_seconds(), 3600)
        minutes, seconds = divmod(remainder, 60)
        formatted_duration = f"{int(hours)}h {int(minutes)}m {int(seconds)}s"
        module_name = self._logger.name.rsplit("_", 1)[0].replace("_", " ").upper()
        self._logger.info(create_bar(f"{module_name} | Run Time: {formatted_duration}"))

    def __getattr__(self, name):
        return getattr(self._logger, name)