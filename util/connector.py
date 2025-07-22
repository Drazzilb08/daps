import sys

from util.arr import create_arr_client
from util.config import Config
from util.database import DapsDB
from util.plex import PlexClient


def update_client_databases(
    db: DapsDB, config, logger, max_age_hours=6, force_reindex=False
):
    """
    Update all ARR instances listed in instances_config, only reindexing if cache is missing or stale.
    """
    logger.info("Updating ARR (Radarr/Sonarr) databases...")
    all_instances = []
    for instance_type, instance_dict in config.instances_config.items():
        for instance_name, info in instance_dict.items():
            all_instances.append((instance_type, instance_name, info))

    if not all_instances:
        logger.error("No instances found in instances_config. Exiting module...")
        sys.exit(1)

    for instance_type, instance_name, info in all_instances:
        url = info.get("url")
        api = info.get("api")
        if not url or not api:
            logger.warning(
                f"[{instance_type}] Instance '{instance_name}' missing URL or API key. Skipping."
            )
            continue

        if instance_type in ["radarr", "sonarr"]:
            app = create_arr_client(url, api, logger)
            if app is None or not app.is_connected():
                logger.error(
                    f"[{instance_type}] Connection failed for '{instance_name}'. Skipping."
                )
                continue

            asset_type = "movie" if app.instance_type == "Radarr" else "show"
            if not force_reindex:
                cache = db.media.get_for_instance(
                    instance_name, asset_type, max_age_hours=max_age_hours
                )
                if cache:
                    logger.debug(
                        f"[{instance_type}] Instance '{instance_name}' is fresh. Skipping reindex."
                    )
                    continue

            logger.info(f"Indexing '{instance_name}'...")
            fresh_media = app.get_all_media()
            db.media.sync_for_instance(
                instance_name, app.instance_type, asset_type, fresh_media, logger
            )


def update_plex_database(
    db: DapsDB, config: Config, logger, max_age_hours=6, force_reindex=False
):
    """
    Only reindex libraries for Plex instances if their cache is missing or stale.
    Syncs the database after each library is indexed.
    """
    logger.info("Updating Plex library databases...")
    plex_instances = config.instances_config.get("plex", {})
    if not plex_instances:
        logger.error("No Plex instances found in config.")
        return

    for instance_name, info in plex_instances.items():
        url = info.get("url")
        api = info.get("api")
        if not url or not api:
            logger.warning(
                f"[plex] Instance '{instance_name}' missing URL or API key. Skipping."
            )
            continue

        plex_client = PlexClient(url, api, logger)
        if not plex_client.is_connected():
            logger.error(f"[plex] Connection failed for '{instance_name}'. Skipping.")
            continue

        try:
            libraries = [
                section.title for section in plex_client.plex.library.sections()
            ]
        except Exception as e:
            logger.error(f"[plex] Failed to fetch libraries for '{instance_name}': {e}")
            continue

        for library_name in libraries:
            if not force_reindex:
                cache = db.plex.get_for_library(
                    instance_name, library_name, max_age_hours=max_age_hours
                )
                if cache:
                    logger.debug(
                        f"[plex] Library '{library_name}' for '{instance_name}' is fresh. Skipping reindex."
                    )
                    continue

            logger.info(f"Indexing library '{library_name}' for '{instance_name}'...")
            try:
                fresh_media = plex_client.get_all_plex_media(
                    db=db,
                    library_name=library_name,
                    logger=logger,
                    instance_name=instance_name,
                )
                db.plex.sync_for_library(
                    instance_name=instance_name,
                    library_name=library_name,
                    fresh_media=fresh_media,
                    logger=logger,
                )
            except Exception as e:
                logger.error(
                    f"[plex] Error caching library '{library_name}' for '{instance_name}': {e}"
                )
                continue


def update_collections_database(
    db: DapsDB, config, logger, max_age_hours=6, force_reindex=False
):
    """
    Only reindex collections for Plex instances if their collections cache is missing or stale.
    Syncs the collections table after each library is indexed.
    """
    logger.info("Updating Plex collections databases...")
    plex_instances = config.instances_config.get("plex", {})
    if not plex_instances:
        logger.error("No Plex instances found in config.")
        return

    for instance_name, info in plex_instances.items():
        url = info.get("url")
        api = info.get("api")
        if not url or not api:
            logger.warning(
                f"[plex] Instance '{instance_name}' missing URL or API key. Skipping."
            )
            continue

        plex_client = PlexClient(url, api, logger)
        if not plex_client.is_connected():
            logger.error(f"[plex] Connection failed for '{instance_name}'. Skipping.")
            continue

        try:
            libraries = [
                section.title for section in plex_client.plex.library.sections()
            ]
        except Exception as e:
            logger.error(f"[plex] Failed to fetch libraries for '{instance_name}': {e}")
            continue
        if libraries:
            for library_name in libraries:
                try:
                    collections = plex_client.get_collections(
                        library_name, include_smart=True
                    )
                except Exception as e:
                    logger.error(
                        f"[plex] Error fetching collections for library '{library_name}' in '{instance_name}': {e}"
                    )
                    continue

                if not collections:
                    logger.debug(
                        f"[plex] No collections found for library '{library_name}' in '{instance_name}'. Skipping."
                    )
                    continue

                if not force_reindex:
                    cache = db.collection.get_for_library(
                        instance_name, library_name, max_age_hours=max_age_hours
                    )
                    if cache:
                        logger.debug(
                            f"[plex] Collections cache for library '{library_name}' in '{instance_name}' is fresh. Skipping reindex."
                        )
                        continue

                logger.info(
                    f"Indexing collections for library '{library_name}' in '{instance_name}'..."
                )
                try:
                    db.collection.sync_collections_cache(
                        instance_name, library_name, collections, logger
                    )
                except Exception as e:
                    logger.error(
                        f"[plex] Error caching collections for library '{library_name}' in '{instance_name}': {e}"
                    )
                    continue
