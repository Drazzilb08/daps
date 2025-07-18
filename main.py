import argparse
import os
import sys

from util.config import Config, manage_config
from util.logger import Logger
from util.orchestrator import DapsOrchestrator
from util.version import get_version


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
    if args.modules:
        os.environ["LOG_TO_CONSOLE"] = "true"
        try:
            orchestrator = DapsOrchestrator(None)
            orchestrator.run(args)
        except Exception as e:
            import traceback

            msg = f"[DAPS] FATAL exception in main(): {e}"
            print(msg, file=sys.stderr)
            traceback.print_exc()
            sys.exit(1)
    else:
        os.environ["LOG_TO_CONSOLE"] = "false"
        try:
            main_config = Config("general")
            logger = Logger(main_config.log_level, main_config.module_name)
            manage_config(logger)
            orchestrator = DapsOrchestrator(logger)
            orchestrator.run(args)
        except Exception as e:
            import traceback

            msg = f"[DAPS] FATAL exception in main(): {e}"
            print(msg, file=sys.stderr)
            traceback.print_exc()
            if not logger:
                logger = Logger(main_config.log_level, "general")
            logger.error(msg, exc_info=True)
            sys.exit(1)


if __name__ == "__main__":
    main()
