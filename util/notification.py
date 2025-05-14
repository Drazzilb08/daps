import os
import json
import random
import requests
from datetime import datetime
from typing import Any, Dict, Optional, Union, Tuple
from ratelimit import limits, sleep_and_retry
from apprise import Apprise
from urllib.parse import quote


@sleep_and_retry
@limits(calls=5, period=5)
def safe_post(url: str, payload: Dict[str, Any]) -> requests.Response:
    """
    Send a POST request with a JSON payload to the specified URL.

    Args:
        url (str): Target URL for the POST request.
        payload (Dict[str, Any]): JSON payload to send.

    Returns:
        requests.Response: The HTTP response object.
    """
    return requests.post(url, json=payload)


def get_random_joke() -> str:
    """
    Retrieve a random joke from the jokes.txt file in the parent directory.

    Returns:
        str: A random joke or a default string if no jokes are found.
    """
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    jokes_path = os.path.join(root_dir, "jokes.txt")
    if os.path.exists(jokes_path):
        with open(jokes_path, encoding="utf-8") as f:
            jokes = [line.strip() for line in f if line.strip()]
            if jokes:
                return random.choice(jokes)
    return "Powered by: Drazzilb"


def send_and_log_response(logger: Any, label: str, hook: str, payload: Dict[str, Any]) -> None:
    """
    Send a POST request and log the response status.

    Args:
        logger (Any): Logger instance for logging messages.
        label (str): Label describing the notification type.
        hook (str): Webhook URL to send the notification to.
        payload (Dict[str, Any]): JSON payload for the POST request.

    Returns:
        None
    """
    try:
        resp = safe_post(hook, payload)
        if resp.status_code not in (200, 204):
            logger.error(
                f"[Notification] ❌ {label} failed ({resp.status_code}): {resp.text}\n"
                f"Payload:\n{json.dumps(payload, indent=2)}"
            )
        else:
            logger.info(f"[Notification] ✅ {label} notification sent.")
    except Exception as e:
        logger.error(f"[Notification] {label} send exception: {e}")


def send_notifiarr_notification(logger, config, auth_data, module_title, output) -> None:
    """
    Send structured notifications to Notifiarr via Passthrough API.
    """
    from util.notification_formatting import format_for_discord

    # Unpack webhook and channel ID
    hook = auth_data.get("webhook", "").rstrip("/")
    cid = int(auth_data.get("channel_id", 0))

    # Get Discord-formatted parts
    data, _ = format_for_discord(config, output)

    # Normalize to a list of parts
    parts = []
    if isinstance(data, dict):
        for idx, fields in data.items():
            parts.append({
                "embed": True,
                "fields": fields,
                "part": f" (Part {idx} of {len(data)})" if len(data) > 1 else ""
            })
    else:
        parts = data

    # Send one Notifiarr Passthrough per part
    for part in parts:
        # Build Passthrough envelope
        payload = {
            "notification": {"update": False, "name": module_title, "event": ""},
            "discord": {
                "color": "",
                "ping": {"pingUser": 0, "pingRole": 0},
                "images": {"thumbnail": "", "image": ""},
                "ids": {"channel": cid}
            }
        }
        # Populate text block per Notifiarr schema
        if part.get("embed"):
            fields = [
                {"title": f.get("name", ""), "text": f.get("value", ""), "inline": bool(f.get("inline", False))}
                for f in part.get("fields", [])
            ]
            payload["discord"]["text"] = {
                "title": f"{module_title} Notification{part.get('part','')}",
                "fields": fields,
                "footer": get_random_joke()
            }
        else:
            content = part.get("content")

            payload["discord"]["text"] = {
                # "title": f"{module_title} Notification",
                "description": " ",
                "content": content,
            }

        # Send the payload
        send_and_log_response(logger, "Notifiarr", hook, payload)



def send_discord_notification(
    logger: Any,
    config: Any,
    hook: str,
    module_title: str,
    output: Any
) -> None:
    """
    Format output and send one or more Discord messages.

    Args:
        logger (Any): Logger instance.
        config (Any): Configuration object.
        hook (str): Discord webhook URL.
        module_title (str): Title of the module sending the notification.
        output (Any): Output data to format and send.

    Returns:
        None
    """
    from util.notification_formatting import format_for_discord

    data, _ = format_for_discord(config, output)
    timestamp = datetime.utcnow().isoformat()

    # If data is dict, convert to list with part info
    if isinstance(data, dict):
        data = [
            {
                "embed": True,
                "fields": fields,
                "part": f" (Part {idx} of {len(data)})" if len(data) > 1 else ""
            }
            for idx, fields in data.items()
        ]

    for part in data:
        payload: Dict[str, Any] = {}

        if "embed" in part:
            # Construct Discord embed message with title, fields, footer, and timestamp
            payload["embeds"] = [{
                "title": f"{module_title} Notification{part.get('part', '')}",
                "description": None,
                "color": 0x00FF00,
                "timestamp": timestamp,
                "fields": part.get("fields", []),
                "footer": {"text": f"Powered by: Drazzilb | {get_random_joke()}"}
            }]

        if "content" in part:
            payload["content"] = part["content"]

        # If dry run is enabled, modify content accordingly
        if getattr(config, "dry_run", False):
            if "embeds" in payload:
                payload["content"] = "__**Dry Run**__"
            elif "content" in payload:
                payload["content"] = f"__**Dry Run**__\n{payload['content']}"

        send_and_log_response(logger, "Discord", hook, payload)


def send_email_notification(
    logger: Any,
    config: Any,
    apprise: Apprise,
    module_title: str,
    output: Any
) -> None:
    """
    Send an HTML formatted email using Apprise.

    Args:
        logger (Any): Logger instance.
        config (Any): Configuration object.
        apprise (Apprise): Apprise instance configured with targets.
        module_title (str): Title of the module sending the notification.
        output (Any): Output data to format and send.

    Returns:
        None
    """
    from util.notification_formatting import format_for_email

    try:
        body, success = format_for_email(config, output)
        if not success:
            logger.warning("[Notification] Email skipped: no formatter found.")
            return

        subject = f"{module_title} Notification"

        try:
            result = apprise.notify(
                title=subject,
                body=body,
                body_format="html"
            )
        except Exception as e:
            logger.error(f"[Notification] Apprise raised exception during email send: {e}", exc_info=True)
            return

        if result:
            logger.info(f"[Notification] ✅ Email sent: {subject}")
        else:
            logger.error("[Notification] ❌ Email failed to send via Apprise.")
            # Log detailed SMTP responses if available
            for service in apprise:
                if hasattr(service, 'last_response') and service.last_response:
                    logger.error(f"[Notification] Last SMTP response: {service.last_response}")
                if hasattr(service, 'response') and service.response:
                    logger.error(f"[Notification] SMTP response: {service.response}")
                if hasattr(service, 'details') and callable(service.details):
                    logger.error(f"[Notification] Service details: {service.details()}")
                logger.error(f"[Notification] Service config: {service}")

    except Exception as e:
        logger.error(f"[Notification] Unhandled exception during email notification: {e}", exc_info=True)


def collect_valid_targets(
    config: Any,
    logger: Any,
    test: bool = False
) -> Dict[str, Union[str, Tuple[str, Union[str, int]]]]:
    """
    Collect and format valid notification targets from the configuration.

    Args:
        config (Any): Configuration object or dict containing notifications.
        logger (Any): Logger instance.
        test (bool): If True, returns Apprise-compatible URLs for testing.

    Returns:
        Dict[str, Union[str, Tuple[str, Union[str, int]]]]: Mapping of notification types to target data.
    """
    target_data: Dict[str, Union[str, Tuple[str, Union[str, int]]]] = {}
    notification_targets = getattr(config, "notifications", None)
    if notification_targets is None and isinstance(config, dict):
        notification_targets = config.get("notifications", [])
    if notification_targets is None:
        notification_targets = {}

    try:
        for ttype, target in notification_targets.items():
            if ttype == "discord":
                if test:
                    hook = target.get("webhook", "").rstrip("/")
                    parts = hook.rstrip("/").split("/")
                    if len(parts) >= 7 and parts[4] == "webhooks":
                        webhook_id = parts[5]
                        token = parts[6]
                        apprise_url = f"discord://{webhook_id}/{token}"
                        target_data["discord"] = apprise_url
                    else:
                        msg = "Invalid Discord webhook URL"
                        logger.warning(msg)
                        target_data["discord"] = msg
                else:
                    hook = target.get("webhook", "").rstrip("/")
                    if hook:
                        target_data[ttype] = hook
                    else:
                        msg = "Invalid Notifiarr configuration"
                        logger.warning(msg)
                        target_data[ttype] = msg

            elif ttype == "notifiarr":
                # in collect_valid_targets, non-test branch:
                hook = target.get("webhook", "").rstrip("/")
                cid  = target.get("channel_id")
                if hook and cid is not None:
                    target_data["notifiarr"] = {
                        "webhook":    hook,
                        "channel_id": int(cid),
                    }
                else:
                    logger.warning("Invalid Notifiarr configuration")
                    target_data["notifiarr"] = "Invalid Notifiarr configuration"

            elif ttype == "email":
                smtp_server = target.get("smtp_server")
                smtp_port = target.get("smtp_port", 587)
                username = target.get("username", "")
                password = target.get("password", "")
                from_addr = target.get("from", "")
                to_addrs = target.get("to", [])
                use_tls = target.get("use_tls", False)

                if smtp_server and from_addr and to_addrs:
                    proto = "mailtos" if use_tls else "mailto"

                    if username and password:
                        user = quote(username, safe="")
                        pwd = quote(password, safe="")
                        auth = f"{user}:{pwd}@"
                    else:
                        auth = ""

                    host_part = f"{smtp_server}:{smtp_port}"

                    params = []
                    to_addrs_list = [to_addrs] if isinstance(to_addrs, str) else to_addrs
                    params.append("to=" + quote(",".join(to_addrs_list)))
                    params.append("from=" + quote(from_addr))

                    query = "&".join(params)
                    mail_url = f"{proto}://{auth}{host_part}?{query}"

                    target_data[ttype] = mail_url
                else:
                    msg = "Invalid email configuration"
                    logger.warning(msg)
                    target_data[ttype] = msg
            else:
                target_data[ttype] = f"Invalid - Unknown notification type: {ttype}"
    except Exception as e:
        logger.error(f"[Notification] Error collecting targets: {e}", exc_info=True)
        target_data = {}
    return target_data


def send_test_notification(payload: Dict[str, Any], logger: Any) -> Dict[str, Union[str, bool, None]]:
    """
    Send a simple test notification using Apprise.

    Args:
        payload (Dict[str, Any]): Payload containing module information.
        logger (Any): Logger instance.

    Returns:
        Dict[str, Union[str, bool, None]]: Result of the test notification with type, message, and result status.
    """
    module_name = payload.get("module", "Unknown")
    target_data = collect_valid_targets(payload, logger=logger, test=True)
    for target, data in target_data.items():
        entry = {"type": target, "message": None, "result": False}
        if not data or (isinstance(data, str) and data.startswith("Invalid")):
            entry["message"] = data if isinstance(data, str) else f"No valid URL for '{target.upper()}'"
            entry["result"] = False
            entry["type"] = target
            return entry
        # Special handling for Notifiarr: send test notification via Passthrough
        if target == "notifiarr":
            # Send a lightweight test notification via Notifiarr Passthrough
            hook = data.get("webhook", "").rstrip("/")
            cid = int(data.get("channel_id", 0))
            payload_obj = {
                "notification": {"update": False, "name": "Test", "event": "0"},
                "discord": {
                    "color": "",
                    "ping": {"pingUser": 0, "pingRole": 0},
                    "images": {"thumbnail": "", "image": ""},
                    "text": {
                        "title": "Test Notification",
                        "icon": "",
                        "content": "This is a test notification.",
                        "description": "This is a test notification.",
                        "fields": [],
                        "footer": ""
                    },
                    "ids": {"channel": cid}
                }
            }
            # Use the existing helper to send and log
            send_and_log_response(logger, "Notifiarr Test", hook, payload_obj)
            entry["message"] = "Test notification sent via Notifiarr."
            entry["result"] = True
            entry["type"] = target
            return entry
        apprise = Apprise()
        apprise.add(data)
        subject = f"{target} Notification Test"
        body = "This is a test notification."
        result = apprise.notify(
            title=subject,
            body=body,
            body_format="text"
        )
        if result:
            entry["message"] = "Notification sent successfully."
            entry["result"] = True
        else:
            entry["message"] = f"Notification failed for: '{module_name.upper()}'"
            entry["result"] = False
        entry["type"] = target
        return entry
    return {"type": None, "message": "No valid notification targets found.", "result": False}


def send_notification(
    logger: Any,
    module_name: str,
    config: Any,
    output: Any
) -> None:
    """
    Dispatch notifications to Discord, Notifiarr, and other Apprise targets.

    Args:
        logger (Any): Logger instance.
        module_name (str): Name of the module sending the notification.
        config (Any): Configuration object.
        output (Any): Output data to format and send.

    Returns:
        None
    """
    target_data = collect_valid_targets(config, logger)
    module_title = module_name.replace("_", " ").title()
    for target, data in target_data.items():
        logger.debug(f"[Notification] Queued {target} via Apprisse")
        if target == "notifiarr":
            send_notifiarr_notification(logger, config, data, module_title, output)
        elif target == "discord":
            send_discord_notification(logger, config, data, module_title, output)
        else:
            apprise = Apprise()
            apprise.add(data)
            if target == "email":
                send_email_notification(logger, config, apprise, module_title, output)
