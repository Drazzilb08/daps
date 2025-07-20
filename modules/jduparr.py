import os
import subprocess
import sys

from util.config import Config
from util.helper import create_table, print_settings
from util.logger import Logger
from util.notification import NotificationManager


def print_output(output: list[dict], logger: Logger) -> None:
    """
    Print the results of the duplicate file search and linking process.

    Args:
        output (list[dict]): List of dictionaries containing path, message, files, and counts.
        logger (Logger): Logger instance to output messages.
    """
    count = 0
    for item in output:
        path = item.get("source_dir")
        field_message = item.get("field_message")
        files = item.get("output")
        sub_count = item.get("sub_count")

        logger.info(f"Findings for path: {path}")
        logger.info(f"\t{field_message}")
        for i in files:
            count += 1
            logger.info(f"\t\t{i}")
        count += sub_count
        logger.info(
            f"\tTotal items for '{os.path.basename(os.path.normpath(path))}': {sub_count}"
        )
    logger.info(f"Total items relinked: {count}")


def main() -> None:
    """
    Main execution function for identifying and hardlinking duplicate media files using jdupes.

    Args:
        config (SimpleNamespace): Configuration object containing source directories, logging, and other settings.

    Returns:
        None
    """
    config = Config("jduparr")
    logger = Logger(getattr(config, "log_level", "INFO"), config.module_name)
    results = None
    try:
        # If dry run, display a notice table
        if config.dry_run:
            table = [["Dry Run"], ["NO CHANGES WILL BE MADE"]]
            logger.info(create_table(table))

        output = []

        # Iterate over each source directory to find duplicates
        if not config.source_dirs:
            logger.error(
                f"No source directories provided in config: {config.source_dirs}"
            )
            return
        for path in config.source_dirs:
            if getattr(config, "log_level", "INFO").lower() == "debug":
                print_settings(logger, config)

            if not os.path.isdir(path):
                logger.error(f"ERROR: path does not exist: {path}")
                return

            # Run jdupes to find duplicate media files with specified extensions
            result = subprocess.getoutput(
                f"jdupes -r -M -X onlyext:mp4,mkv,avi '{path}' 2>/dev/null"
            )

            # If not dry run and duplicates found, hardlink duplicates
            if not config.dry_run:
                if "No duplicates found." not in result:
                    subprocess.run(
                        f"jdupes -r -L -X onlyext:mp4,mkv,avi '{path}' 2>/dev/null",
                        shell=True,
                    )

            # Parse filenames from jdupes output
            parsed_files = sorted(
                set(line.split("/")[-1] for line in result.splitlines() if "/" in line)
            )
            field_message = (
                "✅ No unlinked files discovered..."
                if not parsed_files
                else "❌ Unlinked files discovered..."
            )
            sub_count = len(parsed_files)

            output_data = {
                "source_dir": path,
                "field_message": field_message,
                "output": parsed_files,
                "sub_count": sub_count,
            }
            output.append(output_data)
        if results:
            logger.debug(f"jdupes output: {result}")
            logger.debug(f"Parsed log: {parsed_files}")

        # Print summarized output and send notification
        print_output(output, logger)
        manager = NotificationManager(config, logger, module_name="health_checkarr")
        manager.send_notification(output)

    except KeyboardInterrupt:
        print("Keyboard Interrupt detected. Exiting...")
        sys.exit()
    except Exception:
        logger.error("An error occurred:", exc_info=True)
    finally:
        # Log outro message with run time
        logger.log_outro()
