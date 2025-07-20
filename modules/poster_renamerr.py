import filecmp
import os
import shutil
import sys
from types import SimpleNamespace
from typing import Any, Dict, List

from pathvalidate import is_valid_filename, sanitize_filename

from util.config import Config
from util.connector import update_client_databases, update_collections_database
from util.database import DapsDB
from util.helper import (
    create_table,
    match_assets_to_media,
    print_settings,
    progress,
)
from util.logger import Logger
from util.notification import NotificationManager
from util.poster_import import merge_assets
from util.upload_posters import upload_posters


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


def rename_files(
    config: SimpleNamespace,
    logger: Any,
    db: Any,
) -> tuple:
    """
    Prepares assets for renaming or generates a manifest of asset IDs for border replacerr.
    - Always builds and returns the manifest (list of IDs).
    - Only performs file operations if NOT running border_replacerr.
    - Always updates the renamed_file column in the database for each asset.
    - Always reports output.
    """
    output: Dict[str, List[Dict[str, Any]]] = {
        "collection": [],
        "movie": [],
        "show": [],
    }
    manifest = {"media_cache": [], "collections_cache": []}
    matched_assets = []

    # --- Gather matched/unrenamed media assets ---
    for inst in config.instances:
        if isinstance(inst, str):
            # Radarr/Sonarr/other non-Plex
            instance_name = inst
            for row in db.media.get_by_instance(instance_name):
                if row.get("matched") and (
                    not row.get("renamed_file")
                    or not os.path.exists(row.get("renamed_file"))
                ):
                    matched_assets.append(row)
        elif isinstance(inst, dict):
            for instance_name, params in inst.items():
                library_names = params.get("library_names", [])
                if library_names:
                    for library_name in library_names:
                        # Add matched, not-yet-renamed collections
                        for row in db.collection.get_by_instance_and_library(
                            instance_name, library_name
                        ):
                            if row.get("matched") and (
                                not row.get("renamed_file")
                                or not os.path.exists(row.get("renamed_file"))
                            ):
                                matched_assets.append(row)
                # If you want to support Plex media as well, add that here if needed

    if matched_assets:
        logger.info("Renaming assets please wait...")
        with progress(
            matched_assets,
            desc="Renaming assets",
            total=len(matched_assets),
            unit="assets",
            logger=logger,
        ) as bar:
            for item in bar:
                asset_type = item.get("asset_type")
                if asset_type not in output:
                    logger.debug(f"Skipping unknown asset_type: {asset_type}")
                    continue

                file = item.get("original_file") or item.get("file")
                folder = item.get("folder", item.get("media_folder", "")) or ""
                # Sanitize folder for collections
                if asset_type == "collection" and not is_valid_filename(folder):
                    folder = sanitize_filename(folder)

                # Destination folder
                if getattr(config, "asset_folders", False):
                    dest_dir = os.path.join(config.destination_dir, folder)
                    if (
                        not os.path.exists(dest_dir)
                        and not config.dry_run
                        and not config.run_border_replacerr
                    ):
                        os.makedirs(dest_dir)
                else:
                    dest_dir = config.destination_dir

                file_name = os.path.basename(file)
                file_extension = os.path.splitext(file)[1]
                season_number = item.get("season_number")
                if asset_type == "show" and season_number is not None:
                    season_str = str(season_number).zfill(2)
                    if getattr(config, "asset_folders", False):
                        new_file_name = f"Season{season_str}{file_extension}"
                    else:
                        new_file_name = f"{folder}_Season{season_str}{file_extension}"
                    new_file_path = os.path.join(dest_dir, new_file_name)
                else:
                    if getattr(config, "asset_folders", False):
                        new_file_name = f"poster{file_extension}"
                    else:
                        new_file_name = f"{folder}{file_extension}"
                    new_file_path = os.path.join(dest_dir, new_file_name)

                # Always update the intended path in the DB
                item["renamed_file"] = new_file_path

                if asset_type == "collection":
                    db.collection.update(
                        title=item.get("title"),
                        year=item.get("year"),
                        library_name=item.get("library_name"),
                        instance_name=item.get("instance_name"),
                        matched_value=None,
                        original_file=None,
                        renamed_file=new_file_path,
                    )
                else:
                    db.media.update(
                        asset_type=asset_type,
                        title=item.get("title"),
                        year=item.get("year"),
                        instance_name=item.get("instance_name"),
                        matched_value=None,
                        season_number=item.get("season_number"),
                        original_file=None,
                        renamed_file=new_file_path,
                    )

                if asset_type == "collection":
                    manifest["collections_cache"].append(item.get("id"))
                else:
                    manifest["media_cache"].append(item.get("id"))
                messages = []
                discord_messages = []

                # --- Output/report logic, but skip file ops if inline mode ---
                # Only do file ops if not run_border_replacerr
                file_ops_enabled = not getattr(config, "run_border_replacerr", False)

                if os.path.lexists(new_file_path):
                    existing_file = os.path.join(dest_dir, new_file_name)
                    if not filecmp.cmp(file, existing_file):
                        if file_name != new_file_name:
                            messages.append(f"{file_name} -renamed-> {new_file_name}")
                            discord_messages.append(f"{new_file_name}")
                        else:
                            if not getattr(config, "print_only_renames", False):
                                messages.append(
                                    f"{file_name} -not-renamed-> {new_file_name}"
                                )
                                discord_messages.append(f"{new_file_name}")
                        if file_ops_enabled and not config.dry_run:
                            if getattr(config, "action_type", None) in [
                                "hardlink",
                                "symlink",
                            ]:
                                os.remove(new_file_path)
                            process_file(
                                file, new_file_path, config.action_type, logger
                            )
                else:
                    if file_name != new_file_name:
                        messages.append(f"{file_name} -renamed-> {new_file_name}")
                        discord_messages.append(f"{new_file_name}")
                    else:
                        if not getattr(config, "print_only_renames", False):
                            messages.append(
                                f"{file_name} -not-renamed-> {new_file_name}"
                            )
                            discord_messages.append(f"{new_file_name}")
                    if file_ops_enabled and not config.dry_run:
                        process_file(file, new_file_path, config.action_type, logger)

                if messages or discord_messages:
                    output[asset_type].append(
                        {
                            "title": item.get("title"),
                            "year": item.get("year"),
                            "folder": folder,
                            "messages": messages,
                            "discord_messages": discord_messages,
                        }
                    )
    return output, manifest


def handle_output(output: Dict[str, List[Dict[str, Any]]], logger: Any) -> None:
    """
    Print final rename results to the logger by asset type in a clean, grouped format.
    Groups shows by (title, year, folder) with all their messages together.
    """
    headers = {"collection": "Collection", "movie": "Movie", "show": "Show"}

    for asset_type in ["collection", "movie", "show"]:
        assets = output.get(asset_type, [])
        header = f"{headers.get(asset_type, asset_type.capitalize())}s"
        logger.info(create_table([[header]]))

        if not assets:
            logger.info(f"No {header.lower()}s to rename\n")
            continue

        # ---- GROUPING LOGIC FOR SHOWS ----
        if asset_type == "show":
            grouped = {}
            for asset in assets:
                key = (asset.get("title"), asset.get("year"), asset.get("folder"))
                grouped.setdefault(key, {"messages": [], "discord_messages": []})
                grouped[key]["messages"].extend(asset.get("messages", []))
                grouped[key]["discord_messages"].extend(
                    asset.get("discord_messages", [])
                )

            for (title, year, folder), data in grouped.items():
                display = f"{title} ({year})" if year else f"{title}"
                logger.info(display)
                for msg in data["messages"]:
                    logger.info(f"\t{msg}")
                logger.info("")  # Spacing

        else:
            # No grouping needed for movie/collection
            for asset in assets:
                title = asset.get("title") or ""
                year = asset.get("year")
                display = f"{title} ({year})" if year else f"{title}"
                logger.info(display)
                for msg in asset.get("messages", []):
                    logger.info(f"\t{msg}")
                logger.info("")


def ensure_destination_dir(config: SimpleNamespace, logger: Any) -> None:
    if not os.path.exists(config.destination_dir):
        logger.info(f"Creating destination directory: {config.destination_dir}")
        os.makedirs(config.destination_dir)
    else:
        logger.debug(f"Destination directory already exists: {config.destination_dir}")


def sync_posters(config: SimpleNamespace, logger: Any) -> None:
    if getattr(config, "sync_posters", False):
        logger.info("Running sync_gdrive")
        from modules.sync_gdrive import main as gdrive_main
        from util.config import Config

        gdrive_config = Config("sync_gdrive").module_config
        gdrive_main(gdrive_config)
        logger.info("Finished running sync_gdrive")
    else:
        logger.debug("Sync posters is disabled. Skipping...")


def run_border_replacerr(
    db: DapsDB, config: SimpleNamespace, manifest: List[int], logger: Any
) -> None:
    """
    Orchestrates calling border_replacerr in manifest/inline mode, passing only the list of asset IDs.
    - Manifest is a list of media_cache IDs that require border replacement.
    - All file handling is controlled via the DB, no temp dirs or legacy file lists are used.
    """
    from modules.border_replacerr import run_replacerr

    logger.debug(
        "\nRunning border replacerr:\n"
        f"  Media assets to process: {len(manifest.get('media_cache', []))}\n"
        f"  Collection assets to process: {len(manifest.get('collections_cache', []))}\n"
        f"  Total assets to process: {len(manifest.get('media_cache', [])) + len(manifest.get('collections_cache', []))}\n"
    )

    run_replacerr(
        db,
        config,
        manifest,
        logger,
    )
    logger.info("Finished running border_replacerr.")


def main() -> None:
    """
    Orchestrator entrypoint for poster_renamerr.
    Handles setup, sequencing, error handling, and cleanup.
    Actual sync/match/rename/etc is delegated to helpers.
    """

    config = Config("poster_renamerr")
    logger = Logger(getattr(config, "log_level", "INFO"), config.module_name)
    db = DapsDB()

    try:
        if getattr(config, "log_level", "INFO") == "debug":
            print_settings(logger, config)

        ensure_destination_dir(config, logger)

        if config.dry_run:
            logger.info(create_table([["Dry Run"], ["NO CHANGES WILL BE MADE"]]))

        sync_posters(config, logger)

        logger.info("Gathering all the posters, please wait...")
        db.poster.clear()
        merge_assets(db, config.source_dirs, logger)
        print("Finished gathering posters.")

        update_client_databases(db, config, logger)
        update_collections_database(db, config, logger)

        match_assets_to_media(db, logger, config)
        output, manifest = rename_files(config, logger, db)

        if config.report_unmatched_assets:
            db.close()
            from modules.unmatched_assets import main as report_unmatched_assets

            report_unmatched_assets()

        if config.run_cleanarr:
            cleanarr_logger = Logger(getattr(config, "log_level", "INFO"), "cleanarr")
            db.orphaned.handle_orphaned_posters(cleanarr_logger, config.dry_run)

        if config.run_border_replacerr:
            run_border_replacerr(db, config, manifest, logger)

        upload_posters(config, db, logger, manifest)

        if any(output.values()):
            handle_output(output, logger)
            manager = NotificationManager(
                config, logger, module_name=config.module_name
            )
            manager.send_notification(output)

    except KeyboardInterrupt:
        print("Keyboard Interrupt detected. Exiting...")
        sys.exit()
    except Exception:
        logger.error("\n\nAn error occurred:\n", exc_info=True)
    finally:
        db.close()
        logger.log_outro()
