import os
import shutil
import sys
from types import SimpleNamespace
from typing import Dict, List, Optional, Union

from util.arrpy import create_arr_client
from util.assets import get_assets_files
from util.index import create_new_empty_index
from util.logger import Logger
from util.match import match_assets_to_media
from util.utility import (
    create_table,
    get_plex_data,
    print_json,
    print_settings,
)

try:
    from plexapi.server import PlexServer
except ImportError as e:
    print(f"ImportError: {e}")
    print("Please install the required modules with 'pip install -r requirements.txt'")
    exit(1)


def remove_assets(
    unmatched_dict: List[Dict[str, Union[str, int, List[str], None]]],
    config: SimpleNamespace,
    logger: Logger,
) -> List[Dict[str, Union[str, int, List[str]]]]:
    """
    Remove unmatched assets from disk or simulate removal.

    Args:
        unmatched_dict: List of unmatched asset dictionaries.
        config: Configuration namespace.
        logger: Logger instance.

    Returns:
        List of dictionaries summarizing removed assets and messages.
    """
    remove_data: List[Dict[str, Union[str, int, List[str]]]] = []
    remove_list: List[str] = []

    # If input is a dict by type, flatten to a list
    if isinstance(unmatched_dict, dict):
        all_unmatched = []
        for v in unmatched_dict.values():
            all_unmatched.extend(v)
        unmatched_list = all_unmatched
    else:
        unmatched_list = unmatched_dict

    for asset_data in unmatched_list:
        messages: List[str] = []

        if not asset_data["files"] and asset_data.get("path"):
            # Remove empty folder asset
            remove_list.append(asset_data["path"])
            messages.append(
                f"Removing empty folder: {os.path.basename(asset_data['path'])}"
            )
        else:
            # Remove individual files for asset
            for file in asset_data["files"]:
                remove_list.append(file)
                # Compose tmp path
                asset_dir = os.path.dirname(file)
                basename = os.path.basename(file)
                tmp_path = os.path.join(asset_dir, "tmp", basename)
                if os.path.isfile(tmp_path):
                    remove_list.append(tmp_path)
                    if config.log_level.lower() == "debug":
                        messages.append(f"Removing duplicate in tmp: {tmp_path}")
                messages.append(f"Removing file: {basename}")

        remove_data.append(
            {
                "title": asset_data["title"],
                "year": asset_data["year"],
                "messages": messages,
            }
        )

    if not config.dry_run:
        for path in remove_list:
            try:
                if os.path.isdir(path):
                    shutil.rmtree(path)
                else:
                    os.remove(path)
                    # Remove parent folder if empty after file removal
                    folder_path = os.path.dirname(path)
                    if not os.listdir(folder_path):
                        os.rmdir(folder_path)
            except OSError as e:
                logger.error(f"Error: {e}")
                logger.error(f"Failed to remove: {path}")
                continue

        # Clean up any remaining empty folders in source directories
        for assets_path in config.source_dirs:
            for root, dirs, files in os.walk(assets_path, topdown=False):
                for dir_name in dirs:
                    dir_path = os.path.join(root, dir_name)
                    if not os.listdir(dir_path):
                        try:
                            logger.info(f"Removing empty folder: {dir_name}")
                            os.rmdir(dir_path)
                        except OSError as e:
                            logger.error(f"Error: {e}")
                            logger.error(f"Failed to remove: {dir_path}")
                            continue

    return remove_data


def print_output(
    remove_data: List[Dict[str, Union[str, int, List[str]]]], logger: Logger
) -> None:
    """
    Print summary of removed assets and messages.

    Args:
        remove_data: List of dictionaries with removal information.
        logger: Logger instance.
    """
    # Add a banner/table at the very top
    table = [["Assets Removed Summary"]]
    logger.info(create_table(table))

    count: int = 0

    for data in remove_data:
        title: str = data["title"]
        year: Optional[int] = data.get("year")
        if year:
            logger.info(f"• {title} ({year})")
        else:
            logger.info(f"• {title}")

        asset_messages: List[str] = data["messages"]
        for message in asset_messages:
            logger.info(f"   - {message}")
            count += 1

    logger.info(f"\nTotal number of assets removed: {count}")


def main(config: SimpleNamespace) -> None:
    """
    Main function to load media, match assets, and remove unmatched assets.

    Args:
        config: Configuration namespace.
    """
    logger = Logger(config.log_level, config.module_name)
    remove_data = []

    try:
        if config.log_level.lower() == "debug":
            print_settings(logger, config)

        if config.dry_run:
            table = [["Dry Run"], ["NO CHANGES WILL BE MADE"]]
            logger.info(create_table(table))
        # Load assets from source directories
        prefix_index = create_new_empty_index()
        assets_dict, prefix_index = get_assets_files(config.source_dirs, logger)
        if not assets_dict:
            logger.error(
                f"No assets found in the source directories: {config.source_dirs}"
            )
            return

        media_dict = {"movies": [], "series": [], "collections": []}

        if not config.instances:
            logger.error("No instances found. Exiting script.")
            return

        for instance in config.instances:
            if isinstance(instance, dict):
                instance_name, instance_settings = next(iter(instance.items()))
            else:
                instance_name = instance
                instance_settings = {}

            found = False
            instance_type = None
            instance_data = None

            for itype, idata in config.instances_config.items():
                if instance_name in idata:
                    found = True
                    instance_type = itype
                    instance_data = idata
                    break

            if not found or instance_type is None or instance_data is None:
                logger.warning(
                    f"Instance '{instance_name}' not found in config.instances_config. Skipping."
                )
                continue

            if instance_type == "plex":
                url = instance_data[instance_name]["url"]
                api = instance_data[instance_name]["api"]
                try:
                    app = PlexServer(url, api)
                except Exception as e:
                    logger.error(f"Error connecting to Plex: {e}")
                    app = None

                if app:
                    library_names = instance_settings.get("library_names", [])
                    if library_names:
                        logger.info("Fetching Plex collections...")
                        results = get_plex_data(
                            app,
                            library_names,
                            logger,
                            include_smart=True,
                            collections_only=True,
                        )
                        media_dict["collections"].extend(results)
                    else:
                        logger.warning(
                            f"No library names specified for Plex instance '{instance_name}'. Skipping."
                        )
            else:
                url = instance_data[instance_name]["url"]
                api = instance_data[instance_name]["api"]
                app = create_arr_client(url, api, logger)

                if app and app.connect_status:
                    logger.info(f"Fetching {app.instance_name} data...")
                    results = app.get_parsed_media(include_episode=False)
                    if results:
                        if instance_type == "radarr":
                            media_dict["movies"].extend(results)
                        elif instance_type == "sonarr":
                            media_dict["series"].extend(results)
                    else:
                        logger.warning(
                            f"No {instance_type.capitalize()} data found for instance '{instance_name}'."
                        )

        if not any(media_dict.values()):
            logger.error(
                "No media found. Check 'instances' setting in your config. Exiting."
            )
            return
        if media_dict and prefix_index:
            logger.info("Matching assets to media, please wait...")
            unmatched_dict = match_assets_to_media(
                media_dict,
                prefix_index,
                logger,
                return_unmatched_assets=True,
                config=config,
                strict_folder_match=True,
            )

        if any(unmatched_dict.values()):
            remove_data = remove_assets(unmatched_dict, config, logger)
            if remove_data:
                print_output(remove_data, logger)
        else:
            logger.info("✅ No assets needed to be removed. Everything is in sync!")

        # Only dump debug JSON if we're in debug mode
        if config.log_level.lower() == "debug":
            logger.debug("Dumping debug data for assets/media/unmatched/remove_data.")
            print_json(assets_dict, logger, config.module_name, "assets_dict")
            print_json(media_dict, logger, config.module_name, "media_dict")
            print_json(unmatched_dict, logger, config.module_name, "unmatched_dict")
            print_json(remove_data, logger, config.module_name, "remove_data")

    except KeyboardInterrupt:
        print("Keyboard Interrupt detected. Exiting...")
        sys.exit()
    except Exception:
        logger.error("\n\nAn error occurred:\n", exc_info=True)
        logger.error("\n\n")
    finally:
        logger.log_outro()
