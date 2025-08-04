import logging
import os
import re
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


class RedactFilter(logging.Filter):
    """
    Logging filter to globally redact sensitive information from all log messages.
    """

    @staticmethod
    def redact(text: str) -> str:
        if not isinstance(text, str):
            return text

        patterns = [
            (
                r"https://discord\.com/api/webhooks/[^/]+/\S+",
                "https://discord.com/api/webhooks/[redacted]",
            ),
            (
                r"\b(\w{24})-[a-zA-Z0-9_-]{24}\.apps\.googleusercontent\.com\b",
                "[redacted].apps.googleusercontent.com",
            ),
            (r'(?<=refresh_token": ")([^"]+)(?=")', "[redacted]"),
            (r'(?<=access_token": ")([^"]+)(?=")', "[redacted]"),
            (r"GOCSPX-\S+", "GOCSPX-[redacted]"),
            (
                r"client_secret['\"]?\s*[:=]\s*['\"]?[^'\"\s]+",
                "client_secret: [redacted]",
            ),
            (r"client_id['\"]?\s*[:=]\s*['\"]?[^'\"\s]+", "client_id: [redacted]"),
            (r"api['\"]?\s*[:=]\s*['\"]?[^'\"\s]+", "api: [redacted]"),
            (r"webhook['\"]?\s*[:=]\s*['\"]?[^'\"\s]+", "webhook: [redacted]"),
            (r"token['\"]?\s*[:=]\s*(['\"]).+?\1", "token: [redacted]"),
            (r"password['\"]?\s*[:=]\s*['\"]?[^'\"\s]+", "password: [redacted]"),
        ]
        for pat, repl in patterns:
            text = re.sub(pat, repl, text, flags=re.IGNORECASE)
        return text

    def filter(self, record):
        if hasattr(record, "msg") and isinstance(record.msg, str):
            record.msg = self.redact(record.msg)
        if hasattr(record, "args") and record.args:
            record.args = tuple(self.redact(str(arg)) for arg in record.args)
        return True


class Logger:
    """Logger with robust file/console handling, safe rotation, and adapters."""

    _initialized = {}

    @staticmethod
    def redact_sensitive_info(text: str) -> str:
        # For any legacy helpers calling this directly
        return RedactFilter.redact(text)

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

        # --- Setup handlers ---
        if not self._logger.hasHandlers():
            formatter = SafeFormatter(
                fmt="%(asctime)s %(levelname)s %(source_tag)s[%(filename)s]: %(message)s",
                datefmt="%m/%d/%y %I:%M:%S %p",
            )
            redact_filter = RedactFilter()

            # File handler
            file_handler = RotatingFileHandler(
                log_file_path, mode="a", backupCount=max_logs
            )
            file_handler.setFormatter(formatter)
            file_handler.addFilter(redact_filter)
            self._logger.addHandler(file_handler)

            # Console handler
            if module_name == "general" or os.environ.get(
                "LOG_TO_CONSOLE", ""
            ).lower() in ("1", "true", "yes"):
                console = logging.StreamHandler()
                console.setLevel(self._logger.level)
                console.addFilter(lambda record: record.levelno < logging.ERROR)
                console.setFormatter(logging.Formatter("%(message)s"))
                console.addFilter(redact_filter)
                self._logger.addHandler(console)

            # Error console handler
            error_console = logging.StreamHandler()
            error_console.setLevel(logging.ERROR)
            error_console.setFormatter(
                logging.Formatter(f"%(levelname)s [{module_name.upper()}]: %(message)s")
            )
            error_console.addFilter(redact_filter)
            self._logger.addHandler(error_console)

        version = get_version()
        self.start_time = datetime.now()
        self._logger.start_time = self.start_time
        self._logger.info(
            create_bar(f"{module_name.replace('_', ' ').upper()} Version: {version}")
        )

    def get_adapter(self, extra=None):
        new_extra = dict(self._extra)
        if extra:
            if isinstance(extra, str):
                new_extra["source"] = extra.upper()
            else:
                raise ValueError("DapsLoggerAdapter.get_adapter() expects a string")
        new_extra["source"] = (new_extra.get("source") or self.module_name).upper()
        return DapsLoggerAdapter(self._logger, new_extra)

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


def ensure_log_dir_and_rotate(log_file_path, max_logs=9):
    log_dir = os.path.dirname(log_file_path)
    os.makedirs(log_dir, exist_ok=True)

    # Only rotate if main log file exists
    if os.path.isfile(log_file_path):
        for i in range(max_logs - 1, 0, -1):
            old = f"{log_file_path.rsplit('.log', 1)[0]}.{i}.log"
            new = f"{log_file_path.rsplit('.log', 1)[0]}.{i+1}.log"
            if os.path.exists(old):
                os.rename(old, new)
        # Rename the current .log to .1.log
        rotated = f"{log_file_path.rsplit('.log', 1)[0]}.1.log"
        os.rename(log_file_path, rotated)


class DapsLoggerAdapter(logging.LoggerAdapter):
    def get_adapter(self, extra=None):
        new_extra = dict(self.extra)
        if extra:
            if isinstance(extra, str):
                new_extra["source"] = extra.upper()
            else:
                raise ValueError("DapsLoggerAdapter.get_adapter() expects a string")
        new_extra["source"] = (new_extra.get("source") or self.logger.name).upper()
        return DapsLoggerAdapter(self.logger, new_extra)
