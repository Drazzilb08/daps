import copy
import sys
from types import SimpleNamespace
from typing import Dict, List, Union

from util.arrpy import create_arr_client
from util.assets import get_assets_files
from util.index import create_new_empty_index
from util.logger import Logger
from util.match import match_media_to_assets
from util.notification import send_notification
from util.utility import create_table, get_plex_data, print_json, print_settings

try:
    from plexapi.server import PlexServer
except ImportError as e:
    print(f"ImportError: {e}")
    print("Please install the required modules with 'pip install -r requirements.txt'")
    exit(1)


def print_output(
    unmatched_dict: Dict[str, List[Dict]],
    media_dict: Dict[str, List[Dict]],
    logger: Logger,
) -> Dict[str, List[List[Union[str, int]]]]:
    """Print unmatched results and statistics, returning a summary table."""
    output = {"unmatched_dict": unmatched_dict}
    asset_types = ["movies", "series", "collections"]

    for asset_type in asset_types:
        data_set = unmatched_dict.get(asset_type, None)
        if data_set:
            table = [[f"Unmatched {asset_type.capitalize()}"]]
            logger.info(create_table(table))
            if data_set:
                for idx, item in enumerate(data_set):
                    if idx % 10 == 0:
                        logger.info(
                            f"\t*** {asset_type.title()} {idx + 1} - {min(idx + 10, len(data_set))} ***"
                        )
                        logger.info("")
                    if asset_type == "series":
                        missing_seasons = item.get("missing_seasons", False)
                        missing_main = item.get("missing_main_poster", False)
                        title = item["title"]
                        year = item["year"]
                        # Combined missing info
                        if missing_seasons and missing_main:
                            logger.info(f"\t{title} ({year})")
                            for season in item.get("missing_seasons", []):
                                logger.info(f"\t\tSeason: {season}")
                        elif missing_seasons:
                            logger.info(
                                f"\t{title} ({year}) (Seasons listed below have missing posters)"
                            )
                            for season in item["missing_seasons"]:
                                logger.info(f"\t\tSeason: {season}")
                        elif missing_main:
                            logger.info(
                                f"\t{title} ({year})  Main series poster missing"
                            )
                    else:
                        year = f" ({item['year']})" if item.get("year") else ""
                        logger.info(f"\t{item['title']}{year}")
                    logger.info("")
            logger.info("")

    # Calculate statistics for movies
    unmatched_movies_total = len(unmatched_dict.get("movies", []))
    total_movies = len(media_dict.get("movies", [])) if media_dict.get("movies") else 0
    percent_movies_complete = (
        ((total_movies - unmatched_movies_total) / total_movies * 100)
        if total_movies
        else 0
    )
    # Calculate statistics for series (count only series with missing main poster)
    unmatched_series_total = 0
    for item in unmatched_dict.get("series", []):
        if item.get("missing_main_poster", False):
            unmatched_series_total += 1

    total_series = len(media_dict.get("series", [])) if media_dict.get("series") else 0
    series_percent_complete = (
        ((total_series - unmatched_series_total) / total_series * 100)
        if total_series
        else 0
    )

    # Calculate unmatched seasons count (sum all missing season posters)
    unmatched_seasons_total = 0
    for item in unmatched_dict.get("series", []):
        missing_seasons = item.get("missing_seasons", [])
        unmatched_seasons_total += len(missing_seasons)

    # Calculate total seasons with episodes present
    total_seasons = 0
    for item in media_dict.get("series", []):
        seasons = item.get("seasons", None)
        if seasons:
            for season in seasons:
                if season.get("season_has_episodes"):
                    total_seasons += 1

    season_total_percent_complete = (
        ((total_seasons - unmatched_seasons_total) / total_seasons * 100)
        if total_seasons
        else 0
    )

    # Calculate statistics for collections
    unmatched_collections_total = len(unmatched_dict.get("collections", []))
    total_collections = (
        len(media_dict.get("collections", [])) if media_dict.get("collections") else 0
    )
    collection_percent_complete = (
        ((total_collections - unmatched_collections_total) / total_collections * 100)
        if total_collections
        else 0
    )

    # Calculate grand totals and percentage complete
    grand_total = total_movies + total_series + total_seasons + total_collections
    grand_unmatched_total = (
        unmatched_movies_total
        + unmatched_series_total
        + unmatched_seasons_total
        + unmatched_collections_total
    )
    grand_percent_complete = (
        ((grand_total - grand_unmatched_total) / grand_total * 100)
        if grand_total
        else 0
    )

    logger.info("")
    logger.info(create_table([["Statistics"]]))
    table = [["Type", "Total", "Unmatched", "Percent Complete"]]

    if unmatched_dict.get("movies") or media_dict.get("movies"):
        table.append(
            [
                "Movies",
                total_movies,
                unmatched_movies_total,
                f"{percent_movies_complete:.2f}%",
            ]
        )
    if unmatched_dict.get("series") or media_dict.get("series"):
        table.append(
            [
                "Series",
                total_series,
                unmatched_series_total,
                f"{series_percent_complete:.2f}%",
            ]
        )
        table.append(
            [
                "Seasons",
                total_seasons,
                unmatched_seasons_total,
                f"{season_total_percent_complete:.2f}%",
            ]
        )
    if unmatched_dict.get("collections") or media_dict.get("collections"):
        table.append(
            [
                "Collections",
                total_collections,
                unmatched_collections_total,
                f"{collection_percent_complete:.2f}%",
            ]
        )

    table.append(
        [
            "Grand Total",
            grand_total,
            grand_unmatched_total,
            f"{grand_percent_complete:.2f}%",
        ]
    )
    logger.info(create_table(table))
    output["summary"] = table
    return output


def main(config: SimpleNamespace) -> None:
    """Load media and assets, identify unmatched assets, and log summary statistics."""
    logger = Logger(config.log_level, config.module_name)

    try:
        if config.log_level.lower() == "debug":
            print_settings(logger, config)

        prefix_index = create_new_empty_index()
        print("Gathering all the posters, please wait...")
        assets_dict, prefix_index = get_assets_files(
            config.source_dirs, logger, merge=False
        )
        if not assets_dict:
            return

        media_dict = {"movies": [], "series": [], "collections": []}

        if config.instances:
            for instance in config.instances:
                # Determine instance name and settings
                if isinstance(instance, dict):
                    instance_name, instance_settings = next(iter(instance.items()))
                else:
                    instance_name = instance
                    instance_settings = {}

                # Determine instance type and data
                found = False
                for instance_type, instance_data in config.instances_config.items():
                    if instance_name in instance_data:
                        found = True
                        break
                if not found:
                    logger.warning(
                        f"Instance '{instance_name}' not found in config.instances_config. Skipping."
                    )
                    continue

                if instance_type == "plex":
                    url = instance_data[instance_name]["url"]
                    api = instance_data[instance_name]["api"]
                    try:
                        app = PlexServer(url, api)
                    except Exception as e:
                        logger.error(f"Error connecting to Plex: {e}")
                        app = None
                    if app:
                        library_names = instance_settings.get("library_names", [])
                        if library_names:
                            logger.info("Fetching Plex collections...")
                            results = get_plex_data(
                                app,
                                library_names,
                                logger,
                                include_smart=True,
                                collections_only=True,
                            )
                            media_dict["collections"].extend(results)
                        else:
                            logger.warning(
                                "No library names specified for Plex instance. Skipping Plex."
                            )
                else:
                    # For other instance types (e.g., radarr, sonarr), create client and get media
                    url = instance_data[instance_name]["url"]
                    api = instance_data[instance_name]["api"]
                    app = create_arr_client(url, api, logger)
                    if not app:
                        logger.error(f"Failed to connect to {instance_name}, skipping.")
                        continue
                    if app.connect_status:
                        logger.info(f"Fetching {app.instance_name} data...")
                        results = app.get_parsed_media(include_episode=False, include_unmonitored=False if config.ignore_unmonitored else True)
                        if results:
                            if instance_type == "radarr":
                                media_dict["movies"].extend(results)
                            elif instance_type == "sonarr":
                                media_dict["series"].extend(results)
                        else:
                            logger.error(f"No {instance_type.capitalize()} data found.")
        else:
            logger.error("No instances found. Exiting script...")
            return

        if not any(media_dict.values()):
            logger.error(
                "No media found, Check instances setting in your config. Exiting."
            )
            return

        # Remove heavy keys for logging clarity
        media_dict_copy = copy.deepcopy(media_dict)
        for media_type, media_list in media_dict_copy.items():
            for media in media_list:
                if "seasons" in media:
                    del media["seasons"]

        # Match assets and print output
        if media_dict and prefix_index:
            logger.info("Matching assets to media, please wait...")
            unmatched_dict = match_media_to_assets(
                media_dict, prefix_index, config.ignore_root_folders, logger
            )
        output = print_output(unmatched_dict, media_dict, logger)
        if any(unmatched_dict.values()):
            if config.notifications and output:
                logger.info("Sending notification...")
                send_notification(
                    logger=logger,
                    module_name=config.module_name,
                    config=config,
                    output=output,
                )
        else:
            logger.info("All assets matched.")

        if config.log_level == "debug":
            print_json(assets_dict, logger, config.module_name, "assets_dict")
            print_json(media_dict_copy, logger, config.module_name, "media_dict")
            print_json(prefix_index, logger, config.module_name, "prefix_index")
            print_json(unmatched_dict, logger, config.module_name, "unmatched_dict")

    except KeyboardInterrupt:
        print("Exiting due to keyboard interrupt.")
        sys.exit()
    except Exception:
        logger.error("\n\nAn error occurred:\n", exc_info=True)
        logger.error("\n\n")
        return
    finally:
        # Log outro message with run time
        logger.log_outro()
