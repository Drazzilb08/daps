#!/usr/bin/env python3

import argparse
import atexit
import signal
import sys
import threading
from typing import Optional

from util.config import DapsConfig, load_config
from util.logger import Logger
from util.module_runner import ModuleRunner
from util.scheduler import DapsScheduler
from util.version import get_version

SHUTDOWN_POLL_SECONDS = 60.0  # Interval for main thread to poll for shutdown


class DapsApplication:
    """Main application class - handles lifecycle, infrastructure, and coordination"""

    def __init__(self):
        self.module_runner: Optional[ModuleRunner] = None
        self.scheduler: Optional[DapsScheduler] = None
        self.logger: Optional[Logger] = None
        self.config: Optional[DapsConfig] = None
        self.shutdown_requested = threading.Event()
        self.cleanup_done = False
        self._cleanup_lock = threading.Lock()
        self._cleanup_started = threading.Event()

    def setup_signal_handlers(self):
        """Set up signal handlers for graceful shutdown"""
        import os

        def hard_exit(signum, frame):
            if self.logger:
                self.logger.get_adapter("MAIN").warning(
                    f"Received second signal {signum}, force exiting immediately"
                )
            else:
                print(
                    f"[MAIN] Received second signal {signum}, force exiting immediately"
                )
            os._exit(1)

        def first_signal(signum, frame):
            if self.logger:
                self.logger.get_adapter("MAIN").info(
                    f"Received signal {signum}, initiating shutdown..."
                )
            else:
                print(f"[MAIN] Received signal {signum}, initiating shutdown...")

            # Tell the rest of the app to stop
            self.shutdown_requested.set()

            # Launch cleanup exactly once
            if not self._cleanup_started.is_set():
                self._cleanup_started.set()
                threading.Thread(target=self.cleanup, daemon=True).start()

            # After the first signal, escalate subsequent signals to immediate exit
            signal.signal(signal.SIGINT, hard_exit)
            signal.signal(signal.SIGTERM, hard_exit)

        signal.signal(signal.SIGINT, first_signal)
        signal.signal(signal.SIGTERM, first_signal)
        atexit.register(self.cleanup)

    def cleanup(self):
        """Clean up resources (idempotent, thread-safe)"""
        if self.cleanup_done:
            return
        with self._cleanup_lock:
            if self.cleanup_done:
                return
            try:
                if self.logger:
                    log = self.logger.get_adapter("MAIN")
                    log.info("Cleaning up application resources...")
                else:
                    print("[MAIN] Cleaning up application resources...")

                if self.scheduler:
                    self.scheduler.stop()

                if self.module_runner:
                    self.module_runner.stop_all()

                self.cleanup_done = True

                if self.logger:
                    self.logger.get_adapter("MAIN").info("Cleanup completed")
                else:
                    print("[MAIN] Cleanup completed")

            except Exception as e:
                if self.logger:
                    self.logger.get_adapter("MAIN").error(f"Error during cleanup: {e}")
                else:
                    print(f"[MAIN] Error during cleanup: {e}")
                self.cleanup_done = True

    def run(self, args):
        """Main application run method"""
        try:
            try:
                self.config = load_config()
            except Exception as e:
                print(f"[DAPS] ERROR loading config: {e}", file=sys.stderr)
                return 1

            if args.modules:
                import os

                os.environ["LOG_TO_CONSOLE"] = "true"
                log_level = getattr(self.config.general, "log_level", "INFO")
                self.logger = Logger(
                    log_level=log_level,
                    module_name="general",
                    max_logs=self.config.general.max_logs,
                )
            else:
                import os

                os.environ["LOG_TO_CONSOLE"] = "false"
                log_level = getattr(self.config.general, "log_level", "INFO")
                self.logger = Logger(
                    log_level=log_level,
                    module_name="general",
                    max_logs=self.config.general.max_logs,
                )

            self.module_runner = ModuleRunner(logger=self.logger)

            if args.modules:
                return self.run_cli_modules(args.modules)
            else:
                return self.run_server_mode()

        except KeyboardInterrupt:
            if self.logger:
                self.logger.get_adapter("MAIN").info("Keyboard interrupt received")
            else:
                print("[MAIN] Keyboard interrupt received")
            return 0
        except Exception as e:
            if self.logger:
                self.logger.get_adapter("MAIN").error(
                    f"FATAL exception: {e}", exc_info=True
                )
            else:
                print(f"[MAIN] FATAL exception: {e}", file=sys.stderr)
            return 1

    def run_cli_modules(self, modules):
        """Run CLI modules - simple execution without infrastructure overhead"""
        try:
            if self.logger:
                self.logger.get_adapter("MAIN").info(
                    f"CLI mode: Running modules {modules}"
                )

            # Use simple module runner for CLI
            self.module_runner.run_modules_cli(modules)
            return 0
        except Exception as e:
            if self.logger:
                self.logger.get_adapter("MAIN").error(f"CLI error: {e}", exc_info=True)
            else:
                print(f"[MAIN] CLI error: {e}", file=sys.stderr)
            return 1

    def run_server_mode(self):
        """Run server mode with full infrastructure"""
        if self.logger:
            self.logger.get_adapter("MAIN").info("Starting DAPS server...")
        else:
            print("[MAIN] Starting DAPS server...")

        try:
            self.scheduler = DapsScheduler(
                config=self.config, logger=self.logger, module_runner=self.module_runner
            )

            self.start_web_server()

            self.setup_signal_handlers()

            self.run_scheduler_loop()

            if self.logger:
                self.logger.get_adapter("MAIN").info("Exiting application")
            else:
                print("[MAIN] Exiting application")

            return 0

        except Exception as e:
            if self.logger:
                self.logger.get_adapter("MAIN").error(
                    f"Server error: {e}", exc_info=True
                )
            else:
                print(f"[MAIN] Server error: {e}", file=sys.stderr)
            return 1

    def start_web_server(self):
        try:
            from api.server import start_web_server

            start_web_server(logger=self.logger, module_runner=self.module_runner)
            if self.logger:
                self.logger.get_adapter("MAIN").info(
                    "Web server started in background thread."
                )
        except Exception as e:
            if self.logger:
                self.logger.get_adapter("MAIN").error(
                    f"Failed to start web server: {e}", exc_info=True
                )
            else:
                print(f"[MAIN] Failed to start web server: {e}")
            raise

    def run_scheduler_loop(self):
        """Run the scheduler loop with proper shutdown handling"""
        try:
            # Start scheduler
            self.scheduler.start()

            # Main thread waits for shutdown
            while not self.shutdown_requested.is_set():
                if self.shutdown_requested.wait(timeout=SHUTDOWN_POLL_SECONDS):
                    break

        except Exception as e:
            if self.logger:
                self.logger.get_adapter("MAIN").error(
                    f"FATAL error in scheduler loop: {e}", exc_info=True
                )
            else:
                print(f"[MAIN] FATAL error: {e}", file=sys.stderr)
            raise


def parse_args():
    parser = argparse.ArgumentParser(
        description="Run DAPS modules, schedule, or web UI."
    )
    parser.add_argument(
        "modules", nargs="*", help="Module names to run once (CLI mode)."
    )
    parser.add_argument("--version", action="version", version=get_version())
    return parser.parse_args()


def main():
    args = parse_args()
    app = DapsApplication()
    exit_code = app.run(args)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
