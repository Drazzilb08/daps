#   _    _                           _ _             _                  
#  | |  | |                         | (_)           | |                 
#  | |  | |_ __   __ _ _ __ __ _  __| |_ _ __   __ _| |_ ___  _ __ _ __ 
#  | |  | | '_ \ / _` | '__/ _` |/ _` | | '_ \ / _` | __/ _ \| '__| '__|
#  | |__| | |_) | (_| | | | (_| | (_| | | | | | (_| | || (_) | |  | |   
#   \____/| .__/ \__, |_|  \__,_|\__,_|_|_| |_|\__,_|\__\___/|_|  |_|   
#         | |     __/ |                                                 
#         |_|    |___/                                                  
# ===================================================================================================
# Author: Drazzilb
# Description: A script to upgrade Sonarr/Radarr libraries to the keep in line with trash-guides
# Usage: python3 /path/to/upgradinatorr.py
# Requirements: requests, pyyaml
# License: MIT License
# ===================================================================================================

import json
import sys
import time

from util.arrpy import StARR
from util.discord import discord, discord_check
from util.utility import *
from util.logger import setup_logger

script_name = "upgradinatorr"

def filter_media(media_dict, checked_tag_id, ignore_tag_id, count, logger):
    """
    Filter media_dict to remove items that are:
        * not monitored
        * have the checked_tag_id
        * have the ignore_tag_id
        * not in the correct status
    
    Args:
        media_dict (list): A list of dictionaries containing media information.
        checked_tag_id (int): The checked_tag_id to filter out.
        ignore_tag_id (int): The ignore_tag_id to filter out.
        count (int): The number of items to return.
        
    Returns:
        filtered_media_dict (list): A list of dictionaries containing media information.
    """
    
    filtered_media_dict = []  # Initializing an empty list to store filtered media
    filter_count = 0  # Initializing a counter for the number of filtered items
    for item in media_dict:
        if filter_count == count:  # Check if the desired count has been reached
            break
        # Check conditions: checked_tag_id not in tags, ignore_tag_id not in tags, monitored is True, and status is one of the specified statuses
        if checked_tag_id in item['tags'] or ignore_tag_id in item['tags'] or item['monitored'] == False or item['status'] not in ["continuing", "airing", "ended", "canceled", "released"]:
            # Log skipped items
            logger.debug(f"Skipping {item['title']} ({item['year']}), Status: {item['status']}, Monitored: {item['monitored']}, Tags: {item['tags']}")
            continue  # Move to the next item if conditions are not met
        filtered_media_dict.append(item)  # Append the item to the filtered list
        filter_count += 1  # Increment the counter for filtered items
    return filtered_media_dict  # Return the filtered list of media


def process_queue(queue, instance_type, media_ids):
    """
    Process the queue to return a list of dictionaries containing the download_id, media_id, and download.
    
    Args:
        queue (dict): A dictionary containing the queue information.
        instance_type (str): The instance type to process.
        media_ids (list): A list of media_ids to filter the queue with.
        
    Returns:
        queue_dict (list): A list of dictionaries containing the download_id, media_id, and download.
    """

    if instance_type == "radarr":
        id_type = "movieId"
    elif instance_type == "sonarr":
        id_type = "seriesId"
    queue_dict = []  # Initialize an empty list to store processed queue information
    records = queue.get('records', None)  # Retrieve 'records' from the queue dictionary
    for item in records:  # Iterate through each item in the 'records'
        media_id = item[id_type]  # Get the appropriate ID type ('movieId' or 'seriesId')
        if media_id not in media_ids:  # Check if the media_id is present in the provided list of media_ids
            continue  # Skip to the next item if the media_id is not in the list
        # Append relevant information to the queue_dict list
        queue_dict.append({
            'download_id': item['downloadId'],
            'media_id': media_id,
            'download': item['title'],
            'torrent_custom_format_score': item['customFormatScore'],
        })
    # Remove duplicate dictionaries in the queue_dict list and convert it to a list of unique dictionaries
    queue_dict = [dict(t) for t in {tuple(d.items()) for d in queue_dict}]
    return queue_dict  # Return the processed queue information

def process_instance(instance_type, instance_settings, app, logger):
    """
    Process the instance to return a dictionary containing the server_name, tagged_count, untagged_count,
    total_count, and data.
    
    Args:
        instance_type (str): The instance type to process.
        instance_settings (dict): A dictionary containing the instance settings.
        app (StARR): An instance of the StARR class.
    
    Returns:
        output_dict (dict): A dictionary containing the server_name, tagged_count, untagged_count,
        total_count, and data.
    """
    # Retrieve instance settings
    tagged_count = 0
    untagged_count = 0
    total_count = 0
    server_name = app.get_instance_name()
    count = instance_settings.get('count', 2)
    checked_tag_name = instance_settings.get('tag_name', "checked")
    ignore_tag_name = instance_settings.get('ignore_tag', "ignore")
    unattended = instance_settings.get('unattended', False)
    
    # Logging instance settings
    table = [
        [f"{instance_type} Settings"]
    ]
    logger.debug(create_table(table))
    logger.debug(f'{"Count:":<20}{count}')
    logger.debug(f'{"checked_tag_name:":<20}{checked_tag_name}')
    logger.debug(f'{"ignore_tag_name:":<20}{checked_tag_name}')
    logger.debug(f'{"unattended:":<20}{unattended}')
    logger.debug('*' * 40)
    
    # Fetch media from the instance
    print(f"Gathering media from {server_name}...")
    server_name = app.get_instance_name()
    media_dict = handle_starr_data(app, server_name, instance_type, include_episode=False)
    logger.debug(f"media_dict:\n{json.dumps(media_dict, indent=4)}")
    
    # Get tag ID based on the provided tag name
    checked_tag_id = app.get_tag_id_from_name(checked_tag_name)
    ignore_tag_id = app.get_tag_id_from_name(ignore_tag_name)

    # Filter media based on tag and count criteria
    filtered_media_dict = filter_media(media_dict, checked_tag_id, ignore_tag_id, count, logger)
    if not filtered_media_dict and unattended:
        media_ids = [item['media_id'] for item in media_dict]
        logger.info("All media is tagged. Removing tags...")
        app.remove_tags(media_ids, checked_tag_id)
        media_dict = handle_starr_data(app, server_name, instance_type, include_episode=False)
        filtered_media_dict = filter_media(media_dict, checked_tag_id, ignore_tag_id, count, logger)
    
    # If no filtered_media and not unattended return
    if not filtered_media_dict and not unattended:
        logger.info(f"No media found for {server_name}.")
        return
    
    logger.debug(f"filtered_media_dict:\n{json.dumps(filtered_media_dict, indent=4)}")
    
    # Processing tagged and untagged counts
    if media_dict:
        total_count = len(media_dict)
        for item in media_dict:
            if checked_tag_id in item['tags']:
                tagged_count += 1
            else:
                untagged_count += 1
    
    # Initialize output dictionary
    output_dict = {
        'server_name': server_name,
        'tagged_count': tagged_count,
        'untagged_count': untagged_count,
        'total_count': total_count,
        'data': []
    }
    
    # Processing media data
    if not dry_run:
        media_ids = [item['media_id'] for item in filtered_media_dict]
        search_response = app.search_media(media_ids)
        app.add_tags(media_ids, checked_tag_id)
        ready = app.wait_for_command(search_response['id'])
        if ready:
            sleep_time = 10  # Set the sleep time to 5 seconds
            print(f"Waiting for {sleep_time} seconds to allow for search results to populate in the queue...")
            time.sleep(sleep_time)
            queue = app.get_queue(instance_type)
            logger.debug(f"queue:\n{json.dumps(queue, indent=4)}")
            queue_dict = process_queue(queue, instance_type, media_ids)
            logger.debug(f"queue_dict:\n{json.dumps(queue_dict, indent=4)}")
            for item in filtered_media_dict:
                downloads = {}
                for queue_item in queue_dict:
                    if item['media_id'] == queue_item['media_id']:
                        downloads[queue_item['download']] = queue_item['torrent_custom_format_score']
                output_dict['data'].append({
                    'media_id': item['media_id'],
                    'title': item['title'],
                    'year': item['year'],
                    'download': downloads
                })
    else:
        for item in filtered_media_dict:
            output_dict['data'].append({
                'media_id': item['media_id'],
                'title': item['title'],
                'year': item['year'],
                'download': None,
                'torrent_custom_format_score': None
            })
    return output_dict

def print_output(output_dict, logger):
    """
    Print the output to the console.
    
    Args:
        output_dict (dict): A dictionary containing the server_name, tagged_count, untagged_count,
        total_count, and data.
        
    Returns:
        None
    """
    for instance, run_data in output_dict.items():
        if run_data:
            instance_data = run_data.get('data', None)
            if instance_data:
                # Create a table with the server name as the header
                table = [
                    [f"{run_data['server_name']}"]
                ]
                logger.info(create_table(table))
                
                # Iterate through the media items for this instance
                for item in instance_data:
                    logger.info(f"{item['title']} ({item['year']})")
                    
                    # Print downloads and their format scores associated with the media
                    if item['download']:
                        for download, format_score in item['download'].items():
                            logger.info(f"\t{download}\tScore: {format_score}")
                    else:
                        logger.info("\tNo upgrades found for this item.")
                    
                    logger.info("")  # Add a newline for separation between media items
            else:
                # If no items found for an instance, print a message indicating so
                logger.info(f"No items found for {instance}.")

def notification(output_dict, logger):
    """
    Send a notification to Discord.
    
    Args:
        output_dict (dict): A dictionary containing the server_name, tagged_count, untagged_count,
        total_count, and data.
        
    Returns:
        None
    """
    
    fields = []
    # Iterate through the instances in the output dictionary
    for instance, run_data in output_dict.items():
        if run_data:
            server_name = run_data['server_name']
            instance_data = run_data.get('data', None)
            server_list = []
            # Iterate through the media items for this instance
            for item in instance_data:
                title = item['title']
                year = item['year']
                download = item['download']

                # Construct a list of downloads and their format scores associated with the media
                if download:
                    torrent_list = []
                    torrent_list.append(f"{title} ({year})")
                    for torrent_item, format_score in download.items():
                        torrent_list.append(f"\t{torrent_item}\n\tCF Score: {format_score}\n")
                else:
                    continue
                    torrent_list.append("\tNo upgrades found for this item.")
                server_list.append("\n".join(torrent_list))
            value = "\n".join(server_list)
            # Construct a Discord field containing the server name and associated media/downloads
            if server_list:
                fields.append({
                    "name": server_name,
                    "value": f"```{value}```"
                })
    # Send the constructed fields as a Discord message
    if fields:
        discord(fields, logger, script_name, description=f"{'__**Dry Run**__' if dry_run else ''}", color=0x00ff00, content=None)

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
        logger.info(create_bar(f"STARTING {name}"))
        # Check if it's a dry run and display a message
        if dry_run:
            table = [
                ["Dry Run"],
                ["NO CHANGES WILL BE MADE"]
            ]
            logger.info(create_table(table))
        
        # Access the script configuration settings
        script_config = config.script_config
        
        # Retrieve instances from the configuration file
        instances = script_config.get('instances', None)
        valid = validate(config, script_config, logger)
        
        # Check if instances are present in the configuration
        if not instances:
            logger.error("No instances found in config file.")
            sys.exit()
        
        # Dictionary to store the final output
        final_output_dict = {}
        
        # Iterate over instance configurations
        for instance_type, instance_data in config.instances_config.items():
            for instance, instance_settings in instances.items():
                if instance in instance_data:
                    # Initialize StARR with instance URL, API, and logger
                    final_output_dict[instance] = {}
                    url = instance_data[instance]['url']
                    api = instance_data[instance]['api']
                    app = StARR(url, api, logger)
                    
                    # Process instance and get output
                    output = process_instance(instance_type, instance_settings, app, logger)
                    final_output_dict[instance] = output
        
        # Debug log of the final output dictionary
        logger.debug(f"final_output_dict:\n{json.dumps(final_output_dict, indent=4)}")
        
        # If there's data in the final output dictionary, print output and send notifications
        if final_output_dict:
            print_output(final_output_dict, logger)
            if discord_check(script_name):
                notification(final_output_dict, logger)
    except KeyboardInterrupt:
        print("Keyboard Interrupt detected. Exiting...")
        sys.exit()
    except Exception:
        logger.error(f"\n\nAn error occurred:\n", exc_info=True)
        logger.error(f"\n\n")
    finally: 
        logger.info(create_bar(f"END OF {name}"))
