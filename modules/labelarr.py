#   _           _          _                 
#  | |         | |        | |                
#  | |     __ _| |__   ___| | __ _ _ __ _ __ 
#  | |    / _` | '_ \ / _ \ |/ _` | '__| '__|
#  | |___| (_| | |_) |  __/ | (_| | |  | |   
#  |______\__,_|_.__/ \___|_|\__,_|_|  |_|   
# ======================================================================================
# Author: Drazzilb
# Description: A script to sync labels between Plex and Radarr/Sonarr
# Usage: python3 labelarr.py
# Requirements: requests, pyyaml, plexapi
# License: MIT License
# ======================================================================================

import json
import time
import sys

from util.discord import discord, discord_check
from util.arrpy import StARR
from util.utility import *
from util.logger import setup_logger
    
try:
    from plexapi.server import PlexServer
    from plexapi.exceptions import BadRequest
except ImportError as e:
    print(f"ImportError: {e}")
    print("Please install the required modules with 'pip install -r requirements.txt'")
    exit(1)

script_name = "labelarr"

def sync_to_plex(plex, labels, media_dict, app, starr_server_name, logger, library_names):
    
    tag_ids = {}

    for label in labels: 
        tag_id = app.get_tag_id_from_name(label)
        if tag_id:
            tag_ids[label] = tag_id

    data_dict = []
    for library in tqdm(library_names, desc=f"Processing Library", unit="library"):
        library_data = plex.library.section(library).all()
        for library_item in tqdm(library_data, desc=f"Syncing labels between {library} and {starr_server_name.capitalize()}"):
            try:
                plex_item_labels = [label.tag.lower() for label in library_item.labels]
            except AttributeError:
                logger.error(f"Error fetching labels for {library_item.title} ({library_item.year})")
                continue
            normalized_title = normalize_titles(library_item.title)
            for media_item in media_dict:
                if normalized_title == media_item['normalized_title'] and library_item.year == media_item['year']:
                    add_remove = {}
                    for tag, id in tag_ids.items():
                        if tag not in plex_item_labels and id in media_item['tags']:
                            add_remove[tag] = 'add'
                            if not dry_run:
                                library_item.addLabel(tag)
                        elif tag in plex_item_labels and id not in media_item['tags']:
                            add_remove[tag] = 'remove'
                            if not dry_run:
                                library_item.removeLabel(tag)
                    if add_remove:
                        data_dict.append({
                            "title": library_item.title,
                            "year": library_item.year,
                            "add_remove": add_remove,
                        })
    return data_dict

def handle_messages(data_dict, logger):
    """
    Handle the messages to be sent to Discord.
    
    Args:
        data_dict (dict): The data to be synced to Plex.
        
    Returns:
        None
    """
    table = [
        ["Results"],
    ]
    logger.info(create_table(table))
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


def notification(data_dict, logger):
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
            discord(fields, logger, script_name, description=f"{'__**Dry Run**__' if dry_run else ''}", color=0x00ff00, content=None)
            if message_number % 5 == 0:
                print("Pausing for 5 seconds to let Discord catch up...")
                time.sleep(5)

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
        # If in dry run mode, create a table indicating no changes will be made
        if dry_run:
            table = [
                ["Dry Run"],
                ["NO CHANGES WILL BE MADE"]
            ]
            logger.info(create_table(table))
        
        # Fetch script configurations
        script_config = config.script_config
        instances = script_config.get('instances', None)
        valid = validate(config, script_config, logger)
        
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
                    if app.connect_status:
                        starr_server_name = app.get_instance_name()
                        
                        # Fetch and process media data from the StARR instance
                        media_dict = handle_starr_data(app, starr_server_name, instance_type, include_episode=False)
                        
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
                                        logger.info("Connecting to Plex...")
                                        plex = PlexServer(config.plex_config[plex_instance]['url'], config.plex_config[plex_instance]['api'], timeout=180)
                                    except BadRequest:
                                        logger.error(f"Error connecting to Plex instance: {plex_instance}")
                                        continue
                                    server_name = plex.friendlyName
                                    # Process data for syncing to Plex
                                    if library_names:
                                        logger.info("Syncing labels to Plex")
                                        data_dict = sync_to_plex(plex, labels, media_dict, app, starr_server_name, logger, library_names)
                                    else:
                                        logger.error(f"No library names provided for {server_name}. Skipping...")
                                        continue
                                    
                                    # Handle messages related to syncing actions
                                    if data_dict:
                                        handle_messages(data_dict, logger)
                                        
                                        # Send notifications related to syncing actions
                                        if discord_check(script_name):
                                            notification(data_dict, logger)
                                    else:
                                        logger.info(f"No items to sync from {starr_server_name} to {server_name}.\n")
                            else:
                                continue
    except KeyboardInterrupt:
        print("Keyboard Interrupt detected. Exiting...")
        sys.exit()
    except Exception:
        logger.error(f"\n\nAn error occurred:\n", exc_info=True)
        logger.error(f"\n\n")
    finally:
        logger.info(create_bar(f"END {name}"))