try:
    import requests
except ImportError as e:
    print(f"ImportError: {e}")
    print("Please install the required modules with 'pip install -r requirements.txt'")
    exit(1)

import requests
import random
import json
from datetime import datetime
from util.config import Config

config = Config(script_name="discord")

def get_discord_data(script_name, logger):
    """
    Gather discord data from config file
    
    Args:
        config (dict): The config file
        script_name (str): The name of the script
        logger (logger): The logger to use for logging output
        
    Returns:
        webhook (str): The webhook to send the notification to
        channel_id (str): The channel ID to send the notification to
    """
    # Access the 'discord' section in the config
    discord = config.discord
    
    # Get the 'notifiarr_webhook' from the config
    notifiarr_webhook = discord.get('notifiarr_webhook', None)
    
    # Get the script-specific notification info from the config based on the script name
    script_notification_info = discord.get(script_name, {})

    channel_id = script_notification_info.get('channel_id', None)
    discord_webhook = script_notification_info.get('discord_webhook', None)

    if notifiarr_webhook:
        if not channel_id:
            logger.error("Discord channel ID is missing. Cannot send Discord notification.")
            return
        else:
            return notifiarr_webhook, channel_id
    else:
        return discord_webhook, None

def get_message_data(logger):
    """
    Gather message data from GitHub
    
    Args:
        logger (logger): The logger to use for logging output
        
    Returns:
        random_joke (str): A random joke from the jokes.txt file
        timestamp (str): The timestamp when the joke was retrieved
    """
    # Send a GET request to GitHub to retrieve the jokes.txt file
    response = requests.get("https://raw.githubusercontent.com/Drazzilb08/userScripts/master/jokes.txt")
    
    # Check if the request was successful (status code 200)
    if response.status_code == 200:
        # Split the received text into individual lines
        jokes = response.text.splitlines()
        
        # Choose a random joke from the lines
        random_joke = random.choice(jokes)
        
        # Get the current timestamp in ISO format
        timestamp = datetime.utcnow().isoformat()
    else:
        # Log an error if the request failed
        logger.error(f"Failed to get jokes from GitHub. Status code: {response.status_code} with response: {response.text}")
        random_joke = "Error: Failed to get jokes from GitHub."

    return random_joke, timestamp

def discord_check(script_name):
    """
    Check if Discord notifications are enabled for the script
    
    Args:
        config (dict): The config file
        script_name (str): The name of the script

    Returns:
        enabled (bool): Whether or not Discord notifications are enabled for the script
    """
    # Get the 'discord' section from the config
    discord = config.discord
    
    notifiarr_webhook = discord.get('notifiarr_webhook', None)

    # Get the script-specific notification info from the config based on the script name
    script_notification_info = discord.get(script_name, {})

    channel_id = script_notification_info.get('channel_id', None)
    discord_webhook = script_notification_info.get('discord_webhook', None)
    
    if discord_webhook or channel_id and notifiarr_webhook:
        # If enabled is True, return True
        return True
    else:
        # If enabled is False, return False
        return False

def discord(fields, logger, script_name, description, color, content):
    """
    Send a Discord notification
    
    Args:
        fields (list): The fields to include in the notification
        logger (logger): The logger to use for logging output
        config (dict): The config file
        script_name (str): The name of the script
        description (str): The description of the notification
        color (str): The color of the notification
        content (str): The content of the notification
    
    Returns:
        None
    """
    # Get the webhook and channel_id from the config
    webhook, channel_id = get_discord_data(script_name, logger)
    if webhook:
        # Get the random joke and timestamp
        random_joke, timestamp = get_message_data(logger)
        try:
            # Check if the webhook is a Notifiarr webhook
            if fields and webhook:
                # Check if the webhook is a Notifiarr webhook
                if webhook.startswith("https://notifiarr.com/api/v1/notification/passthrough"):
                    # Create the payload to send to Notifiarr
                    if channel_id:
                        # Convert color from hex to 6 digit html
                        color = f"{color:06x}"
                        payload = {
                            "notification": {
                                "update": False,
                                "name": f"{script_name.capitalize()}",
                            },
                            "discord": {
                                "color": f"{color}",
                                "text": {
                                    "description": f"{description}",
                                    "content": f"{content}",
                                    "fields": fields,
                                    "footer": f"Powered by: Drazzilb | {random_joke}",
                                },
                                "ids": {
                                    "channel": f"{channel_id}",
                                }
                            }
                        }
                    # If channel_id is missing, log an error and return
                    else:
                        logger.error("Discord channel ID is missing. Cannot send Discord notification.")
                        logger.error(f"Discord channel ID: {channel_id}")
                        return
                    # if description is empty then remove it from the payload   
                    if not description:
                        del payload["discord"]["text"]["description"]
                    # if content is empty then remove it from the payload
                    if not content:
                        del payload["discord"]["text"]["content"]
                    # if fields is empty then remove it from the payload
                    if not fields:
                        del payload["discord"]["text"]["fields"]
                # If the webhook is not a Notifiarr webhook, create the payload to send to Discord
                else:
                    payload = {
                        "username": "Notification Bot",
                        "embeds": [
                            {
                                "title": f"{script_name.capitalize()}",
                                "description": f"{description}",
                                "color": color,
                                "content": f"{content}",
                                "fields": fields,
                                "footer": {
                                    "text": f"Powered by: Drazzilb | {random_joke}"
                                },
                                "timestamp": timestamp,
                            }
                        ]
                    }
                    # if description is empty then remove it from the payload
                    if not description:
                        del payload["embeds"][0]["description"]
                    # if fields is empty then remove it from the payload
                    if not fields:
                        del payload["embeds"][0]["fields"]
                    # if content is empty then remove it from the payload
                    if not content:
                        del payload["embeds"][0]["content"]
                logger.debug(json.dumps(payload, indent=4))
                response = requests.post(webhook, json=payload)
                # Check if the request was successful (status code 204 or 200)
                if response.status_code == 204 or response.status_code == 200:
                    logger.debug("Discord notification sent.")
                    return
                # If the request failed, log an error
                else:
                    logger.error(f"Payload: {json.dumps(payload, indent=4)})")
                    logger.error(f"Webhook failed: {webhook}")
                    logger.error(f"Discord notification failed with status code: {response.status_code} with response: {response.text}")
            # If the payload is empty, log an error
            else:
                logger.error("Payload is empty. Cannot send Discord notification.")
        # If there is an error, log it
        except Exception as e:
            logger.error(f"Error: {e}")
            return
    # If the webhook is missing, log an error
    else:
        logger.debug(f"Discord webhook is missing. Cannot send Discord notification.")
        return