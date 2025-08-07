#!/usr/bin/env python3

import argparse
import atexit
import signal
import sys
import threading
import time
from typing import Optional

from util.config import DapsConfig, load_config
from util.logger import Logger
from util.orchestrator import DapsOrchestrator
from util.version import get_version


class DapsApplication:
    """Main application class with proper signal handling and cleanup"""

    def __init__(self):
        self.orchestrator: Optional[DapsOrchestrator] = None
        self.logger: Optional[Logger] = None
        self.config: Optional[DapsConfig] = None
        self.shutdown_requested = threading.Event()
        self.cleanup_done = False

    def setup_signal_handlers(self):
        """Set up signal handlers for graceful shutdown"""
        signal_count = 0

        def signal_handler(signum, frame):
            nonlocal signal_count
            signal_count += 1

            if self.logger:
                log = self.logger.get_adapter("MAIN")
                log.info(
                    f"Received signal {signum} (count: {signal_count}), initiating shutdown..."
                )
            else:
                print(
                    f"[MAIN] Received signal {signum} (count: {signal_count}), initiating shutdown..."
                )

            if signal_count == 1:
                # First signal - try graceful shutdown
                self.shutdown_requested.set()

                # Run cleanup in background and let main thread continue to exit naturally
                if not self.cleanup_done:
                    cleanup_thread = threading.Thread(target=self.cleanup, daemon=True)
                    cleanup_thread.start()
                    # Don't wait for cleanup thread - let main thread exit naturally

                # The key insight: don't call sys.exit() here, just return and let
                # the main thread's scheduler loop exit naturally when shutdown_requested is set
                return
            else:
                # Second signal - force exit immediately
                if self.logger:
                    self.logger.get_adapter("MAIN").warning("Force exiting immediately")
                else:
                    print("[MAIN] Force exiting immediately")
                import os

                os._exit(
                    1
                )  # Use os._exit() instead of sys.exit() for immediate termination

        # Register signal handlers
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)

        # Register atexit cleanup as backup
        atexit.register(self.cleanup)

    def cleanup(self):
        """Clean up resources"""
        if self.cleanup_done:
            return

        try:
            if self.logger:
                log = self.logger.get_adapter("MAIN")
                log.info("Cleaning up application resources...")
            else:
                print("[MAIN] Cleaning up application resources...")

            if self.orchestrator:
                # Stop any running processes
                running_processes = self.orchestrator.get_running()
                if running_processes:
                    if self.logger:
                        self.logger.get_adapter("MAIN").debug(
                            f"Terminating {len(running_processes)} running processes..."
                        )
                    for name, entry in running_processes.items():
                        if entry and entry.get("proc") and entry["proc"].is_alive():
                            if self.logger:
                                self.logger.get_adapter("MAIN").debug(
                                    f"Terminating process {name}"
                                )
                            try:
                                entry["proc"].terminate()
                                entry["proc"].join(timeout=3)  # Reduced timeout
                                if entry["proc"].is_alive():
                                    entry["proc"].kill()  # Force kill if needed
                                    entry["proc"].join(timeout=1)
                            except Exception as e:
                                if self.logger:
                                    self.logger.get_adapter("MAIN").warning(
                                        f"Error stopping process {name}: {e}"
                                    )

                # Clean up database connections (this will stop the workers)
                if hasattr(self.orchestrator, "db") and self.orchestrator.db:
                    try:
                        if self.logger:
                            self.logger.get_adapter("MAIN").debug(
                                "Closing database connections and stopping workers..."
                            )
                        self.orchestrator.db.close_all()
                    except Exception as e:
                        if self.logger:
                            self.logger.get_adapter("MAIN").warning(
                                f"Error closing database: {e}"
                            )

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
            self.cleanup_done = True  # Mark as done even if there was an error

    def run(self, args):
        """Main application run method"""
        try:
            # Load config
            try:
                self.config = load_config()
            except Exception as e:
                print(f"[DAPS] ERROR loading config: {e}", file=sys.stderr)
                return 1

            # Set up logging
            if args.modules:
                # CLI mode - log to console
                import os

                os.environ["LOG_TO_CONSOLE"] = "true"
                self.logger = None  # Let orchestrator handle logging
            else:
                # Server mode - use file logging
                import os

                os.environ["LOG_TO_CONSOLE"] = "false"
                log_level = getattr(self.config.general, "log_level", "INFO")
                self.logger = Logger(log_level, "general")

            # Create orchestrator
            self.orchestrator = DapsOrchestrator(logger=self.logger, config=self.config)

            # Set up signal handling AFTER creating orchestrator
            self.setup_signal_handlers()

            # Run the application
            if args.modules:
                # CLI mode - run modules and exit
                return self.run_cli_modules(args.modules)
            else:
                # Server mode - run indefinitely until shutdown
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
        """Run CLI modules"""
        try:
            self.orchestrator.run_cli_modules(modules)
            return 0
        except Exception as e:
            if self.logger:
                self.logger.get_adapter("MAIN").error(f"CLI error: {e}", exc_info=True)
            else:
                print(f"[MAIN] CLI error: {e}", file=sys.stderr)
            return 1

    def run_server_mode(self):
        """Run server mode with scheduler"""
        if self.logger:
            self.logger.get_adapter("MAIN").info("Starting DAPS server...")
        else:
            print("[MAIN] Starting DAPS server...")

        try:
            # Start web server in background thread
            self.orchestrator._start_web_thread()

            # Run scheduler in main thread with shutdown check
            self.run_scheduler_with_shutdown()

            # Cleanup is handled by the signal handler, no need to call it again here
            if self.logger:
                self.logger.get_adapter("MAIN").info("Exiting application")
            else:
                print("[MAIN] Exiting application")

            # Force exit to ensure we don't hang on remaining threads
            import os

            os._exit(0)

        except Exception as e:
            if self.logger:
                self.logger.get_adapter("MAIN").error(
                    f"Server error: {e}", exc_info=True
                )
            else:
                print(f"[MAIN] Server error: {e}", file=sys.stderr)
            return 1

    def run_scheduler_with_shutdown(self):
        """Run the scheduler loop with proper shutdown handling"""
        schedule = self.config.schedule

        if self.logger:
            log_adapter = self.logger.get_adapter("SCHEDULER")
            log_adapter.info("Starting scheduler loop...")
        else:
            print("[SCHEDULER] Starting scheduler loop...")

        # Print schedule table
        from util.orchestrator import print_schedule_table

        if self.logger:
            print_schedule_table(self.logger.get_adapter("SCHEDULER"), schedule)

        if self.logger:
            self.logger.get_adapter("SCHEDULER").info(
                "Waiting for scheduled modules..."
            )
        else:
            print("[SCHEDULER] Waiting for scheduled modules...")

        start_time = time.monotonic()

        try:
            while not self.shutdown_requested.is_set():
                # Run scheduler tick
                self.orchestrator.tick(schedule)

                # Sleep with shutdown check (instead of fixed 5 second sleep)
                if self.shutdown_requested.wait(timeout=5.0):
                    break  # Shutdown was requested

                # Periodic uptime log (every minute)
                elapsed = int(time.monotonic() - start_time)
                if elapsed > 0 and elapsed % 60 == 0:
                    minutes = elapsed // 60
                    seconds = elapsed % 60
                    if self.logger:
                        self.logger.get_adapter("SCHEDULER").debug(
                            f"Scheduler is alive. Uptime: {minutes}m {seconds}s"
                        )

        except Exception as e:
            if self.logger:
                self.logger.get_adapter("SCHEDULER").error(
                    f"FATAL error in scheduler loop: {e}", exc_info=True
                )
            else:
                print(f"[SCHEDULER] FATAL error: {e}", file=sys.stderr)
            raise
        finally:
            if self.logger:
                self.logger.get_adapter("SCHEDULER").info("Scheduler loop ended")
            else:
                print("[SCHEDULER] Scheduler loop ended")


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
