import itertools
import sys
import threading
import time
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Union

from util.arr import ARRAuthenticationError, ARRConnectionError, create_arr_client
from util.config import DapsConfig, load_config
from util.database import DapsDB
from util.logger import Logger
from util.plex import PlexClient


# Custom exceptions
class ConnectorError(Exception):
    """Base exception for connector operations"""

    pass


class InstanceConfigError(ConnectorError):
    """Raised when instance configuration is invalid"""

    pass


class DatabaseSyncError(ConnectorError):
    """Raised when database synchronization fails"""

    pass


class ConnectionPoolError(ConnectorError):
    """Raised when connection pool operations fail"""

    pass


@dataclass
class SyncResult:
    """Result of a sync operation"""

    instance_name: str
    instance_type: str
    success: bool
    items_processed: int = 0
    error_message: Optional[str] = None
    duration: float = 0.0


@dataclass
class InstanceConfig:
    """Validated instance configuration"""

    name: str
    type: str  # 'radarr', 'sonarr', 'plex'
    url: str
    api_key: str
    libraries: Optional[List[str]] = None  # For Plex instances


class InstanceParser:
    """Parses and validates instance configurations"""

    @staticmethod
    def parse_instance_map(
        instance_map: Dict[str, Any], config: DapsConfig
    ) -> Dict[str, List[InstanceConfig]]:
        """
        Parse instance_map into validated InstanceConfig objects.

        Expected formats:
        - {'arrs': ['Radarr Test', 'Sonarr Test'], 'plex': {'plex_1': ['Test Movies', 'Test TV Shows']}}
        - {'plex': {'plex_1': {'library_names': ['Test Movies', 'Test TV Shows']}}}
        - {'arrs': ['Radarr Test']}
        """
        parsed_instances = {"arr": [], "plex": []}
        # Parse ARR instances
        arr_names = instance_map.get("arrs", [])
        if arr_names:
            parsed_instances["arr"] = InstanceParser._parse_arr_instances(
                arr_names, config
            )

        # Parse Plex instances
        plex_map = instance_map.get("plex", {})
        if plex_map:
            parsed_instances["plex"] = InstanceParser._parse_plex_instances(
                plex_map, config
            )
        return parsed_instances

    @staticmethod
    def _parse_arr_instances(
        arr_names: List[str], config: DapsConfig
    ) -> List[InstanceConfig]:
        """Parse ARR instance names into InstanceConfig objects"""
        instances = []

        for instance_name in arr_names:
            # Check in both Radarr and Sonarr configs
            instance_config = None
            instance_type = None

            if instance_name in config.instances.radarr:
                instance_config = config.instances.radarr[instance_name]
                instance_type = "radarr"
            elif instance_name in config.instances.sonarr:
                instance_config = config.instances.sonarr[instance_name]
                instance_type = "sonarr"

            if not instance_config:
                raise InstanceConfigError(
                    f"ARR instance '{instance_name}' not found in config"
                )

            if not instance_config.url or not instance_config.api:
                raise InstanceConfigError(
                    f"ARR instance '{instance_name}' missing URL or API key"
                )

            instances.append(
                InstanceConfig(
                    name=instance_name,
                    type=instance_type,
                    url=instance_config.url,
                    api_key=instance_config.api,
                )
            )

        return instances

    @staticmethod
    def _parse_plex_instances(
        plex_map: Dict[str, Union[List[str], Dict[str, List[str]]]], config: DapsConfig
    ) -> List[InstanceConfig]:
        """
        Parse Plex instance map into InstanceConfig objects.

        Supports two formats:
        - {'plex_1': ['Test Movies', 'Test TV Shows']}  # Simple list
        - {'plex_1': {'library_names': ['Test Movies', 'Test TV Shows']}}  # Dict format
        """
        instances = []
        for instance_name, plex_config in plex_map.items():
            if instance_name not in config.instances.plex:
                raise InstanceConfigError(
                    f"Plex instance '{instance_name}' not found in config"
                )

            plex_instance_config = config.instances.plex[instance_name]
            if not plex_instance_config.url or not plex_instance_config.api:
                raise InstanceConfigError(
                    f"Plex instance '{instance_name}' missing URL or API key"
                )

            # Extract library names from different formats
            library_names = []
            if isinstance(plex_config, list):
                # Simple format: {'plex_1': ['Movies', 'TV Shows']}
                library_names = plex_config
            elif isinstance(plex_config, dict):
                # Dict format: {'plex_1': {'library_names': ['Movies', 'TV Shows']}}
                library_names = plex_config.get("library_names", [])
            else:
                raise InstanceConfigError(
                    f"Invalid format for Plex instance '{instance_name}'. Expected list or dict with 'library_names'"
                )

            instances.append(
                InstanceConfig(
                    name=instance_name,
                    type="plex",
                    url=plex_instance_config.url,
                    api_key=plex_instance_config.api,
                    libraries=library_names,
                )
            )

        return instances


class ConnectionManager:
    """Manages connections with connection pooling and retry logic"""

    def __init__(self, logger: Logger):
        self.logger = logger
        self._lock = threading.Lock()
        self._connections = {}

    @contextmanager
    def get_arr_client(self, instance_config: InstanceConfig):
        """Get ARR client with connection management"""
        cache_key = f"{instance_config.type}:{instance_config.name}"

        try:
            with self._lock:
                if cache_key not in self._connections:
                    arr_logger = self.logger.get_adapter(
                        f"{instance_config.type}:{instance_config.name}"
                    )
                    client = create_arr_client(
                        instance_config.url, instance_config.api_key, arr_logger
                    )

                    if not client or not client.is_connected():
                        raise ConnectionPoolError(
                            f"Failed to connect to {instance_config.type} instance '{instance_config.name}'"
                        )

                    self._connections[cache_key] = client

            yield self._connections[cache_key]

        except (ARRConnectionError, ARRAuthenticationError) as e:
            with self._lock:
                self._connections.pop(cache_key, None)
            raise ConnectionPoolError(f"ARR connection failed: {e}")
        except Exception as e:
            self.logger.error(f"Unexpected error with ARR client {cache_key}: {e}")
            raise

    @contextmanager
    def get_plex_client(self, instance_config: InstanceConfig):
        """Get Plex client with connection management"""
        cache_key = f"plex:{instance_config.name}"

        try:
            with self._lock:
                if cache_key not in self._connections:
                    plex_logger = self.logger.get_adapter(instance_config.name)
                    client = PlexClient(
                        instance_config.url, instance_config.api_key, plex_logger
                    )

                    if not client.is_connected():
                        raise ConnectionPoolError(
                            f"Failed to connect to Plex instance '{instance_config.name}'"
                        )

                    self._connections[cache_key] = client

            yield self._connections[cache_key]

        except Exception as e:
            with self._lock:
                self._connections.pop(cache_key, None)
            raise ConnectionPoolError(f"Plex connection failed: {e}")

    def close_all_connections(self):
        """Close all cached connections"""
        with self._lock:
            self._connections.clear()


class Connector:
    """
    Enhanced connector class for DAPS v3 with proper instance_map support
    and improved error handling.
    """

    def __init__(
        self,
        db: Optional[DapsDB] = None,
        logger: Optional[Logger] = None,
        instance_map: Optional[Dict[str, Any]] = None,
    ):
        self.db = db
        self.config = load_config()
        self.logger = logger
        self.instance_map = instance_map

        # Enhanced components
        self.connection_manager = ConnectionManager(self.logger)
        self.spinner = itertools.cycle(["-", "\\", "|", "/"])

        # Parse and validate instances using internal config
        try:
            self.parsed_instances = InstanceParser.parse_instance_map(
                self.instance_map, self.config
            )

        except InstanceConfigError as e:
            if self.logger:
                self.logger.error(f"Instance configuration error: {e}")
            raise

    def update_arr_database(self) -> List[SyncResult]:
        """Update ARR database with enhanced error handling"""
        logger = self.logger.get_adapter("arr") if self.logger else None
        arr_instances = self.parsed_instances.get("arr", [])

        if not arr_instances:
            logger.warning("No ARR instances found in instance_map")
            return []

        logger.info(f"Syncing {len(arr_instances)} ARR instances...")

        results = []
        for i, instance_config in enumerate(arr_instances, 1):
            sys.stdout.write(
                f"\rIndexing '{instance_config.name}' ({i}/{len(arr_instances)})... {next(self.spinner)}"
            )
            sys.stdout.flush()

            result = self._sync_single_arr_instance(instance_config, logger)
            results.append(result)

            if not result.success and logger:
                logger.error(
                    f"Failed to sync {instance_config.name}: {result.error_message}"
                )

            time.sleep(0.05)

        sys.stdout.write("\r" + " " * 80 + "\r")
        print(f"ARR database sync complete. ({len(results)} instances)\n")
        return results

    def _sync_single_arr_instance(
        self, instance_config: InstanceConfig, logger
    ) -> SyncResult:
        """Sync a single ARR instance with comprehensive error handling"""
        start_time = time.time()

        try:
            with self.connection_manager.get_arr_client(instance_config) as client:
                asset_type = "movie" if client.instance_type == "Radarr" else "show"

                # Get all media with built-in retry logic from improved ARR client
                raw_media = client.get_all_media()
                if not raw_media:
                    return SyncResult(
                        instance_name=instance_config.name,
                        instance_type=instance_config.type,
                        success=False,
                        error_message="No media retrieved from instance",
                        duration=time.time() - start_time,
                    )

                # Process media data - this now preserves all metadata including genres and cast
                fresh_media = self._process_arr_media(raw_media, asset_type)

                # Sync to database with enhanced metadata
                # The sync_for_instance method will automatically use upsert_with_metadata
                # when genres or cast_data are present in the media items
                try:
                    self.db.media.sync_for_instance(
                        instance_config.name,
                        client.instance_type,
                        asset_type,
                        fresh_media,
                        logger,
                    )

                    return SyncResult(
                        instance_name=instance_config.name,
                        instance_type=instance_config.type,
                        success=True,
                        items_processed=len(fresh_media),
                        duration=time.time() - start_time,
                    )

                except Exception as db_error:
                    raise DatabaseSyncError(f"Database sync failed: {db_error}")

        except ConnectionPoolError as e:
            return SyncResult(
                instance_name=instance_config.name,
                instance_type=instance_config.type,
                success=False,
                error_message=f"Connection error: {e}",
                duration=time.time() - start_time,
            )

        except DatabaseSyncError as e:
            return SyncResult(
                instance_name=instance_config.name,
                instance_type=instance_config.type,
                success=False,
                error_message=str(e),
                duration=time.time() - start_time,
            )

        except Exception as e:
            return SyncResult(
                instance_name=instance_config.name,
                instance_type=instance_config.type,
                success=False,
                error_message=f"Unexpected error: {e}",
                duration=time.time() - start_time,
            )

    def _process_arr_media(self, raw_media: List[Dict], asset_type: str) -> List[Dict]:
        """Process raw ARR media data for database, preserving all metadata including genres and cast"""
        fresh_media = []

        if asset_type == "show":
            # Create entries for main show and each season, preserving all metadata
            for show in raw_media:
                # Main show entry - preserve all metadata fields
                show_row = dict(show)
                show_row["season_number"] = None
                fresh_media.append(show_row)

                # Season entries - inherit metadata from parent show
                for season in show.get("seasons", []):
                    season_row = dict(show)  # Copy all parent show metadata
                    season_row["season_number"] = season.get("season_number")
                    # Preserve genres and cast_data from parent show for each season
                    if "genres" in show:
                        season_row["genres"] = show["genres"]
                    if "cast_data" in show:
                        season_row["cast_data"] = show["cast_data"]
                    fresh_media.append(season_row)
        else:
            # For movies, data is already properly formatted
            fresh_media = raw_media

        return fresh_media

    def update_plex_database(self) -> List[SyncResult]:
        """Update Plex database with enhanced error handling"""
        logger = self.logger.get_adapter("plex") if self.logger else None
        plex_instances = self.parsed_instances.get("plex", [])
        if not plex_instances:
            logger.warning("No Plex instances found in instance_map")
            return []

        results = []
        for i, instance_config in enumerate(plex_instances, 1):
            sys.stdout.write(
                f"\rIndexing Plex '{instance_config.name}' ({i}/{len(plex_instances)})... {next(self.spinner)}"
            )
            sys.stdout.flush()

            result = self._sync_single_plex_instance(instance_config, logger)
            results.append(result)

            if not result.success and logger:
                logger.error(
                    f"Failed to sync {instance_config.name}: {result.error_message}"
                )

            time.sleep(0.05)

        sys.stdout.write("\r" + " " * 80 + "\r")
        print(f"Plex database sync complete. ({len(results)} instances)\n")
        return results

    def _sync_single_plex_instance(
        self, instance_config: InstanceConfig, logger
    ) -> SyncResult:
        """Sync a single Plex instance"""
        start_time = time.time()
        total_items = 0

        try:
            with self.connection_manager.get_plex_client(instance_config) as client:
                # Get available libraries
                try:
                    all_libraries = client.get_libraries()
                except Exception as e:
                    raise ConnectionPoolError(f"Failed to fetch libraries: {e}")

                # Determine target libraries
                target_libraries = self._determine_target_libraries(
                    all_libraries, instance_config.libraries
                )

                if not target_libraries:
                    return SyncResult(
                        instance_name=instance_config.name,
                        instance_type=instance_config.type,
                        success=False,
                        error_message="No valid libraries found",
                        duration=time.time() - start_time,
                    )

                # Sync each library
                for library_name in target_libraries:
                    try:
                        fresh_media = client.get_all_plex_media(
                            library_name=library_name,
                            logger=logger,
                            instance_name=instance_config.name,
                        )

                        if fresh_media:
                            self.db.plex.sync_for_library(
                                instance_name=instance_config.name,
                                library_name=library_name,
                                fresh_media=fresh_media,
                                logger=logger,
                            )
                            total_items += len(fresh_media)

                    except Exception as e:
                        logger.warning(f"Failed to sync library '{library_name}': {e}")

                return SyncResult(
                    instance_name=instance_config.name,
                    instance_type=instance_config.type,
                    success=True,
                    items_processed=total_items,
                    duration=time.time() - start_time,
                )

        except ConnectionPoolError as e:
            return SyncResult(
                instance_name=instance_config.name,
                instance_type=instance_config.type,
                success=False,
                error_message=str(e),
                duration=time.time() - start_time,
            )

        except Exception as e:
            return SyncResult(
                instance_name=instance_config.name,
                instance_type=instance_config.type,
                success=False,
                error_message=f"Unexpected error: {e}",
                duration=time.time() - start_time,
            )

    def update_collections_database(self) -> List[SyncResult]:
        """Update Plex collections database"""
        logger = self.logger.get_adapter("plex") if self.logger else None
        plex_instances = self.parsed_instances.get("plex", [])
        if not plex_instances:
            logger.warning("No Plex instances found for collections sync")
            return []

        results = []
        for i, instance_config in enumerate(plex_instances, 1):
            sys.stdout.write(
                f"\rIndexing collections '{instance_config.name}' ({i}/{len(plex_instances)})... {next(self.spinner)}"
            )
            sys.stdout.flush()

            result = self._sync_single_plex_collections(instance_config, logger)
            results.append(result)

            if not result.success and logger:
                logger.error(
                    f"Failed to sync collections for {instance_config.name}: {result.error_message}"
                )

        sys.stdout.write("\r" + " " * 80 + "\r")
        print(f"Collections sync complete. ({len(results)} instances)\n")
        return results

    def _sync_single_plex_collections(
        self, instance_config: InstanceConfig, logger
    ) -> SyncResult:
        """Sync collections for a single Plex instance"""
        start_time = time.time()
        total_collections = 0

        try:
            with self.connection_manager.get_plex_client(instance_config) as client:
                all_libraries = client.get_libraries()
                target_libraries = self._determine_target_libraries(
                    all_libraries, instance_config.libraries
                )

                for library_name in target_libraries:
                    try:
                        collections = client.get_collections(
                            library_name, include_smart=True
                        )

                        if collections:
                            self.db.collection.sync_collections_cache(
                                instance_config.name, library_name, collections, logger
                            )
                            total_collections += len(collections)

                    except Exception as e:
                        logger.warning(
                            f"Failed to sync collections for library '{library_name}': {e}"
                        )

                return SyncResult(
                    instance_name=instance_config.name,
                    instance_type="plex_collections",
                    success=True,
                    items_processed=total_collections,
                    duration=time.time() - start_time,
                )

        except Exception as e:
            return SyncResult(
                instance_name=instance_config.name,
                instance_type="plex_collections",
                success=False,
                error_message=str(e),
                duration=time.time() - start_time,
            )

    def _determine_target_libraries(
        self, all_libraries: List[str], selected_libraries: Optional[List[str]]
    ) -> List[str]:
        """Determine which libraries to process"""
        if not selected_libraries:
            return all_libraries

        # Normalize for comparison
        def normalize(name: str) -> str:
            return name.strip().lower() if isinstance(name, str) else ""

        normalized_selected = {normalize(lib) for lib in selected_libraries}
        return [lib for lib in all_libraries if normalize(lib) in normalized_selected]

    def update_media_plex_mappings(self) -> Dict[str, int]:
        """
        Update plex_mapping_id in media_cache table using labelarr.py matching logic.
        This creates pre-computed mappings between ARR media and Plex items for faster access.

        Returns:
            Dict with mapping statistics: {'updated': count, 'no_match': count}
        """
        if self.logger:
            self.logger.info("Starting media-to-plex mapping update...")

        stats = {"updated": 0, "no_match": 0}

        try:
            # Import normalization function from labelarr logic

            # Get all plex media cache entries for validation
            plex_items = self.db.plex.get_all()
            valid_plex_ids = (
                {item.get("id") for item in plex_items} if plex_items else set()
            )

            # Get all media cache entries that need mapping (NULL or invalid plex_mapping_id)
            media_items = [
                item
                for item in self.db.media.get_all()
                if item.get("plex_mapping_id") is None
                or item.get("plex_mapping_id") not in valid_plex_ids
            ]

            if not media_items:
                if self.logger:
                    self.logger.info("No media items need plex mapping")
                return stats

            if self.logger and plex_items:
                self.logger.debug(f"First plex_item keys: {list(plex_items[0].keys())}")

            if not plex_items:
                if self.logger:
                    self.logger.warning("No plex items found for mapping")
                return stats

            # Process each media item for mapping using direct database-to-database matching
            for media_item in media_items:
                plex_mapping_id = self._find_plex_match(media_item, plex_items)

                if plex_mapping_id:
                    # Update the media_cache record with the mapping
                    self.db.media.execute_query(
                        "UPDATE media_cache SET plex_mapping_id = ? WHERE id = ?",
                        (plex_mapping_id, media_item["id"]),
                    )
                    stats["updated"] += 1
                else:
                    stats["no_match"] += 1

            if self.logger:
                self.logger.info(
                    f"Plex mapping complete: {stats['updated']} mapped, {stats['no_match']} no match"
                )

        except Exception as e:
            if self.logger:
                self.logger.error(f"Error updating plex mappings: {e}")
            raise ConnectorError(f"Plex mapping update failed: {e}")

        return stats

    def _find_plex_match(self, media_item, plex_items):
        """Simple direct table-to-table matching: media_cache → plex_media_cache"""
        from util.normalization import normalize_titles

        # Extract media item data
        media_tmdb = self._get_clean_id(media_item.get("tmdb_id"))
        media_tvdb = self._get_clean_id(media_item.get("tvdb_id"))
        media_imdb = self._get_clean_id(media_item.get("imdb_id"))
        media_season = media_item.get("season_number")
        media_title = normalize_titles(media_item.get("title"))
        media_year = str(media_item.get("year") or "")

        # Simple direct comparison - match ALL criteria
        for plex_item in plex_items:
            # Parse plex item data
            guids = self._parse_plex_guids(plex_item.get("guids", ""))
            plex_tmdb = self._get_clean_id(guids.get("tmdb"))
            plex_tvdb = self._get_clean_id(guids.get("tvdb"))
            plex_imdb = self._get_clean_id(guids.get("imdb"))
            plex_season = plex_item.get("season_number")
            plex_title = normalize_titles(plex_item.get("title"))
            plex_year = str(plex_item.get("year") or "")

            # Match: title + year + season + IDs
            title_match = media_title == plex_title
            year_match = media_year == plex_year

            # Special handling for Season 0 - can match either NULL or 0
            if media_season == 0:
                season_match = plex_season is None or plex_season == 0
            else:
                season_match = media_season == plex_season

            # ID matches (any one ID match is sufficient, but all must match if present)
            id_match = False
            if media_tmdb and plex_tmdb and media_tmdb == plex_tmdb:
                id_match = True
            elif media_tvdb and plex_tvdb and media_tvdb == plex_tvdb:
                id_match = True
            elif media_imdb and plex_imdb and media_imdb == plex_imdb:
                id_match = True

            # Match if: (title+year+season) OR (ID+season)
            if season_match and (id_match or (title_match and year_match)):
                if self.logger:
                    match_type = "ID" if id_match else "title+year"
                    rowid = self._get_plex_rowid(plex_item)
                    self.logger.debug(
                        f"✓ Direct match found for '{media_item.get('title')}' season {media_season} using {match_type}, rowid={rowid}"
                    )
                return self._get_plex_rowid(plex_item)

        if self.logger:
            self.logger.warning(
                f"✗ No direct match found for '{media_item.get('title')}' season {media_season}"
            )
        return None

    def _get_plex_rowid(self, plex_item):
        """Get the database ID for a plex item"""
        return plex_item.get("id")

    def _parse_plex_guids(self, guids_str):
        """Parse Plex GUID string into structured data (from labelarr.py logic)"""
        import json

        guids = {}
        if not guids_str:
            return guids

        try:
            parsed = json.loads(guids_str)

            # Handle different possible formats
            guid_array = []
            if isinstance(parsed, list):
                guid_array = parsed
            elif isinstance(parsed, str):
                guid_array = [parsed]
            elif parsed and isinstance(parsed, dict):
                guid_array = list(parsed.values())

            for guid in guid_array:
                if isinstance(guid, str):
                    if "themoviedb://" in guid:
                        guids["tmdb"] = guid.replace(
                            "com.plexapp.agents.themoviedb://", ""
                        ).split("?")[0]
                    elif "thetvdb://" in guid:
                        guids["tvdb"] = guid.replace(
                            "com.plexapp.agents.thetvdb://", ""
                        ).split("?")[0]
                    elif "imdb://" in guid:
                        guids["imdb"] = guid.replace(
                            "com.plexapp.agents.imdb://", ""
                        ).split("?")[0]

        except Exception:
            pass  # Return empty dict on parse error

        return guids

    def _get_clean_id(self, val):
        """Normalize IDs into comparable strings or None (from labelarr.py logic)"""
        return str(val).strip() if val not in (None, "null", "", "None") else None

    def sync_all_databases(self) -> Dict[str, List[SyncResult]]:
        """Sync all databases and return results"""
        if self.logger:
            self.logger.info("Starting comprehensive database sync...")

        results = {}

        try:
            results["arr"] = self.update_arr_database()
            results["plex"] = self.update_plex_database()
            results["collections"] = self.update_collections_database()

            # Update plex mappings after both ARR and Plex data are synced
            try:
                mapping_stats = self.update_media_plex_mappings()
                results["mappings"] = mapping_stats
            except Exception as e:
                if self.logger:
                    self.logger.warning(f"Plex mapping update failed: {e}")
                results["mappings"] = {"error": str(e)}

            if self.logger:
                # Only count sync results, not mapping results which is a dict
                sync_result_keys = ["arr", "plex", "collections"]
                total_successful = sum(
                    len([r for r in results.get(key, []) if r.success])
                    for key in sync_result_keys
                )
                total_attempted = sum(
                    len(results.get(key, [])) for key in sync_result_keys
                )

                self.logger.info(
                    f"Database sync complete: {total_successful}/{total_attempted} instances successful"
                )

        except Exception as e:
            if self.logger:
                self.logger.error(f"Error during comprehensive sync: {e}")
            raise ConnectorError(f"Comprehensive sync failed: {e}")
        finally:
            self.connection_manager.close_all_connections()

        return results

    def __enter__(self):
        """Context manager entry"""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - clean up connections"""
        self.connection_manager.close_all_connections()
