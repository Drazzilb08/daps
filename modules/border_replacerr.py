import filecmp
import logging
import os
import shutil
from datetime import datetime
from types import SimpleNamespace
from typing import Any, List, Tuple

from PIL import Image

from util.config import Config
from util.database import DapsDB
from util.helper import (
    create_table,
    print_settings,
    progress,
)
from util.logger import Logger

logging.getLogger("PIL").setLevel(logging.WARNING)


def get_holiday_status(
    db: DapsDB,
    config: SimpleNamespace,
    logger: Logger,
) -> dict:
    """
    Returns the current and previous holiday state, and whether a full reset is required.
    """

    now = datetime.now()
    holidays = getattr(config, "holidays", {}) or {}
    default_colors = getattr(config, "border_colors", [])
    skip_enabled = getattr(config, "skip", False)

    # Get last status from DB
    last_status = db.get_last_holiday_status()
    last_active_holiday = last_status.get("last_active_holiday")

    current_holiday = None
    border_colors = None

    for holiday, schedule_color in holidays.items():
        schedule = schedule_color.get("schedule")
        if not schedule or not schedule.startswith("range("):
            continue
        inside = schedule[len("range(") : -1]
        start_str, end_str = inside.split("-", 1)
        sm, sd = map(int, start_str.split("/"))
        em, ed = map(int, end_str.split("/"))
        year = now.year

        start_date = datetime(year, sm, sd)
        end_date = datetime(year, em, ed)
        if end_date < start_date:  # handle year crossover
            if now.month < sm:
                start_date = start_date.replace(year=year - 1)
            else:
                end_date = end_date.replace(year=year + 1)
        if start_date <= now <= end_date:
            color_list = schedule_color.get("color", default_colors)
            if isinstance(color_list, str):
                color_list = [color_list]
            border_colors = [convert_to_rgb(c, logger) for c in color_list]
            current_holiday = holiday
            break

    if not border_colors and default_colors:
        border_colors = [convert_to_rgb(c, logger) for c in default_colors]

    # -- The key logic:
    reset_all = current_holiday != last_active_holiday
    result = {
        "active_holiday": current_holiday,
        "last_active_holiday": last_active_holiday,
        "border_colors": border_colors,
        "skip_enabled": skip_enabled,
        "reset_all": reset_all,
    }
    return result


def convert_to_rgb(hex_color: str, logger: Logger) -> Tuple[int, int, int]:
    """
    Converts a hexadecimal color string to an RGB tuple.

    Args:
        hex_color (str): Hexadecimal color string.
        logger (Logger): Logger instance for logging errors.

    Returns:
        Tuple[int, int, int]: RGB color tuple.
    """
    hex_color = hex_color.strip("#")
    if len(hex_color) == 3:
        hex_color = hex_color * 2
    try:
        color_code = tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))
    except ValueError:
        logger.error(
            f"Error: {hex_color} is not a valid hexadecimal color code.\nDefaulting to white."
        )
        return (255, 255, 255)
    return color_code


def replace_borders(
    original_file: str,
    renamed_file: str,
    border_color: Tuple[int, int, int],
    border_width: int,
    logger: Logger,
) -> bool:
    """
    Replace border on an image and save to the renamed_file location.
    Returns True if border replaced and file updated, False otherwise.
    """
    try:
        with Image.open(original_file) as image:
            width, height = image.size
            cropped = image.crop(
                (
                    border_width,
                    border_width,
                    width - border_width,
                    height - border_width,
                )
            )
            new_width = cropped.width + 2 * border_width
            new_height = cropped.height + 2 * border_width
            out_img = Image.new("RGB", (new_width, new_height), border_color)
            out_img.paste(cropped, (border_width, border_width))
            out_img = out_img.resize((1000, 1500)).convert("RGB")

            # Only save if changed, using temp file and filecmp
            tmp_path = f"/tmp/{os.path.basename(renamed_file)}"
            out_img.save(tmp_path)
            if not os.path.exists(renamed_file) or not filecmp.cmp(
                renamed_file, tmp_path
            ):
                os.makedirs(os.path.dirname(renamed_file), exist_ok=True)
                shutil.move(tmp_path, renamed_file)
                logger.debug(
                    f"Replaced border: {os.path.basename(original_file)} → {os.path.basename(renamed_file)}"
                )
                return True
            else:
                os.remove(tmp_path)
                logger.debug(
                    f"No border update needed for {os.path.basename(renamed_file)}"
                )
                return False
    except Exception as e:
        logger.error(
            f"Error replacing border on {os.path.basename(original_file)}: {e}"
        )
        return False


def remove_borders(
    original_file: str,
    renamed_file: str,
    border_width: int,
    logger: Logger,
) -> bool:
    """
    Remove border from an image and save to renamed_file.
    Returns True if border removed and file updated, False otherwise.
    """
    try:
        with Image.open(original_file) as image:
            width, height = image.size
            cropped = image.crop(
                (
                    border_width,
                    border_width,
                    width - border_width,
                    height - border_width,
                )
            )
            cropped = cropped.resize((1000, 1500)).convert("RGB")

            tmp_path = f"/tmp/{os.path.basename(renamed_file)}"
            cropped.save(tmp_path)
            if not os.path.exists(renamed_file) or not filecmp.cmp(
                renamed_file, tmp_path
            ):
                os.makedirs(os.path.dirname(renamed_file), exist_ok=True)
                shutil.move(tmp_path, renamed_file)
                logger.debug(
                    f"Removed border: {os.path.basename(original_file)} → {os.path.basename(renamed_file)}"
                )
                return True
            else:
                os.remove(tmp_path)
                logger.debug(
                    f"No border update needed for {os.path.basename(renamed_file)}"
                )
                return False
    except Exception as e:
        logger.error(f"Error removing border on {os.path.basename(original_file)}: {e}")
        return False


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


def run_replacerr(
    db: DapsDB,
    renamerr_config: SimpleNamespace,
    manifest: List[int],
    logger: Logger,
) -> None:
    replacerr_config = Config("border_replacerr")

    if renamerr_config.log_level.lower() == "debug":
        print_settings(logger, replacerr_config)

    results = get_holiday_status(db, replacerr_config, logger)
    skip_enabled = results["skip_enabled"]
    reset_all = results["reset_all"]
    active_holiday = results["active_holiday"]

    if skip_enabled and not active_holiday:
        logger.info(
            "Border replacerr is in skip mode and today is not a holiday. Skipping all processing."
        )
        db.set_last_holiday_status(active_holiday)
        return
    if skip_enabled and active_holiday:
        logger.info(
            "Border replacerr skip mode: Overriding skip due to active holiday."
        )

    assets = []
    color_index = 0
    processed = 0
    replaced = 0
    removed = 0
    skipped = 0
    if reset_all:
        logger.debug(
            "Holiday state changed (or startup). Doing full reprocessing of all matched assets."
        )
        for row in db.get_media_cache():
            if row.get("matched") == 1:
                if (
                    replacerr_config.exclusion_list
                    and row.get("title") in replacerr_config.exclusion_list
                ):
                    logger.debug(f"Skipping '{row['title']}' (in exclusion_list).")
                    skipped += 1
                    continue
                assets.append(row)
    else:
        # Combine all asset IDs and their types into a single list
        all_ids = [("media_cache", i) for i in manifest.get("media_cache", [])] + [
            ("collections_cache", i) for i in manifest.get("collections_cache", [])
        ]

        for source, asset_id in all_ids:
            if source == "media_cache":
                asset = db.get_media_cache_from_id(asset_id)
            else:
                asset = db.get_collections_cache_from_id(asset_id)
            if not asset:
                logger.warning(f"Asset ID {asset_id} not found in {source}. Skipping.")
                continue
            if (
                replacerr_config.exclusion_list
                and asset.get("title") in replacerr_config.exclusion_list
            ):
                logger.debug(f"Skipping '{asset['title']}' (in exclusion_list).")
                continue
            assets.append(asset)

    if not assets:
        logger.info("No assets to process for border replacerr.")
        db.set_last_holiday_status(active_holiday)
        return

    border_colors = results["border_colors"]
    dry_run = getattr(renamerr_config, "dry_run", False)

    logger.debug(f"Total assets to process: {len(assets)}")
    if border_colors:
        logger.debug(
            f"Border colors: {', '.join(f'#{r:02x}{g:02x}{b:02x}' for (r,g,b) in border_colors)}"
        )
    else:
        logger.debug("Border colors: None (removing borders)")

    logger.info(f"Processing {len(assets)} posters, please wait...")
    with progress(
        assets,
        desc="Processing Posters",
        total=len(assets),
        unit="posters",
        logger=logger,
    ) as bar:
        for asset in bar:
            original_file = asset.get("original_file")
            renamed_file = asset.get("renamed_file")
            title = asset.get("title")
            if not original_file or not renamed_file:
                logger.warning(f"Asset '{title}' missing file info. Skipping.")
                skipped += 1
                continue

            if border_colors:
                color = border_colors[color_index]
                if not dry_run:
                    result = replace_borders(
                        original_file,
                        renamed_file,
                        color,
                        replacerr_config.border_width,
                        logger,
                    )
                else:
                    logger.info(f"[DRY RUN] Would replace border for: {renamed_file}")
                    result = True
                color_index = (color_index + 1) % len(border_colors)
                if result:
                    replaced += 1
                processed += 1
            else:
                if not dry_run:
                    result = remove_borders(
                        original_file,
                        renamed_file,
                        replacerr_config.border_width,
                        logger,
                    )
                else:
                    logger.info(f"[DRY RUN] Would remove border for: {renamed_file}")
                    result = True
                if result:
                    removed += 1
                processed += 1

    logger.info("")  # Spacing
    logger.info(
        create_table(
            [
                ["Border Replacerr Summary"],
            ]
        )
    )
    summary_table = [
        ["Processed", processed],
        ["Skipped", skipped],
    ]
    if replaced:
        summary_table.append(["Borders replaced", replaced])
    elif removed:
        summary_table.append(["Borders removed", removed])
    else:
        summary_table.append(["Borders changed", 0])
    for row in summary_table:
        logger.info(f"{row[0]:<20}: {row[1]}")

    # Human-friendly one-liner
    if replaced or removed:
        action = []
        if replaced:
            action.append(f"{replaced} replaced")
        if removed:
            action.append(f"{removed} removed")
        logger.info(
            f"Border replacerr completed: {processed} processed, {', '.join(action)}, {skipped} skipped."
        )
    else:
        logger.info(
            f"Border replacerr completed: {processed} processed, {skipped} skipped. No borders changed."
        )
    logger.info("")

    # Save current run and active holiday to DB
    db.set_last_holiday_status(active_holiday)
