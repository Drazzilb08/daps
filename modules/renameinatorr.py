#   _____                                 _             _                  
#  |  __ \                               (_)           | |                 
#  | |__) |___ _ __   __ _ _ __ ___   ___ _ _ __   __ _| |_ ___  _ __ _ __ 
#  |  _  // _ \ '_ \ / _` | '_ ` _ \ / _ \ | '_ \ / _` | __/ _ \| '__| '__|
#  | | \ \  __/ | | | (_| | | | | | |  __/ | | | | (_| | || (_) | |  | |   
#  |_|  \_\___|_| |_|\__,_|_| |_| |_|\___|_|_| |_|\__,_|\__\___/|_|  |_|   
# ===================================================================================================
# Author: Drazzilb
# Description: This script will rename all series in Sonarr/Radarr to match the naming scheme of the
#              Naming Convention within Radarr/Sonarr. It will also add a tag to the series so that it can be easily
#              identified as having been renamed.
# Usage: python3 /path/to/renameinatorr.py
# Requirements: requests, pyyaml
# License: MIT License
# ===================================================================================================

import json
import re

from util.config import Config
from util.logger import setup_logger
from util.arrpy import StARR
from util.utility import *
from util.discord import discord, discord_check

try:
    from tqdm import tqdm
except ImportError as e:
    print(f"ImportError: {e}")
    print("Please install the required modules with 'pip install -r requirements.txt'")
    exit(1)

script_name = "renameinatorr"
config = Config(script_name)
log_level = config.log_level
dry_run = config.dry_run
logger = setup_logger(log_level, script_name)

def print_output(output_dict):
    """
    Prints the output of the script to the console.
    
    Args:
        output_dict (dict): Dictionary containing the output of the script.
        
    Returns:
        None
    """
    # Iterate through each instance's output in the provided dictionary
    for instance, instance_data in output_dict.items():
        # Create a table for the specific instance's rename list
        data = [
            [f"{instance_data['server_name'].capitalize()} Rename List"],
        ]
        create_table(data, log_level="info", logger=logger)
        
        # Iterate through each item in the instance's data
        for item in instance_data['data']:
            # Display title and year if available
            if item['file_info'] or item['new_path_name']:
                logger.info(f"{item['title']} ({item['year']})")
            
            # Display folder rename information if available
            if item['new_path_name']:
                if item['new_path_name']:
                    logger.info(f"\tFolder Renamed: {item['path_name']} -> {item['new_path_name']}")
            
            # Display file information if available
            if item['file_info']:
                logger.info(f"\tFiles:")
                for existing_path, new_path in item['file_info'].items():
                    logger.info(f"\t\t{existing_path}\n\t\t{new_path}\n")
        logger.info('')
        
        # Calculate total counts for various rename items
        total_items = len(instance_data['data'])
        total_rename_items = len([value['file_info'] for value in instance_data['data'] if value['file_info']])
        total_folder_rename = len([value['new_path_name'] for value in instance_data['data'] if value['new_path_name']])
        
        # Display summary of rename actions if any rename occurred
        if any(value['file_info'] or value['new_path_name'] for value in instance_data['data']):
            data = [
                [f"{instance_data['server_name'].capitalize()} Rename Summary"],
                [f"Total Items: {total_items}"],
            ]
            if any(value['file_info'] for value in instance_data['data']):
                data.append([f"Total Renamed Items: {total_rename_items}"])
            if any(value['new_path_name'] for value in instance_data['data']):
                data.append([f"Total Folder Renames: {total_folder_rename}"])
            create_table(data, log_level="info", logger=logger)
        else:
            logger.info(f"No items renamed in {instance_data['server_name']}.")
        logger.info('')

def notification(output_dict):
    """
    Sends a notification to Discord with the output of the script.
    
    Args:
        output_dict (dict): Dictionary containing the output of the script.
        
    Returns:
        None
    """
    # Initialize empty lists and dictionaries to store Discord messages and fields
    fields = []
    discord_dict = {}

    # Process each instance's data in the output dictionary
    for instance, instance_data in output_dict.items():
        discord_message = []
        
        # Iterate through each item in the instance's data
        for item in instance_data['data']:
            # Prepare information for Discord message fields for each item (file renames and folder renames)
            if item['file_info'] or item['new_path_name']:
                current_field = ""
                name = f"{item['title']} ({item['year']})"
                item_messages = []
                
                # Collect folder rename information if available
                if item['new_path_name']:
                    item_messages.append(f"Folder:\n{item['path_name']} -> {item['new_path_name']}\n")
                
                # Collect file rename information if available
                if item['file_info']:
                    for existing_path, new_path in item['file_info'].items():
                        item_messages.append(f"{existing_path}\n\n{new_path}\n")
                
                # Split collected messages into multiple fields if exceeding character limits
                for message in item_messages:
                    if len(current_field) + len(message) + len("\t\n") <= 1000:
                        current_field += message + "\n" 
                    else:
                        fields.append({
                            "name": name,
                            "value": f"```{current_field}```"
                        })
                        current_field = message + "\n"
                        name = ""
                
                # Append the last remaining field or set of fields
                if current_field:
                    fields.append({
                        "name": name,
                        "value": f"```{current_field}```"
                    })
                    if len(fields) <= 25:
                        discord_dict[1] = fields
                    else:
                        # Create multiple message keys if exceeding a certain number of fields
                        num_fields = len(fields)
                        num_messages_per_field = 25
                        num_keys = num_fields // num_messages_per_field
                        if num_fields % num_messages_per_field != 0:
                            num_keys += 1

                        for i in range(num_keys):
                            start_index = i * num_messages_per_field
                            end_index = min(start_index + num_messages_per_field, num_fields)
                            discord_dict[i + 1] = fields[start_index:end_index]

    # Calculate character counts and split messages if they exceed specified limits
    new_dict = {}
    new_fields = []
    new_field_count = 0
    new_character_count = 0

    for key, value in discord_dict.items():
        total_character_count = sum(len(field['value']) for field in value)
        if total_character_count > 5000:
            for field in value:
                field_character_count = len(field['value'])
                if new_character_count + field_character_count + len("\n") + len("\t") <= 5000:
                    new_fields.append(field)
                    new_character_count += field_character_count
                else:
                    new_dict[new_field_count + 1] = new_fields
                    new_fields = [field]
                    new_field_count += 1
                    new_character_count = field_character_count

            if new_fields:
                new_dict[new_field_count + 1] = new_fields
        else:
            new_dict[key] = value

    discord_dict = new_dict

    # Send Discord messages
    total_character_count_per_key = {}
    for key, value in discord_dict.items():
        total_character_count_per_key[key] = sum(len(field['value']) for field in value)
    for key, value in discord_dict.items():
        print(f"Sending message {key} of {len(discord_dict)}")
        discord(fields=value, logger=logger, script_name=script_name, description=f"{'__**Dry Run**__' if dry_run else ''}", color=0x00ff00, content=None)


def process_instance(app, rename_folders, server_name, instance_type):
    """
    Processes the data for a specific instance.
    
    Args:
        app (StARR): StARR object for the instance.
        rename_folders (bool): Whether or not to rename folders.
        server_name (str): Name of the instance.
        instance_type (str): Type of instance (Sonarr or Radarr).
        
    Returns:
        list: List of dictionaries containing the data for each item.
    """
    
    # Fetch data related to the instance (Sonarr or Radarr)
    media_dict = handle_starr_data(app, instance_type)
    
    # Process each item in the fetched data
    if media_dict:
        print("Processing data... This may take a while.")
        for item in tqdm(media_dict, desc=f"Processing '{server_name}' Media", unit="items", disable=None):
            file_info = {}
            
            # Fetch rename list and sort it by existingPath
            rename_response = app.get_rename_list(item['media_id'])
            rename_response.sort(key=lambda x: x['existingPath'])
            
            # Process each item in the rename list to get file rename information
            for items in rename_response:
                existing_path = items.get('existingPath', None)
                new_path = items.get('newPath', None)
                
                # Remove 'Season' folders from paths if they exist
                pattern = r"Season \d{1,2}/" 
                if re.search(pattern, existing_path) or re.search(pattern, new_path):
                    existing_path = re.sub(pattern, "", existing_path)
                    new_path = re.sub(pattern, "", new_path)
                
                file_info[existing_path] = new_path
            
            # Update item with file rename information
            item["new_path_name"] = None
            item["file_info"] = file_info
        
        # If not in dry run, perform file renaming
        if not dry_run:
            if any(value['file_info'] for value in media_dict):
                # Get media IDs and initiate file renaming
                media_ids = [item['media_id'] for item in media_dict]
                print(f"Renaming {len(media_dict)} {server_name} items...")
                app.rename_media(media_ids)
                
                # Refresh media and wait for it to be ready
                response = app.refresh_media()
                print(f"Waiting for {server_name} to refresh...")
                ready = app.wait_for_command(response['id'])
                print(f"Files renamed in {server_name}.")
            
            # Group and rename root folders if necessary
            grouped_root_folders = {}
            if rename_folders:
                for item in media_dict:
                    root_folder = item["root_folder"]
                    if root_folder not in grouped_root_folders:
                        grouped_root_folders[root_folder] = []
                    grouped_root_folders[root_folder].append(item['media_id'])
                
                # Rename folders and wait for media refresh
                for root_folder, media_ids in grouped_root_folders.items():
                    app.rename_folders(media_ids, root_folder)
                
                print(f"Waiting for {server_name} to refresh...")
                response = app.refresh_media()
                ready = app.wait_for_command(response['id'])
                print(f"Folders renamed in {server_name}.")
                
                # Get updated media data and update item with new path names
                if ready:
                    new_media_dict = handle_starr_data(app, instance_type)
                    for new_item in new_media_dict:
                        for old_item in media_dict:
                            if new_item['media_id'] == old_item['media_id']:
                                if new_item['path_name'] != old_item['path_name']:
                                    old_item['new_path_name'] = new_item['path_name']
    
    return media_dict

def main():
    """
    Main function for the script.
    """
    
    # Get instances and rename_folders settings from the script config
    instances = config.script_config.get('instances', None)
    rename_folders = config.script_config.get('rename_folders', False)
    
    # Log script settings
    data = [
        ["Script Settings"]
    ]
    create_table(data, log_level="debug", logger=logger)
    logger.debug(f'{"Dry_run:":<20}{dry_run if dry_run else "False"}')
    logger.debug(f'{"Log level:":<20}{log_level if log_level else "INFO"}')
    logger.debug(f'{"Instances:":<20}{instances if instances else "Not Set"}')
    logger.debug(f'{"Rename Folders:":<20}{rename_folders if rename_folders else "False"}')
    logger.debug(f'*' * 40 + '\n')
    
    # Handle dry run settings
    if dry_run:
        data = [
            ["Dry Run"],
            ["NO CHANGES WILL BE MADE"]
        ]
        create_table(data, log_level="info", logger=logger)
        logger.info('')
    
    # Output dictionary to store processed data
    output_dict = {}
    
    # Process instances and gather data
    for instance_type, instance_data in config.instances_config.items():
        for instance in instances:
            if instance in instance_data:
                # Initialize StARR object for the instance
                app = StARR(instance_data[instance]['url'], instance_data[instance]['api'], logger)
                server_name = app.get_instance_name()
                
                # Process data for the instance and store in output_dict
                data = process_instance(app, rename_folders, server_name, instance_type)
                output_dict[instance] = {
                    "server_name": server_name,
                    "data": data
                }
    
    # Print output and send notifications if data exists
    if any(value['data'] for value in output_dict.values()):
        print_output(output_dict)
        if discord_check(script_name):
            notification(output_dict)
    else:
        logger.info("No media items to rename.")
    logger.info(f"{'*' * 40} END {'*' * 40}\n")

if __name__ == "__main__":
    main()