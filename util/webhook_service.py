import hashlib
import json
import threading
import time
from urllib.parse import urlparse

from modules.poster_renamerr import PosterRenamerr
from util.arr import create_arr_client
from util.config import Config
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
        self.config = Config(module_name)
        self.db = db or DapsDB()
        self.logger = logger or Logger(
            getattr(self.config, "log_level", "INFO"), self.config.module_name
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

        for media_type in ("radarr", "sonarr"):
            for name, info in self.config.instances_config.get(media_type, {}).items():
                url = info.get("url")
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
                    instance_api = info.get("api")
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
        log = logger.get_adapter({"source": "WEBHOOK"})
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

        arr_client = create_arr_client(
            self.config.instances_config[instance_type][instance_name]["url"],
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
        log = self.logger.get_adapter({"source": "WEBHOOK"})
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
        from util.upload_posters import upload_posters

        log = self.logger.get_adapter({"source": "RENAMERR_ADHOC"})

        item_keys = self._extract_media_keys(process_result)
        item = self.db.media.get_by_keys(**item_keys)
        if not item:
            log.error(f"No DB row found for: {json.dumps(item_keys, indent=2)}")
            return {
                "status": 404,
                "success": False,
                "error_code": "MEDIA_NOT_FOUND",
                "message": "No media DB row found for keys.",
                "item": None,
            }

        renamer = PosterRenamerr(self.config, log, self.db)
        log.debug("Gathering all the posters, please wait...")
        renamer.merge_assets(self.config.source_dirs, self.db, self.logger)

        is_collection = item.get("asset_type", "").lower() not in ("movie", "show")
        result = renamer.match_item(item, is_collection=is_collection)

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

        item = self.db.media.get_by_keys(**item_keys)
        renamed = renamer.rename_file(item)
        if not renamed:
            return {
                "status": 500,
                "success": False,
                "error_code": "RENAME_FAILED",
                "message": "Rename failed.",
                "item": item,
            }

        output = {"collection": [], "movie": [], "show": []}
        output[renamed["asset_type"]].append(renamed)

        manifest = {
            "media_cache": (
                [renamed["id"]] if renamed["asset_type"] != "collection" else []
            ),
            "collections_cache": (
                [renamed["id"]] if renamed["asset_type"] == "collection" else []
            ),
        }

        self.notification_manager.send_notification(output)

        if self.config.run_border_replacerr:
            renamer.run_border_replacerr(manifest)

        upload_posters(self.config, self.db, self.logger, manifest)
        return {
            "status": 200,
            "success": True,
            "error_code": None,
            "message": "Renaming and notification completed.",
            "item": renamed,
        }

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
