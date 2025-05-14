import os
import shutil
import sys
from types import SimpleNamespace
from typing import List, Dict, Optional, Union

from util.logger import Logger
from util.arrpy import create_arr_client
from util.utility import (
    create_table,
    print_settings,
    get_plex_data,
    print_json,
    progress
)
from util.match import is_match
from util.assets import get_assets_files

try:
    from plexapi.server import PlexServer
except ImportError as e:
    print(f"ImportError: {e}")
    print("Please install the required modules with 'pip install -r requirements.txt'")
    exit(1)


def match_data(
    assets_dict: Dict[str, List[Dict[str, Union[str, int, List[str]]]]],
    media_dict: Dict[str, List[Dict[str, Union[str, int]]]],
    config: SimpleNamespace,
    logger: Logger
) -> List[Dict[str, Union[str, int, List[str], None]]]:
    """
    Match assets to media entries and return list of unmatched assets.

    Args:
        assets_dict: Dictionary of assets categorized by type.
        media_dict: Dictionary of media entries categorized by type.
        config: Configuration namespace.
        logger: Logger instance.

    Returns:
        List of unmatched asset dictionaries.
    """
    unmatched_assets: List[Dict[str, Union[str, int, List[str], None]]] = []
    asset_types: List[str] = ['movies', 'series', 'collections']

    with progress(asset_types, desc="Asset Types", total=len(asset_types), unit="type", logger=logger) as outer:
        for asset_type in outer:
            items: List[Dict[str, Union[str, int, List[str]]]] = assets_dict.get(asset_type, [])
            with progress(items, desc=f"Matching {asset_type}", total=len(items), unit="asset", logger=logger, leave=False) as pbar:
                for asset_data in pbar:
                    if asset_data['title'] == "tmp":
                        continue

                    matched: bool = False

                    if not asset_data['files']:
                        # Asset with no files is automatically unmatched
                        unmatched_assets.append({
                            'title': asset_data['title'],
                            'year': asset_data['year'],
                            'files': asset_data['files'],
                            'path': asset_data.get('path', None)
                        })
                        continue

                    # Check for match against media entries
                    for media_data in media_dict.get(asset_type, []):
                        if is_match(asset_data, media_data, logger):
                            matched = True
                            break

                    if not matched:
                        # Skip assets in ignore_media list
                        if config.ignore_media and f"{asset_data['title']} ({asset_data['year']})" in config.ignore_media:
                            print(f"{asset_data['title']} ({asset_data['year']}) is in ignore_media, skipping...")
                            continue
                        unmatched_assets.append({
                            'title': asset_data['title'],
                            'year': asset_data['year'],
                            'files': asset_data['files'],
                            'path': asset_data.get('path', None)
                        })
    return unmatched_assets


def remove_assets(
    unmatched_dict: List[Dict[str, Union[str, int, List[str], None]]],
    config: SimpleNamespace,
    logger: Logger
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

    for asset_data in unmatched_dict:
        messages: List[str] = []

        if not asset_data['files'] and asset_data.get('path'):
            # Remove empty folder asset
            remove_list.append(asset_data['path'])
            messages.append(f"Removing empty folder: {os.path.basename(asset_data['path'])}")
        else:
            # Remove individual files for asset
            for file in asset_data['files']:
                remove_list.append(file)
                messages.append(f"Removing file: {os.path.basename(file)}")

        remove_data.append({
            'title': asset_data['title'],
            'year': asset_data['year'],
            'messages': messages
        })

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


def print_output(remove_data: List[Dict[str, Union[str, int, List[str]]]], logger: Logger) -> None:
    """
    Print summary of removed assets and messages.

    Args:
        remove_data: List of dictionaries with removal information.
        logger: Logger instance.
    """
    count: int = 0

    for data in remove_data:
        title: str = data['title']
        year: Optional[int] = data.get('year')
        if year:
            logger.info(f"\t{title} ({year})")
        else:
            logger.info(f"\t{title}")

        asset_messages: List[str] = data['messages']
        for message in asset_messages:
            logger.info(f"\t\t{message}")
            count += 1
        logger.info("")

    logger.info(f"\nTotal number of assets removed: {count}")


def main(config: SimpleNamespace) -> None:
    """
    Main function to load media, match assets, and remove unmatched assets.

    Args:
        config: Configuration namespace.
    """
    logger = Logger(config.log_level, config.module_name)

    try:
        if config.log_level.lower() == "debug":
            print_settings(logger, config)

        if config.dry_run:
            table = [
                ["Dry Run"],
                ["NO CHANGES WILL BE MADE"]
            ]
            logger.info(create_table(table))

        # Load assets from source directories
        assets_dict: Dict[str, List[Dict[str, Union[str, int, List[str]]]]] = {}
        assets_dict, prefix_index = get_assets_files(config.source_dirs, logger)
        if not assets_dict:
            logger.error(f"No assets found in the source directories: {config.source_dirs}")
            return

        media_dict: Dict[str, List[Dict[str, Union[str, int]]]] = {
            'movies': [],
            'series': [],
            'collections': []
        }

        if config.instances:
            for instance in config.instances:
                if isinstance(instance, dict):
                    instance_name, instance_settings = next(iter(instance.items()))
                else:
                    instance_name = instance
                    instance_settings = {}

                found: bool = False
                instance_type: Optional[str] = None
                instance_data: Optional[Dict[str, Dict[str, str]]] = None

                # Identify instance type and data from config.instances_config
                for itype, idata in config.instances_config.items():
                    if instance_name in idata:
                        found = True
                        instance_type = itype
                        instance_data = idata
                        break

                if not found or instance_type is None or instance_data is None:
                    logger.warning(f"Instance '{instance_name}' not found in config.instances_config. Skipping.")
                    continue

                if instance_type == "plex":
                    url: str = instance_data[instance_name]['url']
                    api: str = instance_data[instance_name]['api']
                    try:
                        app = PlexServer(url, api)
                    except Exception as e:
                        logger.error(f"Error connecting to Plex: {e}")
                        app = None

                    if app:
                        library_names: List[str] = instance_settings.get('library_names', [])
                        if library_names:
                            # Fetch collections from Plex libraries
                            print("Getting Plex data...")
                            results = get_plex_data(app, library_names, logger, include_smart=True, collections_only=True)
                            media_dict['collections'].extend(results)
                        else:
                            logger.warning("No library names specified for Plex instance. Skipping Plex.")
                else:
                    url = instance_data[instance_name]['url']
                    api = instance_data[instance_name]['api']
                    app = create_arr_client(url, api, logger)

                    # Fetch media from Radarr or Sonarr
                    if app and app.connect_status:
                        print(f"Getting {app.instance_name} data...")
                        results = app.get_parsed_media(include_episode=False)
                        if results:
                            if instance_type == "radarr":
                                media_dict['movies'].extend(results)
                            elif instance_type == "sonarr":
                                media_dict['series'].extend(results)
                        else:
                            logger.error(f"No {instance_type.capitalize()} data found.")
        else:
            logger.error("No instances found. Exiting script...")
            return

        if not any(media_dict.values()):
            logger.error("No media found, Check instances setting in your config. Exiting.")
            return

        unmatched_dict = match_data(assets_dict, media_dict, config, logger)
        if unmatched_dict:
            remove_data = remove_assets(unmatched_dict, config, logger)
            if remove_data:
                print_output(remove_data, logger)
        else:
            logger.info("No assets removed.")

        if config.log_level.lower() == "debug":
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
