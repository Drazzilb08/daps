#   _           _          _                 
#  | |         | |        | |                
#  | |     __ _| |__   ___| | __ _ _ __ _ __ 
#  | |    / _` | '_ \ / _ \ |/ _` | '__| '__|
#  | |___| (_| | |_) |  __/ | (_| | |  | |   
#  |______\__,_|_.__/ \___|_|\__,_|_|  |_|   
# ======================================================================================
# Author: Drazzilb
# Description: A script to sync labels between Plex and Radarr/Sonarr
# Usage: python3 /path/to/labelarr.py
# Requirements: requests, pyyaml, plexapi
# License: MIT License
# ======================================================================================

import json
import time

from util.config import Config
from util.discord import discord, discord_check
from util.arrpy import StARR
from util.utility import *
from util.logger import setup_logger
    
try:
    from plexapi.server import PlexServer
    from plexapi.exceptions import BadRequest
    from tqdm import tqdm
except ImportError as e:
    print(f"ImportError: {e}")
    print("Please install the required modules with 'pip install -r requirements.txt'")
    exit(1)

script_name = "labelarr"
config = Config(script_name)
log_level = config.log_level
dry_run = config.dry_run
logger = setup_logger(log_level, script_name)

def process_data(plex_dict, media_dict, labels):
    """
    Process the data to be synced to Plex.
    
    Args:
        plex_dict (dict): The Plex data.
        media_dict (dict): The Radarr/Sonarr data.
        labels (list): The list of labels to sync.
        
    Returns:
        data_dict (dict): The data to be synced to Plex.
    """

    # Importing logger to log syncing process
    logger.debug("Syncing labels to Plex")
    
    # Initialize the list to store data to be synced to Plex
    data_dict = []
    
    # Iterate through each media item in the Radarr/Sonarr data
    for media_item in media_dict:
        # Iterate through each Plex item in the Plex data
        for plex_item in plex_dict:
            # Check if the normalized title and year match between Plex and media data
            if (
                media_item['normalized_title'] == plex_item['normalized_title']
                and media_item['year'] == plex_item['year']
            ):
                # Get labels from Plex and media tags from Radarr/Sonarr
                plex_labels = plex_item.get('labels', [])
                media_tags = media_item.get('tag_data', {}).keys()
                
                # Dictionary to store labels to add or remove
                add_remove = {}
                
                # Check each label in the provided list
                for label in labels:
                    # Determine labels to add or remove based on comparison between Plex labels and media tags
                    if label in plex_labels and label not in media_tags:
                        add_remove[label] = "remove"
                    elif label not in plex_labels and label in media_tags:
                        add_remove[label] = "add"
                
                # If there are labels to add or remove, append data to data_dict
                if add_remove:
                    data_dict.append({
                        "title": media_item['title'],
                        "year": media_item['year'],
                        "add_remove": add_remove
                    })
    
    # Return the data to be synced to Plex
    return data_dict


def sync_to_plex(plex, data_dict, instance_type):
    """
    Sync the data to Plex.
    
    Args:
        plex (obj): The Plex server object.
        data_dict (dict): The data to be synced to Plex.
        instance_type (str): The type of instance (radarr/sonarr).
        
    Returns:
        None
    """

    print(f"Syncing labels to Plex")
    
    # Loop through each item in the data_dict
    for item in data_dict:
        if instance_type == "sonarr":
            type = "show"
        elif instance_type == "radarr":
            type = "movie"
            
            # Search for the item in the Plex library based on title and year
            try:
                plex_item = plex.library.search(item['title'], libtype=type, year=item['year'])[0]
            except IndexError:
                # Log an error if the title is not found in Plex and continue to the next item
                logger.error(f"Title: {item['title']} ({item['year']}) | Title not found in Plex")
                continue
                
            # If the Plex item is found
            if plex_item:
                # Iterate through each label and corresponding action (add/remove)
                for label, action in item['add_remove'].items():
                    # Perform add or remove action based on the label and action type
                    if action == "add":
                        plex_item.addLabel(label)
                    elif action == "remove":
                        plex_item.removeLabel(label)

    # No explicit return value, as it's modifying Plex items directly
    return


def handle_messages(data_dict):
    """
    Handle the messages to be sent to Discord.
    
    Args:
        data_dict (dict): The data to be synced to Plex.
        
    Returns:
        None
    """
    # Loop through each item in the data_dict
    for item in data_dict:
        # Log the title and year of the item
        logger.info(f"Title: {item['title']} ({item['year']})")
        
        # Iterate through each label and corresponding action (add/remove) in the item
        for label, action in item['add_remove'].items():
            # Log information about label addition or removal
            if action == "add":
                logger.info(f"\tLabel: {label} added.")
            elif action == "remove":
                logger.info(f"\tLabel: {label} removed.")


def notification(data_dict):
    """
    Send the notification to Discord.

    Args:
        data_dict (dict): The data to be synced to Plex.

    Returns:
        None
    """

    fields = []
    built_fields = {}
    count = 0
    message_count = 0

    # Iterate through each item in the data_dict
    for item in data_dict:
        actions = []
        # Extract actions (add or remove labels) for each item
        for label, action in item['add_remove'].items():
            if action == "add":
                action = f"{label} {action}ed"
            elif action == "remove":
                action = f"{label} {action}d"
            actions.append(action)
        actions = "\n".join(actions)
        # Create a field for the Discord message
        field = {
            "name": f"{item['title']} ({item['year']})",
            "value": f"```{actions}```",
            "inline": False
        }
        count += 1
        fields.append(field)
        # If the count of fields reaches 25, store the current fields and reset the count
        if count >= 25:
            count = 0
            message_count += 1
            built_fields[message_count] = fields
            fields = []

    # If there are remaining fields, store them
    if fields:
        message_count += 1
        built_fields[message_count] = fields

    # If there are built_fields, send the notifications
    if built_fields:
        for message_number, fields in built_fields.items():
            print(f"Sending message {message_number} of {message_count}...")
            # Discord function call (may require specific parameters to function)
            discord(fields, logger, config, script_name, description=f"{'__**Dry Run**__' if dry_run else ''}", color=0x00ff00, content=None)


def handle_tags(app, media_dict, tag_names):
    """
    Handle the tags for the media.

    Args:
        app (obj): The StARR object.
        media_dict (dict): The media data.
        tag_names (list): The list of tag names.

    Returns:
        media_dict (dict): The media data with the tag data added.
    """

    tag_dict = {}
    
    # If tag_names list is not empty
    if tag_names:
        # Convert tag names to lowercase and store in 'tags'
        tags = [tag.lower() for tag in tag_names]
        
        # Iterate through each tag in the lowercase 'tags' list
        for tag in tags:
            # Get the tag ID from StARR object for each tag
            tag_id = app.get_tag_id_from_name(tag)
            
            # If tag ID exists, add it to the tag dictionary
            if tag_id:
                tag_dict[tag] = tag_id
    
    # If tag_dict is not empty
    if tag_dict:
        # Iterate through each item in the media dictionary
        for item in media_dict:
            tag_data = {}
            # Check each tag and its ID against the item's tags
            for tag, tag_id in tag_dict.items():
                # If the tag ID exists in the item's tags, add it to tag_data
                if tag_id in item['tags']:
                    tag_data[tag] = tag_id
            # Assign the collected tag_data to the item
            item['tag_data'] = tag_data
    
    return media_dict


def main():
    """
    The main function.
    """
    
    # If in dry run mode, create a table indicating no changes will be made
    if dry_run:
        data = [
            ["Dry Run"],
            ["NO CHANGES WILL BE MADE"]
        ]
        create_table(data, log_level="info", logger=logger)
    
    # Fetch script configurations
    script_config = config.script_config
    instances = script_config.get('instances', None)
    
    # Iterate through instance types and their respective configurations
    for instance_type, instance_data in config.instances_config.items():
        for instance, instance_settings in instances.items():
            if instance in instance_data:
                # Extract various settings for the instance
                plex_instances = instance_settings.get('plex_instances', None)
                labels = instance_settings.get('labels', None)
                library_names = instance_settings.get('library_names', None)
                
                # Create StARR object and get instance name
                app = StARR(instance_data[instance]['url'], instance_data[instance]['api'], logger)
                starr_server_name = app.get_instance_name()
                
                # Fetch and process media data from the StARR instance
                media_dict = handle_starr_data(app, instance_type)
                media_dict = handle_tags(app, media_dict, labels)
                
                # If media data is found
                if media_dict:
                    # Logging settings and instance information
                    logger.debug(f"Media Data:\n{json.dumps(media_dict, indent=4)}")
                    # (Additional logging and table creation omitted for brevity)
                    
                    # Iterate through Plex instances associated with the current StARR instance
                    for plex_instance in plex_instances:
                        if plex_instance in config.plex_config:
                            # Connect to the Plex server
                            try:
                                plex = PlexServer(config.plex_config[plex_instance]['url'], config.plex_config[plex_instance]['api'])
                            except BadRequest:
                                logger.error(f"Error connecting to Plex instance: {plex_instance}")
                                continue
                            server_name = plex.friendlyName
                            
                            # Fetch Plex data and process it
                            plex_dict = get_plex_data(plex, library_names, logger, include_smart=False, collections_only=False)
                            
                            # If Plex data is found
                            if plex_dict:
                                # Logging Plex data
                                logger.debug(f"Plex Data:\n{json.dumps(plex_dict, indent=4)}")
                                
                                # Process data for syncing to Plex
                                data_dict = process_data(plex_dict, media_dict, labels)
                                
                                # If items to sync are found
                                if data_dict:
                                    logger.debug(f"Items to sync:\n{json.dumps(data_dict, indent=4)}")
                                    # Perform actual syncing to Plex if not in dry run mode
                                    if not dry_run:
                                        sync_to_plex(plex, data_dict, instance_type)
                                    
                                    # Handle messages related to syncing actions
                                    handle_messages(data_dict)
                                    
                                    # Send notifications related to syncing actions
                                    if discord_check(config, script_name):
                                        notification(data_dict)
                                else:
                                    logger.info(f"No items to sync from {starr_server_name} to {server_name}.\n")
                            else:
                                logger.error(f"No Plex Data found for {server_name}. Skipping...")
                                continue
                    else:
                        continue
    logger.info(f"{'*' * 40} END {'*' * 40}\n")


if __name__ == "__main__":
    start_time = time.time()
    main()
    end_time = time.time()
    total_time = round(end_time - start_time, 2)
    logger.info(f"Total Time: {time.strftime('%H:%M:%S', time.gmtime(total_time))}")
