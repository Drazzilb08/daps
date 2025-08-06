import datetime
import hashlib
import json
import threading
import time
from urllib.parse import urlparse

from modules.poster_renamerr import PosterRenamerr
from util.arr import create_arr_client
from util.config import load_config
from util.database import DapsDB
from util.logger import Logger
from util.notification import NotificationManager


class WebhookService:
    """
    Handles webhook requests from Radarr/Sonarr, deduplication, and triggers asset upserts and renaming.
    Prefers client info from the API layer if provided.
    """

    _media_cache = {}
    _media_cache_lock = threading.Lock()

    def __init__(self, request=None, db=None, logger=None, module_name=None):
        self.request = request
        # Always load the full config, always access .instances, .poster_renamerr, etc as needed
        full_config = load_config()
        self.full_config = full_config
        # If module_name given, use that section if present, else fallback to full_config
        if module_name and hasattr(full_config, module_name):
            self.config = getattr(full_config, module_name)
        else:
            self.config = full_config
        self.db = db or DapsDB()
        self.logger = logger or Logger(
            getattr(self.config, "log_level", "INFO"),
            getattr(self.config, "module_name", module_name or "webhook_service"),
        )
        self.notification_manager = NotificationManager(
            self.config, self.logger, module_name
        )
        self._client_info = None

    def set_client_info(self, client_info):
        """Set pre-parsed client_info from the API layer."""
        self._client_info = client_info

    def _get_client_addr(self):
        """
        Return (host, port, scheme) using _client_info if present, else fall back to request.
        """
        host = None
        port = None
        scheme = None
        if self._client_info:
            host = self._client_info.get("client_host")
            port = self._client_info.get("client_port")
            scheme = self._client_info.get("scheme")
        if not host and self.request and hasattr(self.request, "client"):
            host = self.request.client.host if self.request.client else None
        if not port and self.request:
            try:
                port = int(self.request.headers.get("X-Service-Port"))
            except Exception:
                port = None
        if not scheme and self.request:
            try:
                if hasattr(self.request, "url"):
                    scheme = self.request.url.scheme
                elif hasattr(self.request, "scope") and "scheme" in self.request.scope:
                    scheme = self.request.scope["scheme"]
            except Exception:
                scheme = "http"
        return host, port, scheme

    @staticmethod
    def _get_media_block(data):
        """Return the relevant 'series' or 'movie' block for deduplication."""
        if "series" in data:
            return data["series"], "series", data["series"].get("id")
        elif "movie" in data:
            return data["movie"], "movie", data["movie"].get("id")
        else:
            return None, None, None

    @staticmethod
    def _media_hash(media_block, asset_type=None, season_number=None):
        """
        Hash only fields that actually affect upsert. Extra fields are ignored.
        asset_type: "movie" or "show"
        season_number: For shows, the season to be included (optional)
        """
        keys = [
            "title",
            "normalized_title",
            "year",
            "tmdb_id",
            "tvdb_id",
            "imdb_id",
            "folder",
            "location",
            "tags",
        ]
        hash_data = {k: media_block.get(k) for k in keys if k in media_block}
        if asset_type == "show" and season_number is not None:
            hash_data["season_number"] = season_number
        return hashlib.sha256(
            json.dumps(hash_data, sort_keys=True, default=str).encode("utf-8")
        ).hexdigest()

    def find_instance(self):
        host, port, scheme = self._get_client_addr()

        def normalize_host(h):
            if not h:
                return h
            h = str(h).lower()
            if h in ("127.0.0.1", "::1", "localhost"):
                return "localhost"
            return h

        instance_name = None
        instance_type = None
        instance_api = None
        instance_scheme = None

        norm_host = normalize_host(host)
        norm_port = int(port) if port is not None else None

        # Use pydantic attribute access, never .get()
        instances_config = self.full_config.instances

        for media_type in ("radarr", "sonarr"):
            # Each is a dict of name -> InstanceDetail
            media_dict = getattr(instances_config, media_type, {})
            for name, info in media_dict.items():
                url = info.url
                if not url:
                    continue
                parsed = urlparse(url)
                parsed_host = normalize_host(parsed.hostname)
                try:
                    parsed_port = int(parsed.port) if parsed.port is not None else None
                except Exception:
                    parsed_port = None

                if parsed_host == norm_host and parsed_port == norm_port:
                    instance_name = name
                    instance_type = media_type
                    instance_api = info.api
                    instance_scheme = scheme or parsed.scheme or "http"
                    break

        return (
            instance_name,
            instance_type,
            instance_api,
            host,
            port,
            instance_scheme,
        )

    def fetch_items(self, arr_client, data, instance_type):
        if instance_type == "radarr":
            item = arr_client.get_movie(data["movie"]["id"])
        else:
            item = arr_client.get_show(data["series"]["id"])
        asset_type = "movie" if instance_type == "radarr" else "show"
        return item, asset_type

    def process_arr_request(self, data, logger):
        """
        Main webhook entrypoint. Skips test events, then matches client info and processes ARR webhook.
        """
        if "_client" in data:
            self._client_info = data["_client"]
        media_block, media_kind, media_id = self._get_media_block(data)

        instance_name, instance_type, instance_api, host, port, scheme = (
            self.find_instance()
        )
        log = logger.get_adapter("WEBHOOK")
        log.debug(f"Source: {scheme}://{host}:{port}")

        if not instance_name or not instance_api or not media_kind or media_id is None:
            log.error(f"No matching ARR instance found for {scheme}://{host}:{port}")
            return {
                "status": 400,
                "success": False,
                "error_code": "NO_INSTANCE",
                "message": "No matching ARR instance for this request's IP:port",
                "item": None,
            }

        cache_key = (instance_type, instance_name, media_kind, media_id)
        now = time.time()
        if media_block:
            media_hash = self._media_hash(media_block)
            with self._media_cache_lock:
                prev = self._media_cache.get(cache_key)
                if prev:
                    prev_hash, prev_time = prev
                    if prev_hash == media_hash and (now - prev_time) < 5:
                        log.debug(
                            f"Skipping unchanged {media_kind} {media_id} for {instance_type}:{instance_name} (debounced, last={now - prev_time:.2f}s ago)"
                        )
                        return {
                            "status": 200,
                            "success": True,
                            "error_code": None,
                            "message": f"{media_kind.capitalize()} {media_id} unchanged, debounced.",
                            "debounced": True,
                            "item": None,
                        }
                self._media_cache[cache_key] = (media_hash, now)

        # ARR instance config is always full_config.instances.{radarr|sonarr}
        instances_config = self.full_config.instances

        # Get the correct InstanceDetail
        arr_url = None
        if instance_type and instance_name:
            media_dict = getattr(instances_config, instance_type, {})
            info = media_dict.get(instance_name)
            if info:
                arr_url = info.url

        if not arr_url:
            return {
                "status": 502,
                "success": False,
                "error_code": "ARR_CONFIG_MISSING",
                "message": "No URL for ARR instance",
                "item": None,
            }

        arr_client = create_arr_client(
            arr_url,
            instance_api,
            logger,
        )
        if not arr_client or not arr_client.is_connected():
            return {
                "status": 502,
                "success": False,
                "error_code": "ARR_CONNECT_FAIL",
                "message": "Could not connect to ARR instance",
                "item": None,
            }
        item, asset_type = self.fetch_items(arr_client, data, instance_type)

        self.upsert_media_items(item, asset_type, instance_type, instance_name)

        log.debug(
            f"Processed {item['title']} ({item['year']}) from {instance_type}:{instance_name}"
        )
        return {
            "status": 200,
            "success": True,
            "error_code": None,
            "message": f"Processed {item['title']} ({item.get('year')}) from {instance_type}:{instance_name}",
            "instance_name": instance_name,
            "media_type": instance_type,
            "asset_type": asset_type,
            "result": None,
            "client_host": host,
            "client_port": port,
            "item": item,
        }

    def upsert_media_items(self, item, asset_type, instance_type, instance_name):
        log = self.logger.get_adapter("WEBHOOK")
        log.debug(
            f"New asset '{item['title']}' ({asset_type}), {item.get('year')}, from {instance_name}"
        )
        if asset_type == "show":
            show_row = dict(item)
            show_row["season_number"] = None
            self.db.media.upsert(show_row, asset_type, instance_type, instance_name)
            for season in item.get("seasons", []):
                season_row = dict(item)
                season_row["season_number"] = season.get("season_number")
                self.db.media.upsert(
                    season_row, asset_type, instance_type, instance_name
                )
        else:
            self.db.media.upsert(item, asset_type, instance_type, instance_name)

    def run_renamerr_adhoc(self, process_result: dict) -> dict:
        try:
            from util.upload_posters import PosterUploader

            log = self.logger.get_adapter("RENAMERR_ADHOC")
            item_keys = self._extract_media_keys(process_result)
            items = self.db.media.get_by_keys(**item_keys)
            if not items:
                log.error(f"No DB row found for: {json.dumps(item_keys, indent=2)}")
                return {
                    "status": 404,
                    "success": False,
                    "error_code": "MEDIA_NOT_FOUND",
                    "message": "No media DB row found for keys.",
                    "item": None,
                }

            # Only allow types relevant to ARR (movie, show)
            allowed_types = ("movie", "show")
            output = {k: [] for k in allowed_types}
            manifests = []

            renamer = PosterRenamerr(logger=log)
            if not self.config.source_dirs:
                self.logger.warning("No source directories configured.")
                return {
                    "status": 500,
                    "success": False,
                    "error_code": "NO_SOURCE_DIRS",
                    "message": "No source directories configured.",
                    "item": None,
                }

            renamer.merge_assets(self.config.source_dirs, self.db, self.logger)

            for item in items:
                asset_type = item.get("asset_type", "").lower()
                if asset_type not in allowed_types:
                    log.info(f"Skipping unsupported asset_type: {asset_type}")
                    continue

                result = renamer.match_item(item, is_collection=False)
                if not result["matched"]:
                    log.info(f"No match for {item['title']} ({item['year']})")
                    return {
                        "status": 404,
                        "success": False,
                        "error_code": "NO_MATCH",
                        "message": "No asset match found for provided media.",
                        "item": item,
                    }

                log.info(
                    f"Matched: {result['match']['title']} ({result['match']['year']}) → {item['title']} ({item['year']})"
                )
                log.debug(f"Match reasons: {result['reasons']}")
                refreshed_item = self.db.media.get_by_id(item["id"])
                renamed = renamer.rename_file(refreshed_item)
                if not renamed:
                    return {
                        "status": 500,
                        "success": False,
                        "error_code": "RENAME_FAILED",
                        "message": "Rename failed.",
                        "item": refreshed_item,
                    }

                output[renamed["asset_type"]].append(renamed)
                # Build manifest: only include as media_cache (never collections_cache for ARR)
                manifests.append(
                    {
                        "media_cache": [renamed["id"]],
                        "collections_cache": [],
                    }
                )

            # Always send notification for all results
            self.notification_manager.send_notification(output)

            # Border replacer logic
            if getattr(self.config, "run_border_replacerr", False):
                for manifest in manifests:
                    renamer.run_border_replacerr(manifest)

            # Only proceed if at least one Plex instance is enabled for poster upload
            plex_enabled = any(
                isinstance(i, dict)
                and getattr(next(iter(i.values())), "add_posters", False)
                for i in self.config.instances
            )

            if plex_enabled:
                # Can only ever be one manifest per ARR webhook run, but handle multi just in case
                upload_failures = []
                upload_success = []
                for manifest in manifests:
                    upload_result = PosterUploader(
                        logger=self.logger, manifest=manifest
                    ).run()
                    if not upload_result.get("success"):
                        failure_message = (
                            upload_result.get("message") or "Unknown upload failure"
                        )
                        payload = {
                            "manifest": manifest,
                            "item": output,
                            "config_module": getattr(self.config, "module_name", None),
                        }
                        delay_minutes = getattr(self.config, "upload_retry_delay", 5)
                        max_attempts = getattr(
                            self.config, "upload_retry_max_attempts", 3
                        )
                        scheduled_at = (
                            datetime.datetime.now(datetime.timezone.utc)
                            + datetime.timedelta(minutes=delay_minutes)
                        ).isoformat()
                        enqueue_result = self.db.worker.enqueue_job(
                            "jobs",
                            payload,
                            job_type="upload_posters",
                            extra_fields={
                                "max_attempts": max_attempts,
                                "error": failure_message,
                            },
                            scheduled_at=scheduled_at,
                        )
                        log.warning(
                            f"Poster upload failed: {upload_result.get('message')!r}; will retry (job enqueued)"
                        )
                        log.info(f"Enqueue result: {enqueue_result}")
                        upload_failures.append(
                            {
                                "manifest": manifest,
                                "result": upload_result,
                                "retry_job": enqueue_result,
                            }
                        )
                    else:
                        upload_success.append(
                            {
                                "manifest": manifest,
                                "result": upload_result,
                            }
                        )

                if upload_failures:
                    return {
                        "status": 500,
                        "success": False,
                        "error_code": "UPLOAD_QUEUED",
                        "message": "One or more uploads failed, jobs enqueued for retry.",
                        "item": output,
                        "upload_failures": upload_failures,
                    }
                else:
                    return {
                        "status": 200,
                        "success": True,
                        "error_code": None,
                        "message": "Renaming and notification completed, uploads succeeded.",
                        "item": output,
                        "upload_success": upload_success,
                    }
            else:
                self.logger.debug(
                    "No Plex instances enabled (add_posters=True) for poster upload."
                )
                return {
                    "status": 200,
                    "success": True,
                    "error_code": None,
                    "message": "Renaming and notification completed.",
                    "item": output,
                }
        except Exception as exc:
            self.logger.error(f"\n\nAn error occurred: {exc}\n", exc_info=True)
        finally:
            self.db.close_all()

    def _extract_media_keys(self, process_result: dict) -> dict:
        item = process_result.get("item", {})
        return {
            "asset_type": process_result.get("asset_type"),
            "title": item.get("title"),
            "year": item.get("year"),
            "tmdb_id": item.get("tmdb_id"),
            "tvdb_id": item.get("tvdb_id"),
            "imdb_id": item.get("imdb_id"),
            "season_number": item.get("season_number"),
            "instance_name": process_result.get("instance_name"),
        }
