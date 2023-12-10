import requests
import json
import random
import requests
from datetime import datetime

def get_discord_data(config, script_name, logger):
    discord = config.discord
    notifiarr_webhook = discord.get('notifiarr_webhook', None)
    script_notification_info = discord.get(script_name, {})

    if notifiarr_webhook:
        channel_id = script_notification_info.get('channel_id', None)
        webhook = notifiarr_webhook
        if not channel_id:
            webhook = None
            logger.error("Discord channel ID is missing. Cannot send Discord notification.")
    else:
        webhook = script_notification_info.get('discord_webhook', None)
        channel_id = None
    return webhook, channel_id

def get_message_data(logger):
    response = requests.get("https://raw.githubusercontent.com/Drazzilb08/userScripts/master/jokes.txt")
    if response.status_code == 200:
        jokes = response.text.splitlines()
        random_joke = random.choice(jokes)
        timestamp = datetime.utcnow().isoformat()
    else:
        logger.error(f"Failed to get jokes from GitHub. Status code: {response.status_code} with response: {response.text}")
        random_joke = "Error: Failed to get jokes from GitHub."

    return random_joke, timestamp

def discord(fields, logger, config, script_name, description, color, content):
    webhook, channel_id = get_discord_data(config, script_name, logger)
    if webhook:
        random_joke, timestamp = get_message_data(logger)
        try:
            if fields and webhook:
                if webhook.startswith("https://notifiarr.com/api/v1/notification/passthrough"):
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
                                    "footer": f"{random_joke}",
                                },
                                "ids": {
                                    "channel": f"{channel_id}",
                                }
                            }
                        }
                    else:
                        logger.error("Discord channel ID is missing. Cannot send Discord notification.")
                        logger.error(f"Discord channel ID: {channel_id}")
                        return
                    if not description:
                        del payload["discord"]["text"]["description"]
                    if not content:
                        del payload["discord"]["text"]["content"]
                    if not fields:
                        del payload["discord"]["text"]["fields"]
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
                                    "text": f"{random_joke}"
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
                    if not content:
                        del payload["embeds"][0]["content"]
                logger.debug(json.dumps(payload, indent=4))
                response = requests.post(webhook, json=payload)
                if response.status_code == 204 or response.status_code == 200:
                    return True
                else:
                    logger.error(f"Webhook failed: {webhook}")
                    logger.error(f"Discord notification failed with status code: {response.status_code} with response: {response.text}")
            else:
                logger.error("Payload is empty. Cannot send Discord notification.")
        except Exception as e:
            logger.error(f"Error: {e}")
            return False
    else:
        logger.debug(f"Discord webhook is missing. Cannot send Discord notification.")
        return False

def content_builder(discord_messages):
    pass
    
def field_builder(discord_messages, name):
    discord_message = '\n'.join(discord_messages)
    modified_discord_messages = []
    current_message = ""
    for line in discord_message.splitlines():
        if len(current_message) + len(line) + 1 <= 1024:
            current_message += line + "\n"
        else:
            modified_discord_messages.append(current_message)
            current_message = line + "\n"
    if current_message:
        modified_discord_messages.append(current_message)
    discord_messages_dict = {}
    print(f"len(modified_discord_messages): {len(modified_discord_messages)}")
    field_count = 1
    if len(modified_discord_messages) > 5:
        for i in range(0, len(modified_discord_messages), 5):
            discord_messages_dict[field_count] = modified_discord_messages[i:i + 5]
            field_count += 1
    else:
        discord_messages_dict[field_count] = modified_discord_messages
    fields = {}
    for field_number, messages in discord_messages_dict.items():
        fields[field_number] = []
        for message in messages:
            fields[field_number].append({
                "name": f"{name}",
                "value": f"```{message}```",
                "inline": False
            })
    return fields
