from types import SimpleNamespace
from typing import List, Tuple, Optional, Dict, Any, Union

import os
import logging
import filecmp
import shutil
import sys
import pathlib

from util.logger import Logger
from util.utility import print_settings, create_table, print_json, progress
from util.scheduler import check_schedule
from util.assets import get_assets_files
from datetime import datetime, timedelta

try:
    from PIL import Image, UnidentifiedImageError
except ImportError as e:
    print(f"ImportError: {e}")
    print("Please install the required modules with 'pip install -r requirements.txt'")
    exit(1)

logging.getLogger("PIL").setLevel(logging.WARNING)


from datetime import datetime
from typing import Optional, List, Dict, Tuple


def load_last_run(log_dir: str) -> Optional[datetime]:
    """
    Load the last run timestamp from the .last_run file in the log directory.
    """
    last_run_file = os.path.join(log_dir, ".last_run")
    if os.path.exists(last_run_file):
        with open(last_run_file, "r") as f:
            ts = f.read().strip()
            try:
                return datetime.fromisoformat(ts)
            except Exception:
                pass
    return None


def save_last_run(log_dir: str, dt: Optional[datetime] = None) -> None:
    """
    Save the current timestamp (or provided datetime) to the .last_run file in the log directory.
    """
    last_run_file = os.path.join(log_dir, ".last_run")
    now = dt or datetime.now()
    with open(last_run_file, "w") as f:
        f.write(now.isoformat())


def check_holiday(
    config: SimpleNamespace, logger: Logger, last_run: Optional[datetime] = None
) -> Tuple[bool, Optional[List[str]], Dict[str, bool]]:
    """
    Determines if today falls within a holiday schedule and returns applicable border colors and switch flags.
    Now supports modules run less than daily by checking if a holiday started or ended since the last run.

    Args:
        config (SimpleNamespace): Configuration object containing holidays.
        logger (Logger): Logger instance for logging messages.
        last_run (Optional[datetime]): Timestamp of last module run.

    Returns:
        Tuple[bool, Optional[List[str]], Dict[str, bool]]:
            - True if today is a holiday, else False.
            - List of border colors if a holiday is active, else None.
            - Dictionary indicating if a holiday started or ended since last run.
    """
    holiday_switch: Dict[str, bool] = {
        "start_since_last_run": False,
        "end_since_last_run": False,
    }
    now = datetime.now()
    for holiday, schedule_color in config.holidays.items():
        schedule = schedule_color.get("schedule")
        if not schedule or not schedule.startswith("range("):
            continue
        inside = schedule[len("range(") : -1]
        start_str, end_str = inside.split("-", 1)
        sm, sd = map(int, start_str.split("/"))
        em, ed = map(int, end_str.split("/"))
        year = now.year
        # Handle ranges that cross the year boundary
        start_date = datetime(year, sm, sd)
        end_date = datetime(year, em, ed)
        if end_date < start_date:
            # Range crosses new year
            if now.month < sm:
                start_date = start_date.replace(year=year - 1)
            else:
                end_date = end_date.replace(year=year + 1)
        # Check if holiday started or ended since last run
        if last_run:
            if start_date > last_run and start_date <= now:
                holiday_switch["start_since_last_run"] = True
            if end_date > last_run and end_date <= now:
                holiday_switch["end_since_last_run"] = True
        else:
            # On first run, treat as start if within holiday
            if start_date <= now <= end_date:
                holiday_switch["start_since_last_run"] = True
        # Is today inside the holiday range?
        if start_date <= now <= end_date:
            holiday_colors = schedule_color.get("color", config.border_colors)
            if isinstance(holiday_colors, str):
                holiday_colors = [holiday_colors]
            logger.info(create_table([[f"Running {holiday.capitalize()} Schedule"]]))
            logger.info(
                f"Schedule: {holiday.capitalize()} | Using {', '.join(holiday_colors)} border colors."
            )
            return True, holiday_colors, holiday_switch
    return False, None, holiday_switch


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


def fix_borders(
    assets_dict: Union[List[Dict[str, Any]], Dict[str, List[Dict[str, Any]]]],
    config: SimpleNamespace,
    border_colors: Optional[List[str]],
    destination_dir: str,
    dry_run: bool,
    logger: Logger,
    exclusion_list: Optional[List[str]],
) -> List[str]:
    """
    Processes image assets and applies or removes borders based on configuration.

    Args:
        assets_dict (Dict[str, List[Dict[str, Any]]]): Dictionary of assets categorized by type.
        config (SimpleNamespace): Module configuration.
        border_colors (Optional[List[str]]): List of border colors to use.
        destination_dir (str): Target output directory.
        dry_run (bool): If True, simulate changes without saving.
        logger (Logger): Logger instance for logging messages.
        exclusion_list (Optional[List[str]]): List of items to exclude from processing.

    Returns:
        List[str]: Status messages for each processed asset.
    """
    # Support flat list or grouped dict by type
    if isinstance(assets_dict, list):
        grouped: Dict[str, List[Dict[str, Any]]] = {}
        for asset in assets_dict:
            asset_type = asset.get("type")
            grouped.setdefault(asset_type, []).append(asset)
        assets_dict = grouped
    rgb_border_colors: List[Tuple[int, int, int]] = []
    if border_colors:
        for color in border_colors:
            rgb_color = convert_to_rgb(color, logger)
            rgb_border_colors.append(rgb_color)
    if not border_colors:
        action = "Removed border"
        banner = "Removing Borders"
    else:
        action = "Replaced border"
        banner = "Replacing Borders"
    if action:
        table = [
            [f"{banner}"],
        ]
        logger.info(create_table(table))
    messages: List[str] = []
    for key, items in assets_dict.items():
        current_index = 0
        if not items:
            logger.info(f"No {key} found in the input directory")
            continue
        with progress(
            items,
            desc=f"Processing {key.capitalize()}",
            total=len(items),
            unit=" items",
            logger=logger,
            leave=True,
        ) as pbar:
            for data in pbar:
                files = data.get("files", None)
                year = data.get("year", None)
                folder = data.get("folder", None)
                if year:
                    year_str = f"({year})"
                else:
                    year_str = ""
                excluded = False
                if exclusion_list and f"{data['title']} {year_str}" in exclusion_list:
                    excluded = True
                    logger.debug(f"Excluding {data['title']} {year_str}")
                # Prepare output directory for saving processed files
                output_path = destination_dir
                for input_file in files:
                    file_name, extension = os.path.splitext(input_file)
                    if extension not in [
                        ".jpg",
                        ".png",
                        ".jpeg",
                        ".JPG",
                        ".PNG",
                        ".JPEG",
                    ]:
                        logger.warning(
                            f"Skipping {input_file} as it is not a jpg or png file."
                        )
                        continue
                    file_name = os.path.basename(input_file)
                    if rgb_border_colors:
                        rgb_border_color = rgb_border_colors[current_index]
                    else:
                        rgb_border_color = None
                    if not dry_run:
                        if rgb_border_color:
                            results = replace_borders(
                                input_file,
                                output_path,
                                rgb_border_color,
                                config.border_width,
                                folder,
                                logger,
                            )
                        else:
                            results = remove_borders(
                                input_file,
                                output_path,
                                config.border_width,
                                logger,
                                excluded,
                                folder,
                            )
                        if results:
                            messages.append(f"{action} on {file_name}")
                    else:
                        messages.append(f"Would have {action} on {file_name}")
                    if rgb_border_colors:
                        current_index = (current_index + 1) % len(rgb_border_colors)
            pbar.update(1)
    return messages


def replace_borders(
    input_file: str,
    output_path: str,
    border_colors: Tuple[int, int, int],
    border_width: int,
    folder: Optional[str],
    logger: Logger,
) -> bool:
    """
    Removes the existing border and applies a new one with the specified color.

    Args:
        input_file (str): Path to the input image file.
        output_path (str): Path to save the processed image.
        border_colors (Tuple[int, int, int]): RGB color for the new border.
        border_width (int): Width of the border to apply.
        folder (Optional[str]): Subfolder to organize output files.
        logger (Logger): Logger instance for logging messages.

    Returns:
        bool: True if the file was saved or updated; False otherwise.
    """
    try:
        with Image.open(input_file) as image:
            width, height = image.size
            # Remove border by cropping
            cropped_image = image.crop(
                (
                    border_width,
                    border_width,
                    width - border_width,
                    height - border_width,
                )
            )
            # Add border by expanding the canvas
            new_width = cropped_image.width + 2 * border_width
            new_height = cropped_image.height + 2 * border_width
            final_image = Image.new("RGB", (new_width, new_height), border_colors)
            final_image.paste(cropped_image, (border_width, border_width))
            file_name = os.path.basename(input_file)
            if folder:
                final_path = f"{output_path}/{folder}/{file_name}"
            else:
                final_path = f"{output_path}/{file_name}"
            final_image = final_image.resize((1000, 1500)).convert("RGB")
            if os.path.isfile(final_path):
                # Only save if the file is different to avoid unnecessary overwrites
                tmp_path = f"/tmp/{file_name}"
                final_image.save(tmp_path)
                if not filecmp.cmp(final_path, tmp_path):
                    final_image.save(final_path)
                    os.remove(tmp_path)
                    return True
                else:
                    os.remove(tmp_path)
                    return False
            else:
                if not os.path.exists(os.path.dirname(final_path)):
                    os.makedirs(os.path.dirname(final_path), exist_ok=True)
                final_image.save(final_path)
                return True
    except UnidentifiedImageError as e:
        logger.error(f"Error: {e}")
        logger.error(f"Error processing {input_file}")
        return False
    except Exception as e:
        logger.error(f"Error: {e}")
        logger.error(f"Error processing {input_file}")
        return False


def remove_borders(
    input_file: str,
    output_path: str,
    border_width: int,
    logger: Logger,
    exclude: bool,
    folder: Optional[str],
) -> bool:
    """
    Crops an image to remove its borders and optionally adds a black bottom border.

    Args:
        input_file (str): Path to the input image file.
        output_path (str): Path to save the processed image.
        border_width (int): Width of the border to remove.
        logger (Logger): Logger instance for logging messages.
        exclude (bool): If True, remove all borders; if False, add black bottom border.
        folder (Optional[str]): Subfolder to organize output files.

    Returns:
        bool: True if the file was saved or updated; False otherwise.
    """
    try:
        with Image.open(input_file) as image:
            width, height = image.size
            if not exclude:
                # Remove top, left, right borders, add black bottom border
                final_image = image.crop(
                    (border_width, border_width, width - border_width, height)
                )
                bottom_border = Image.new(
                    "RGB", (width - 2 * border_width, border_width), color="black"
                )
                bottom_border_position = (0, height - border_width - border_width)
                final_image.paste(bottom_border, bottom_border_position)
            else:
                # Remove all borders
                final_image = image.crop(
                    (
                        border_width,
                        border_width,
                        width - border_width,
                        height - border_width,
                    )
                )
            final_image = final_image.resize((1000, 1500)).convert("RGB")
            file_name = os.path.basename(input_file)
            if folder:
                final_path = f"{output_path}/{folder}/{file_name}"
            else:
                final_path = f"{output_path}/{file_name}"
            if os.path.isfile(final_path):
                tmp_path = f"/tmp/{file_name}"
                final_image.save(tmp_path)
                if not filecmp.cmp(final_path, tmp_path):
                    final_image.save(final_path)
                    os.remove(tmp_path)
                    return True
                else:
                    os.remove(tmp_path)
                    return False
            else:
                if not os.path.exists(os.path.dirname(final_path)):
                    os.makedirs(os.path.dirname(final_path), exist_ok=True)
                final_image.save(final_path)
                return True
    except UnidentifiedImageError as e:
        logger.error(f"Error: {e}")
        logger.error(f"Error processing {input_file}")
        return False
    except Exception as e:
        logger.error(f"Error: {e}")
        logger.error(f"Error processing {input_file}")
        return False


def copy_files(
    assets_dict: Dict[str, List[Dict[str, Any]]],
    destination_dir: str,
    dry_run: bool,
    logger: Logger,
) -> List[str]:
    """
    Copies asset files from the input to the output directory with change detection.

    Args:
        assets_dict (Dict[str, List[Dict[str, Any]]]): Dictionary of asset data.
        destination_dir (str): Path to the output directory.
        dry_run (bool): Whether to simulate copying without actual file write.
        logger (Logger): Logger instance for logging.

    Returns:
        List[str]: A list of copy operations performed or simulated.
    """
    messages: List[str] = []
    if destination_dir.endswith("/"):
        destination_dir = destination_dir.rstrip("/")
    asset_types = ["movies", "series", "collections"]
    for asset_type in asset_types:
        if asset_type in assets_dict:
            items = assets_dict[asset_type]
            with progress(
                items,
                desc=f"Processing {asset_type.capitalize()}",
                total=len(items),
                unit=" items",
                logger=logger,
                leave=True,
            ) as pbar:
                for data in pbar:
                    files = data.get("files", None)
                    year = data.get("year", None)
                    if year:
                        year_str = f"({year})"
                    else:
                        year_str = ""
                    output_path = destination_dir
                    for input_file in files:
                        file_name, extension = os.path.splitext(input_file)
                        if extension not in [
                            ".jpg",
                            ".png",
                            ".jpeg",
                            ".JPG",
                            ".PNG",
                            ".JPEG",
                        ]:
                            logger.warning(
                                f"Skipping {input_file} as it is not a jpg or png file."
                            )
                            continue
                        file_name = os.path.basename(input_file)
                        final_path = f"{output_path}/{file_name}"
                        output_basename = os.path.basename(output_path)
                        if not dry_run:
                            if os.path.isfile(final_path):
                                if not filecmp.cmp(final_path, input_file):
                                    try:
                                        shutil.copy(input_file, final_path)
                                    except shutil.SameFileError:
                                        logger.debug(
                                            f"Input file {input_file} is the same as {final_path}, skipping"
                                        )
                                    logger.debug(
                                        f"Input file {input_file} is different from {final_path}, copying to {output_basename}"
                                    )
                                    messages.append(
                                        f"Copied {data['title']}{year_str} - {file_name} to {output_basename}"
                                    )
                            else:
                                try:
                                    shutil.copy(input_file, final_path)
                                except shutil.SameFileError:
                                    logger.debug(
                                        f"Input file {input_file} is the same as {final_path}, skipping"
                                    )
                                logger.debug(
                                    f"Input file {input_file} does not exist in {output_path}, copying to {output_basename}"
                                )
                                messages.append(
                                    f"Copied {data['title']}{year_str} - {file_name} to {output_basename}"
                                )
                        else:
                            messages.append(
                                f"Would have copied {data['title']}{year_str} - {file_name} to {output_basename}"
                            )
                pbar.update(1)
    return messages


def process_files(
    source_dirs: str,
    config: SimpleNamespace,
    logger: Optional[Logger] = None,
    renamerr_config: Optional[SimpleNamespace] = None,
    renamed_assets: Optional[Dict[str, Any]] = None,
    incremental_run: Optional[bool] = False,
) -> None:
    """Main processor for applying or removing borders to media assets."""
    logger = Logger(config.log_level, config.module_name)

    def no_assets_exit():
        logger.info("\nNo assets found in the input directory")
        logger.info("Please check the input directory and try again.")
        logger.info("Exiting...")
        return

    # Get log_dir
    config_dir = os.getenv("CONFIG_DIR", "/config")
    if os.environ.get("DOCKER_ENV"):
        log_dir = f"{config_dir}/logs/{config.module_name}"
    else:
        log_dir = os.path.join(
            pathlib.Path(__file__).parents[1], "logs", config.module_name
        )

    last_run = load_last_run(log_dir)
    if config.log_level.lower() == "debug":
        print_settings(logger, config)

    # Set key variables from config or renamerr_config
    merged = renamerr_config if renamerr_config else config
    dry_run = getattr(merged, "dry_run", False)
    destination_dir = getattr(merged, "destination_dir", None)
    if not os.path.exists(destination_dir):
        logger.error(f"Output directory {destination_dir} does not exist.")
        return

    # Get border colors and schedule
    border_colors = None
    run_holiday = False
    switch = {"start_since_last_run": False, "end_since_last_run": False}
    if getattr(config, "holidays", None):
        run_holiday, border_colors, switch = check_holiday(
            config, logger, last_run=last_run
        )
    if not border_colors:
        border_colors = getattr(config, "border_colors", None)

    # Get and group assets
    def group_assets(assets):
        if isinstance(assets, list):
            grouped = {}
            for asset in assets:
                asset_type = asset.get("type")
                grouped.setdefault(asset_type, []).append(asset)
            return grouped
        return assets

    if (
        renamed_assets is None
        or switch["start_since_last_run"]
        or switch["end_since_last_run"]
    ):
        assets_dict, _ = get_assets_files(source_dirs, logger)
        assets_dict = group_assets(assets_dict)
    elif renamed_assets and incremental_run:
        assets_dict = group_assets(renamed_assets)
    else:
        assets_dict = None

    if not assets_dict or not any(assets_dict.values()):
        return no_assets_exit()

    # Just copy files if not scheduled to run
    if not run_holiday and getattr(config, "skip", False):
        messages = copy_files(assets_dict, destination_dir, dry_run, logger)
        logger.info(
            f"Skipping {config.module_name} as it is not scheduled to run today."
        )
        if messages:
            logger.info(create_table([["Processed Files", f"{len(messages)}"]]))
            for message in messages:
                logger.info(message)
        return

    if destination_dir.endswith("/"):
        destination_dir = destination_dir[:-1]

    # Border logic
    if not border_colors:
        border_args = None
        action_label = "removed border"
        logger.info("No border colors set, removing borders from assets.")
        logger.info("Executing border removal mode (removing all borders from assets).")
    else:
        border_args = border_colors
        action_label = "replaced border"
        logger.info(f"Using {', '.join(border_colors)} border color(s).")
        logger.info(
            "Executing border replacement mode (replacing borders with configured colors)."
        )

    messages = fix_borders(
        assets_dict,
        config,
        border_args,
        destination_dir,
        dry_run,
        logger,
        getattr(config, "exclusion_list", None),
    )

    if messages:
        logger.info(create_table([["Processed Files", f"{len(messages)}"]]))
        logger.info(print_output(assets_dict, action_label, dry_run))
    else:
        logger.info("\nNo files processed")
    if config.log_level == "debug":
        print_json(assets_dict, logger, config.module_name, "assets_dict")
        print_json(messages, logger, config.module_name, "messages")


# --- Formatting function for border actions output ---
def print_output(
    assets_dict: Dict[str, List[Dict[str, Any]]], action: str, dry_run: bool
) -> str:
    """
    Groups output by asset title and lists all processed files per asset.

    Args:
        assets_dict: Dictionary grouped by type, each with a list of asset dicts.
        action: 'Removed border' or 'Replaced border'.
        dry_run: If True, prefix with 'Would have'.

    Returns:
        str: Formatted output for logging or CLI.
    """
    output_lines = []
    for asset_type, assets in assets_dict.items():
        for asset in assets:
            title = asset.get("title")
            year = asset.get("year")
            if year:
                display = f"{title} ({year})"
            else:
                display = f"{title}"
            prefix = f"Would have {action} on" if dry_run else f"{action} on"
            output_lines.append(f"{prefix} '{display}'")
            files = asset.get("files", [])
            for file_path in files:
                file_name = os.path.basename(file_path)
                output_lines.append(f"    {file_name}")
    return "\n".join(output_lines)


def main(config: SimpleNamespace) -> None:
    """
    Entry point for running the border replacer module.

    Args:
        config (SimpleNamespace): Main configuration object.
    """
    logger = Logger(config.log_level, config.module_name)
    try:
        process_files(
            config.source_dirs,
            config,
            logger=logger,
            renamed_assets=None,
            renamerr_config=None,
        )
    except KeyboardInterrupt:
        print("Keyboard Interrupt detected. Exiting...")
        sys.exit()
    except Exception:
        logger.error(f"\n\nAn error occurred:\n", exc_info=True)
        logger.error(f"\n\n")
    finally:
        # Log outro message with run time
        logger.log_outro()
