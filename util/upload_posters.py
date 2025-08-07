import hashlib
import json
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Any, Dict, Generator, List, Optional, Tuple

from util.config import load_config
from util.connector import Connector
from util.database import DapsDB
from util.helper import progress
from util.logger import Logger
from util.normalization import normalize_titles
from util.plex import PlexClient


class PosterUploadError(Exception):
    """Base exception for poster upload operations"""

    pass


class PlexConnectionError(PosterUploadError):
    """Raised when Plex connection fails"""

    pass


class AssetProcessingError(PosterUploadError):
    """Raised when asset processing fails"""

    pass


class FileOperationError(PosterUploadError):
    """Raised when file operations fail"""

    pass


@dataclass
class UploadResult:
    """Result of a single upload operation"""

    asset_title: str
    asset_type: str
    success: bool
    action: str  # 'updated', 'skipped', 'failed'
    reason: str
    library_name: Optional[str] = None
    match_type: Optional[str] = None


@dataclass
class InstanceResult:
    """Result for a single Plex instance"""

    instance_name: str
    enabled: bool
    connected: bool
    uploads: List[UploadResult]
    error_message: Optional[str] = None


class PosterUploader:
    """Enhanced poster uploader with improved error handling and logging"""

    def __init__(
        self,
        logger: Optional[Logger] = None,
        manifest: Optional[Dict] = None,
        force: bool = False,
    ):
        self.full_config = load_config()
        self.config = self.full_config.poster_renamerr
        self.db = DapsDB()
        self.logger = logger or Logger(self.config.log_level, "poster_uploader")
        self.logger = self.logger.get_adapter("poster_uploader")
        self.manifest = manifest or {}
        self.force = force

        # Cache for connections and indexes
        self._plex_clients = {}
        self._media_indexes = {}

    def run(self) -> Dict[str, Any]:
        """
        Main entry point for poster uploading with improved error handling.

        Returns:
            Dict with comprehensive results and minimal verbose logging
        """
        try:
            # Parse instance configuration
            enabled_instances = self._get_enabled_instances()

            if not enabled_instances:
                self.logger.debug("No Plex instances enabled for poster upload")
                return self._create_result(
                    success=False,
                    message="No Plex instances enabled for poster upload",
                    error_code="NO_ENABLED_INSTANCES",
                )

            # Update Plex database once for all instances
            self._update_plex_database(enabled_instances)

            # Process each enabled instance
            instance_results = []
            for instance_name, library_names in enabled_instances.items():
                result = self._process_instance(instance_name, library_names)
                instance_results.append(result)

            # Generate final result
            return self._compile_final_result(instance_results)

        except Exception as e:
            self.logger.error(f"Poster upload failed: {e}", exc_info=True)
            return self._create_result(
                success=False,
                message=f"Poster upload failed: {e}",
                error_code="UPLOAD_EXCEPTION",
            )
        finally:
            self._cleanup_connections()

    def _get_enabled_instances(self) -> Dict[str, List[str]]:
        """Get enabled Plex instances with their library names"""
        enabled_instances = {}
        disabled_instances = []

        for instance_config in self.config.instances:
            if isinstance(instance_config, dict):
                for instance_name, instance_data in instance_config.items():
                    if (
                        hasattr(instance_data, "add_posters")
                        and instance_data.add_posters
                    ):
                        library_names = getattr(instance_data, "library_names", [])
                        enabled_instances[instance_name] = library_names
                    else:
                        disabled_instances.append(instance_name)

        # Log disabled instances once, concisely
        if disabled_instances:
            self.logger.debug(f"Disabled instances: {', '.join(disabled_instances)}")

        return enabled_instances

    def _update_plex_database(self, enabled_instances: Dict[str, List[str]]):
        """Update Plex database for enabled instances"""
        instance_map = {
            "plex": {name: libraries for name, libraries in enabled_instances.items()}
        }

        try:
            connector = Connector(
                db=self.db, logger=self.logger, instance_map=instance_map
            )
            connector.update_plex_database()
        except Exception as e:
            raise PosterUploadError(f"Failed to update Plex database: {e}")

    def _process_instance(
        self, instance_name: str, library_names: List[str]
    ) -> InstanceResult:
        """Process a single Plex instance"""
        try:
            # Get Plex configuration
            plex_config = self.full_config.instances.plex.get(instance_name)
            if not plex_config:
                return InstanceResult(
                    instance_name=instance_name,
                    enabled=True,
                    connected=False,
                    uploads=[],
                    error_message=f"Configuration not found for instance '{instance_name}'",
                )

            # Connect to Plex
            with self._get_plex_client(
                instance_name, plex_config.url, plex_config.api
            ) as plex_client:
                if not plex_client.is_connected():
                    return InstanceResult(
                        instance_name=instance_name,
                        enabled=True,
                        connected=False,
                        uploads=[],
                        error_message=f"Failed to connect to Plex instance '{instance_name}'",
                    )

                # Build media indexes
                indexes = self._get_media_indexes(instance_name)
                if not indexes:
                    return InstanceResult(
                        instance_name=instance_name,
                        enabled=True,
                        connected=True,
                        uploads=[],
                        error_message=f"No media cache found for instance '{instance_name}'",
                    )

                # Process assets
                assets = self._get_assets_from_manifest()
                upload_results = self._sync_all_assets(
                    assets, plex_client, indexes, self.config.dry_run
                )

                return InstanceResult(
                    instance_name=instance_name,
                    enabled=True,
                    connected=True,
                    uploads=upload_results,
                )

        except Exception as e:
            self.logger.error(f"Error processing instance '{instance_name}': {e}")
            return InstanceResult(
                instance_name=instance_name,
                enabled=True,
                connected=False,
                uploads=[],
                error_message=str(e),
            )

    @contextmanager
    def _get_plex_client(
        self, instance_name: str, url: str, api: str
    ) -> Generator[PlexClient, None, None]:
        """Get or create Plex client with connection caching"""
        if instance_name not in self._plex_clients:
            client = PlexClient(url, api, self.logger)
            if not client.is_connected():
                raise PlexConnectionError(
                    f"Failed to connect to Plex instance '{instance_name}'"
                )
            self._plex_clients[instance_name] = client

        yield self._plex_clients[instance_name]

    def _get_media_indexes(
        self, instance_name: str
    ) -> Optional[Tuple[Dict, Dict, Dict, Dict]]:
        """Get or build media indexes for an instance"""
        if instance_name in self._media_indexes:
            return self._media_indexes[instance_name]

        plex_media_cache = self.db.plex.get_by_instance(instance_name)
        if not plex_media_cache:
            return None

        indexes = self._build_indexes(plex_media_cache)
        self._media_indexes[instance_name] = indexes
        return indexes

    def _get_assets_from_manifest(self) -> List[Dict]:
        """Get assets from manifest with error handling"""
        assets = []

        # Process media assets
        for asset_id in self.manifest.get("media_cache", []):
            try:
                asset = self.db.media.get_by_id(asset_id)
                if asset:
                    assets.append(asset)
                else:
                    self.logger.warning(f"Media asset ID {asset_id} not found")
            except Exception as e:
                self.logger.error(f"Error retrieving media asset {asset_id}: {e}")

        # Process collection assets
        for asset_id in self.manifest.get("collections_cache", []):
            try:
                asset = self.db.collection.get_by_id(asset_id)
                if asset:
                    assets.append(asset)
                else:
                    self.logger.warning(f"Collection asset ID {asset_id} not found")
            except Exception as e:
                self.logger.error(f"Error retrieving collection asset {asset_id}: {e}")

        return assets

    def _sync_all_assets(
        self,
        assets: List[Dict],
        plex_client: PlexClient,
        indexes: Tuple[Dict, Dict, Dict, Dict],
        dry_run: bool,
    ) -> List[UploadResult]:
        """Sync all assets with consolidated progress reporting"""
        movie_index, show_index, season_index, collection_index = indexes
        all_results = []

        # Group assets by type for efficient processing
        movies = [
            a
            for a in assets
            if a.get("asset_type") == "movie" and a.get("matched") == 1
        ]
        series = [
            a
            for a in assets
            if a.get("asset_type") == "show"
            and a.get("matched") == 1
            and not a.get("season_number")
        ]
        seasons = [
            a
            for a in assets
            if a.get("asset_type") == "show"
            and a.get("matched") == 1
            and a.get("season_number")
        ]
        collections = [
            a
            for a in assets
            if a.get("asset_type") == "collection" and a.get("matched") == 1
        ]

        # Process each type with progress bars
        if movies:
            all_results.extend(
                self._sync_movies(movies, plex_client, movie_index, dry_run)
            )

        if series:
            all_results.extend(
                self._sync_series(series, plex_client, show_index, dry_run)
            )

        if seasons:
            all_results.extend(
                self._sync_seasons(seasons, plex_client, season_index, dry_run)
            )

        if collections:
            all_results.extend(
                self._sync_collections(
                    collections, plex_client, collection_index, dry_run
                )
            )

        return all_results

    def _sync_movies(
        self,
        movies: List[Dict],
        plex_client: PlexClient,
        movie_index: Dict,
        dry_run: bool,
    ) -> List[UploadResult]:
        """Sync movie posters"""
        results = []

        with progress(
            movies,
            desc="Syncing movie posters",
            total=len(movies),
            unit="movie",
            logger=self.logger,
        ) as bar:
            for movie in bar:
                try:
                    result = self._sync_single_asset(
                        asset=movie,
                        plex_client=plex_client,
                        index=movie_index,
                        priority_keys=["tmdb", "imdb", "title"],
                        dry_run=dry_run,
                    )
                    results.append(result)
                except Exception as e:
                    self.logger.error(
                        f"Error syncing movie '{movie.get('title')}': {e}"
                    )
                    results.append(
                        UploadResult(
                            asset_title=movie.get("title", "Unknown"),
                            asset_type="movie",
                            success=False,
                            action="failed",
                            reason=f"Processing error: {e}",
                        )
                    )

        return results

    def _sync_series(
        self,
        series: List[Dict],
        plex_client: PlexClient,
        show_index: Dict,
        dry_run: bool,
    ) -> List[UploadResult]:
        """Sync TV series posters"""
        results = []

        with progress(
            series,
            desc="Syncing series posters",
            total=len(series),
            unit="series",
            logger=self.logger,
        ) as bar:
            for show in bar:
                try:
                    result = self._sync_single_asset(
                        asset=show,
                        plex_client=plex_client,
                        index=show_index,
                        priority_keys=["tvdb", "tmdb", "imdb", "title"],
                        dry_run=dry_run,
                    )
                    results.append(result)
                except Exception as e:
                    self.logger.error(
                        f"Error syncing series '{show.get('title')}': {e}"
                    )
                    results.append(
                        UploadResult(
                            asset_title=show.get("title", "Unknown"),
                            asset_type="series",
                            success=False,
                            action="failed",
                            reason=f"Processing error: {e}",
                        )
                    )

        return results

    def _sync_seasons(
        self,
        seasons: List[Dict],
        plex_client: PlexClient,
        season_index: Dict,
        dry_run: bool,
    ) -> List[UploadResult]:
        """Sync season posters"""
        results = []

        with progress(
            seasons,
            desc="Syncing season posters",
            total=len(seasons),
            unit="season",
            logger=self.logger,
        ) as bar:
            for season in bar:
                try:
                    # Modify search key for season matching
                    season_num = season.get("season_number")
                    norm_title = normalize_titles(season.get("title", ""))

                    result = self._sync_single_asset(
                        asset=season,
                        plex_client=plex_client,
                        index=season_index,
                        priority_keys=["tvdb", "tmdb", "imdb", "title"],
                        dry_run=dry_run,
                        season_number=season_num,
                        title_override=f"{norm_title}:S{season_num}",
                    )
                    results.append(result)
                except Exception as e:
                    season_num = season.get("season_number", "?")
                    self.logger.error(
                        f"Error syncing season {season_num} of '{season.get('title')}': {e}"
                    )
                    results.append(
                        UploadResult(
                            asset_title=f"{season.get('title', 'Unknown')} S{season_num}",
                            asset_type="season",
                            success=False,
                            action="failed",
                            reason=f"Processing error: {e}",
                        )
                    )

        return results

    def _sync_collections(
        self,
        collections: List[Dict],
        plex_client: PlexClient,
        collection_index: Dict,
        dry_run: bool,
    ) -> List[UploadResult]:
        """Sync collection posters"""
        results = []

        with progress(
            collections,
            desc="Syncing collection posters",
            total=len(collections),
            unit="collection",
            logger=self.logger,
        ) as bar:
            for collection in bar:
                try:
                    result = self._sync_single_asset(
                        asset=collection,
                        plex_client=plex_client,
                        index=collection_index,
                        priority_keys=["title"],
                        dry_run=dry_run,
                        is_collection=True,
                    )
                    results.append(result)
                except Exception as e:
                    self.logger.error(
                        f"Error syncing collection '{collection.get('title')}': {e}"
                    )
                    results.append(
                        UploadResult(
                            asset_title=collection.get("title", "Unknown"),
                            asset_type="collection",
                            success=False,
                            action="failed",
                            reason=f"Processing error: {e}",
                        )
                    )

        return results

    def _sync_single_asset(
        self,
        asset: Dict,
        plex_client: PlexClient,
        index: Dict,
        priority_keys: List[str],
        dry_run: bool,
        season_number: Optional[int] = None,
        title_override: Optional[str] = None,
        is_collection: bool = False,
    ) -> UploadResult:
        """Sync a single asset with comprehensive error handling"""

        asset_title = asset.get("title", "Unknown")
        asset_type = asset.get("asset_type", "unknown")
        poster_path = asset.get("renamed_file")

        try:
            # Find matching Plex entry
            search_values = {
                "tmdb": str(asset.get("tmdb_id")) if asset.get("tmdb_id") else None,
                "imdb": asset.get("imdb_id"),
                "tvdb": str(asset.get("tvdb_id")) if asset.get("tvdb_id") else None,
                "title": title_override or normalize_titles(asset_title),
            }

            matched_entry, match_type = self.match_asset(
                index, priority_keys, search_values
            )

            if not matched_entry:
                return UploadResult(
                    asset_title=asset_title,
                    asset_type=asset_type,
                    success=False,
                    action="failed",
                    reason="No matching Plex entry found",
                )

            # Check if file hash has changed
            record_hash = asset.get("file_hash")
            current_file_hash = self._compute_file_hash(poster_path, dry_run)

            if not current_file_hash:
                return UploadResult(
                    asset_title=asset_title,
                    asset_type=asset_type,
                    success=False,
                    action="failed",
                    reason="Could not read poster file",
                )

            if current_file_hash == record_hash and not self.force:
                return UploadResult(
                    asset_title=asset_title,
                    asset_type=asset_type,
                    success=True,
                    action="skipped",
                    reason="File unchanged",
                    library_name=matched_entry.get("library_name"),
                    match_type=match_type,
                )

            # Upload poster
            upload_success = plex_client.upload_poster(
                library_name=matched_entry["library_name"],
                item_title=matched_entry["title"],
                poster_path=poster_path,
                year=matched_entry.get("year"),
                is_collection=is_collection,
                season_number=season_number,
                dry_run=dry_run,
            )

            if upload_success:
                # Remove overlay label if present
                if self._has_overlay(matched_entry):
                    plex_client.remove_label(matched_entry, "Overlay", dry_run)

                # Update database
                self._update_asset_database(asset, current_file_hash)

                return UploadResult(
                    asset_title=asset_title,
                    asset_type=asset_type,
                    success=True,
                    action="updated",
                    reason="Successfully uploaded",
                    library_name=matched_entry.get("library_name"),
                    match_type=match_type,
                )
            else:
                return UploadResult(
                    asset_title=asset_title,
                    asset_type=asset_type,
                    success=False,
                    action="failed",
                    reason="Upload to Plex failed",
                    library_name=matched_entry.get("library_name"),
                    match_type=match_type,
                )

        except Exception as e:
            self.logger.error(f"Error processing asset '{asset_title}': {e}")
            return UploadResult(
                asset_title=asset_title,
                asset_type=asset_type,
                success=False,
                action="failed",
                reason=f"Processing error: {e}",
            )

    def _update_asset_database(self, asset: Dict, file_hash: str):
        """Update asset in database with new hash"""
        try:
            if asset.get("asset_type") == "collection":
                self.db.collection.update(
                    title=asset.get("title"),
                    year=asset.get("year"),
                    library_name=asset.get("library_name"),
                    instance_name=asset.get("instance_name"),
                    matched_value=None,
                    original_file=None,
                    renamed_file=None,
                    file_hash=file_hash,
                )
            else:
                self.db.media.update(
                    asset_type=asset.get("asset_type"),
                    title=asset.get("title"),
                    year=asset.get("year"),
                    instance_name=asset.get("instance_name"),
                    matched_value=None,
                    season_number=asset.get("season_number"),
                    original_file=None,
                    renamed_file=None,
                    file_hash=file_hash,
                )
        except Exception as e:
            self.logger.error(
                f"Failed to update database for asset '{asset.get('title')}': {e}"
            )

    def _compile_final_result(
        self, instance_results: List[InstanceResult]
    ) -> Dict[str, Any]:
        """Compile final result with clean summary logging"""
        total_updated = 0
        total_skipped = 0
        total_failed = 0
        successful_instances = 0

        for instance_result in instance_results:
            if instance_result.connected and not instance_result.error_message:
                successful_instances += 1

                updated = len(
                    [r for r in instance_result.uploads if r.action == "updated"]
                )
                skipped = len(
                    [r for r in instance_result.uploads if r.action == "skipped"]
                )
                failed = len(
                    [r for r in instance_result.uploads if r.action == "failed"]
                )

                total_updated += updated
                total_skipped += skipped
                total_failed += failed

                # Log instance summary concisely
                self.logger.info(
                    f"{instance_result.instance_name}: {updated} updated, {skipped} skipped, {failed} failed"
                )

        # Log overall summary
        self.logger.info(
            f"Upload summary: {total_updated} updated, {total_skipped} skipped, {total_failed} failed"
        )

        # Log detailed failures only if there are failures
        if total_failed > 0:
            failed_details = []
            for instance_result in instance_results:
                for upload in instance_result.uploads:
                    if upload.action == "failed":
                        failed_details.append(f"{upload.asset_title}: {upload.reason}")
            if failed_details:
                self.logger.warning(
                    "Failed uploads:\n"
                    + "\n".join(f"  • {detail}" for detail in failed_details)
                )

        # Determine overall success
        overall_success = total_failed == 0 and successful_instances > 0

        return self._create_result(
            success=overall_success,
            message=f"Upload complete: {total_updated} updated, {total_skipped} skipped, {total_failed} failed",
            error_code=None if overall_success else "UPLOAD_FAILURES",
            payload={
                "updated": total_updated,
                "skipped": total_skipped,
                "failed": total_failed,
                "instances_processed": successful_instances,
                "instance_results": [
                    {
                        "instance": r.instance_name,
                        "enabled": r.enabled,
                        "connected": r.connected,
                        "uploads": len(r.uploads),
                        "error": r.error_message,
                    }
                    for r in instance_results
                ],
            },
        )

    def _create_result(
        self,
        success: bool,
        message: str,
        error_code: Optional[str],
        payload: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """Create standardized result dictionary"""
        return {
            "success": success,
            "message": message,
            "error_code": error_code,
            "payload": {"manifest": self.manifest, **(payload or {})},
        }

    def _cleanup_connections(self):
        """Clean up cached connections"""
        self._plex_clients.clear()
        self._media_indexes.clear()

    # Static/utility methods (keeping existing implementations but with improvements)
    @staticmethod
    def _build_indexes(media_cache: List[Dict]) -> Tuple[Dict, Dict, Dict, Dict]:
        """Build indexes for fast asset lookups - same as original but with error handling"""
        movie_index, show_index, season_index, collection_index = {}, {}, {}, {}

        for entry in media_cache:
            try:
                typ = entry.get("asset_type")
                norm_title = entry.get("normalized_title")
                guids = entry.get("guids", {})

                # Handle JSON-encoded guids
                if isinstance(guids, str):
                    try:
                        guids = json.loads(guids)
                    except (json.JSONDecodeError, TypeError):
                        guids = {}

                if typ == "movie":
                    if norm_title:
                        movie_index[f"title:{norm_title}"] = entry
                    if guids.get("tmdb"):
                        movie_index[f"tmdb:{guids['tmdb']}"] = entry
                    if guids.get("imdb"):
                        movie_index[f"imdb:{guids['imdb']}"] = entry

                elif typ in ("show", "tvshow"):
                    season_num = entry.get("season_number")
                    if season_num in (None, "null"):
                        # Series main entry
                        if norm_title:
                            show_index[f"title:{norm_title}"] = entry
                        for guid_type in ["tmdb", "imdb", "tvdb"]:
                            if guids.get(guid_type):
                                show_index[f"{guid_type}:{guids[guid_type]}"] = entry
                    else:
                        # Season entry
                        if norm_title:
                            season_index[f"title:{norm_title}:S{season_num}"] = entry
                        for guid_type in ["tmdb", "imdb", "tvdb"]:
                            if guids.get(guid_type):
                                season_index[
                                    f"{guid_type}:{guids[guid_type]}:S{season_num}"
                                ] = entry

                elif typ == "collection":
                    if norm_title:
                        collection_index[f"title:{norm_title}"] = entry

            except Exception:
                # Log and continue with other entries
                continue

        return movie_index, show_index, season_index, collection_index

    @staticmethod
    def match_asset(
        index: Dict, priority_keys: List[str], values: Dict
    ) -> Tuple[Optional[Dict], Optional[str]]:
        """Match asset using index with priority keys"""
        for key in priority_keys:
            value = values.get(key)
            if value and f"{key}:{value}" in index:
                return index[f"{key}:{value}"], key.upper()
        return None, None

    @staticmethod
    def _compute_file_hash(poster_path: str, dry_run: bool = False) -> Optional[str]:
        """Compute file hash with proper error handling"""
        if dry_run:
            return "dry_run_hash"

        try:
            with open(poster_path, "rb") as f:
                return hashlib.sha256(f.read()).hexdigest()
        except (FileNotFoundError, PermissionError, OSError):
            return None

    @staticmethod
    def _has_overlay(item: Dict) -> bool:
        """Check if item has overlay label"""
        return "Overlay" in item.get("labels", [])
