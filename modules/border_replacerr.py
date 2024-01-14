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

from util.config import Config
from util.logger import setup_logger
from util.utility import *
from util.scheduler import handle_range

try:
    from tqdm import tqdm
    from PIL import Image
except ImportError as e:
    print(f"ImportError: {e}")
    print("Please install the required modules with 'pip install -r requirements.txt'")
    exit(1)

script_name = "border_replacerr"
config = Config(script_name)
log_level = config.log_level
dry_run = config.dry_run
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
                    return holiday_colors  # Return the colors for the holiday
                    
            else:
                # Log an error if the schedule doesn't match the expected pattern
                logger.error(f"Error: {schedule} is not a valid range schedule.")
    
    # Return the original border colors if no range schedule was found or executed
    return border_colors


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
    return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))  # Convert each pair of hex digits to an integer

def fix_borders(assets_dict, script_config, border_colors, output_dir):
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
        banner = "Removing Border"
    elif not border_colors and resize:
        action = "Removed border and resized"
        banner = "Removing Border and Resizing"
    elif border_colors and resize:
        action = "Replacing border and resized"
        banner = "Replacing Border and Resizing"
    else:
        action = "Replacing border on"
        banner = "Replacing Border"

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
            for data in tqdm(items, desc=f"Processing {asset_type.capitalize()}", total=len(items), unit="Posters", disable=None):
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
                    file_name = os.path.basename(input_file)
                    if rgb_border_colors:
                        rgb_border_color = rgb_border_colors[current_index]
                    else:
                        rgb_border_color = None

                    # Actual processing or dry run action
                    if not dry_run:
                        if not resize:
                            if rgb_border_color:
                                replace_border(input_file, output_path, rgb_border_color, border_width)
                            else:
                                remove_border(input_file, output_path, border_width)
                        else:
                            if rgb_border_color:
                                replace_border_and_resize(input_file, output_path, rgb_border_color, border_width)
                            else:
                                remove_border_resize(input_file, output_path, border_width)
                        if path:
                            messages.append(f"{action} {data['title']}{year} - {file_name})")
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
        None
    """

    # Open the image
    with Image.open(input_file) as image:
        width, height = image.size

        # Crop the existing border
        cropped_image = image.crop((border_width, border_width, width - border_width, height - border_width))

        # Add new border
        new_width = cropped_image.width + 2 * border_width # Add 2 * border_width to the width and height
        new_height = cropped_image.height + 2 * border_width # to account for the new border
        extended_image = Image.new("RGB", (new_width, new_height), border_colors) # Create a new image with the new border color
        extended_image.paste(cropped_image, (border_width, border_width)) # Paste the cropped image onto the new image

        # Resize proportionally to a maximum of 1000x1500
        resized_image = extended_image.resize((1000, 1500), Image.LANCZOS)  # Use high-quality resampling

        # Save the final resized image with the new border
        if os.path.isfile(output_path): # Check if the file already exists
            if not filecmp.cmp(input_file, output_path): # Check if the file is different from the original
                resized_image.save(f"{output_path}/{os.path.basename(input_file)}") # Save the file
        else: # If the file doesn't exist
            resized_image.save(f"{output_path}/{os.path.basename(input_file)}") # Save the file

                    
def replace_border(input_file, output_path, border_colors, border_width):
    """
    Crops the center of an image, adds a 25-pixel border around it, and saves the result.
    
    Args:
        input_file (str): The input file.
        output_path (str): The output path.
        border_colors (list): The list of border colors.
        border_width (int): The border width.
        
    Returns:
        None
    """

    # Open the image
    with Image.open(input_file) as image:
        border_width = border_width * 2 # Multiply by 2 to account for the border on both sides
        width, height = image.size # Get the width and height of the image

        # Crop the center
        new_width = width - border_width # Subtract 2 * border_width from the width and height
        new_height = height - border_width # to account for the border
        left = (width - new_width) // 2 # Calculate the left and top coordinates
        top = (height - new_height) // 2 # of the cropped image
        right = left + new_width # Calculate the right and bottom coordinates
        bottom = top + new_height # of the cropped image
        cropped_image = image.crop((left, top, right, bottom)) # Crop the image

        # Add border
        new_width = cropped_image.width + 2 * border_width # Add 2 * border_width to the width and height
        new_height = cropped_image.height + 2 * border_width # to account for the new border
        extended_image = Image.new("RGB", (new_width, new_height), border_colors) # Create a new image with the new border color
        extended_image.paste(cropped_image, (border_width, border_width)) # Paste the cropped image onto the new image

        # Save the final image with the new border
        if os.path.isfile(output_path): # Check if the file already exists
            if not filecmp.cmp(input_file, output_path): # Check if the file is different from the original
                extended_image.save(f"{output_path}/{os.path.basename(input_file)}") # Save the file
        else: # If the file doesn't exist
            extended_image.save(f"{output_path}/{os.path.basename(input_file)}") # Save the file

def remove_border_resize(input_file, output_path, border_width):
    """
    Crops the center of an image, resizes it proportionally to a maximum of 1000x1500, and extends the canvas to 1000x1500 if necessary.
    
    Args:
        input_file (str): The input file.
        output_path (str): The output path.
        border_width (int): The border width.
        
    Returns:
        None
    """

    # Open the image
    with Image.open(input_file) as image: # Open the image
        border_width = border_width * 2 # Multiply by 2 to account for the border on both sides
        width, height = image.size # Get the width and height of the image

        # Crop the center
        new_width = width - border_width # Subtract 2 * border_width from the width and height
        new_height = height - border_width # to account for the border
        left = (width - new_width) // 2 # Calculate the left and top coordinates
        top = (height - new_height) // 2 # of the cropped image
        right = left + new_width # Calculate the right and bottom coordinates
        bottom = top + new_height # of the cropped image
        cropped_image = image.crop((left, top, right, bottom)) # Crop the image

        # Resize proportionally to a maximum of 1000x1500
        resized_image = cropped_image.resize((1000, 1500), Image.LANCZOS)  # Use high-quality resampling

        # Extend the canvas to 1000x1500 if necessary
        if resized_image.size != (1000, 1500): # Check if the image is smaller than 1000x1500
            extended_image = Image.new("RGB", (1000, 1500), "white")  # Create a white canvas
            extended_image.paste(resized_image, (0, 0))  # Paste the resized image onto the canvas
            resized_image = extended_image # Set the resized image to the extended image

        if os.path.isfile(output_path): # Check if the file already exists
            if not filecmp.cmp(input_file, output_path): # Check if the file is different from the original
                resized_image.save(f"{output_path}/{os.path.basename(input_file)}") # Save the file
        else: # If the file doesn't exist
            resized_image.save(f"{output_path}/{os.path.basename(input_file)}") # Save the file

def remove_border(input_file, output_path, border_width):
    """
    Crops the center of an image, reducing its dimensions by 50 pixels on each side.
    
    Args:
        input_file (str): The input file.
        output_path (str): The output path.
        border_width (int): The border width.
        
    Returns:
        None
    """

    # Open the image
    with Image.open(input_file) as image: # Open the image
        border_width = border_width * 2 # Multiply by 2 to account for the border on both sides
        width, height = image.size # Get the width and height of the image

        # Crop the center
        new_width = width - border_width # Subtract 2 * border_width from the width and height
        new_height = height - border_width # to account for the border
        left = (width - new_width) // 2 # Calculate the left and top coordinates
        top = (height - new_height) // 2 # of the cropped image
        right = left + new_width # Calculate the right and bottom coordinates
        bottom = top + new_height # of the cropped image
        cropped_image = image.crop((left, top, right, bottom)) # Crop the image
        
        if os.path.isfile(output_path): # Check if the file already exists
            if not filecmp.cmp(input_file, output_path): # Check if the file is different from the original
                cropped_image.save(f"{output_path}/{os.path.basename(input_file)}") # Save the file
        else: # If the file doesn't exist
            cropped_image.save(f"{output_path}/{os.path.basename(input_file)}") # Save the file

def process_files(input_dir, output_dir, asset_folders):
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

    # Convert single string border color to a list if necessary
    if isinstance(border_colors, str):
        border_colors = [border_colors]

    # Check for a scheduled event to update border colors if provided
    if schedule:
        border_colors = check_holiday(schedule, border_colors)

    # If no border colors are available, log a message
    if not border_colors:
        logger.info(f"No border colors set, removing border instead.")

    # Categorize files in the input directory into assets
    assets_dict = categorize_files(input_dir, asset_folders)
    
    # If assets are found in the input directory
    if assets_dict:
        logger.debug(f"assets_dict:\n{json.dumps(assets_dict, indent=4)}")

        # Fix borders for assets using specified configurations
        messages = fix_borders(assets_dict, script_config, border_colors, output_dir)

        # If there are messages (indicating processed files), log each message
        if messages:
            for message in messages:
                logger.info(message)
    else:
        # Log a message if no files are found in the input directory
        logger.info(f"No files found in {input_dir}")


def main():
    """
    Main function.
    """

    # Obtain script configuration details
    script_config = config.script_config
    input_dir = script_config['input_dir']
    output_dir = script_config['output_dir']
    schedule = script_config['schedule']
    border_colors = script_config['border_colors']

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
    process_files(input_dir, output_dir, asset_folders=False)

    logger.info(f"Border Replacer Complete")  # Log completion message
    logger.info(f"{'*' * 40} END {'*' * 40}\n")

if __name__ == "__main__":
    main()
