from types import SimpleNamespace
from util.logger import Logger
from util.utility import (
    create_table,
    print_settings
)
from util.notification import send_notification

import os
import sys
import subprocess
import time
import json
import shlex


def print_output(output: list[dict], logger: Logger) -> None:
    """
    Print the results of the duplicate file search and linking process.

    Args:
        output (list[dict]): List of dictionaries containing path, message, files, and counts.
        logger (Logger): Logger instance to output messages.
    """
    count = 0
    for item in output:
        path = item.get('source_dir')
        field_message = item.get('field_message')
        files = item.get('output')
        sub_count = item.get('sub_count')

        logger.info(f"Findings for path: {path}")
        logger.info(f"\t{field_message}")
        for i in files:
            count += 1
            logger.info(f"\t\t{i}")
        count += sub_count
        logger.info(f"\tTotal items for '{os.path.basename(path)}': {sub_count}")
    logger.info(f"Total items relinked: {count}")


def run_rclone(config: SimpleNamespace, logger: Logger) -> None:
    """
    Build and execute the rclone sync command using subprocess and log success or failure.

    Args:
        config (SimpleNamespace): Configuration object containing rclone and Google Drive settings.
        logger (Logger): Logger instance for logging output.
    """
    # Ensure gdrive_list is always a list for iteration
    sync_list = config.gdrive_list if isinstance(config.gdrive_list, list) else [config.gdrive_list]

    # Validate service account file path if provided
    if config.gdrive_sa_location and not os.path.isfile(config.gdrive_sa_location):
        logger.warning(
            f"\nGoogle service account file '{config.gdrive_sa_location}' does not exist\n"
            "Please verify the path or remove it from config\n"
        )
        config.gdrive_sa_location = None

    for sync_item in sync_list:
        sync_location = sync_item['location']
        sync_id = sync_item['id']

        if not sync_location or not sync_id:
            logger.error("Sync location or GDrive folder ID not provided.")
            continue

        # Create sync directory if it does not exist
        if not os.path.exists(sync_location):
            try:
                os.makedirs(sync_location)
                logger.info(f"Created sync location: {sync_location}")
            except Exception as e:
                logger.error(f"Failed to create sync location '{sync_location}': {e}")
                continue

        # Construct the rclone command with appropriate flags and options
        cmd = [
            'rclone', 'sync',
            '--drive-client-id', config.client_id or '',
            '--drive-client-secret', config.client_secret or '',
            '--drive-token', json.dumps(config.token) if config.token else '',
            '--drive-root-folder-id', sync_id,
            '--fast-list',
            '--tpslimit=5',
            '--no-update-modtime',
            '--drive-use-trash=false',
            '--drive-chunk-size=512M',
            '--exclude=**.partial',
            '--check-first',
            '--bwlimit=80M',
            '--size-only',
            '--delete-after',
            '-v'
        ]

        if config.gdrive_sa_location:
            cmd.extend(['--drive-service-account-file', config.gdrive_sa_location])

        cmd.extend(['posters:', sync_location])

        try:
            logger.debug(f"Running rclone command: {' '.join(shlex.quote(arg) for arg in cmd)}")
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            for line in process.stdout:
                logger.info(line.strip())
            process.wait()
            if process.returncode == 0:
                logger.info("✅ RClone sync completed successfully.")
            else:
                logger.error(f"❌ RClone sync failed with return code {process.returncode}")
        except Exception as e:
            logger.error(f"Exception occurred while running rclone: {e}")


def main(config: SimpleNamespace) -> None:
    """
    Main execution function for identifying and hardlinking duplicate media files using jdupes.

    Args:
        config (SimpleNamespace): Configuration object containing source directories, logging, and other settings.

    Returns:
        None
    """
    logger = Logger(config.log_level, config.module_name)

    try:
        # If dry run, display a notice table
        if config.dry_run:
            table = [
                ["Dry Run"],
                ["NO CHANGES WILL BE MADE"]
            ]
            logger.info(create_table(table))

        output = []

        # Iterate over each source directory to find duplicates
        for path in config.source_dirs:
            if config.log_level.lower() == "debug":
                print_settings(logger, config)

            if not os.path.isdir(path):
                logger.error(f"ERROR: path does not exist: {path}")
                return

            # Run jdupes to find duplicate media files with specified extensions
            result = subprocess.getoutput(f"jdupes -r -M -X onlyext:mp4,mkv,avi '{path}' 2>/dev/null")

            # If not dry run and duplicates found, hardlink duplicates
            if not config.dry_run:
                if "No duplicates found." not in result:
                    subprocess.run(f"jdupes -r -L -X onlyext:mp4,mkv,avi '{path}' 2>/dev/null", shell=True)

            # Parse filenames from jdupes output
            parsed_files = sorted(set(line.split("/")[-1] for line in result.splitlines() if "/" in line))
            field_message = "✅ No unlinked files discovered..." if not parsed_files else "❌ Unlinked files discovered..."
            sub_count = len(parsed_files)

            output_data = {
                "source_dir": path,
                "field_message": field_message,
                "output": parsed_files,
                "sub_count": sub_count
            }
            output.append(output_data)

        logger.debug(f"jdupes output: {result}")
        logger.debug(f"Parsed log: {parsed_files}")

        # Print summarized output and send notification
        print_output(output, logger)
        send_notification(
            logger,
            config.module_name,
            config,
            output
        )

        # Perform rclone sync after processing duplicates
        run_rclone(config, logger)

    except KeyboardInterrupt:
        print("Keyboard Interrupt detected. Exiting...")
        sys.exit()
    except Exception:
        logger.error("An error occurred:", exc_info=True)