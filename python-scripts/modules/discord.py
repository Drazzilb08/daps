import requests
import json
import random
import requests
from datetime import datetime

def discord(fields, logger, config, script_name, description, color, url):
    webhook = config.webhook_data
    channel_id = config.channel_id

    if webhook:
        response = requests.get("https://raw.githubusercontent.com/Drazzilb08/userScripts/master/jokes.txt")
        if response.status_code == 200:
            jokes = response.text.splitlines()
            random_joke = random.choice(jokes)
            timestamp = datetime.utcnow().isoformat()
        try:
            if fields and webhook:
                # if webhook starts with https://notifiarr\.com/api/v1/notification/passthrough then it is a notifiarr webhook
                if webhook.startswith("https://notifiarr.com/api/v1/notification/passthrough"):
                    if channel_id:
                        # Convert color from hex to 6 digit html
                        color = f"{color:06x}"
                        payload = {
                            "notification": {
                                "update": False,
                                "name": f"{script_name}",
                            },
                            "discord": {
                                "color": f"{color}",
                                "text": {
                                    "description": f"{description} below.\n\n{url}",
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
                else:
                    payload = {
                        "embeds": [
                            {
                                "title": f"{script_name}",
                                "description": f"{description} above.",
                                "color": color,
                                "url": f"{url}",
                                "fields": fields,
                                "footer": {
                                    "text": f"{random_joke}"
                                },
                                "timestamp": timestamp,
                            }
                        ]
                    }
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
        return