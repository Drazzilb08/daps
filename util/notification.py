import json
import logging
import os
import random
import traceback
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Tuple, Union
from urllib.parse import quote

import requests
from apprise import Apprise
from ratelimit import limits, sleep_and_retry


class ErrorNotifyHandler(logging.Handler):
    """Custom logging handler to send errors to Discord/Notifiarr via notifications."""

    def __init__(self, config, module_name="main", logger=None):
        super().__init__(level=logging.ERROR)
        self.config = config
        self.module_name = module_name
        self.logger = logger  # for logging send status, not for the error itself

    def emit(self, record):
        try:
            msg = record.getMessage()
            tb = None
            error_type_msg = ""
            if record.exc_info:
                tb_lines = traceback.format_exception(*record.exc_info)
                tb = "".join(tb_lines)
                if tb_lines:
                    error_type_msg = tb_lines[-1].strip()
            elif record.stack_info:
                tb = record.stack_info
            else:
                tb = None

            if error_type_msg:
                error_msg = f"{msg}\n{error_type_msg}"
            else:
                error_msg = msg

            output = {
                "error_message": error_msg,
                "traceback": tb,
                "color": "FF0000",
                "source_module": getattr(record, "module", self.module_name),
            }

            notify_mod = "error_notify"
            config = self.config
            if hasattr(config, "module_name"):
                old_mod = config.module_name
                config.module_name = notify_mod
                send_notification(self.logger or config, notify_mod, config, output)
                config.module_name = old_mod
            else:
                temp_cfg = dict(config)
                temp_cfg["module_name"] = notify_mod
                send_notification(self.logger or config, notify_mod, temp_cfg, output)
        except Exception as e:
            if self.logger:
                self.logger.error(
                    f"[ErrorNotifyHandler] Failed to send error notification: {e}"
                )


@dataclass
class NotifiarrConfig:
    webhook: str
    channel_id: int


def extract_error(resp: requests.Response) -> str:
    """Extract a user-friendly error message from an HTTP response.

    Args:
      resp: HTTP response object.

    Returns:
      User-friendly error message.
    """
    try:
        data = resp.json()
        return data.get("error", resp.text)
    except ValueError:
        return resp.text


def build_notifiarr_payload(module_title: str, cid: int) -> Dict[str, Any]:
    """Build the JSON payload for Notifiarr Passthrough.

    Args:
      module_title: Title of the module.
      cid: Channel ID.

    Returns:
      Notifiarr payload dict.
    """
    return {
        "notification": {"update": False, "name": module_title, "event": "0"},
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
                "footer": "",
            },
            "ids": {"channel": cid},
        },
    }


def build_discord_payload(
    module_title: str,
    data: Any,
    timestamp: str,
    dry_run: bool = False,
    color: Union[int, str] = 0x00FF00,
) -> List[Dict[str, Any]]:
    """Build Discord payload(s) for embeds/content.

    Args:
      module_title: Title of the module.
      data: Data for the payload.
      timestamp: ISO timestamp string.
      dry_run: If True, marks as dry run.
      color: Embed color as int (0xRRGGBB) or hex string ("FF0000" or "#FF0000").

    Returns:
      List of Discord payload dicts.
    """
    # Handle string color input
    if isinstance(color, str):
        color = int(color.lstrip("#"), 16)
    payloads: List[Dict[str, Any]] = []
    if isinstance(data, dict):
        data = [
            {
                "embed": True,
                "fields": fields,
                "part": f" (Part {idx} of {len(data)})" if len(data) > 1 else "",
            }
            for idx, fields in data.items()
        ]
    for part in data:
        payload: Dict[str, Any] = {}
        if "embed" in part:
            payload["embeds"] = [
                {
                    "title": f"{module_title} Notification{part.get('part', '')}",
                    "description": None,
                    "color": color,
                    "timestamp": timestamp,
                    "fields": part.get("fields", []),
                    "footer": {"text": f"Powered by: Drazzilb | {get_random_joke()}"},
                }
            ]
        if "content" in part:
            payload["content"] = (
                f"__**Dry Run**__\n{part['content']}" if dry_run else part["content"]
            )
        elif dry_run:
            payload["content"] = "__**Dry Run**__"
        payload["username"] = "Notification Bot"
        payloads.append(payload)
    return payloads


@sleep_and_retry
@limits(calls=5, period=5)
def safe_post(url: str, payload: Dict[str, Any]) -> requests.Response:
    """Send a POST request with a JSON payload.

    Args:
      url: Target URL.
      payload: Payload dict.

    Returns:
      HTTP response.
    """
    return requests.post(url, json=payload)


def get_random_joke() -> str:
    """Retrieve a random joke from jokes.txt in the parent directory.

    Returns:
      A random joke string, or empty string if not found.
    """
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    jokes_path = os.path.join(root_dir, "jokes.txt")
    if os.path.exists(jokes_path):
        with open(jokes_path, encoding="utf-8") as f:
            jokes = [line.strip() for line in f if line.strip()]
            if jokes:
                return random.choice(jokes)
    return ""


def send_and_log_response(
    logger: Any, label: str, hook: str, payload: Dict[str, Any]
) -> None:
    """Send a POST request and log the response status.

    Args:
      logger: Logger instance.
      label: Notification label.
      hook: Webhook URL.
      payload: Payload dict.
    """
    try:
        resp = safe_post(hook, payload)
        if resp.status_code not in (200, 204):
            err = format_notification_error(resp, label)
            logger.error(
                f"[Notification] ❌ {label} failed ({resp.status_code}): {err}\n"
                f"Payload:\n{json.dumps(payload, indent=2)}"
            )
        else:
            logger.info(f"[Notification] ✅ {label} notification sent.")
    except Exception as e:
        logger.error(f"[Notification] {label} send exception: {e}")


def send_notifiarr_notification(
    logger: Any,
    config: Any,
    auth_data: NotifiarrConfig,
    module_title: str,
    output: Any,
    test: bool = False,
) -> Optional[Tuple[bool, str]]:
    """Send structured notifications to Notifiarr via Passthrough API.

    Args:
      logger: Logger instance.
      config: Configuration object.
      auth_data: NotifiarrConfig instance.
      module_title: Module title.
      output: Output data.
      test: Whether to send a test notification.

    Returns:
      (success, message) if test, else None.
    """
    hook = auth_data.webhook.rstrip("/")
    cid = auth_data.channel_id
    payload = build_notifiarr_payload(module_title, cid)
    if test:
        resp = safe_post(hook, payload)
        success = resp.status_code in (200, 204)
        msg = (
            "Test notification sent via Notifiarr."
            if success
            else f"Notifiarr Test failed ({resp.status_code}): {extract_error(resp)}"
        )
        return success, msg
    from util.notification_formatting import format_for_discord

    data, _ = format_for_discord(config, output)
    parts: List[Dict[str, Any]] = []
    if isinstance(data, dict):
        for idx, fields in data.items():
            parts.append(
                {
                    "embed": True,
                    "fields": fields,
                    "part": f" (Part {idx} of {len(data)})" if len(data) > 1 else "",
                }
            )
    else:
        parts = data
    for part in parts:
        pt_payload = {
            "notification": {"update": False, "name": module_title, "event": ""},
            "discord": {
                "color": "",
                "ping": {"pingUser": 0, "pingRole": 0},
                "images": {"thumbnail": "", "image": ""},
                "ids": {"channel": cid},
            },
        }
        if part.get("embed"):
            fields = [
                {
                    "title": f.get("name", ""),
                    "text": f.get("value", ""),
                    "inline": bool(f.get("inline", False)),
                }
                for f in part.get("fields", [])
            ]
            pt_payload["discord"]["text"] = {
                "title": f"{module_title} Notification{part.get('part','')}",
                "fields": fields,
                "footer": get_random_joke(),
            }
        else:
            content = part.get("content")
            pt_payload["discord"]["text"] = {
                "description": " ",
                "content": content,
            }
        color = output.get("color", "00FF00") if isinstance(output, dict) else "00FF00"
        if isinstance(color, int):
            color = f"{color:06X}"
        elif isinstance(color, str):
            color = color.lstrip("#")
        pt_payload["discord"]["color"] = color
        send_and_log_response(logger, "Notifiarr", hook, pt_payload)
    return None


def send_discord_notification(
    logger: Any,
    config: Any,
    hook: str,
    module_title: str,
    output: Any,
) -> None:
    from util.notification_formatting import format_for_discord

    data, _ = format_for_discord(config, output)
    timestamp = datetime.utcnow().isoformat()
    dry_run = getattr(config, "dry_run", False)
    if isinstance(output, dict):
        color = output.get("color", 0x00FF00)
    else:
        color = 0x00FF00
    for payload in build_discord_payload(
        module_title, data, timestamp, dry_run=dry_run, color=color
    ):
        send_and_log_response(logger, "Discord", hook, payload)


def extract_apprise_errors(apprise: Apprise) -> str:
    """Extract concise error messages from Apprise services.

    Args:
      apprise: Apprise instance.

    Returns:
      Concatenated error message string.
    """
    errors: List[str] = []
    for service in apprise:
        if hasattr(service, "last_response") and service.last_response:
            errors.append(f"Last response: {service.last_response}")
        if hasattr(service, "response") and service.response:
            errors.append(f"Response: {service.response}")
        if hasattr(service, "details") and callable(service.details):
            try:
                details = service.details()
                if details:
                    errors.append(f"Details: {details}")
            except Exception:
                pass
        errors.append(f"Service config: {service}")
    return "; ".join(errors) if errors else "Unknown error"


def format_notification_error(source: Any, label: str = "") -> str:
    """Return a user-friendly error message from a response or Apprise.

    Args:
      source: requests.Response or Apprise instance.
      label: Optional label.

    Returns:
      Error message string.
    """
    if isinstance(source, requests.Response):
        return extract_error(source)
    try:
        if isinstance(source, Apprise):
            return extract_apprise_errors(source)
    except Exception:
        pass
    return f"{label} unknown error"


def format_module_title(name: str) -> str:
    """Convert a module name to a human-readable title.

    Args:
      name: Module name.

    Returns:
      Title string.
    """
    return name.replace("_", " ").title()


def send_apprise_notification(
    logger: Any,
    label: str,
    apprise: Apprise,
    title: str,
    body: str,
    body_format: str = "text",
) -> bool:
    """Send a notification via Apprise and log the result.

    Args:
      logger: Logger instance.
      label: Notification label.
      apprise: Apprise instance.
      title: Notification title.
      body: Notification body.
      body_format: Body format.

    Returns:
      True on success, False on failure.
    """
    try:
        success = apprise.notify(title=title, body=body, body_format=body_format)
        if success:
            logger.info(f"[Notification] ✅ {label} sent via Apprise.")
        else:
            err_msg = format_notification_error(apprise, label)
            logger.error(f"[Notification] ❌ {label} failed via Apprise: {err_msg}")
        return success
    except Exception as e:
        logger.error(
            f"[Notification] ❌ {label} exception via Apprise: {e}", exc_info=True
        )
        return False


def send_email_notification(
    logger: Any,
    config: Any,
    apprise: Apprise,
    module_title: str,
    output: Any,
) -> None:
    """Send an HTML formatted email using Apprise.

    Args:
      logger: Logger instance.
      config: Configuration object.
      apprise: Apprise instance.
      module_title: Module title.
      output: Output data.
    """
    from util.notification_formatting import format_for_email

    try:
        body, success = format_for_email(config, output)
        if not success:
            logger.warning("[Notification] Email skipped: no formatter found.")
            return
        subject = f"{module_title} Notification"
        send_apprise_notification(
            logger, f"{module_title} Email", apprise, subject, body, "html"
        )
    except Exception as e:
        logger.error(
            f"[Notification] Unhandled exception during email notification: {e}",
            exc_info=True,
        )


def collect_valid_targets(
    config: Any, logger: Any, test: bool = False
) -> Dict[str, Union[str, Tuple[str, Union[str, int]]]]:
    """Collect and format valid notification targets from the configuration.

    Args:
      config: Configuration object.
      logger: Logger instance.
      test: If True, format for test mode.

    Returns:
      Dictionary of notification targets.
    """
    target_data: Dict[str, Union[str, Tuple[str, Union[str, int]]]] = {}
    notification_targets = getattr(config, "notifications", None)
    if notification_targets is None and isinstance(config, dict):
        notification_targets = config.get("notifications", [])
    if notification_targets is None:
        notification_targets = {}
    try:
        for ttype, target in notification_targets.items():
            if not isinstance(target, dict):
                logger.warning(f"Invalid config structure for {ttype}: expected dict.")
                target_data[ttype] = f"Invalid config for {ttype}"
                continue
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
                hook = target.get("webhook", "").rstrip("/")
                cid = target.get("channel_id")
                if hook and cid is not None:
                    target_data["notifiarr"] = {
                        "webhook": hook,
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
                    to_addrs_list = (
                        [to_addrs] if isinstance(to_addrs, str) else to_addrs
                    )
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


def send_test_notification(
    payload: Dict[str, Any], logger: Any
) -> Dict[str, Union[str, bool, None]]:
    """Send a simple test notification using Apprise.

    Args:
      payload: Payload dict.
      logger: Logger instance.

    Returns:
      Result dict with type, message, and result.
    """
    module_name = payload.get("module", "Unknown")
    module_title = format_module_title(module_name)
    target_data = collect_valid_targets(payload, logger=logger, test=True)
    for target, data in target_data.items():
        entry: Dict[str, Union[str, bool, None]] = {
            "type": target,
            "message": None,
            "result": False,
        }
        if not data or (isinstance(data, str) and data.startswith("Invalid")):
            entry["message"] = (
                data
                if isinstance(data, str)
                else f"No valid URL for '{target.upper()}'"
            )
            entry["result"] = False
            entry["type"] = target
            return entry
        if target == "notifiarr":
            cfg = NotifiarrConfig(**data)
            success, msg = send_notifiarr_notification(
                logger, None, cfg, module_title, None, test=True
            )
            return {"type": target, "message": msg, "result": success}
        apprise = Apprise()
        apprise.add(data)
        subject = f"{target} Notification Test"
        body = "This is a test notification."
        success = send_apprise_notification(
            logger, f"{target} Notification Test", apprise, subject, body, "text"
        )
        entry["message"] = (
            "Notification sent successfully."
            if success
            else extract_apprise_errors(apprise)
        )
        entry["result"] = success
        entry["type"] = target
        return entry
    return {
        "type": None,
        "message": "No valid notification targets found.",
        "result": False,
    }


SEND_HANDLERS: Dict[str, Callable[..., Any]] = {
    "notifiarr": send_notifiarr_notification,
    "discord": send_discord_notification,
    "email": send_email_notification,
}


def send_notification(logger: Any, module_name: str, config: Any, output: Any) -> None:
    """Dispatch notifications to Discord, Notifiarr, and other Apprise targets.

    Args:
      logger: Logger instance.
      module_name: Module name.
      config: Configuration object.
      output: Output data.
    """
    target_data = collect_valid_targets(config, logger)
    module_title = format_module_title(module_name)
    for target, data in target_data.items():
        logger.debug(f"[Notification] Queued {target} via Apprisse")
        handler = SEND_HANDLERS.get(target)
        if handler:
            if target == "notifiarr":
                cfg = NotifiarrConfig(**data)
                handler(logger, config, cfg, module_title, output)
            elif target == "discord":
                handler(logger, config, data, module_title, output)
            elif target == "email":
                apprise = Apprise()
                apprise.add(data)
                handler(logger, config, apprise, module_title, output)
        else:
            logger.warning(f"[Notification] Unknown target: {target}")
