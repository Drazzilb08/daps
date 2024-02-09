#    ____             _             _                  
#   / __ \           (_)           | |                 
#  | |  | |_   _  ___ _ _ __   __ _| |_ ___  _ __ _ __ 
#  | |  | | | | |/ _ \ | '_ \ / _` | __/ _ \| '__| '__|
#  | |__| | |_| |  __/ | | | | (_| | || (_) | |  | |   
#   \___\_\\__,_|\___|_|_| |_|\__,_|\__\___/|_|  |_|   
# ===================================================================================================
# Author: Drazzilb
# Description: This script will move torrents from one category to another in qBittorrent based on
#              the title of the torrent. This is useful for moving torrents from a category that are stuck 
#              in a queue due to a missing file or not being an upgrade for existing episode file(s).
# Usage: python3 queinatorr.py
# Requirements: requests, qbittorrentapi
# License: MIT License
# ===================================================================================================

import json
from datetime import datetime
import sys

from util.config import Config
from util.logger import setup_logger
from qbittorrentapi import Client
from util.arrpy import StARR
from util.discord import discord, discord_check
from util.utility import *

try:
    from urllib.parse import urlsplit
except ImportError as e:
    print(f"ImportError: {e}")
    print("Please install the required modules with 'pip install -r requirements.txt'")
    exit(1)

script_name = "queinatorr"
config = Config(script_name)
log_level = config.log_level
dry_run = config.dry_run
logger = setup_logger(log_level, script_name)

queue_list = [
    "Not an upgrade for existing episode file(s). Existing quality: WEBDL-720p. New Quality WEBDL-1080p.",
    "New Quality is BR-DISK",
    "No files found are eligible for import",
    "The download is missing files",
    "DownloadClientQbittorrentTorrentStateMissingFiles",
    "qBittorrent is reporting an error"
]

def handle_qbit(queue_dict, qb, post_import_category, pre_import_category, days_to_keep):
    """
    This function will move torrents from one category to another in qBittorrent based on
    the title of the torrent. This is useful for moving torrents from a category that are stuck
    in a queue due to a missing file or not being an upgrade for existing episode file(s).
    
    Args:
        queue_dict (dict): Dictionary of items in the queue.
        qb (Client): qBittorrent Client instance.
        post_import_category (str): Category to move torrents to.
        pre_import_category (str): Category to move torrents from.
        days_to_keep (int): Number of days to keep torrents in the pre_import_category before moving them to the post_import_category.
        
    Returns:
        dict: Dictionary of messages to send to Discord.
    """
    
    try:
        torrents = qb.torrents_info()  # Retrieve information about all torrents in qBittorrent
    except Exception as e:
        logger.error(f"Error getting torrents: {e}")
        return  # Return if an error occurs while fetching torrents
    
    torrents_dict = {}  # Dictionary to store torrents from the pre_import_category
    qbit_messages = {}  # Dictionary to store messages to send to Discord
    
    # Iterate through all torrents and filter those in the pre_import_category
    for torrent in torrents:
        hash = torrent['hash']
        if torrent['category'] == pre_import_category:
            torrents_dict[hash] = {
                'torrent': torrent['name'],
                'category': torrent['category'],
                'addedOn': torrent['added_on']
            }
    
    # Log details of torrents in the pre_import_category
    logger.debug(f"Torrents in '{pre_import_category}': {len(torrents_dict)}\n {json.dumps(torrents_dict, indent=4)}")
    
    list_of_torrents = []  # List to store torrents from the queue_dict
    
    # Extract torrent names from queue_dict
    for record in queue_dict.values():
        list_of_torrents.append(record['torrent'])
    
    # Check each torrent in torrents_dict and move them to post_import_category if required conditions are met
    for hash, qb_data in torrents_dict.items():
        qb_torrent = qb_data['torrent']
        qb_torrent_without_extension = '.'.join(qb_torrent.split('.')[:-1])
        added_on = qb_data['addedOn']
        added_on = datetime.fromtimestamp(added_on)
        days_ago = (datetime.now() - added_on).days
        
        # Check if the torrent is in the list_of_torrents or older than days_to_keep and move accordingly
        if qb_torrent in list_of_torrents or qb_torrent_without_extension in list_of_torrents:
            move_torrent_to_category(qb, hash, post_import_category)  # Move torrent to post_import_category
        elif days_ago > days_to_keep:
            if qb_torrent in qbit_messages:
                qbit_messages[qb_torrent]['count'] += 1
            else:
                qbit_messages[qb_torrent] = {
                    'count': 1,
                    'message': f"{qb_torrent} -> {post_import_category} (Downloaded {days_ago} days ago)"
                }
            move_torrent_to_category(qb, hash, post_import_category)  # Move torrent to post_import_category
    
    return qbit_messages  # Return messages for notifications

def move_torrent_to_category(qb, torrent_hash, category):
    """
    This function will move a torrent to a category in qBittorrent.
    
    Args:
        qb (Client): qBittorrent Client instance.
        torrent_hash (str): Hash of the torrent to move.
        category (str): Category to move the torrent to.
    
    Returns:
        None
    """
    # Check if it's not a dry run and attempt to move the torrent to the specified category
    if not dry_run:
        try:
            qb.torrents_set_category(torrent_hashes=torrent_hash, category=category)
        except Exception as e:
            logger.error(f"Error moving torrent to {category}: {e}")  # Log an error if the move operation fails

def handle_queue(queue_dict, app):
    """
    This function will remove items from the queue in Radarr or Sonarr based on the status messages
    of the item.
    
    Args:
        queue_dict (dict): Dictionary of items in the queue.
        app (StARR): StARR instance.
    
    Returns:
        dict: Dictionary of messages to send to messages.
    """
    messages_dict = {}
    
    # Iterate through each item in the queue dictionary
    for id, record in queue_dict.items():
        title = record['title']
        year = record['year']
        message = record['status_messages']
        error = record['error_message']
        torrent = record['torrent']
        
        # Check if any substrings from queue_list are present in the status message or error message
        if any((sub_string in (message or "")) for sub_string in queue_list) or any((sub_string in (error or "")) for sub_string in queue_list):
            # Select the relevant substring from the status message or error message
            if any((sub_string in (message or "")) for sub_string in queue_list):
                message = next(sub_string for sub_string in queue_list if sub_string in (message or ""))
            elif any((sub_string in (error or "")) for sub_string in queue_list):
                message = next(sub_string for sub_string in queue_list if sub_string in (error or ""))
            
            # Create or update messages_dict with the appropriate details for each torrent
            if torrent not in messages_dict:
                messages_dict[id] = {
                    'title': title,
                    'year': year,
                    'torrent': torrent,
                    'messages': {},
                }
                
            # Increment the count of each encountered status or error message
            if message:
                if message in messages_dict[id]['messages']:
                    messages_dict[id]['messages'][message] += 1
                else:
                    messages_dict[id]['messages'][message] = 1
            if error:
                if error in messages_dict[torrent]['messages']:
                    messages_dict[id]['messages'][error] += 1
                else:
                    messages_dict[id]['messages'][error] = 1
        
        # Create a list of queue_ids for removal
        queue_ids = list(messages_dict.keys())
        
        # Remove items from the queue (if not a dry run)
        if not dry_run:
            app.remove_item_from_queue(queue_ids)
    
    return messages_dict

def queued_items(queue, instance_type):
    """
    This function will create a dictionary of items in the queue.
    
    Args:
        queue (dict): Dictionary of items in the queue.
        instance_type (str): Type of instance to process.
        
    Returns:
        dict: Dictionary of items in the queue.
    """

    queue_dict = {}
    
    # Traverse through the queue and extract relevant information for each item
    for key, data in queue.items():
        if key == 'records':
            for item in data:
                status_messages = []
                
                # For Radarr instance
                if instance_type == 'radarr':
                    media_id = item['movieId']
                    title = item['movie']['title']
                    year = item['movie']['year']
                    torrent = item['title']
                    status_messages = item.get('statusMessages', [])
                    
                    # Skip items without status messages
                    if status_messages == []:
                        continue
                    
                    list_of_messages = []
                    for message_item in status_messages:
                        if message_item['messages']:
                            list_of_messages.extend(message_item['messages'])
                    error_message = item.get('errorMessage', None)
                    queue_id = item['id']
                    
                    # Concatenate status messages as comma-separated string
                    if list_of_messages:
                        status_messages = ','.join(list_of_messages)
                    
                    # Create entry in queue_dict for each item
                    queue_dict[queue_id] = {
                        'media_id': media_id,
                        'title': title,
                        'year': year,
                        'torrent': torrent,
                        'status_messages': status_messages,
                        'error_message': error_message
                    }
                
                # For Sonarr instance
                elif instance_type == 'sonarr':
                    media_id = item['seriesId']
                    title = item['series']['title']
                    year = item['series']['year']
                    torrent = item['title']
                    status_messages = item['statusMessages']
                    error_message = item.get('errorMessage', None)
                    list_of_messages = []
                    
                    # Extract messages from status_messages
                    for message_item in status_messages:
                        if message_item['messages']:
                            list_of_messages.extend(message_item['messages'])
                    queue_id = item['id']
                    
                    # Concatenate status messages as comma-separated string
                    if list_of_messages:
                        status_messages = ','.join(list_of_messages)
                    
                    # Create entry in queue_dict for each item
                    queue_dict[queue_id] = {
                        'media_id': media_id,
                        'title': title,
                        'year': year,
                        'torrent': torrent,
                        'status_messages': status_messages,
                        'error_message': error_message
                    }
    
    return queue_dict

def process_instance(instance_type, url, api, pre_import_category, post_import_category, qbit_instance, days_to_keep):
    """
    This function will process a Radarr or Sonarr instance and move items from the queue to the
    specified category based on the status messages of the item.
    
    Args:
        instance_type (str): Type of instance to process.
        url (str): URL of the instance.
        api (str): API key of the instance.
        pre_import_category (str): Category to move torrents from.
        post_import_category (str): Category to move torrents to.
        qbit_instance (str): qBittorrent instance to move torrents to.
        days_to_keep (int): Number of days to keep torrents in the pre_import_category before moving them to the post_import_category.
        
    Returns:
        dict: Dictionary of messages to send to Discord.
    """

    # Retrieve qBittorrent configuration from the script's configurations
    qbit_data = config.instances_config.get('qbittorrent', {})
    for key, data in qbit_data.items():
        if key == qbit_instance:
            qbit_url = data['url']
            qbit_host = urlsplit(qbit_url).hostname
            qbit_port = urlsplit(qbit_url).port
            qbit_username = data['username']
            qbit_password = data['password']
            qb = Client(host=qbit_host, port=qbit_port)
            break
    
    # Initialize a StARR instance for Radarr or Sonarr
    app = StARR(url, api, logger)
    server_name = app.get_instance_name()
    
    # Log script instance configuration details
    table = [
        [f"{server_name}"],
    ]
    logger.info(create_table(table))
    logger.debug('\n')
    table = [
        [f"Script instance config for {server_name}"],
    ]
    logger.debug(create_table(table))
    # Logging configuration details
    logger.debug(f'{"URL:":<30}{url}')
    logger.debug(f'{"API:":<30}{"*" * (len(api) - 5)}{api[-5:]}')
    logger.debug(f'{"qBittorrent Instance:":<30}{qbit_instance}')
    logger.debug(f'{"qBittorrent URL:":<30}{qbit_url}')
    logger.debug(f'{"qBittorrent Host:":<30}{qbit_host}')
    logger.debug(f'{"qBittorrent Port:":<30}{qbit_port}')
    logger.debug(f'{"qBittorrent Username:":<30}{qbit_username}')
    logger.debug(f'{"qBittorrent Password:":<30}{"*" * (len(qbit_password) - 5)}{qbit_password[-5:]}')
    logger.debug(f'{"pre_import_category:":<30}{pre_import_category}')
    logger.debug(f'{"post_import_category:":<30}{post_import_category}')
    logger.debug(create_bar("-"))
    
    # Retrieve the queue from Radarr or Sonarr instance
    queue = app.get_queue(instance_type)
    queue_dict = queued_items(queue, instance_type)
    
    # Create a dictionary to store output messages
    output_dict = {
        'server_name': server_name,
        'queue': {},
        'qbit': {}
    }
    
    # Check if the queue is empty for the specified instance
    if queue_dict == {}:
        logger.info(f"No items in the queue for {server_name} for Queinatorr to process.\n")
    else:
        logger.info(f"Number of items in the queue for {server_name}: {len(queue_dict)}\n")
    
    # Process and handle the queue in Radarr or Sonarr
    messages_dict = handle_queue(queue_dict, app)
    if messages_dict:
        output_dict['queue'] = messages_dict
    
    logger.debug(f"Queue items for '{instance_type}'\n{json.dumps(queue_dict, indent=4)}\n")
    
    # Handle moving torrents from the queue to the specified categories in qBittorrent
    messages_dict = handle_qbit(queue_dict, qb, post_import_category, pre_import_category, days_to_keep)
    if messages_dict:
        output_dict['qbit'] = messages_dict
    
    return output_dict

def notification(messages):
    """
    This function will send a notification to Discord.
    
    Args:
        messages (dict): Dictionary of messages to send to Discord.
        
    Returns:
        None
    """
    # If there are no messages to send, log and exit the function
    if not messages:
        logger.info("No Discord messages to send.")
        return
    
    fields = []
    # Iterate through each instance and its corresponding value in the messages dictionary
    for instance_name, value in messages.items():
        field_list = []
        
        # Retrieve values for various parameters from the input 'value' dictionary
        pre_import_category = value.get('pre_import_category', None)
        post_import_category = value.get('post_import_category', None)
        qbit_instance = value.get('qbit_instance', None)
        days_to_keep = value.get('days_to_keep', None)
        
        # Retrieve output from the value dictionary
        output = value['output']
        server_name = output['server_name']
        queue_items = output.get('queue', None)
        qbit_items = output.get('qbit', None)
        
        total_queue_items = 0
        total_qbit_items = 0
        
        # Calculate total queue items and construct fields for queue items
        if queue_items:
            for torrent, data in queue_items.items():
                messages = data['messages']
                total = sum(messages.values())
                total_queue_items += total
            if total_queue_items > 0:
                field = {
                    "name": f"{server_name} - Queue Items (Total: " + str(total_queue_items) + ")",
                    "value": f"```Items removed from queue:\nAction: {pre_import_category} -> {post_import_category}```",
                    "inline": False
                }
                fields.append(field)
        
        # Calculate total qBittorrent items and construct fields for qBittorrent items
        if qbit_items:
            for torrent, data in qbit_items.items():
                count = data['count']
                total_qbit_items += count
            if total_qbit_items > 0:
                field = {
                    "name": f"{server_name} - qBittorrent Items (Total: " + str(total_qbit_items) + ")",
                    "value": f"```Items moved to from {pre_import_category} -> {post_import_category}:\nDownloaded {days_to_keep} days ago or more```",
                    "inline": False
                }
                fields.append(field)
        
        if field_list:
            fields.append(field_list)
    
    # If there are fields to be sent to Discord, send the message
    if fields:
        discord(fields, logger, script_name, description=f"{'__**Dry Run**__' if dry_run else 'Queinatorr'}", color=0x800080, content=None)



def print_output(messages):
    """
    This function will print the output to the console.
    
    Args:
        messages (dict): Dictionary of messages to print.
        
    Returns:
        None
    """
    
    # Set the header based on whether it's a dry run or not
    if dry_run:
        header = f"DRY RUN: Items removed from queue."
    else:
        header = f"Items removed from queue."
    
    # If there are no messages to print, log and exit the function
    if not messages:
        logger.info("No items to print.")
        return
    
    # Iterate through each instance and its corresponding value in the messages dictionary
    for instance_name, value in messages.items():
        pre_import_category = value.get('pre_import_category', None)
        post_import_category = value.get('post_import_category', None)
        qbit_instance = value.get('qbit_instance', None)
        
        # Retrieve output from the value dictionary
        output = value['output']
        server_name = output['server_name']
        queue_items = output.get('queue', None)
        qbit_items = output.get('qbit', None)
        
        # Process and print queue items information
        if queue_items:
            # Create header and subheader for queue items
            table = [
                [f"Queue Items Processed for {server_name}"],
                [f"{header}"]
            ]
            logger.info(create_table(table))
            
            # Iterate through each queue item and print its details
            for id, data in queue_items.items():
                title = data['title']
                year = data['year']
                torrent = data['torrent']
                messages = data['messages']
                total = sum(messages.values())
                
                # Print details for each queue item and its messages
                logger.info(f"\t{title} ({year}) - {torrent} - {total} items")
                for message, count in messages.items():
                    logger.info(f"\t\t{message} ({count})")
                logger.info('')
        
        # Process and print qBittorrent items information
        if qbit_items:
            # Create header and subheader for qBittorrent items
            table = [
                [f"qBittorrent Items Processed for {server_name}"],
                [f"{pre_import_category} -> {post_import_category} ({qbit_instance})"],
            ]
            logger.info(create_table(table))
            
            # Iterate through each qBittorrent item and print its details
            for torrent, data in qbit_items.items():
                count = data['count']
                message = data['message']
                
                # Print details for each qBittorrent item
                if count > 1:
                    logger.info(f"\t{message} - {count} times")
                else:
                    logger.info(f"\t{message}")

def main():
    """
    Main function.
    """
    name = script_name.replace("_", " ").upper()
    try:
        logger.info(create_bar(f"START {name}"))
        # Display a notice for dry run mode if enabled
        if dry_run:
            table = [
                ["Dry Run"],
                ["NO CHANGES WILL BE MADE"]
            ]
            logger.info(create_table(table))
        
        # Retrieve script configuration from the config file
        script_config = config.script_config

        # Get the number of days to keep torrents in pre-import category
        days_to_keep = script_config.get('days_to_keep', 15)
        
        # Retrieve instance information from the configuration
        instances = script_config.get('instances', None)
        if instances is None:
            logger.error("No instances defined in the config.")
            return
        
        # Initialize the final output dictionary
        final_output_dict = {}
        
        # Iterate through each instance type and its settings in the configuration
        for instance_type, instance_data in config.instances_config.items():
            for instance, instance_settings in instances.items():
                # Check if the instance exists in the configuration data
                if instance in instance_data:
                    # Retrieve necessary instance settings
                    url = instance_data[instance]['url']
                    api = instance_data[instance]['api']
                    pre_import_category = instance_settings.get('pre_import_category', False)
                    post_import_category = instance_settings.get('post_import_category', False)
                    qbit_instance = instance_settings.get('qbit_instance', False)
                    
                    # Process the instance and retrieve the output
                    output = process_instance(instance_type, url, api, pre_import_category, post_import_category, qbit_instance, days_to_keep)
                    
                    # If there is an output, update the final output dictionary
                    if output:
                        final_output_dict[instance] = {
                            'output': output,
                            'pre_import_category': pre_import_category,
                            'post_import_category': post_import_category,
                            'qbit_instance': qbit_instance,
                            'days_to_keep': days_to_keep
                        }
        
        # Print the final output details to the console
        print_output(final_output_dict)
        
        # Send a notification to Discord with the final output
        if discord_check(script_name):
            notification(final_output_dict)

    except KeyboardInterrupt:
        print("Keyboard Interrupt detected. Exiting...")
        sys.exit()
    except Exception:
        logger.error(f"\n\nAn error occurred:\n", exc_info=True)
        logger.error(f"\n\n")
    finally:
        logger.info(create_bar(f"END {name}"))

if __name__ == '__main__':
    main()