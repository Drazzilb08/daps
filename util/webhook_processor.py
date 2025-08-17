# util/webhook_processor.py

import hashlib
import json
import threading
import time
from typing import Optional, Tuple
from urllib.parse import urlparse

from util.config import load_config
from util.database import DapsDB


class WebhookProcessor:
    """
    Clean webhook processor that only handles validation and routing.
    Business logic is delegated to other components.
    """

    # Simple deduplication cache
    _cache = {}
    _cache_lock = threading.Lock()

    def __init__(self, logger):
        self.logger = logger
        self.config = load_config()

    def process_webhook(
        self, webhook_data: dict, client_info: Optional[dict] = None
    ) -> dict:
        """
        Process webhook and enqueue job for background processing.

        Args:
            webhook_data: Raw webhook data from ARR
            client_info: Optional client info from API layer

        Returns:
            dict: Standardized success/failure response
        """
        log = self.logger.get_adapter("WEBHOOK")

        # Validate and extract basic info
        validation_result = self._validate_webhook(webhook_data, client_info)
        if not validation_result["success"]:
            return validation_result

        # Check for duplicates (simple debouncing)
        if self._is_duplicate(validation_result["cache_key"], webhook_data):
            log.debug("Skipping duplicate webhook (debounced)")
            return {
                "success": True,
                "message": "Webhook debounced (duplicate)",
                "data": {"debounced": True},
            }

        # Enqueue job for background processing
        job_payload = {
            "webhook_data": webhook_data,
            "client_info": client_info,
            "instance_info": validation_result["instance_info"],
        }

        with DapsDB(logger=self.logger) as db:
            enqueue_result = db.worker.enqueue_job(
                table_name="jobs", payload=job_payload, job_type="webhook"
            )

        if enqueue_result["success"]:
            job_id = enqueue_result["data"]["job_id"]
            log.info(f"Webhook enqueued as job {job_id}")
            return {
                "success": True,
                "message": "Webhook enqueued for processing",
                "data": {"job_id": job_id},
            }
        else:
            log.error(f"Failed to enqueue webhook: {enqueue_result['message']}")
            return {
                "success": False,
                "message": "Failed to enqueue webhook",
                "error_code": "ENQUEUE_FAILED",
            }

    def _validate_webhook(
        self, webhook_data: dict, client_info: Optional[dict] = None
    ) -> dict:
        """
        Validate webhook and extract instance information.

        Args:
            webhook_data: Raw webhook data
            client_info: Client connection info

        Returns:
            dict: Validation result with instance info
        """
        log = self.logger.get_adapter("WEBHOOK")

        # Extract media block
        media_block, media_type, media_id = self._extract_media_block(webhook_data)
        if not media_block or not media_type or media_id is None:
            return {
                "success": False,
                "message": "Invalid webhook data - no media block found",
                "error_code": "INVALID_WEBHOOK_DATA",
            }

        # Find matching ARR instance
        instance_info = self._find_arr_instance(client_info)
        if not instance_info["found"]:
            log.error("No matching ARR instance found")
            return {
                "success": False,
                "message": "No matching ARR instance found",
                "error_code": "NO_INSTANCE",
            }

        # Create cache key for deduplication
        cache_key = (instance_info["type"], instance_info["name"], media_type, media_id)

        return {
            "success": True,
            "message": "Webhook validated successfully",
            "media_block": media_block,
            "media_type": media_type,
            "media_id": media_id,
            "instance_info": instance_info,
            "cache_key": cache_key,
        }

    def _extract_media_block(
        self, webhook_data: dict
    ) -> Tuple[Optional[dict], Optional[str], Optional[int]]:
        """
        Extract media information from webhook data.

        Args:
            webhook_data: Raw webhook data

        Returns:
            tuple: (media_block, media_type, media_id)
        """
        if "series" in webhook_data:
            return webhook_data["series"], "series", webhook_data["series"].get("id")
        elif "movie" in webhook_data:
            return webhook_data["movie"], "movie", webhook_data["movie"].get("id")
        else:
            return None, None, None

    def _find_arr_instance(self, client_info: Optional[dict] = None) -> dict:
        """
        Find matching ARR instance from client info.

        Args:
            client_info: Client connection information

        Returns:
            dict: Instance lookup result
        """

        def normalize_host(h):
            if not h:
                return h
            h = str(h).lower()
            if h in ("127.0.0.1", "::1", "localhost"):
                return "localhost"
            return h

        # Extract client info
        if client_info:
            host = client_info.get("client_host")
            port = client_info.get("client_port")
            scheme = client_info.get("scheme", "http")
        else:
            return {"found": False, "error": "No client info provided"}

        norm_host = normalize_host(host)
        norm_port = int(port) if port is not None else None

        # Search through configured instances
        instances_config = self.config.instances

        for media_type in ("radarr", "sonarr"):
            media_dict = getattr(instances_config, media_type, {})
            for name, info in media_dict.items():
                if not info.url:
                    continue

                parsed = urlparse(info.url)
                parsed_host = normalize_host(parsed.hostname)

                try:
                    parsed_port = int(parsed.port) if parsed.port is not None else None
                except Exception:
                    parsed_port = None

                if parsed_host == norm_host and parsed_port == norm_port:
                    return {
                        "found": True,
                        "name": name,
                        "type": media_type,
                        "api": info.api,
                        "url": info.url,
                        "host": host,
                        "port": port,
                        "scheme": scheme or parsed.scheme or "http",
                    }

        return {"found": False, "error": "No matching instance"}

    def _is_duplicate(self, cache_key: tuple, webhook_data: dict) -> bool:
        """
        Check if this webhook is a duplicate (simple debouncing).

        Args:
            cache_key: Unique cache key for this webhook
            webhook_data: Raw webhook data

        Returns:
            bool: True if duplicate
        """
        media_block, _, _ = self._extract_media_block(webhook_data)
        if not media_block:
            return False

        # Simple hash of relevant fields
        hash_data = {
            k: media_block.get(k)
            for k in ["title", "year", "tmdb_id", "tvdb_id", "imdb_id"]
            if k in media_block
        }
        content_hash = hashlib.sha256(
            json.dumps(hash_data, sort_keys=True, default=str).encode("utf-8")
        ).hexdigest()

        now = time.time()
        with self._cache_lock:
            if cache_key in self._cache:
                prev_hash, prev_time = self._cache[cache_key]
                if prev_hash == content_hash and (now - prev_time) < 5:
                    return True

            self._cache[cache_key] = (content_hash, now)

            # Simple cleanup - remove entries older than 30 seconds
            cutoff = now - 30
            expired_keys = [k for k, (_, t) in self._cache.items() if t < cutoff]
            for k in expired_keys:
                del self._cache[k]

        return False
