import hashlib
import json
import threading
import time

from urllib.parse import urlparse
from typing import Any, Dict, List

from util.arr import create_arr_client
from util.config import Config
from util.database import DapsDB
from util.logger import Logger
from util.notification import NotificationManager
from modules.poster_renamerr import PosterRenamerr

class JobService:
    _media_cache = {}
    _media_cache_lock = threading.Lock()

    def __init__(self, request, db=None, logger=None, module_name=None):
        self.request = request
        self.config = Config(module_name)
        self.db = db or DapsDB()
        self.logger = logger or Logger(
            getattr(self.config, "log_level", "INFO"), self.config.module_name
        )
        self.notification_manager = NotificationManager(self.config, self.logger, module_name)


    def _get_client_addr(self):
        host = (
            self.request.client.host
            if self.request.client
            else self.request.headers.get("X-Service-URL")
        )
        try:
            port = int(self.request.headers.get("X-Service-Port"))
        except Exception:
            port = None
        return host, port

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
    def _media_hash(media_block):
        """Hash a dict (series/movie) in a consistent order-insensitive way."""
        return hashlib.sha256(
            json.dumps(media_block, sort_keys=True, default=str).encode("utf-8")
        ).hexdigest()

    def find_instance(self):
        """Find the correct instance_name/type/api/scheme from config based on request origin."""
        client_host, client_port = self._get_client_addr()
        scheme = None

        # Try to get the scheme from the request itself (http/https)
        try:
            if hasattr(self.request, "url"):
                scheme = self.request.url.scheme
            elif hasattr(self.request, "scope") and "scheme" in self.request.scope:
                scheme = self.request.scope["scheme"]
        except Exception:
            pass

        instance_name = None
        instance_type = None
        instance_api = None
        instance_scheme = None

        for media_type in ("radarr", "sonarr"):
            for name, info in self.config.instances_config.get(media_type, {}).items():
                url = info.get("url")
                if not url:
                    continue
                parsed = urlparse(url)
                parsed_host = parsed.hostname
                my_host = client_host
                if parsed_host in ("127.0.0.1", "::1") or parsed_host == "localhost":
                    parsed_host = "localhost"
                if my_host in ("127.0.0.1", "::1") or my_host == "localhost":
                    my_host = "localhost"
                if parsed_host == my_host and parsed.port == client_port:
                    instance_name = name
                    instance_type = media_type
                    instance_api = info.get("api")
                    # Prefer the request scheme; if unavailable, fallback to instance URL scheme
                    instance_scheme = scheme or parsed.scheme or "http"
                    break

        return (
            instance_name,
            instance_type,
            instance_api,
            client_host,
            client_port,
            instance_scheme,
        )
    
    def is_test(self, data):
        event_type = data.get("eventType", "")
        return isinstance(event_type, str) and "test" in event_type.lower()

    def fetch_items(self, arr_client, data, instance_type):
        if instance_type == "radarr":
            item = arr_client.get_movie(data["movie"]["id"])
        else:
            item = arr_client.get_show(data["series"]["id"])
        asset_type = "movie" if instance_type == "radarr" else "show"
        return item, asset_type

    def process_arr_request(self, data, logger):
        # Debounce based on series/movie block hash
        media_block, media_kind, media_id = self._get_media_block(data)
        instance_name, instance_type, instance_api, client_host, client_port, scheme = (
            self.find_instance()
        )

        if not instance_name or not instance_api or not media_kind or media_id is None:
            logger.error(
                f"No matching ARR instance found for {scheme}://{client_host}:{client_port}"
            )
            return {
                "error": "No matching ARR instance for this request's IP:port",
                "status": 400,
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
                        logger.debug(
                            f"[DEBOUNCE] Skipping unchanged {media_kind} {media_id} for {instance_type}:{instance_name} (debounced, last={now - prev_time:.2f}s ago)"
                        )
                        return {
                            "result": f"{media_kind.capitalize()} {media_id} unchanged, debounced.",
                            "status": 200,
                            "debounced": True,
                        }
                self._media_cache[cache_key] = (media_hash, now)

        logger.debug(f"Received request from {scheme}://{client_host}:{client_port}")
        arr_client = create_arr_client(
            self.config.instances_config[instance_type][instance_name]["url"],
            instance_api,
            logger,
        )
        if not arr_client or not arr_client.is_connected():
            return {"error": "Could not connect to ARR instance", "status": 502}
        item, asset_type = self.fetch_items(arr_client, data, instance_type)
        
        self.upsert_media_items(item, asset_type, instance_type, instance_name)
        
        self.logger.debug(f"Processed {item['title']} ({item['year']}) from {instance_type}:{instance_name}")
        return {
            "instance_name": instance_name,
            "media_type": instance_type,
            "asset_type": asset_type,
            "result": None,
            "client_host": client_host,
            "client_port": client_port,
            "item": item,
            "success": True,
            "status": 200,
        }

    def upsert_media_items(self, item, asset_type, instance_type, instance_name):
        self.logger.debug(
            f"[ADD] New asset '{item['title']}' ({asset_type}), {item.get('year')}, from {instance_name}"
        )
        if asset_type == "show":
            show_row = dict(item)
            show_row["season_number"] = None
            self.db.media.upsert(show_row, asset_type, instance_type, instance_name)
            for season in item.get("seasons", []):
                season_row = dict(item)
                season_row["season_number"] = season.get("season_number")
                self.db.media.upsert(season_row, asset_type, instance_type, instance_name)
        else:
            self.db.media.upsert(item, asset_type, instance_type, instance_name)

    def run_renamerr_adhoc(self, process_result):
        """
        Run ad-hoc poster renaming/matching for provided item(s).
        Ensures the same DB state and row hydration as a full run.
        """
        from util.upload_posters import upload_posters
        
        item = self.db.media.get_by_keys(
            process_result.get('asset_type'),
            process_result['item'].get('title'),
            process_result['item'].get('year'),
            process_result['item'].get('tmdb_id'),
            process_result['item'].get('tvdb_id'),
            process_result['item'].get('imdb_id'),
            process_result['item'].get('season_number'),
            process_result.get('instance_name')
        )
        if not item:
            self.logger.error(f"No media DB row found for keys: Asset Type: {process_result.get('asset_type')} | Title: {process_result['item'].get('title')} | Year: {process_result['item'].get('year')} | TMDB ID: {process_result['item'].get('tmdb_id')} | TVDB ID: {process_result['item'].get('tvdb_id')} | IMDB ID: {process_result['item'].get('imdb_id')} | Season Number: {process_result['item'].get('season_number')} | Instance Name: {process_result.get('instance_name')}")
            return {"status": 500, "error": "No media DB row found for keys."}
        
        renamer = PosterRenamerr(self.config, self.logger, self.db)
        self.logger.debug("Gathering all the posters, please wait...")
        renamer.merge_assets(self.config.source_dirs, self.db, self.logger)

        is_collection = item.get('asset_type', '').lower() not in ("movie", "show")
        result = renamer.match_item(item, is_collection=is_collection)
        item = self.db.media.get_by_keys(
            process_result.get('asset_type'),
            process_result['item'].get('title'),
            process_result['item'].get('year'),
            process_result['item'].get('tmdb_id'),
            process_result['item'].get('tvdb_id'),
            process_result['item'].get('imdb_id'),
            process_result['item'].get('season_number'),
            process_result.get('instance_name')
        )
        if result['matched']:
            self.logger.info(
                f"Matched: {result['match']['title']} ({result['match']['year']}) to {item['title']} ({item['year']})"
            )
            self.logger.debug(f"Matched reasons: {result['reasons']}")
            renamer_result = renamer.rename_file(item)

            if renamer_result:
                output = {
                    "collection": [],
                    "movie": [],
                    "show": [],
                }
                output[renamer_result["asset_type"]].append(renamer_result)
                manifest = [renamer_result['id']]
                self.notification_manager.send_notification(output)
                renamer.handle_output(output)
                if self.config.run_border_replacerr:
                    renamer.run_border_replacerr(manifest)
                upload_posters(self.config, self.db, self.logger, manifest)
                return {"status": 200}
        else:
            self.logger.info(f"No match found for {item['title']} ({item['year']})")
            return {"status": 404, "error": "No match found."}