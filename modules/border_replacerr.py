#   ____                _             _____            _                          
#  |  _ \              | |           |  __ \          | |                         
#  | |_) | ___  _ __ __| | ___ _ __  | |__) |___ _ __ | | __ _  ___ ___ _ __ _ __ 
#  |  _ < / _ \| '__/ _` |/ _ \ '__| |  _  // _ \ '_ \| |/ _` |/ __/ _ \ '__| '__|
#  | |_) | (_) | | | (_| |  __/ |    | | \ \  __/ |_) | | (_| | (_|  __/ |  | |   
#  |____/ \___/|_|  \__,_|\___|_|    |_|  \_\___| .__/|_|\__,_|\___\___|_|  |_|   
#                                               | |                               
#                                               |_|                               
# =================================================================================
# Author: Drazzilb
# Description:
# Usage: python border_replacerr.py
# Requirements: Pillow, tqdm
# License: MIT License
# =================================================================================

import os
import json
import re
import logging
import filecmp
import shutil

from util.config import Config
from util.logger import setup_logger
from util.utility import *
from util.scheduler import handle_range

try:
    from tqdm import tqdm
    from PIL import Image, UnidentifiedImageError
except ImportError as e:
    print(f"ImportError: {e}")
    print("Please install the required modules with 'pip install -r requirements.txt'")
    exit(1)

script_name = "border_replacerr"
config = Config(script_name)
log_level = config.log_level
# dry_run = config.dry_run
logging.getLogger("PIL").setLevel(logging.WARNING)

logger = setup_logger(log_level, script_name)

# Set regex patterns
illegal_chars_regex = re.compile(r'[<>:"/\\|?*\x00-\x1f]+')
year_regex = re.compile(r"\((\d{4})\).*")
remove_special_chars = re.compile(r'[^a-zA-Z0-9\s]+')

def check_holiday(data, border_colors):
    """
    Checks if the schedule is a range schedule and if so, runs the range schedule.
    
    Args:
        data (dict): The schedule data.
        border_colors (list): The list of border colors.
        
    Returns:
        list: The list of border colors.
    """
    
    # Regular expression pattern to match a range schedule format
    pattern = r"^range(\((\d{1,2}/\d{1,2}-\d{1,2}/\d{1,2}\|?)+\))$"
    
    # Iterate through each holiday and its corresponding schedule and color in the data
    for holiday, schedule_color in data.items():
        schedule = schedule_color.get('schedule', None)
        
        # If schedule exists for the holiday
        if schedule:
            # Check if the schedule matches the range pattern
            if re.match(pattern, schedule):
                # If it matches, handle the range schedule using 'handle_range' function
                run = handle_range(schedule, logger)
                # If 'handle_range' returns True (indicating successful execution)
                if run:
                    # Retrieve the color for the holiday from schedule_color or use default border_colors
                    holiday_colors = schedule_color.get('color', border_colors)
                    
                    # If holiday_colors exist, log the schedule execution and colors being used
                    if holiday_colors:
                        data = [
                            [f"Running {holiday.capitalize()} Schedule"],
                        ]
                        create_table(data, log_level="info", logger=logger)
                        logger.info(f"Schedule: {holiday.capitalize()} | Using {', '.join(holiday_colors)} border colors.")
                    return holiday_colors, True  # Return the colors for the holiday
                    
            else:
                # Log an error if the schedule doesn't match the expected pattern
                logger.error(f"Error: {schedule} is not a valid range schedule.")
    
    # Return the original border colors if no range schedule was found or executed
    return border_colors, False


def convert_to_rgb(hex_color):
    """
    Converts a hexadecimal color code to an RGB tuple.
    
    Args:
        hex_color (str): The hexadecimal color code.
        
    Returns:
        tuple: The RGB tuple.
    """

    hex_color = hex_color.strip("#") # Remove the leading hash if present
    if len(hex_color) == 3: # Expand shorthand notation if necessary
        hex_color = hex_color * 2 # e.g. #ABC becomes #AABBCC
    try:
        color_code = tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))  # Convert each pair of hex digits to an integer
    except ValueError:
        logger.error(f"Error: {hex_color} is not a valid hexadecimal color code.\nDefaulting to white.")
        return (255, 255, 255)
    return color_code

def fix_borders(assets_dict, script_config, border_colors, output_dir, dry_run):
    """
    Replaces the border on the posters.

    Args:
        assets_dict (dict): The dictionary of assets.
        script_config (dict): The script config.
        border_colors (list): The list of border colors.
        output_dir (str): The output directory.

    Returns:
        list: The list of messages.
    """

    # Extracting necessary parameters from the script config
    border_width = script_config['border_width']
    resize = script_config['resize']
    rgb_border_colors = []

    # Convert border colors to RGB format if available
    if border_colors:
        for color in border_colors:
            rgb_color = convert_to_rgb(color)  # Convert color to RGB
            rgb_border_colors.append(rgb_color)

    # Determining the action based on configuration
    action = None
    if not border_colors and not resize:
        action = "Removed border on"
        banner = "Removing Borders"
    elif not border_colors and resize:
        action = "Removed border and resized"
        banner = "Removing Borders and Resizing"
    elif border_colors and resize:
        action = "Replacing border and resized"
        banner = "Replacing Borders and Resizing"
    else:
        action = "Replacing border on"
        banner = "Replacing Borders"

    # Initialize asset types to process
    asset_types = ["movies", "series", "collections"]

    # Logging the action if it's determined
    if action:
        data = [
            [f"{banner}"],
        ]
        create_table(data, log_level="info", logger=logger)

    messages = []  # List to hold progress messages

    # Loop through each asset type
    for asset_type in asset_types:
        if asset_type in assets_dict:
            current_index = 0  # Index for cycling through border colors
            items = assets_dict[asset_type]
            # Loop through each item in the asset type
            for data in tqdm(items, desc=f"Processing {asset_type.capitalize()}", total=len(items), unit="items", disable=None, leave=True):
                files = data.get('files', None)
                path = data.get('path', None)
                year = data.get('year', None)
                if year:
                    year = f"({year})"
                else:
                    year = ""

                # Prepare output directory for saving processed files
                if path:
                    path_basename = os.path.basename(path)
                    output_path = f"{output_dir}/{path_basename}"
                    if not os.path.exists(output_path):
                        os.makedirs(output_path)
                else:
                    output_path = output_dir

                # Process each input file within the asset
                for input_file in files:
                    file_name, extension = os.path.splitext(input_file)
                    if extension not in [".jpg", ".png", ".jpeg", ".JPG", ".PNG", ".JPEG"]:
                        logger.warning(f"Skipping {input_file} as it is not a jpg or png file.")
                        continue
                    file_name = os.path.basename(input_file)
                    if rgb_border_colors:
                        rgb_border_color = rgb_border_colors[current_index]
                    else:
                        rgb_border_color = None

                    # Actual processing or dry run action
                    if not dry_run:
                        if not resize:
                            if rgb_border_color:
                                results = replace_border(input_file, output_path, rgb_border_color, border_width)
                            else:
                                results = remove_border(input_file, output_path, border_width)
                        else:
                            if rgb_border_color:
                                results = replace_border_and_resize(input_file, output_path, rgb_border_color, border_width)
                            else:
                                results = remove_border_resize(input_file, output_path, border_width)
                        if results:
                            if path:
                                messages.append(f"{action} {data['title']}{year} - {file_name}")
                            else:
                                messages.append(f"{action} {file_name}")
                    else:
                        messages.append(f"Would have {action} {file_name}")

                    if rgb_border_colors:
                        current_index = (current_index + 1) % len(rgb_border_colors)
        else:
            logger.info(f"No {asset_type} found.")
    return messages

def replace_border_and_resize(input_file, output_path, border_colors, border_width):
    """
    Removes the existing border, adds a new border of the given color, and resizes the image to 1000x1500 while maintaining aspect ratio.
    
    Args:
        input_file (str): The input file.
        output_path (str): The output path.
        border_colors (list): The list of border colors.
        border_width (int): The border width.
    
    Returns:
        bool: True if the file was saved, False otherwise.
    """

    # Open the image
    try:
        with Image.open(input_file) as image:
            # Set the border width
            width, height = image.size # Get the width and height of the image

            # Remove border
            cropped_image = image.crop((border_width, border_width, width - border_width, height - border_width)) # Crop the image to remove the border

            # Add new border
            new_width = cropped_image.width + 2 * border_width # Add 2 * border_width to the width and height
            new_height = cropped_image.height + 2 * border_width # to account for the new border
            extended_image = Image.new("RGB", (new_width, new_height), border_colors) # Create a new image with the new border color
            extended_image.paste(cropped_image, (border_width, border_width)) # Paste the cropped image onto the new image

            # Resize proportionally to a maximum of 1000x1500
            resized_image = extended_image.resize((1000, 1500), Image.LANCZOS)  # Use high-quality resampling

            file_name = os.path.basename(input_file)
            final_path = f"{output_path}/{file_name}" # Set the output path to the parent directory
            
            if os.path.isfile(final_path):
                # Save file to /tmp/ and compare to existing file
                tmp_path = f"/tmp/{file_name}"
                resized_image.save(tmp_path)
                if not filecmp.cmp(final_path, tmp_path):
                    resized_image.save(final_path)
                    # Remove tmp file
                    os.remove(tmp_path)
                    return True
                else:
                    # Remove tmp file
                    os.remove(tmp_path)
                    return False
            else:
                resized_image.save(final_path)
                return True
    # Log an error if the image can't be opened
    except UnidentifiedImageError as e:
        logger.error(f"Error: {e}")
        logger.error(f"Error processing {input_file}")

                    
def replace_border(input_file, output_path, border_colors, border_width):
    """
    Crops the center of an image, adds a 25-pixel border around it, and saves the result.
    
    Args:
        input_file (str): The input file.
        output_path (str): The output path.
        border_colors (list): The list of border colors.
        border_width (int): The border width.
        
    Returns:
        bool: True if the file was saved, False otherwise.
    """

    # Open the image
    try:
        with Image.open(input_file) as image:
            # Set the border width
            width, height = image.size # Get the width and height of the image

            # Remove border
            cropped_image = image.crop((border_width, border_width, width - border_width, height - border_width)) # Crop the image to remove the border

            # Add border
            new_width = cropped_image.width + 2 * border_width # Add 2 * border_width to the width and height
            new_height = cropped_image.height + 2 * border_width # to account for the new border
            extended_image = Image.new("RGB", (new_width, new_height), border_colors) # Create a new image with the new border color
            extended_image.paste(cropped_image, (border_width, border_width)) # Paste the cropped image onto the new image
            
            file_name = os.path.basename(input_file)
            final_path = f"{output_path}/{file_name}" # Set the output path to the parent directory

            if os.path.isfile(final_path):
                # Save file to /tmp/ and compare to existing file
                tmp_path = f"/tmp/{file_name}"
                extended_image.save(tmp_path)
                if not filecmp.cmp(final_path, tmp_path):
                    extended_image.save(final_path)
                    # Remove tmp file
                    os.remove(tmp_path)
                    return True
                else:
                    # Remove tmp file
                    os.remove(tmp_path)
                    return False
            else:
                extended_image.save(final_path)
                return True
    # Log an error if the image can't be opened
    except UnidentifiedImageError as e:
        logger.error(f"Error: {e}")
        logger.error(f"Error processing {input_file}")

def remove_border_resize(input_file, output_path, border_width):
    """
    Crops the center of an image, resizes it proportionally to a maximum of 1000x1500, and extends the canvas to 1000x1500 if necessary.
    
    Args:
        input_file (str): The input file.
        output_path (str): The output path.
        border_width (int): The border width.
        
    Returns:
        bool: True if the file was saved, False otherwise.
    """

    # Open the image
    try:
        with Image.open(input_file) as image: # Open the image
            # Set the border width
            width, height = image.size # Get the width and height of the image

            # Remove border
            cropped_image = image.crop((border_width, border_width, width - border_width, height - border_width)) # Crop the image to remove the border

            # Resize proportionally to a maximum of 1000x1500
            resized_image = cropped_image.resize((1000, 1500), Image.LANCZOS)  # Use high-quality resampling
            
            file_name = os.path.basename(input_file)
            final_path = f"{output_path}/{file_name}" # Set the output path to the parent directory

            if os.path.isfile(final_path):
                # Save file to /tmp/ and compare to existing file
                tmp_path = f"/tmp/{file_name}"
                resized_image.save(tmp_path)
                if not filecmp.cmp(final_path, tmp_path):
                    resized_image.save(final_path)
                    # Remove tmp file
                    os.remove(tmp_path)
                    return True
                else:
                    # Remove tmp file
                    os.remove(tmp_path)
                    return False
            else:
                resized_image.save(final_path)
                return True
    # Log an error if the image can't be opened
    except UnidentifiedImageError as e:
        logger.error(f"Error: {e}")
        logger.error(f"Error processing {input_file}")

def remove_border(input_file, output_path, border_width):
    """
    Crops the center of an image, reducing its dimensions by 50 pixels on each side.
    
    Args:
        input_file (str): The input file.
        output_path (str): The output path.
        border_width (int): The border width.
        
    Returns:
        bool: True if the file was saved, False otherwise.
    """

    # Open the image
    try:
        with Image.open(input_file) as image: # Open the image
            # Set the border width
            width, height = image.size # Get the width and height of the image

            # Remove border
            cropped_image = image.crop((border_width, border_width, width - border_width, height - border_width)) # Crop the image to remove the border

            file_name = os.path.basename(input_file)
            final_path = f"{output_path}/{file_name}" # Set the output path to the parent directory

            if os.path.isfile(final_path):
                # Save file to /tmp/ and compare to existing file
                tmp_path = f"/tmp/{file_name}"
                cropped_image.save(tmp_path)
                if not filecmp.cmp(final_path, tmp_path):
                    cropped_image.save(final_path)
                    # Remove tmp file
                    os.remove(tmp_path)
                    return True
                else:
                    # Remove tmp file
                    os.remove(tmp_path)
                    return False
            else:
                cropped_image.save(final_path) # Save the file
                return True
    # Log an error if the image can't be opened
    except UnidentifiedImageError as e:
        logger.error(f"Error: {e}")
        logger.error(f"Error processing {input_file}")
        return False
    
def copy_files(assets_dict, output_dir, dry_run):
    """
    Copies the files in the input directory to the output directory.
    
    Args:
        input_dir (str): The input directory.
        output_dir (str): The output directory.
        asset_folders (bool): Whether to use asset folders.
        dry_run (bool): Whether to perform a dry run.
        
    Returns:
        None
    """
    # Initialize asset types to process
    asset_types = ["movies", "series", "collections"]
    for asset_type in asset_types:
        if asset_type in assets_dict:
            items = assets_dict[asset_type]
            for data in tqdm(items, desc=f"Processing {asset_type.capitalize()}", total=len(items), unit="items", disable=None, leave=True):
                files = data.get('files', None)
                path = data.get('path', None)
                year = data.get('year', None)
                if year:
                    year = f"({year})"
                else:
                    year = ""

                # Prepare output directory for saving processed files
                if path:
                    path_basename = os.path.basename(path)
                    output_path = f"{output_dir}/{path_basename}"
                    if dry_run:
                        if not os.path.exists(output_path):
                            os.makedirs(output_path)
                        else:
                            output_path = output_dir
                    else:
                        logger.info(f"Creating {output_path}")
                else:
                    output_path = output_dir
                
                # Process each input file within the asset
                for input_file in files:
                    file_name, extension = os.path.splitext(input_file)
                    if extension not in [".jpg", ".png", ".jpeg", ".JPG", ".PNG", ".JPEG"]:
                        logger.warning(f"Skipping {input_file} as it is not a jpg or png file.")
                        continue
                    file_name = os.path.basename(input_file)
                    final_path = f"{output_path}/{file_name}"
                    if not dry_run:
                        if os.path.isfile(final_path):
                            if not filecmp.cmp(final_path, file_name):
                                shutil.copy(input_file, final_path)
                        else:
                            shutil.copy(input_file, final_path)
                    else:
                        logger.info(f"Would have copied {file_name} to {output_path}")

def process_files(input_dir, output_dir, asset_folders, dry_run):
    """
    Processes the files in the input directory.

    Args:
        input_dir (str): The input directory.
        output_dir (str): The output directory.
        asset_folders (bool): Whether to use asset folders.

    Returns:
        None
    """

    # Obtain script configuration details
    script_config = config.script_config
    schedule = script_config['schedule']
    border_colors = script_config['border_colors']
    skip = script_config['skip']

    # Convert single string border color to a list if necessary
    if isinstance(border_colors, str):
        border_colors = [border_colors]

    # Check for a scheduled event to update border colors if provided
    if schedule:
        border_colors, run_holiday = check_holiday(schedule, border_colors)

    # If Run holiday is False and Skip is set to True, return
    if not run_holiday and skip:
        copy_files(assets_dict, output_dir, dry_run)
        logger.info(f"Skipping {script_name} as it is not scheduled to run today.")
        return
    # If no border colors are available, log a message
    if not border_colors:
        logger.info(f"No border colors set, removing border instead.")
    else:
        # Log the border colors being used
        logger.info(f"Using {', '.join(border_colors)} border color(s).")

    # Categorize files in the input directory into assets
    if os.path.isdir(input_dir):
        assets_dict = categorize_files(input_dir, asset_folders)
    else:
        logger.error(f"No assets found in {input_dir}, if running Poster Renamerr in dry_run, this is expected.")
        exit()

    # if trailing slash on output_dir, remove it
    if output_dir.endswith("/"):
        output_dir = output_dir[:-1]
    
    # If assets are found in the input directory
    if any(assets_dict['movies']) or any(assets_dict['series']) or any(assets_dict['collections']):
        logger.debug(f"assets_dict:\n{json.dumps(assets_dict, indent=4)}")

        # Fix borders for assets using specified configurations
        messages = fix_borders(assets_dict, script_config, border_colors, output_dir, dry_run)
        logger.debug(f"messages:\n{json.dumps(messages, indent=4)}")

        # If there are messages (indicating processed files), log each message
        if messages:
            table = [
                ["Processed Files", f"{len(messages)}"],
            ]
            create_table(table, log_level="info", logger=logger)
            for message in messages:
                logger.info(message)
        else:
            # Log a message if no files were processed
            logger.info(f"\nNo files processed")
    else:
        logger.error(f"No assets found in {input_dir}, if running Poster Renamerr in dry_run, this is expected.")
        exit()


def main():
    """
    Main function.
    """
    try:
        # Obtain script configuration details
        script_config = config.script_config
        input_dir = script_config['input_dir']
        output_dir = script_config['output_dir']
        schedule = script_config['schedule']
        border_colors = script_config['border_colors']
        asset_folders = script_config['asset_folders']
        dry_run = config.dry_run

        # Convert single string border color to a list if necessary
        if isinstance(border_colors, str):
            border_colors = [border_colors]

        # Creating a table to log script settings in debug mode
        data = [
            ["Script Settings"],
        ]
        create_table(data, log_level="debug", logger=logger)
        logger.debug(f'{"Dry_run:":<20}{config.dry_run if config.dry_run else "False"}')
        logger.debug(f'{"Log Level:":<20}{config.log_level if config.log_level else "info"}')
        logger.debug(f'{"Input Dir:":<20}{input_dir if input_dir else "Not Set"}')
        logger.debug(f'{"Output Dir:":<20}{output_dir if output_dir else "Not Set"}')
        logger.debug(f'{"Schedule:":<20}{schedule if schedule else "Not Set"}')

        # Process files in the input directory with specified settings
        process_files(input_dir, output_dir, asset_folders, dry_run)

        logger.info(f"Border Replacer Complete")  # Log completion message
    except KeyboardInterrupt:
        print("Keyboard Interrupt detected. Exiting...")
        sys.exit()
    except Exception:
        logger.error(f"\n\nAn error occurred:\n", exc_info=True)
        logger.error(f"\n\n")
    finally:
        logger.info(f"\n{'*' * 40} END {'*' * 40}\n")

if __name__ == "__main__":
    main()
