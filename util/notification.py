import json
import logging
import os
import random
import traceback
from dataclasses import dataclass
from typing import Any, Dict, List, Tuple, Union
from urllib.parse import quote

import requests
from apprise import Apprise
from ratelimit import limits, sleep_and_retry


@dataclass
class NotifiarrConfig:
    webhook: str
    channel_id: int


class NotificationManager:
    def __init__(self, config, logger, module_name="main"):
        self.config = config
        self.logger = logger
        self.module_name = module_name
        self.SEND_HANDLERS = {
            "notifiarr": self.send_notifiarr_notification,
            "discord": self.send_discord_notification,
            "email": self.send_email_notification,
        }

    # ========== Helper/Utility Methods ==========

    @staticmethod
    def format_module_title(name: str) -> str:
        return name.replace("_", " ").title()

    @staticmethod
    def extract_error(resp: requests.Response) -> str:
        try:
            data = resp.json()
            return data.get("error", resp.text)
        except ValueError:
            return resp.text

    @staticmethod
    def build_notifiarr_payload(module_title: str, cid: int) -> Dict[str, Any]:
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

    @staticmethod
    def build_discord_payload(
        module_title: str,
        data: Any,
        timestamp: str,
        dry_run: bool = False,
        color: Union[int, str] = 0x00FF00,
    ) -> List[Dict[str, Any]]:
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
                        "footer": {
                            "text": f"Powered by: Drazzilb | {get_random_joke()}"
                        },
                    }
                ]
            if "content" in part:
                payload["content"] = (
                    f"__**Dry Run**__\n{part['content']}"
                    if dry_run
                    else part["content"]
                )
            elif dry_run:
                payload["content"] = "__**Dry Run**__"
            payload["username"] = "Notification Bot"
            payloads.append(payload)
        return payloads

    @staticmethod
    @sleep_and_retry
    @limits(calls=5, period=5)
    def safe_post(url: str, payload: Dict[str, Any]) -> requests.Response:
        return requests.post(url, json=payload)

    def send_and_log_response(
        self, label: str, hook: str, payload: Dict[str, Any]
    ) -> Tuple[bool, str]:
        try:
            resp = self.safe_post(hook, payload)
            if resp.status_code not in (200, 204):
                err = self.format_notification_error(resp, label)
                self.logger.error(
                    f"[Notification] ❌ {label} failed ({resp.status_code}): {err}\n"
                    f"Payload:\n{json.dumps(payload, indent=2)}"
                )
                return False, err
            else:
                self.logger.info(f"[Notification] ✅ {label} notification sent.")
                return True, "Notification sent successfully."
        except Exception as e:
            tb_str = traceback.format_exc()
            self.logger.error(
                f"[Notification] {label} send exception: {e}\n{tb_str}", exc_info=True
            )
            return False, f"{e}\n{tb_str}"

    # ========== Main Send Methods ==========

    def send_notifiarr_notification(
        self,
        auth_data: NotifiarrConfig,
        module_title: str,
        output: Any,
        test: bool = False,
    ) -> Tuple[bool, str]:
        hook = auth_data.webhook.rstrip("/")
        cid = auth_data.channel_id
        payload = self.build_notifiarr_payload(module_title, cid)
        if test:
            resp = self.safe_post(hook, payload)
            success = resp.status_code in (200, 204)
            msg = (
                "Test notification sent via Notifiarr."
                if success
                else f"Notifiarr Test failed ({resp.status_code}): {self.extract_error(resp)}"
            )
            return success, msg

        from util.notification_formatting import format_for_discord

        data, _ = format_for_discord(self.config, output)
        parts: List[Dict[str, Any]] = []
        if isinstance(data, dict):
            for idx, fields in data.items():
                parts.append(
                    {
                        "embed": True,
                        "fields": fields,
                        "part": (
                            f" (Part {idx} of {len(data)})" if len(data) > 1 else ""
                        ),
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
            color = "00FF00"
            if isinstance(output, dict):
                color = output.get("color", "00FF00")
            if isinstance(color, int):
                color = f"{color:06X}"
            elif isinstance(color, str):
                color = color.lstrip("#")
            pt_payload["discord"]["color"] = color
            self.send_and_log_response("Notifiarr", hook, pt_payload)
        return True, "Notification sent to Notifiarr."

    def send_discord_notification(
        self,
        hook: str,
        module_title: str,
        output: Any,
    ) -> Tuple[bool, str]:
        from datetime import datetime

        from util.notification_formatting import format_for_discord

        data, _ = format_for_discord(self.config, output)
        timestamp = datetime.utcnow().isoformat()
        dry_run = getattr(self.config, "dry_run", False)
        color = output.get("color", 0x00FF00)
        success = True
        messages = []
        for payload in self.build_discord_payload(
            module_title, data, timestamp, dry_run=dry_run, color=color
        ):
            ok, msg = self.send_and_log_response("Discord", hook, payload)
            if not ok:
                success = False
            messages.append(msg)
        return success, "; ".join(messages)

    def send_apprise_notification(
        self,
        label: str,
        apprise: Apprise,
        title: str,
        body: str,
        body_format: str = "text",
    ) -> Tuple[bool, str]:
        try:
            sent = apprise.notify(title=title, body=body, body_format=body_format)
            if sent:
                self.logger.info(f"[Notification] ✅ {label} sent via Apprise.")
                return True, "Notification sent via Apprise."
            else:
                err_msg = self.format_notification_error(apprise, label)
                self.logger.error(
                    f"[Notification] ❌ {label} failed via Apprise: {err_msg}"
                )
                return False, err_msg
        except Exception as e:
            tb_str = traceback.format_exc()
            self.logger.error(
                f"[Notification] ❌ {label} exception via Apprise: {e}\n{tb_str}",
                exc_info=True,
            )
            return False, f"{e}\n{tb_str}"

    def send_email_notification(
        self,
        apprise: Apprise,
        module_title: str,
        output: Any,
    ) -> Tuple[bool, str]:
        from util.notification_formatting import format_for_email

        try:
            body, success = format_for_email(self.config, output)
            if not success:
                self.logger.warning("[Notification] Email skipped: no formatter found.")
                return False, "No email formatter found."
            subject = f"{module_title} Notification"
            return self.send_apprise_notification(
                f"{module_title} Email", apprise, subject, body, "html"
            )
        except Exception as e:
            tb_str = traceback.format_exc()
            self.logger.error(
                f"[Notification] Unhandled exception during email notification: {e}\n{tb_str}",
                exc_info=True,
            )
            return False, f"{e}\n{tb_str}"

    # ========== Target Management ==========

    def collect_valid_targets(
        self, test: bool = False
    ) -> Dict[str, Union[str, Dict[str, Any]]]:
        # (code identical to your previous collect_valid_targets, but using self.config/self.logger)
        config = self.config
        logger = self.logger
        target_data: Dict[str, Union[str, Dict[str, Any]]] = {}
        notification_targets = getattr(config, "notifications", None)
        if notification_targets is None and isinstance(config, dict):
            notification_targets = config.get("notifications", [])
        if notification_targets is None:
            notification_targets = {}
        try:
            for ttype, target in notification_targets.items():
                if not isinstance(target, dict):
                    logger.warning(
                        f"Invalid config structure for {ttype}: expected dict."
                    )
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
                            msg = "Invalid Discord configuration"
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

    # ========== Main Dispatch Methods ==========

    def send_notification(self, output: Any) -> Dict[str, Any]:
        """Send notifications to all configured targets. Returns standardized result."""
        results = []
        target_data = self.collect_valid_targets()
        module_title = self.format_module_title(self.module_name)
        for target, data in target_data.items():
            entry = {
                "type": target,
                "ok": False,
                "message": None,
                "error": None,
            }
            handler = self.SEND_HANDLERS.get(target)
            try:
                if handler:
                    if target == "notifiarr":
                        cfg = NotifiarrConfig(**data)
                        ok, msg = handler(cfg, module_title, output)
                    elif target == "discord":
                        ok, msg = handler(data, module_title, output)
                    elif target == "email":
                        apprise = Apprise()
                        apprise.add(data)
                        ok, msg = handler(apprise, module_title, output)
                    else:
                        ok, msg = False, f"Unknown handler for {target}"
                    entry["ok"] = ok
                    entry["message"] = msg
                    if not ok:
                        entry["error"] = msg
                else:
                    entry["error"] = f"Unknown notification target: {target}"
                results.append(entry)
            except Exception as ex:
                tb_str = traceback.format_exc()
                entry["error"] = f"Exception for {target}: {ex}\n{tb_str}"
                results.append(entry)
                self.logger.error(
                    f"Exception for {target}: {ex}\n{tb_str}", exc_info=True
                )
        success = any(r.get("ok") for r in results)
        out = {"success": success, "results": results}
        if not success:
            errors = [r.get("error") for r in results if r.get("error")]
            out["error"] = "; ".join(errors)
        return out

    def send_test_notification(self) -> Dict[str, Any]:
        """Send test notifications to all configured targets. Standardized result."""
        results = []
        target_data = self.collect_valid_targets(test=True)
        module_title = self.format_module_title(self.module_name)
        for target, data in target_data.items():
            entry = {
                "type": target,
                "ok": False,
                "message": None,
                "error": None,
            }
            if not data or (isinstance(data, str) and data.startswith("Invalid")):
                entry["message"] = (
                    data
                    if isinstance(data, str)
                    else f"No valid config for '{target.upper()}'"
                )
                entry["error"] = entry["message"]
                results.append(entry)
                continue
            try:
                if target == "notifiarr":
                    cfg = NotifiarrConfig(**data)
                    ok, msg = self.send_notifiarr_notification(
                        cfg, module_title, None, test=True
                    )
                else:
                    apprise = Apprise()
                    apprise.add(data)
                    subject = f"{target} Notification Test"
                    body = "This is a test notification."
                    ok, msg = self.send_apprise_notification(
                        f"{target} Notification Test", apprise, subject, body, "text"
                    )
                entry["ok"] = ok
                entry["message"] = msg
                if not ok:
                    entry["error"] = msg
            except Exception as ex:
                tb_str = traceback.format_exc()
                entry["message"] = f"Exception while testing {target}: {ex}\n{tb_str}"
                entry["error"] = f"{ex}\n{tb_str}"
            results.append(entry)
        success = any(r.get("ok") for r in results)
        out = {"success": success, "results": results}
        if not success:
            errors = [r.get("error") for r in results if r.get("error")]
            out["error"] = "; ".join(errors)
        return out

    # ========== Error Extraction/Formatting ==========

    @staticmethod
    def extract_apprise_errors(apprise: Apprise) -> str:
        errors = []
        for service in apprise:
            err = getattr(service, "notify_error", None)
            if callable(err):
                notify_err = err()
                if notify_err:
                    errors.append(str(notify_err))
            last_resp = getattr(service, "last_response", None)
            if last_resp and str(last_resp) not in errors:
                errors.append(str(last_resp))
            resp = getattr(service, "response", None)
            if resp and str(resp) not in errors:
                errors.append(str(resp))
            if hasattr(service, "details") and callable(service.details):
                try:
                    details = service.details()
                    if details and isinstance(details, dict):
                        for k, v in details.items():
                            if isinstance(v, str) and (
                                "error" in v.lower() or "fail" in v.lower()
                            ):
                                errors.append(f"{k}: {v}")
                    elif details and isinstance(details, str) and details not in errors:
                        errors.append(details)
                except Exception:
                    pass
        errors = [e for e in errors if not e.startswith("Service:")] or errors
        if not errors:
            return "Unknown notification error. (No error message was provided by Apprise or the notification service.) Please double-check your config values and try sending a test with debug logs enabled."
        return "; ".join(dict.fromkeys(errors))

    def format_notification_error(
        self, source: Any, label: str = "", config: Any = None
    ) -> str:
        if isinstance(source, requests.Response):
            return self.extract_error(source)
        try:
            if isinstance(source, Apprise):
                msg = self.extract_apprise_errors(source)
                if "Unknown notification error" in msg and config is not None:
                    return f"{msg}\n\nConfig used:\n{json.dumps(config, indent=2)}"
                return msg
        except Exception:
            pass
        return f"{label} unknown error"


# Optionally keep ErrorNotifyHandler for error logging integration:
class ErrorNotifyHandler(logging.Handler):
    """Custom logging handler to send errors to Discord/Notifiarr via notifications."""

    def __init__(self, config, module_name="main", logger=None):
        super().__init__(level=logging.ERROR)
        self.manager = NotificationManager(config, logger, module_name)

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
                "source_module": getattr(record, "module", self.manager.module_name),
            }

            self.manager.send_notification(output)
        except Exception as e:
            if self.manager.logger:
                self.manager.logger.error(
                    f"[ErrorNotifyHandler] Failed to send error notification: {e}"
                )


def get_random_joke() -> str:
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    jokes_path = os.path.join(root_dir, "jokes.txt")
    if os.path.exists(jokes_path):
        with open(jokes_path, encoding="utf-8") as f:
            jokes = [line.strip() for line in f if line.strip()]
            if jokes:
                return random.choice(jokes)
    return ""
