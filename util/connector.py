import itertools
import sys
import time
from typing import Dict, List

from util.arr import create_arr_client
from util.config import DapsConfig, load_config
from util.database import DapsDB
from util.logger import Logger
from util.plex import PlexClient


class Connector:
    def __init__(
        self,
        db: DapsDB = None,
        config: DapsConfig = None,
        logger: Logger = None,
        instance_map: Dict[str, List[str]] = None,
    ):
        self.db = db or DapsDB()
        self.config = load_config()
        self.logger = logger
        self.instance_map = instance_map

    def update_arr_database(self):
        logger = self.logger.get_adapter("arr")
        config = self.config
        db = self.db

        arr_instances = set(self.instance_map.get("arrs", []))
        all_instances = []
        for instance_type, instance_dict in [
            ("radarr", config.instances.radarr),
            ("sonarr", config.instances.sonarr),
        ]:
            for instance_name, info in instance_dict.items():
                if arr_instances and instance_name not in arr_instances:
                    continue
                all_instances.append((instance_type, instance_name, info))

        if not all_instances:
            logger.error("No ARR instances found in instance_map['arrs'] or config.")
            return

        spinner = itertools.cycle(["-", "\\", "|", "/"])
        for idx, (instance_type, instance_name, info) in enumerate(all_instances):
            arr_logger = logger.get_adapter(f"{instance_type}:{instance_name}")
            sys.stdout.write(f"\rIndexing '{instance_name}'... {next(spinner)}")
            sys.stdout.flush()
            url = info.url
            api = info.api
            if not url or not api:
                arr_logger.warning(
                    f"Instance '{instance_name}' missing URL or API key. Skipping."
                )
                continue

            app = create_arr_client(url, api, arr_logger)
            if app is None or not app.is_connected():
                arr_logger.error(f"Connection failed for '{instance_name}'. Skipping.")
                continue

            asset_type = "movie" if app.instance_type == "Radarr" else "show"
            raw_media = app.get_all_media()
            fresh_media = []

            if asset_type == "show":
                for show in raw_media:
                    show_row = dict(show)
                    show_row["season_number"] = None
                    fresh_media.append(show_row)
                    for season in show.get("seasons", []):
                        season_row = dict(show)
                        season_row["season_number"] = season.get("season_number")
                        fresh_media.append(season_row)
            else:
                fresh_media = raw_media

            db.media.sync_for_instance(
                instance_name, app.instance_type, asset_type, fresh_media, arr_logger
            )
            time.sleep(0.05)
        sys.stdout.write("\r")
        print(f"ARR database sync complete. ({len(all_instances)} instances)\n")

    def update_plex_database(self):
        logger = self.logger.get_adapter("plex")
        config = self.config
        db = self.db

        plex_map = self.instance_map.get("plex", {})
        if not plex_map:
            logger.error("No Plex instances found in instance_map['plex'].")
            return

        for instance_name, selected_libraries in plex_map.items():
            plex_logger = logger.get_adapter(instance_name)
            plex_config = config.instances.plex.get(instance_name)
            if not plex_config:
                plex_logger.warning(
                    f"Plex instance '{instance_name}' not found in config."
                )
                continue
            url = plex_config.url
            api = plex_config.api
            if not url or not api:
                plex_logger.warning(
                    f"Instance '{instance_name}' missing URL or API key. Skipping."
                )
                continue

            plex_client = PlexClient(url, api, plex_logger)
            if not plex_client.is_connected():
                plex_logger.error(f"Connection failed for '{instance_name}'. Skipping.")
                continue

            try:
                all_libraries = plex_client.get_libraries()
            except Exception as e:
                plex_logger.error(
                    f"Failed to fetch libraries for '{instance_name}': {e}"
                )
                continue

            # Handle [] as "all libraries", otherwise filter
            if not selected_libraries:
                target_libraries = all_libraries
            else:

                def norm(s):
                    return s.strip().lower() if isinstance(s, str) else s

                norm_selected = set(map(norm, selected_libraries))
                target_libraries = [
                    lib for lib in all_libraries if norm(lib) in norm_selected
                ]

            if not target_libraries:
                plex_logger.debug(
                    f"No libraries specified for '{instance_name}', skipping. Available libraries: {all_libraries}"
                )
                continue

            spinner = itertools.cycle(["-", "\\", "|", "/"])
            for idx, library_name in enumerate(target_libraries):
                sys.stdout.write(
                    f"\rIndexing library '{library_name}' for '{instance_name}'... {next(spinner)}"
                )
                sys.stdout.flush()
                try:
                    fresh_media = plex_client.get_all_plex_media(
                        library_name=library_name,
                        logger=plex_logger,
                        instance_name=instance_name,
                    )
                    db.plex.sync_for_library(
                        instance_name=instance_name,
                        library_name=library_name,
                        fresh_media=fresh_media,
                        logger=plex_logger,
                    )
                except Exception as e:
                    plex_logger.error(
                        f"Error caching library '{library_name}' for '{instance_name}': {e}"
                    )
                    continue
                time.sleep(0.05)
            sys.stdout.write("\r")
            print(f"Indexed all libraries for {instance_name}.")

    def update_collections_database(self):
        logger = self.logger.get_adapter("plex")
        config = self.config
        db = self.db

        plex_map = self.instance_map.get("plex", {})
        if not plex_map:
            logger.error("No Plex instances found in instance_map['plex'].")
            return

        for instance_name, selected_libraries in plex_map.items():
            plex_logger = logger.get_adapter(instance_name)
            plex_config = config.instances.plex.get(instance_name)
            if not plex_config:
                plex_logger.warning(
                    f"Plex instance '{instance_name}' not found in config."
                )
                continue
            url = plex_config.url
            api = plex_config.api
            if not url or not api:
                plex_logger.warning(
                    f"Instance '{instance_name}' missing URL or API key. Skipping."
                )
                continue

            plex_client = PlexClient(url, api, plex_logger)
            if not plex_client.is_connected():
                plex_logger.error(f"Connection failed for '{instance_name}'. Skipping.")
                continue

            try:
                all_libraries = plex_client.get_libraries()
            except Exception as e:
                plex_logger.error(
                    f"Failed to fetch libraries for '{instance_name}': {e}"
                )
                continue

            if not selected_libraries:
                target_libraries = all_libraries
            else:

                def norm(s):
                    return s.strip().lower() if isinstance(s, str) else s

                norm_selected = set(map(norm, selected_libraries))
                target_libraries = [
                    lib for lib in all_libraries if norm(lib) in norm_selected
                ]

            if not target_libraries:
                plex_logger.debug(
                    f"No libraries specified for '{instance_name}', skipping. Available libraries: {all_libraries}"
                )
                continue

            spinner = itertools.cycle(["-", "\\", "|", "/"])
            for idx, library_name in enumerate(target_libraries):
                sys.stdout.write(
                    f"\rIndexing collections for library '{library_name}' in '{instance_name}'... {next(spinner)}"
                )
                sys.stdout.flush()
                try:
                    collections = plex_client.get_collections(
                        library_name, include_smart=True
                    )
                except Exception as e:
                    plex_logger.error(
                        f"Error fetching collections for library '{library_name}' in '{instance_name}': {e}"
                    )
                    continue

                if not collections:
                    plex_logger.debug(
                        f"No collections found for library '{library_name}' in '{instance_name}'. Skipping."
                    )
                    continue

                db.collection.sync_collections_cache(
                    instance_name, library_name, collections, plex_logger
                )
                time.sleep(0.05)
            sys.stdout.write("\r")
            print(f"Indexed all collections for {instance_name}.")
