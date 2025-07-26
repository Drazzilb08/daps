import logging
import os
from datetime import datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path

from util.helper import create_bar
from util.version import get_version


class SafeFormatter(logging.Formatter):
    def format(self, record):
        source = getattr(record, "source", None)
        if source:
            record.source_tag = f"[{source}]"
        else:
            record.source_tag = ""
        return super().format(record)


def ensure_log_dir_and_rotate(log_file_path, max_logs=9):
    log_dir = os.path.dirname(log_file_path)
    os.makedirs(log_dir, exist_ok=True)

    if os.path.isfile(log_file_path):
        for i in range(max_logs - 1, 0, -1):
            old = f"{log_file_path}.{i}"
            new = f"{log_file_path}.{i + 1}"
            if os.path.exists(old):
                os.rename(old, new)
        os.rename(log_file_path, f"{log_file_path}.1")


class Logger:
    """Logger with robust file/console handling, safe rotation, and adapters."""

    _initialized = {}

    def __init__(
        self,
        log_level: str,
        module_name: str,
        log_file: str = None,
        max_logs: int = 9,
        extra=None,
    ):
        log_level = log_level.upper()
        self.module_name = module_name
        self._extra = extra or {}

        key = (module_name, log_file)
        if key in Logger._initialized:
            self._logger = logging.getLogger(module_name)
            return
        Logger._initialized[key] = True

        if log_file:

            log_file_path = log_file
        else:

            log_base = os.getenv("LOG_DIR")
            if log_base:
                log_dir = Path(log_base) / module_name
            else:
                log_dir = Path(__file__).resolve().parents[1] / "logs" / module_name
            log_dir = Path(log_dir)
            os.makedirs(log_dir, exist_ok=True)
            log_file_path = str(log_dir / f"{module_name}.log")

        ensure_log_dir_and_rotate(log_file_path, max_logs)

        self._logger = logging.getLogger(module_name)
        self._logger.setLevel(getattr(logging, log_level, logging.INFO))

        if not self._logger.hasHandlers():
            formatter = SafeFormatter(
                fmt="%(asctime)s %(levelname)s %(source_tag)s[%(filename)s]: %(message)s",
                datefmt="%m/%d/%y %I:%M:%S %p",
            )
            file_handler = RotatingFileHandler(
                log_file_path, mode="a", backupCount=max_logs
            )
            file_handler.setFormatter(formatter)
            self._logger.addHandler(file_handler)

            if module_name == "general" or os.environ.get(
                "LOG_TO_CONSOLE", ""
            ).lower() in ("1", "true", "yes"):
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

        version = get_version()
        self.start_time = datetime.now()
        self._logger.start_time = self.start_time
        self._logger.info(
            create_bar(f"{module_name.replace('_', ' ').upper()} Version: {version}")
        )

    def get_adapter(self, extra=None):
        ctx = dict(self._extra)
        if extra:
            ctx.update(extra)
        ctx["source"] = (ctx.get("source") or self.module_name).upper()
        return logging.LoggerAdapter(self._logger, ctx)

    def log_outro(self) -> None:
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
