"""
Clean Webhook Processor

Handles ONLY webhook validation and job enqueueing.
No business logic, no database operations, no file operations.
SIMPLIFIED: Removed duplicate logic, standardized response format.
"""

import hashlib
import json
import threading
import time
from typing import Optional, Tuple
from urllib.parse import urlparse

from util.arr import create_arr_client
from util.config import load_config
from util.database import DapsDB


class WebhookProcessor:
    """
    Clean webhook processor - ONLY handles webhook validation and routing.
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
        SIMPLIFIED: Uses standardized response format.

        Args:
            webhook_data: Raw webhook data from ARR
            client_info: Optional client info from API layer

        Returns:
            dict: Standardized success/failure response
        """
        log = self.logger.get_adapter("WEBHOOK")

        # 1. Validate and extract basic info
        validation_result = self._validate_webhook(webhook_data, client_info)
        if not validation_result["success"]:
            return validation_result

        # 2. Check for duplicates (simple debouncing)
        if self._is_duplicate(validation_result["cache_key"], webhook_data):
            log.debug("Skipping duplicate webhook (debounced)")
            return {
                "success": True,
                "message": "Webhook debounced (duplicate)",
                "data": {"debounced": True},
            }

        # 3. Enqueue job for background processing
        job_payload = {
            "webhook_data": webhook_data,
            "client_info": client_info,
            "instance_info": validation_result["instance_info"],
        }

        with DapsDB(logger=self.logger) as db:
            enqueue_result = db.worker.enqueue_job(
                table_name="jobs", payload=job_payload, job_type="webhook_process"
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

    def process_webhook_adhoc(
        self, webhook_data: dict, client_info: Optional[dict] = None
    ) -> dict:
        """
        Process webhook directly (synchronously) for job processing.
        SIMPLIFIED: Unified with job processor, standardized response format.

        Args:
            webhook_data: Raw webhook data from ARR
            client_info: Optional client info from API layer

        Returns:
            dict: Standardized processing results
        """
        log = self.logger.get_adapter("WEBHOOK_ADHOC")

        # 1. Validate webhook
        validation_result = self._validate_webhook(webhook_data, client_info)
        if not validation_result["success"]:
            return validation_result

        # 2. Fetch media from ARR
        media_result = self._fetch_media_from_arr(
            webhook_data, validation_result["instance_info"]
        )
        if not media_result["success"]:
            return media_result

        # 3. Store media in database
        with DapsDB(logger=self.logger) as db:
            self._store_media(
                db, media_result["media"], validation_result["instance_info"]
            )

        # 4. Call PosterRenamerr directly - import here to avoid circular dependency
        from modules.poster_renamerr import PosterRenamerr

        renamer = PosterRenamerr(logger=self.logger)
        rename_result = renamer.run_poster_rename_adhoc([media_result["media"]])

        if rename_result["success"]:
            log.info(
                f"Webhook processed successfully: {media_result['media']['title']}"
            )
            return {
                "success": True,
                "message": "Webhook processed successfully",
                "data": {
                    "media": media_result["media"],
                    "rename_result": rename_result,
                },
            }
        else:
            log.error(f"Poster rename failed: {rename_result.get('message')}")
            return {
                "success": False,
                "message": "Poster rename failed",
                "error_code": "POSTER_RENAME_FAILED",
            }

    def _validate_webhook(
        self, webhook_data: dict, client_info: Optional[dict] = None
    ) -> dict:
        """Validate webhook and extract instance information. FIXED: Standardized response format."""
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
        """Extract media information from webhook data."""
        if "series" in webhook_data:
            return webhook_data["series"], "series", webhook_data["series"].get("id")
        elif "movie" in webhook_data:
            return webhook_data["movie"], "movie", webhook_data["movie"].get("id")
        else:
            return None, None, None

    def _find_arr_instance(self, client_info: Optional[dict] = None) -> dict:
        """Find matching ARR instance from client info or request."""

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
                        "api_key": info.api,
                        "url": info.url,
                        "host": host,
                        "port": port,
                        "scheme": scheme or parsed.scheme or "http",
                    }

        return {"found": False, "error": "No matching instance"}

    def _is_duplicate(self, cache_key: tuple, webhook_data: dict) -> bool:
        """Check if this webhook is a duplicate (simple debouncing)."""
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

    def _fetch_media_from_arr(self, webhook_data: dict, instance_info: dict) -> dict:
        """Fetch full media information from ARR instance. FIXED: Standardized response format."""
        log = self.logger.get_adapter("WEBHOOK")

        # Create ARR client
        arr_client = create_arr_client(
            instance_info["url"], instance_info["api_key"], self.logger
        )

        if not arr_client or not arr_client.is_connected():
            return {
                "success": False,
                "message": "Could not connect to ARR instance",
                "error_code": "ARR_CONNECT_FAIL",
            }

        # Fetch media details
        media_block, media_type, media_id = self._extract_media_block(webhook_data)

        try:
            if instance_info["type"] == "radarr":
                media = arr_client.get_movie(media_id)
                asset_type = "movie"
            else:
                media = arr_client.get_show(media_id)
                asset_type = "show"

            log.debug(f"Fetched {media['title']} from {instance_info['name']}")

            return {
                "success": True,
                "message": f"Media fetched successfully: {media['title']}",
                "media": media,
                "asset_type": asset_type,
            }

        except Exception as e:
            log.error(f"Failed to fetch media from ARR: {e}")
            return {
                "success": False,
                "message": f"Failed to fetch media: {str(e)}",
                "error_code": "ARR_FETCH_FAIL",
            }

    def _store_media(self, db, media: dict, instance_info: dict):
        """Store media information in database."""
        log = self.logger.get_adapter("WEBHOOK")

        asset_type = "movie" if instance_info["type"] == "radarr" else "show"

        # Store main media record
        if asset_type == "show":
            # Store show record
            show_record = dict(media)
            show_record["season_number"] = None
            db.media.upsert(
                show_record, asset_type, instance_info["type"], instance_info["name"]
            )

            # Store season records
            for season in media.get("seasons", []):
                season_record = dict(media)
                season_record["season_number"] = season.get("season_number")
                db.media.upsert(
                    season_record,
                    asset_type,
                    instance_info["type"],
                    instance_info["name"],
                )
        else:
            db.media.upsert(
                media, asset_type, instance_info["type"], instance_info["name"]
            )

        log.debug(f"Stored {media['title']} in database")
