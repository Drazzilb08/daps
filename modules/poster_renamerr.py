import os
import sys
import re
import filecmp
import shutil
import copy
from typing import List, Dict, Tuple, Any
from types import SimpleNamespace

from util.logger import Logger
from util.arrpy import create_arr_client
from util.utility import (
    print_json,
    print_settings,
    create_table,
    get_plex_data,
)
from util.notification import send_notification
from util.index import create_new_empty_index
from util.match import match_assets_to_media
from util.assets import get_assets_files
from util.constants import year_regex

try:
    from plexapi.server import PlexServer
    from util.utility import progress
    from pathvalidate import sanitize_filename, is_valid_filename
except ImportError as e:
    print(f"ImportError: {e}")
    print("Please install the required modules with 'pip install -r requirements.txt'")
    exit(1)

def process_file(file: str, new_file_path: str, action_type: str, logger: Any) -> None:
    """
    Perform a file operation (copy, move, hardlink, or symlink) between paths.
    Args:
        file: Original file path.
        new_file_path: Destination file path.
        action_type: Operation type: 'copy', 'move', 'hardlink', or 'symlink'.
        logger: Logger for error reporting.
    Returns:
        None
    """
    try:
        if action_type == "copy":
            shutil.copy(file, new_file_path)
        elif action_type == "move":
            shutil.move(file, new_file_path)
        elif action_type == "hardlink":
            os.link(file, new_file_path)
        elif action_type == "symlink":
            os.symlink(file, new_file_path)
    except OSError as e:
        logger.error(f"Error {action_type}ing file: {e}")


def match_data(
    media_dict: Dict[str, List[Dict[str, Any]]],
    prefix_index: Dict[str, Dict[str, Any]],
    logger: Any
) -> Dict[str, Dict[str, List[Dict[str, Any]]]]:
    """
    Match assets against media using title/index similarity.
    Args:
        media_dict: Media categorized by type.
        prefix_index: Index for prefix/title lookup.
        logger: Logger for logging.
    Returns:
        Dictionary of matched/unmatched assets.
    """
    return match_assets_to_media(media_dict, prefix_index, logger)


def rename_files(
    matched_assets: Dict[str, List[Dict[str, Any]]],
    config: SimpleNamespace,
    logger: Any
) -> Tuple[Dict[str, List[Dict[str, Any]]], List[str]]:
    """
    Rename matched assets to Plex-compatible filenames and handle folder structure.
    Args:
        matched_assets: Dictionary of matched poster assets.
        config: Module configuration.
        logger: Logger instance.
    Returns:
        Tuple of output message dict and renamed assets dict.
    """
    output: Dict[str, List[Dict[str, Any]]] = {}
    renamed_files = []
    # Determine destination based on dry run and border replacer
    if config.run_border_replacerr:
        tmp_dir = os.path.join(config.destination_dir, 'tmp')
        if not config.dry_run:
            if not os.path.exists(tmp_dir):
                os.makedirs(tmp_dir)
            else:
                logger.debug(f"{tmp_dir} already exists")
            destination_dir = tmp_dir
        else:
            logger.debug(f"Would create folder {tmp_dir}")
            destination_dir = tmp_dir
    else:
        destination_dir = config.destination_dir

    asset_types: List[str] = ['collections', 'movies', 'series']
    print("Renaming assets please wait...")
    for asset_type in asset_types:
        output[asset_type] = []
        if matched_assets[asset_type]:
            with progress(
                matched_assets[asset_type],
                desc=f"Renaming {asset_type}",
                total=len(matched_assets[asset_type]),
                unit="item",
                logger=logger
            ) as pbar:
                for item in pbar:
                    messages: List[str] = []
                    discord_messages: List[str] = []
                    files = item['files']
                    folder = item['folder']
                    # Sanitize folder name for collections
                    if asset_type == "collections":
                        if not is_valid_filename(folder):
                            folder = sanitize_filename(folder)
                    # Construct destination folder
                    if config.asset_folders:
                        dest_dir = os.path.join(destination_dir, folder)
                        if not os.path.exists(dest_dir):
                            if not config.dry_run:
                                os.makedirs(dest_dir)
                    else:
                        dest_dir = destination_dir
                    # Rename each asset file
                    for file in files:
                        file_name = os.path.basename(file)
                        file_extension = os.path.splitext(file)[1]
                        if re.search(r' - Season| - Specials', file_name):
                            try:
                                season_number = (
                                    re.search(r"Season (\d+)", file_name).group(1)
                                    if "Season" in file_name else "00"
                                ).zfill(2)
                            except AttributeError:
                                logger.debug(f"Error extracting season number from {file_name}")
                                continue
                            if config.asset_folders:
                                new_file_name = f"Season{season_number}{file_extension}"
                            else:
                                new_file_name = f"{folder}_Season{season_number}{file_extension}"
                            new_file_path = os.path.join(dest_dir, new_file_name)
                        else:
                            if config.asset_folders:
                                new_file_name = f"poster{file_extension}"
                            else:
                                new_file_name = f"{folder}{file_extension}"
                            new_file_path = os.path.join(dest_dir, new_file_name)
                        # Check if destination exists and is different
                        if os.path.lexists(new_file_path):
                            existing_file = os.path.join(dest_dir, new_file_name)
                            try:
                                if not filecmp.cmp(file, existing_file):
                                    if file_name != new_file_name:
                                        messages.append(f"{file_name} -renamed-> {new_file_name}")
                                        discord_messages.append(f"{new_file_name}")
                                    else:
                                        if not config.print_only_renames:
                                            messages.append(f"{file_name} -not-renamed-> {new_file_name}")
                                            discord_messages.append(f"{new_file_name}")
                                    if not config.dry_run:
                                        if config.action_type in ["hardlink", "symlink"]:
                                            os.remove(new_file_path)
                                        process_file(file, new_file_path, config.action_type, logger)
                                        renamed_files.append(new_file_path)
                            except FileNotFoundError:
                                if not config.dry_run:
                                    os.remove(new_file_path)
                                    process_file(file, new_file_path, config.action_type, logger)
                                    renamed_files.append(new_file_path)
                        else:
                            if file_name != new_file_name:
                                messages.append(f"{file_name} -renamed-> {new_file_name}")
                                discord_messages.append(f"{new_file_name}")
                            else:
                                if not config.print_only_renames:
                                    messages.append(f"{file_name} -not-renamed-> {new_file_name}")
                                    discord_messages.append(f"{new_file_name}")
                            if not config.dry_run:
                                process_file(file, new_file_path, config.action_type, logger)
                                renamed_files.append(new_file_path)
                    if messages or discord_messages:
                        output[asset_type].append({
                            'title': item['title'],
                            'year': item['year'],
                            'folder': item['folder'],
                            'messages': messages,
                            'discord_messages': discord_messages,
                        })
        else:
            print(f"No {asset_type} to rename")
    return output, renamed_files


def handle_output(
    output: Dict[str, List[Dict[str, Any]]],
    config: SimpleNamespace,
    logger: Any
) -> None:
    """
    Print final rename results to the logger by asset type.
    Args:
        output: Collected messages by asset type.
        config: Configuration settings.
        logger: Logger for printing.
    Returns:
        None
    """
    for asset_type, assets in output.items():
        if assets:
            table = [
                [f"{asset_type.capitalize()}"],
            ]
            if any(asset['messages'] for asset in assets):
                logger.info(create_table(table))
            for asset in assets:
                title = asset['title']
                title = year_regex.sub("", title).strip()
                year = asset['year']
                folder = asset['folder']
                messages = asset['messages']
                if year:
                    year = f" ({year})"
                else:
                    year = ""
                messages.sort()
                if messages:
                    logger.info(f"{title}{year}")
                    if config.asset_folders:
                        if config.dry_run:
                            logger.info(f"\tWould create folder '{folder}'")
                        else:
                            logger.info(f"\tCreated folder '{folder}'")
                    for message in messages:
                        logger.info(f"\t{message}")
                    logger.info("")
        else:
            logger.info(f"No {asset_type} to rename")


def main(config: SimpleNamespace) -> None:
    """
    Entrypoint for poster_renamerr.py.
    Loads configuration, fetches media and assets, matches posters, performs renames,
    and optionally syncs to Google Drive and runs border replacerr if enabled.
    Args:
        config: Parsed config from user settings.
    Returns:
        None
    """
    logger = Logger(config.log_level, config.module_name)
    try:
        if config.log_level.lower() == "debug":
            print_settings(logger, config)
        if not os.path.exists(config.destination_dir):
            logger.info(f"Creating destination directory: {config.destination_dir}")
            os.makedirs(config.destination_dir)
        else:
            logger.debug(f"Destination directory already exists: {config.destination_dir}")
        if config.dry_run:
            table = [
                ["Dry Run"],
                ["NO CHANGES WILL BE MADE"]
            ]
            logger.info(create_table(table))
        if config.sync_posters:
            logger.info("Running sync_gdrive")
            from modules.sync_gdrive import main as gdrive_main
            from util.config import Config
            gdrive_config = Config("sync_gdrive").module_config
            gdrive_main(gdrive_config)
            logger.info("Finished running sync_gdrive")
        else:
            logger.debug("Sync posters is disabled. Skipping...")
        prefix_index = create_new_empty_index()
        print("Gathering all the posters, please wait...")
        assets_dict, prefix_index = get_assets_files(config.source_dirs, logger)
        if not assets_dict:
            logger.error("No assets found in the source directories. Exiting module...")
            return
        media_dict: Dict[str, List[Dict[str, Any]]] = {
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
                found = False
                for instance_type, instance_data in config.instances_config.items():
                    if instance_name in instance_data:
                        found = True
                        break
                if not found:
                    logger.warning(f"Instance '{instance_name}' not found in config.instances_config. Skipping.")
                    continue
                if instance_type == "plex":
                    url = instance_data[instance_name]['url']
                    api = instance_data[instance_name]['api']
                    try:
                        app = PlexServer(url, api)
                    except Exception as e:
                        logger.error(f"Error connecting to Plex: {e}")
                        app = None
                    if app:
                        library_names = instance_settings.get('library_names', [])
                        if library_names:
                            print("Getting Plex data...")
                            results = get_plex_data(app, library_names, logger, include_smart=True, collections_only=True)
                            media_dict['collections'].extend(results)
                        else:
                            logger.warning("No library names specified for Plex instance. Skipping Plex.")
                else:
                    url = instance_data[instance_name]['url']
                    api = instance_data[instance_name]['api']
                    app = create_arr_client(url, api, logger)
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
            logger.error("No instances found. Exiting module...")
            return
        if not any(media_dict.values()):
            logger.error("No media found, Check instances setting in your config. Exiting.")
            return
        renamed_assets = None
        if media_dict and assets_dict:
            print("Matching media to assets please wait...")
            combined_dict = match_data(media_dict, prefix_index, logger)
            if any(combined_dict.get('unmatched', {}).values()):
                combined_dict_copy = copy.deepcopy(combined_dict)
                for key in ['matched', 'unmatched']:
                    for media_type, media_list in combined_dict_copy[key].items():
                        for media in media_list:
                            if 'seasons' in media:
                                del media['seasons']
                if config.log_level == "debug":
                    print_json(assets_dict, logger, config.module_name, "assets_dict")
                    print_json(media_dict, logger, config.module_name, "media_dict")
                    print_json(prefix_index, logger, config.module_name, "prefix_index")
                    print_json(combined_dict_copy['matched'], logger, config.module_name, "matched")
                    print_json(combined_dict_copy['unmatched'], logger, config.module_name, "unmatched")
            else:
                logger.debug("No unmatched assets found.")
            matched_assets = combined_dict.get('matched', None)
            if matched_assets and any(matched_assets.values()):
                output, renamed_files = rename_files(matched_assets, config, logger)
                if any(output.values()):
                    handle_output(output, config, logger)
                    send_notification(
                        logger=logger,
                        module_name=config.module_name,
                        config=config,
                        output=output,
                    )
                else:
                    logger.info("No new posters to rename.")
            else:
                logger.info("No assets matched to media.")
        if config.run_border_replacerr:
            tmp_dir = os.path.join(config.destination_dir, 'tmp')
            from modules.border_replacerr import process_files
            from util.config import Config
            from util.scanner import process_selected_files
            replacerr_config = Config("border_replacerr").module_config
            # Simplified conditional logic for incremental/full run
            if config.incremental_border_replacerr:
                if renamed_files:
                    renamed_assets = process_selected_files(renamed_files, logger, asset_folders=config.asset_folders)
                    logger.info("\nDoing an incremental run on only assets that were provided\nStarting Border Replacerr...\n")
                    process_files(
                        tmp_dir,
                        config=replacerr_config,
                        logger=None,
                        renamerr_config=config,
                        renamed_assets=renamed_assets,
                        incremental_run=True
                    )
                    logger.info(f"Finished running border_replacerr.pyu")
                else:
                    logger.info("\nNo new assets to incrementally perform with border_replacerr.\nSkipping Border Replacerr..")
            else:
                logger.info("\nDoing a full run with Border Replacerr\nStarting Border Replacerr...\n")
                process_files(
                    tmp_dir,
                    config=replacerr_config,
                    logger=None,
                    renamerr_config=config,
                    renamed_assets=renamed_assets,
                    incremental_run=False
                )
                logger.info(f"Finished running border_replacerr.py")
    except KeyboardInterrupt:
        print("Keyboard Interrupt detected. Exiting...")
        sys.exit()
    except Exception:
        logger.error("\n\nAn error occurred:\n", exc_info=True)
        logger.error("\n\n")
