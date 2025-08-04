import argparse
import os
import sys

from util.config import DapsConfig, load_config
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
    logger = None  # for safe fallback

    try:
        config: DapsConfig = load_config()
    except Exception as e:
        print(f"[DAPS] ERROR loading config: {e}", file=sys.stderr)
        sys.exit(1)

    if args.modules:
        os.environ["LOG_TO_CONSOLE"] = "true"
        try:
            orchestrator = DapsOrchestrator(logger=None, config=config)
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
            # Use config.general for log_level, fallback to INFO if missing
            log_level = getattr(config.general, "log_level", "INFO")
            logger = Logger(log_level, "general")
            orchestrator = DapsOrchestrator(logger=logger, config=config)
            orchestrator.run(args)
        except Exception as e:
            import traceback

            msg = f"[DAPS] FATAL exception in main(): {e}"
            print(msg, file=sys.stderr)
            traceback.print_exc()
            if not logger:
                logger = Logger("INFO", "general")
            logger.error(msg, exc_info=True)
            sys.exit(1)


if __name__ == "__main__":
    main()
