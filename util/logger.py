import logging
import os
import re
from datetime import datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Optional

from util.helper import create_bar
from util.version import get_version


class SafeFormatter(logging.Formatter):
    """Custom formatter that handles source tags properly."""

    def format(self, record):
        source = getattr(record, "source", None)
        if source:
            record.source_tag = f"[{source}]"
        else:
            record.source_tag = ""
        return super().format(record)


class SmartRedactionFilter(logging.Filter):
    """
    Improved redaction filter that's less aggressive and more targeted.
    Focuses on actual sensitive data rather than everything that looks like it might be.
    """

    @staticmethod
    def redact(text: str) -> str:
        """Apply smart redaction to text, preserving legitimate data."""
        if not isinstance(text, str):
            return text

        # More targeted redaction patterns
        patterns = [
            # Discord webhooks - very specific pattern
            (
                r"https://discord\.com/api/webhooks/\d+/[A-Za-z0-9_-]{68}",
                "https://discord.com/api/webhooks/[redacted]",
            ),
            # Google OAuth client IDs - specific format
            (
                r"\b\d{12}-[a-zA-Z0-9]{32}\.apps\.googleusercontent\.com\b",
                "[redacted].apps.googleusercontent.com",
            ),
            # Google OAuth secrets - specific format
            (r"GOCSPX-[A-Za-z0-9_-]{35}", "GOCSPX-[redacted]"),
            # JSON field redaction - more precise
            (r'("refresh_token":\s*")[^"]{40,}(")', r"\1[redacted]\2"),
            (r'("access_token":\s*")[^"]{20,}(")', r"\1[redacted]\2"),
            (r'("client_secret":\s*")[^"]{20,}(")', r"\1[redacted]\2"),
            # Configuration field redaction - only when clearly a secret
            (
                r"client_secret\s*[:=]\s*['\"]?[A-Za-z0-9_-]{20,}['\"]?",
                "client_secret: [redacted]",
            ),
            (r"webhook\s*[:=]\s*['\"]?https://[^'\"\s]+['\"]?", "webhook: [redacted]"),
            # API keys - only long alphanumeric strings likely to be keys
            (r"\bapi\s*[:=]\s*['\"]?[A-Za-z0-9]{32,}['\"]?", "api: [redacted]"),
            # Passwords
            (r"password\s*[:=]\s*['\"]?[^\s'\"]{8,}['\"]?", "password: [redacted]"),
        ]

        for pattern, replacement in patterns:
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)

        return text

    def filter(self, record):
        """Apply redaction to log record."""
        if hasattr(record, "msg") and isinstance(record.msg, str):
            record.msg = self.redact(record.msg)
        if hasattr(record, "args") and record.args:
            record.args = tuple(self.redact(str(arg)) for arg in record.args)
        return True


class Logger:
    """
    Enhanced logger with smart redaction, automatic log rotation, and cleaner initialization.
    """

    _initialized = set()

    @staticmethod
    def redact_sensitive_info(text: str) -> str:
        """Static method for backwards compatibility."""
        return SmartRedactionFilter.redact(text)

    def __init__(
        self,
        log_level: str,
        module_name: str,
        log_file: Optional[str] = None,
        max_logs: int = 9,
        retention_days: Optional[int] = None,
        extra: Optional[dict] = None,
    ):
        """
        Initialize logger with enhanced features.

        Args:
            log_level: Logging level (DEBUG, INFO, etc.)
            module_name: Name of the module for log organization
            log_file: Optional custom log file path
            max_logs: Number of rotated logs to keep (defaults to 9 if not provided)
            retention_days: (deprecated; ignored) kept for backward compatibility
            extra: Extra context for log adapters
        """
        log_level = log_level.upper()
        self.module_name = module_name
        self._extra = extra or {}
        self.retention_days = retention_days

        # Use simpler initialization tracking
        key = (module_name, log_file)
        if key in Logger._initialized:
            self._logger = logging.getLogger(module_name)
            return
        Logger._initialized.add(key)

        # Determine log file path
        if log_file:
            log_file_path = log_file
        else:
            log_file_path = self._get_log_file_path(module_name)

        # Setup log directory and rotation
        self._setup_log_directory_and_rotation(log_file_path, max_logs)

        # Initialize logger
        self._logger = logging.getLogger(module_name)
        self._logger.setLevel(getattr(logging, log_level, logging.INFO))

        # Setup handlers only if not already done
        if not self._logger.hasHandlers():
            self._setup_handlers(log_file_path, max_logs)

        # Log startup message
        version = get_version()
        self.start_time = datetime.now()
        self._logger.start_time = self.start_time
        self._logger.info(
            create_bar(f"{module_name.replace('_', ' ').upper()} Version: {version}")
        )

    def _get_log_file_path(self, module_name: str) -> str:
        """Determine the log file path for a module."""
        log_base = os.getenv("LOG_DIR")
        if log_base:
            log_dir = Path(log_base) / module_name
        else:
            log_dir = Path(__file__).resolve().parents[1] / "logs" / module_name

        log_dir.mkdir(parents=True, exist_ok=True)
        return str(log_dir / f"{module_name}.log")

    def _setup_log_directory_and_rotation(
        self, log_file_path: str, max_logs: int
    ) -> None:
        """Setup log directory and handle rotation with consistent naming pattern."""
        log_dir = os.path.dirname(log_file_path)
        os.makedirs(log_dir, exist_ok=True)

        # Only rotate if main log file exists
        if os.path.isfile(log_file_path):
            # Extract base name (without .log extension)
            base_name = log_file_path.rsplit(".log", 1)[0]

            # Shift existing numbered logs: module_name.9.log -> module_name.10.log, etc.
            for i in range(max_logs - 1, 0, -1):
                old_file = f"{base_name}.{i}.log"
                new_file = f"{base_name}.{i + 1}.log"
                if os.path.exists(old_file):
                    os.rename(old_file, new_file)

            # Move current log to module_name.1.log
            rotated_file = f"{base_name}.1.log"
            os.rename(log_file_path, rotated_file)

    def _setup_handlers(self, log_file_path: str, max_logs: int) -> None:
        """Setup logging handlers with improved redaction."""
        formatter = SafeFormatter(
            fmt="%(asctime)s %(levelname)s %(source_tag)s[%(filename)s]: %(message)s",
            datefmt="%m/%d/%y %I:%M:%S %p",
        )
        redaction_filter = SmartRedactionFilter()

        # File handler
        file_handler = RotatingFileHandler(
            log_file_path, mode="a", backupCount=max_logs
        )
        file_handler.setFormatter(formatter)
        file_handler.addFilter(redaction_filter)
        self._logger.addHandler(file_handler)

        # Console handler for general module or when LOG_TO_CONSOLE is set
        should_log_to_console = self.module_name == "general" or os.environ.get(
            "LOG_TO_CONSOLE", ""
        ).lower() in ("1", "true", "yes")

        if should_log_to_console:
            console = logging.StreamHandler()
            console.setLevel(self._logger.level)
            console.addFilter(lambda record: record.levelno < logging.ERROR)
            console.setFormatter(logging.Formatter("%(message)s"))
            console.addFilter(redaction_filter)
            self._logger.addHandler(console)

        # Error console handler (always present for errors)
        error_console = logging.StreamHandler()
        error_console.setLevel(logging.ERROR)
        error_console.setFormatter(
            logging.Formatter(
                f"%(levelname)s [{self.module_name.upper()}]: %(message)s"
            )
        )
        error_console.addFilter(redaction_filter)
        self._logger.addHandler(error_console)

    def get_adapter(self, extra=None):
        """
        Get a logger adapter with additional context.

        Args:
            extra: Additional context (string for source, or dict for multiple fields)

        Returns:
            DapsLoggerAdapter with enhanced context
        """
        new_extra = dict(self._extra)
        if extra:
            if isinstance(extra, str):
                new_extra["source"] = extra.upper()
            elif isinstance(extra, dict):
                new_extra.update(extra)
            else:
                raise ValueError(
                    "DapsLoggerAdapter.get_adapter() expects a string or dict"
                )

        new_extra["source"] = (new_extra.get("source") or self.module_name).upper()
        return DapsLoggerAdapter(self._logger, new_extra)

    def log_outro(self) -> None:
        """Log completion message with runtime information."""
        start = getattr(self, "start_time", None)
        if start is None:
            return

        duration = datetime.now() - start
        hours, remainder = divmod(duration.total_seconds(), 3600)
        minutes, seconds = divmod(remainder, 60)
        formatted_duration = f"{int(hours)}h {int(minutes)}m {int(seconds)}s"
        module_name = self._logger.name.replace("_", " ").upper()
        self._logger.info(create_bar(f"{module_name} | Run Time: {formatted_duration}"))

    def __getattr__(self, name):
        """Delegate unknown attributes to the underlying logger."""
        return getattr(self._logger, name)


class DapsLoggerAdapter(logging.LoggerAdapter):
    """Enhanced logger adapter with better context management."""

    def get_adapter(self, extra=None):
        """
        Get a new adapter with additional context.

        Args:
            extra: Additional context (string for source, or dict for multiple fields)

        Returns:
            New DapsLoggerAdapter with enhanced context
        """
        new_extra = dict(self.extra)
        if extra:
            if isinstance(extra, str):
                new_extra["source"] = extra.upper()
            elif isinstance(extra, dict):
                new_extra.update(extra)
            else:
                raise ValueError(
                    "DapsLoggerAdapter.get_adapter() expects a string or dict"
                )

        new_extra["source"] = (new_extra.get("source") or self.logger.name).upper()
        return DapsLoggerAdapter(self.logger, new_extra)


def ensure_log_dir_and_rotate(log_file_path: str, max_logs: int = 9) -> None:
    """
    Ensures consistent <module_name>.#.log naming pattern.

    Args:
        log_file_path: Path to the main log file
        max_logs: Maximum number of rotated logs to keep
    """
    log_dir = os.path.dirname(log_file_path)
    os.makedirs(log_dir, exist_ok=True)

    # Only rotate if main log file exists
    if os.path.isfile(log_file_path):
        # Extract base name (without .log extension)
        base_name = log_file_path.rsplit(".log", 1)[0]

        # Shift existing numbered logs: module_name.9.log -> module_name.10.log, etc.
        for i in range(max_logs - 1, 0, -1):
            old_file = f"{base_name}.{i}.log"
            new_file = f"{base_name}.{i + 1}.log"
            if os.path.exists(old_file):
                os.rename(old_file, new_file)

        # Move current log to module_name.1.log
        rotated_file = f"{base_name}.1.log"
        os.rename(log_file_path, rotated_file)
