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
import sys
import time

from util.arrpy import StARR
from util.utility import *
from util.discord import discord, discord_check
from util.logger import setup_logger

try:
    from tqdm import tqdm
except ImportError as e:
    print(f"ImportError: {e}")
    print("Please install the required modules with 'pip install -r requirements.txt'")
    exit(1)

script_name = "renameinatorr"

def print_output(output_dict, logger):
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
        table = [
            [f"{instance_data['server_name'].capitalize()} Rename List"],
        ]
        logger.info(create_table(table))
        
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
                    logger.info(f"\t\tOriginal: {existing_path}\n\t\tNew: {new_path}\n")
        logger.info('')
        
        # Calculate total counts for various rename items
        total_items = len(instance_data['data'])
        total_rename_items = len([value['file_info'] for value in instance_data['data'] if value['file_info']])
        total_folder_rename = len([value['new_path_name'] for value in instance_data['data'] if value['new_path_name']])
        
        # Display summary of rename actions if any rename occurred
        if any(value['file_info'] or value['new_path_name'] for value in instance_data['data']):
            table = [
                [f"{instance_data['server_name'].capitalize()} Rename Summary"],
                [f"Total Items: {total_items}"],
            ]
            if any(value['file_info'] for value in instance_data['data']):
                table.append([f"Total Renamed Items: {total_rename_items}"])
            if any(value['new_path_name'] for value in instance_data['data']):
                table.append([f"Total Folder Renames: {total_folder_rename}"])
            logger.info(create_table(table))
        else:
            logger.info(f"No items renamed in {instance_data['server_name']}.")
        logger.info('')

def notification(output_dict, logger):
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
        if key % 5 == 0:
            print("Pausing for 5 seconds to let Discord catch up...")
            time.sleep(5)


def process_instance(app, rename_folders, server_name, instance_type, count, tag_name, logger):
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
    table = [
        [f"Processing {server_name}"]
    ]
    print(create_table(table))
    
    # Fetch data related to the instance (Sonarr or Radarr)
    media_dict = handle_starr_data(app, server_name, instance_type, include_episode=False)

    # If count and tag_name is specified, limit the number of items to process that do not have tag_name
    tag_id = None
    if count and tag_name:
        tag_id = app.get_tag_id_from_name(tag_name)
        if tag_id:
            media_tmp = [item for item in media_dict if tag_id not in item['tags']][:count]
        
        # If all media is tagged, remove tags and fetch new data
        if not media_tmp:
            media_ids = [item['media_id'] for item in media_dict]
            logger.info("All media is tagged. Removing tags...")
            app.remove_tags(media_ids, tag_id)
            media_dict = handle_starr_data(app, server_name, instance_type, include_episode=False)
            media_dict = [item for item in media_dict if tag_id not in item['tags']][:count]
        else:
            media_dict = media_tmp
    
    logger.debug(f"media dict:\n{json.dumps(media_dict, indent=4)}")

    # Process each item in the fetched data
    rename_response = []
    if media_dict:
        print("Processing data... This may take a while.")
        for item in tqdm(media_dict, desc=f"Processing '{server_name}' Media", unit="items", disable=None, leave=True):
            file_info = {}
            can_rename = False
            # Fetch rename list and sort it by existingPath
            rename_response = app.get_rename_list(item['media_id'])
            rename_response.sort(key=lambda x: x['existingPath'])
            
            if rename_response:
                can_rename = True
            
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
            item["can_rename"] = can_rename
        
        # If not in dry run, perform file renaming
        if not dry_run:
            # Get media IDs and initiate file renaming
            media_ids = []
            for item in media_dict:
                if item["can_rename"]:
                    media_ids.append(item['media_id'])

            if media_ids:
                # Rename files and wait for media refresh
                app.rename_media(media_ids)              
                
                # Refresh media and wait for it to be ready
                print(f"Refreshing {server_name}...")
                response = app.refresh_items(media_ids)
                
                # Wait for media to be ready
                ready = app.wait_for_command(response['id'])

                if ready:
                    logger.info(f"Media refreshed on {server_name}...")
                    ready = False
            else:
                logger.info(f"No media to rename on {server_name}...")

            if tag_id and count and tag_name:
                # Add tag to items that were renamed
                print(f"Adding tag '{tag_name}' to items in {server_name}...")
                app.add_tags(media_ids, tag_id)
            
            # Group and rename root folders if necessary
            grouped_root_folders = {}

            # Group root folders by root folder name
            if rename_folders:
                print(f"Renaming folders in {server_name}...")
                for item in media_dict:
                    root_folder = item["root_folder"]
                    if root_folder not in grouped_root_folders:
                        grouped_root_folders[root_folder] = []
                    grouped_root_folders[root_folder].append(item['media_id'])
                
                # Rename folders and wait for media refresh
                for root_folder, media_ids in grouped_root_folders.items():
                    app.rename_folders(media_ids, root_folder)
                
                # Refresh media and wait for it to be ready
                print(f"Refreshing {server_name}...")
                response = app.refresh_items(media_ids)

                # Wait for media to be ready
                print(f"Waiting for {server_name} to refresh...")
                ready = app.wait_for_command(response['id'])
                
                print(f"Folders renamed in {server_name}...")
                # Get updated media data and update item with new path names
                if ready:
                    print(f"Fetching updated data for {server_name}...")
                    new_media_dict = handle_starr_data(app, server_name, instance_type, include_episode=False)
                    for new_item in new_media_dict:
                        for old_item in media_dict:
                            if new_item['media_id'] == old_item['media_id']:
                                if new_item['path_name'] != old_item['path_name']:
                                    old_item['new_path_name'] = new_item['path_name']
    
    return media_dict

def main(config):
    """
    Main function.
    """
    global dry_run
    dry_run = config.dry_run
    log_level = config.log_level
    logger = setup_logger(log_level, script_name)
    script_config = config.script_config
    name = script_name.replace("_", " ").upper()

    try:
        logger.info(create_bar(f"START {name}"))
        # Get instances and rename_folders settings from the script config
        script_config = config.script_config
        instances = config.script_config.get('instances', None)
        rename_folders = config.script_config.get('rename_folders', False)
        count = config.script_config.get('count', 0)
        tag_name = config.script_config.get('tag_name', None)
        valid = validate(config, script_config, logger)
        
        # Log script settings
        table = [
            ["Script Settings"]
        ]
        logger.debug(create_table(table))
        logger.debug(f'{"Dry_run:":<20}{dry_run}')
        logger.debug(f'{"Log level:":<20}{log_level}')
        logger.debug(f'{"Instances:":<20}{instances}')
        logger.debug(f'{"Rename Folders:":<20}{rename_folders}')
        logger.debug(f'{"Count:":<20}{count}')
        logger.debug(f'{"Tag Name:":<20}{tag_name}')
        logger.debug(create_bar("-"))
        
        # Handle dry run settings
        if dry_run:
            table = [
                ["Dry Run"],
                ["NO CHANGES WILL BE MADE"]
            ]
            logger.info(create_table(table))
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
                    data = process_instance(app, rename_folders, server_name, instance_type, count, tag_name, logger)
                    output_dict[instance] = {
                        "server_name": server_name,
                        "data": data
                    }
        
        # Print output and send notifications if data exists
        if any(value['data'] for value in output_dict.values()):
            print_output(output_dict, logger)
            if discord_check(script_name):
                notification(output_dict, logger)
        else:
            logger.info("No media items to rename.")
    except KeyboardInterrupt:
        print("Keyboard Interrupt detected. Exiting...")
        sys.exit()
    except Exception:
        logger.error(f"\n\nAn error occurred:\n", exc_info=True)
        logger.error(f"\n\n")
    finally:
        logger.info(create_bar(f"END {name}"))