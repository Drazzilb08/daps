import os
import re
import sys
from typing import TYPE_CHECKING, Any, Dict, List, Optional, Tuple

from util.arr import create_arr_client
from util.constants import (
    episode_regex,
    season_regex,
    year_regex,
)
from util.helper import (
    create_table,
    normalize_titles,
    print_json,
    print_settings,
    progress,
)
from util.logger import Logger
from util.config import Config
from util.notification import NotificationManager

VIDEO_EXTS = (".mkv", ".mp4")

if TYPE_CHECKING:
    from util.arr import BaseARRClient


def find_nohl_files(
    path: str, logger: Logger
) -> Optional[Dict[str, List[Dict[str, Any]]]]:
    """
    Find all video files in a directory tree that are not hardlinked.
    Args:
        path: Root directory to scan.
        logger: Logger instance for debug output.
    Returns:
        Dictionary with non-hardlinked movies and series details.
    """
    path_basename = os.path.basename(path.rstrip("/"))
    nohl_data: Dict[str, List[Dict[str, Any]]] = {"movies": [], "series": []}
    logger.debug(f"Scanning directory: {path}")
    try:
        entries = [i for i in os.listdir(path) if os.path.isdir(os.path.join(path, i))]
    except FileNotFoundError as e:
        logger.error(f"Error: {e}")
        return None
    for item in progress(
        entries,
        desc=f"Searching '{path_basename}'",
        unit="item",
        total=len(entries),
        logger=logger,
    ):
        if item.startswith("."):
            continue
        # Remove year from directory name for title
        title = re.sub(year_regex, "", item)
        try:
            year = int(year_regex.search(item).group(1))
        except AttributeError:
            year = 0
        asset_list: Dict[str, Any] = {
            "title": title,
            "year": year,
            "normalized_title": normalize_titles(title),
            "root_path": os.path.join(*path.rstrip(os.sep).split(os.sep)[-2:]),
            "path": os.path.join(path, item),
        }
        item_path = os.path.join(path, item)
        # Detect if this is a series (has subfolders) or a movie (just files)
        if os.path.isdir(item_path) and any(
            os.path.isdir(os.path.join(item_path, sub_folder))
            for sub_folder in os.listdir(item_path)
        ):
            sub_folders = [
                sub_folder
                for sub_folder in os.listdir(item_path)
                if os.path.isdir(os.path.join(item_path, sub_folder))
                and not sub_folder.startswith(".")
            ]
            asset_list["season_info"] = []
            for sub_folder in sub_folders:
                sub_folder_path = os.path.join(item_path, sub_folder)
                sub_folder_files = [
                    file
                    for file in os.listdir(sub_folder_path)
                    if os.path.isfile(os.path.join(sub_folder_path, file))
                    and not file.startswith(".")
                ]
                season = re.search(season_regex, sub_folder)
                try:
                    season_number = int(season.group(1))
                except AttributeError:
                    season_number = 0
                nohl_files = []
                # Non-hardlink detection for each file in season folder
                for file in sub_folder_files:
                    if not file.endswith(VIDEO_EXTS):
                        continue
                    file_path = os.path.join(sub_folder_path, file)
                    try:
                        st = os.stat(file_path)
                        if st.st_nlink == 1:
                            nohl_files.append(file_path)
                    except Exception:
                        continue
                if nohl_files:
                    logger.debug(
                        f"Found {len(nohl_files)} non-hardlinked files in '{sub_folder_path}'"
                    )
                episodes = []
                # Extract episode numbers from non-hardlinked files
                for file in nohl_files:
                    try:
                        episode_match = re.search(episode_regex, file)
                        if episode_match is not None:
                            episode = int(episode_match.group(1))
                            episodes.append(episode)
                    except Exception as e:
                        logger.error(f"{e}")
                        logger.error(f"Error processing file: {file}.")
                        continue
                season_list = {
                    "season_number": season_number,
                    "episodes": episodes,
                    "nohl": nohl_files,
                }
                if nohl_files:
                    asset_list["season_info"].append(season_list)
            # Only add if there are any non-hardlinked episodes in any season
            if asset_list.get("season_info") and any(
                season["nohl"] for season in asset_list["season_info"]
            ):
                nohl_data["series"].append(asset_list)
        else:
            files_path = item_path
            files = [
                file
                for file in os.listdir(files_path)
                if os.path.isfile(os.path.join(files_path, file))
                and not file.startswith(".")
            ]
            nohl_files = []
            # Non-hardlink detection for movie files
            for file in files:
                if not file.endswith(VIDEO_EXTS):
                    continue
                file_path = os.path.join(files_path, file)
                try:
                    st = os.stat(file_path)
                    if st.st_nlink == 1:
                        nohl_files.append(file_path)
                except Exception:
                    continue
            if nohl_files:
                logger.debug(
                    f"Found {len(nohl_files)} non-hardlinked files in '{item_path}'"
                )
            asset_list["nohl"] = nohl_files
            if nohl_files:
                nohl_data["movies"].append(asset_list)
    # Sort seasons and episodes numerically for each series
    for series in nohl_data["series"]:
        if "season_info" in series:
            series["season_info"].sort(key=lambda s: int(s["season_number"]))
            for season in series["season_info"]:
                if "episodes" in season:
                    season["episodes"].sort(key=int)
    return nohl_data


def handle_searches(
    app: "BaseARRClient",
    search_list: List[Dict[str, Any]],
    instance_type: str,
    logger: Logger,
    config,
) -> List[Dict[str, Any]]:
    """
    Perform search and deletion actions for Radarr or Sonarr items.
    Args:
        app: ARR API client.
        search_list: List of media dicts to search.
        instance_type: "radarr" or "sonarr".
        logger: Logger instance.
        config: Config object.
    Returns:
        List of items that were searched.
    """
    logger.debug(f"Initiating search for {len(search_list)} items in {instance_type.title()}.")
    searched_for: List[Dict[str, Any]] = []
    searches = 0
    per_item_info_logs = []

    for item in progress(
        search_list,
        desc="Searching...",
        unit="item",
        total=len(search_list),
        logger=logger,
    ):
        title = item.get('title', 'Unknown')
        year = item.get('year', 'Unknown')

        # Use debug for all per-item actions in the loop
        logger.debug(f"Processing [{instance_type}] '{title}' ({year}) [media_id={item.get('media_id')}]")

        if instance_type == "radarr":
            if config.dry_run:
                logger.debug(f"[Dry Run] Would search and delete: '{title}' ({year}), file IDs: {item.get('file_ids', [])}")
                searched_for.append(item)
                searches += 1
                per_item_info_logs.append(f"[Dry Run] Would search and delete: '{title}' ({year}), file IDs: {item.get('file_ids', [])}")
            else:
                logger.debug(f" Deleting file IDs: {item.get('file_ids', [])} for '{title}' ({year}) [media_id={item.get('media_id')}]")
                app.delete_movie_file(item["file_ids"])
                logger.debug(f" Refreshing movie: '{title}' ({year}) [media_id={item['media_id']}]")
                results = app.refresh_items(item["media_id"])
                ready = app.wait_for_command(results["id"])
                if ready:
                    logger.debug(f" Initiating search for movie: '{title}' ({year}), media_id: {item['media_id']}")
                    app.search_media(item["media_id"])
                    searched_for.append(item)
                    searches += 1
                    per_item_info_logs.append(f" Searched: '{title}' ({year}) [media_id={item['media_id']}]")
                else:
                    logger.warning(f" Command for '{title}' ({year}) was not ready in time.")
        elif instance_type == "sonarr":
            seasons = item.get("seasons", [])
            if not seasons:
                logger.warning(f" No seasons found for '{title}' ({year}) - skipping.")
                continue
            searched_this_item = False
            for season in seasons:
                snum = season.get("season_number", "Unknown")
                season_pack = season.get("season_pack", False)
                file_ids = list({ep["episode_file_id"] for ep in season["episode_data"]})
                episode_ids = [ep["episode_id"] for ep in season["episode_data"]]
                episode_numbers = [ep.get("episode_number") for ep in season["episode_data"]]
                if season_pack:
                    if config.dry_run:
                        logger.debug(f"[Dry Run] Would search season pack: '{title}' ({year}) Season {snum} [media_id={item.get('media_id')}]")
                        per_item_info_logs.append(f"[Dry Run] Would search season pack: '{title}' ({year}) Season {snum} [media_id={item.get('media_id')}]")
                    else:
                        logger.debug(f" Deleting episode file IDs: {file_ids} for Season {snum} of '{title}' ({year}) [media_id={item.get('media_id')}]")
                        app.delete_episode_files(file_ids)
                        logger.debug(f" Refreshing series: '{title}' ({year}) [media_id={item['media_id']}]")
                        results = app.refresh_items(item["media_id"])
                        ready = app.wait_for_command(results["id"])
                        if ready:
                            logger.debug(f" Initiating season pack search for: '{title}' ({year}) Season {snum} [media_id={item['media_id']}]")
                            app.search_season(item["media_id"], snum)
                            per_item_info_logs.append(f" Searched season pack: '{title}' ({year}) Season {snum} [media_id={item['media_id']}]")
                        else:
                            logger.warning(f" Command for season pack '{title}' ({year}) Season {snum} was not ready in time.")
                    searched_this_item = True
                else:
                    if config.dry_run:
                        logger.debug(f"[Dry Run] Would search episodes {episode_numbers} of '{title}' ({year}) Season {snum} [media_id={item.get('media_id')}]")
                        per_item_info_logs.append(f"[Dry Run] Would search episodes {episode_numbers} of '{title}' ({year}) Season {snum} [media_id={item.get('media_id')}]")
                    else:
                        logger.debug(f" Deleting episode file IDs: {file_ids} for episodes {episode_numbers} in Season {snum} of '{title}' ({year}) [media_id={item.get('media_id')}]")
                        app.delete_episode_files(file_ids)
                        logger.debug(f" Refreshing series: '{title}' ({year}) [media_id={item['media_id']}]")
                        results = app.refresh_items(item["media_id"])
                        ready = app.wait_for_command(results["id"])
                        if ready:
                            logger.debug(f" Initiating episode search for: '{title}' ({year}) Episodes {episode_ids} in Season {snum} [media_id={item['media_id']}]")
                            app.search_episodes(episode_ids)
                            per_item_info_logs.append(f" Searched episodes {episode_numbers} of '{title}' ({year}) Season {snum} [media_id={item['media_id']}]")
                        else:
                            logger.warning(f" Command for episodes '{title}' ({year}) Season {snum} was not ready in time.")
                    searched_this_item = True
            if searched_this_item:
                searched_for.append(item)

    logger.debug(f"Total searches performed: {searches} for {instance_type.title()}.")
    # After progress bar, log info summary for searched items (if desired)
    if per_item_info_logs:
        logger.debug("Searched items summary:")
        for msg in per_item_info_logs:
            logger.debug(msg)
    return searched_for


def filter_media(
    app: "BaseARRClient",
    media_dict: List[Dict[str, Any]],
    nohl_data: List[Dict[str, Any]],
    instance_type: str,
    config,
    logger: Logger,
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Filter media to exclude items based on monitoring, exclusion lists, and quality profiles.
    Args:
        app: ARR client for Radarr/Sonarr.
        media_dict: List of media items from ARR.
        nohl_data: List of non-hardlinked media items.
        instance_type: "radarr" or "sonarr".
        config: Script configuration.
        logger: Logger instance.
    Returns:
        Dict with 'search_media' and 'filtered_media' lists.
    """
    logger.debug(
        f"Filtering {len(nohl_data)} non-hardlinked items against {len(media_dict)} media items from {instance_type.title()}."
    )
    quality_profiles = app.get_quality_profile_names()
    exclude_profile_ids = [
        quality_profiles[profile]
        for profile in getattr(config, "exclude_profiles", [])
        if profile in quality_profiles
    ]

    def build_season_filtering(media_season, file_season):
        season_data = []
        filtered_seasons = []
        if not media_season.get("monitored"):
            filtered_seasons.append({
                "season_number": media_season["season_number"],
                "monitored": False,
            })
        else:
            if media_season.get("season_pack"):
                season_data.append({
                    "season_number": media_season["season_number"],
                    "season_pack": True,
                    "episode_data": media_season["episode_data"],
                })
            else:
                episode_set = set(file_season.get("episodes", []))
                filtered_episodes = []
                episode_data = []
                for episode in media_season.get("episode_data", []):
                    if not episode.get("monitored"):
                        filtered_episodes.append(episode)
                    elif episode.get("episode_number") in episode_set:
                        episode_data.append(episode)
                if filtered_episodes:
                    filtered_seasons.append({
                        "season_number": media_season["season_number"],
                        "monitored": True,
                        "episodes": filtered_episodes,
                    })
                if episode_data:
                    season_data.append({
                        "season_number": media_season["season_number"],
                        "season_pack": False,
                        "episode_data": episode_data,
                    })
        return season_data, filtered_seasons

    data_list = {"search_media": [], "filtered_media": []}

    for nohl_item in progress(
        nohl_data,
        desc="Filtering media...",
        unit="item",
        total=len(nohl_data),
        logger=logger,
    ):
        for media_item in media_dict:
            # Match normalized title and year
            if (
                media_item.get("normalized_title") == nohl_item.get("normalized_title")
                and media_item.get("year") == nohl_item.get("year")
            ):
                # Only match root_path if not dry_run
                if (
                    nohl_item.get("root_path") not in media_item.get("root_folder", "")
                    and not config.dry_run
                ):
                    logger.debug(
                        f"Skipped: '{media_item['title']}' ({media_item['year']}) [root folder mismatch]"
                    )
                    continue

                reasons = []
                if not media_item.get("monitored", True):
                    reasons.append("not monitored")
                if (
                    instance_type == "radarr"
                    and getattr(config, "exclude_movies", [])
                    and media_item["title"] in config.exclude_movies
                ):
                    reasons.append("excluded by title")
                if (
                    instance_type == "sonarr"
                    and getattr(config, "exclude_series", [])
                    and media_item["title"] in config.exclude_series
                ):
                    reasons.append("excluded by title")
                if media_item.get("quality_profile") in exclude_profile_ids:
                    reasons.append("excluded by quality profile")

                if reasons:
                    data_list["filtered_media"].append({
                        "title": media_item["title"],
                        "year": media_item["year"],
                        "monitored": media_item["monitored"],
                        "excluded": any(x in reasons for x in ["excluded by title"]),
                        "quality_profile": (
                            quality_profiles.get(media_item["quality_profile"])
                            if media_item.get("quality_profile") in exclude_profile_ids
                            else None
                        ),
                    })
                    logger.debug(
                        f"Filtered out: '{media_item['title']}' ({media_item['year']}), reasons: {', '.join(reasons)}"
                    )
                    continue

                if instance_type == "radarr":
                    file_ids = media_item.get("file_id")
                    data_list["search_media"].append({
                        "media_id": media_item["media_id"],
                        "title": media_item["title"],
                        "year": media_item["year"],
                        "file_ids": file_ids,
                    })
                    logger.debug(
                        f"Will process '{media_item['title']}' ({media_item['year']}), file_ids={file_ids}, media_id={media_item['media_id']}"
                    )
                elif instance_type == "sonarr":
                    media_seasons_info = media_item.get("seasons", [])
                    file_season_info = nohl_item.get("season_info", [])
                    season_data = []
                    filtered_seasons = []
                    for media_season in media_seasons_info:
                        for file_season in file_season_info:
                            if (
                                media_season.get("season_number")
                                == file_season.get("season_number")
                            ):
                                sdata, sfiltered = build_season_filtering(
                                    media_season, file_season
                                )
                                season_data.extend(sdata)
                                filtered_seasons.extend(sfiltered)
                    if filtered_seasons:
                        data_list["filtered_media"].append({
                            "title": media_item["title"],
                            "year": media_item["year"],
                            "seasons": filtered_seasons,
                        })
                        logger.debug(
                            f"Filtered out: '{media_item['title']}' ({media_item['year']}) -- unmonitored/filtered seasons: {[s['season_number'] for s in filtered_seasons]}"
                        )
                    if season_data:
                        data_list["search_media"].append({
                            "media_id": media_item["media_id"],
                            "title": media_item["title"],
                            "year": media_item["year"],
                            "monitored": media_item["monitored"],
                            "seasons": season_data,
                        })
                        logger.debug(
                            f" Will process '{media_item['title']}' ({media_item['year']}), seasons: {[s['season_number'] for s in season_data]}, media_id={media_item['media_id']}"
                        )

    # Limit number of searches if configured
    search_limit = getattr(config, "searches", None)
    if search_limit is not None and len(data_list["search_media"]) > search_limit:
        logger.info(
            f"Search limit applied: reducing search_media from {len(data_list['search_media'])} to {search_limit}."
        )
        data_list["search_media"] = data_list["search_media"][:search_limit]

    logger.debug(
        f"Filtering complete. Searchable items: {len(data_list['search_media'])}, Filtered/excluded items: {len(data_list['filtered_media'])}"
    )
    return data_list


def handle_messages(output: Dict[str, Any], logger: Logger) -> None:
    """
    Print a formatted summary of scanned non-hardlinked files and resolved ARR actions.
    Args:
        output: Output dictionary containing scan and resolve results.
        logger: Logger instance.
    """
    # Output scanned section: show all non-hardlinked movies and series found
    if output.get("scanned", {}):
        logger.info(create_table([["Scanned Non-Hardlinked Files"]]))
        for path, results in output.get("scanned", {}).items():
            logger.info(f"Scanning results for: {path}")
            for item in results.get("movies", []):
                logger.info(f"{item['title']} ({item['year']})")
                if item.get("nohl"):
                    for file_path in item["nohl"]:
                        logger.info(f"\t{os.path.basename(file_path)}")
                logger.info("")
            for item in results.get("series", []):
                logger.info(f"{item['title']} ({item['year']})")
                for season in item.get("season_info", []):
                    if season.get("nohl"):
                        logger.info(f"\tSeason {season['season_number']}")
                        for file_path in season["nohl"]:
                            logger.info(f"\t\t{os.path.basename(file_path)}")
                logger.info("")
    # Output resolved section: show all ARR actions performed or skipped
    has_results = any(
        instance.get("data", {}).get("search_media") or instance.get("data", {}).get("filtered_media")
        for instance in output.get("resolved", {}).values()
    )
    if has_results:
        logger.info(create_table([["Resolved ARR Actions"]]))
        for instance, instance_data in output.get("resolved", {}).items():
            search_media = instance_data["data"]["search_media"]
            filtered_media = instance_data["data"]["filtered_media"]
            # Output searched ARR media
            if search_media:
                for search_item in search_media:
                    if instance_data["instance_type"] == "radarr":
                        logger.info(f"{search_item['title']} ({search_item['year']})")
                        logger.info("\tDeleted and searched.\n")
                    else:
                        logger.info(f"{search_item['title']} ({search_item['year']})")
                        if search_item.get("seasons", None):
                            for season in search_item["seasons"]:
                                if season["season_pack"]:
                                    logger.info(
                                        f"\tSeason {season['season_number']}, deleted and searched."
                                    )
                                else:
                                    logger.info(f"\tSeason {season['season_number']}")
                                    for episode in season["episode_data"]:
                                        logger.info(
                                            f"\t   Episode {episode['episode_number']}, deleted and searched."
                                        )
                                logger.info("")
            # Output filtered ARR media (excluded or unmonitored)
            table = [["Filtered Media"]]
            if filtered_media:
                logger.debug(create_table(table))
                for filtered_item in filtered_media:
                    monitored = filtered_item.get("monitored", None)
                    logger.debug(f"{filtered_item['title']} ({filtered_item['year']})")
                    if monitored is False:
                        logger.debug("\tSkipping, not monitored.")
                    elif filtered_item.get("exclude_media", None):
                        logger.debug("\tSkipping, excluded.")
                    elif filtered_item.get("quality_profile", None):
                        logger.debug(
                            f"\tSkipping, quality profile: {filtered_item['quality_profile']}"
                        )
                    elif filtered_item.get("seasons", None):
                        for season in filtered_item["seasons"]:
                            if season["monitored"] is False:
                                logger.debug(
                                    f"\tSeason {season['season_number']}, skipping, not monitored."
                                )
                            elif season.get("episodes", None):
                                logger.debug(f"\tSeason {season['season_number']}")
                                for episode in season["episodes"]:
                                    logger.debug(
                                        f"\t   Episode {episode['episode_number']}, skipping, not monitored."
                                    )
                                logger.debug("")
            else:
                logger.debug(f"No filtered files for {instance_data['server_name']}")
            logger.debug("")
    # Output summary table
    summary = output.get("summary", {})
    if not all(value == 0 for value in summary.values()):
        logger.info(
            create_table(
                [
                    ["Metric", "Count"],
                    ["Total Scanned Movies", summary.get("total_scanned_movies", 0)],
                    ["Total Scanned Episodes", summary.get("total_scanned_series", 0)],
                    ["Total Resolved Movies", summary.get("total_resolved_movies", 0)],
                    [
                        "Total Resolved Episodes",
                        summary.get("total_resolved_series", 0),
                    ],
                ]
            )
        )
    else:
        logger.info("\n\n\t\t✅ Congratulations, there is nothing to report.\n\n")


def build_instance_index(instances, instances_config):
    """
    Builds an index mapping each instance name to (instance_type, instance_config)
    """
    index = {}
    # Loop over all instance_types (radarr/sonarr/plex)
    for instance_type, configs in instances_config.items():
        for name, cfg in configs.items():
            index[name] = (instance_type, cfg)
    # Special handling if Plex is dict-in-list
    for i in instances:
        if isinstance(i, dict):
            for name, value in i.items():
                # Use type 'plex' since all dicts here are plex by your config
                index[name] = ("plex", value)
    return index


# Helper functions for refactoring main()
def parse_source_entries(config):
    """Parse source_dirs into scan and resolve entries."""
    source_entries = []
    if getattr(config, "source_dirs", None):
        for entry in config.source_dirs:
            if isinstance(entry, dict):
                source_entries.append(
                    {
                        "path": entry.get("path"),
                        "mode": entry.get("mode", "resolve"),
                    }
                )
            else:
                source_entries.append({"path": entry, "mode": "resolve"})
    scan_entries = [e for e in source_entries if e["mode"] == "scan"]
    resolve_entries = [e for e in source_entries if e["mode"] == "resolve"]
    return scan_entries, resolve_entries

def scan_entries(scan_entries, logger):
    """Gather all non-hardlinked files for reporting."""
    scanned_results: Dict[str, Any] = {}
    for entry in scan_entries:
        path = entry["path"]
        results = find_nohl_files(path, logger)
        scanned_results[path] = results or {"movies": [], "series": []}
    return scanned_results

def aggregate_nohl_results(resolve_entries, logger):
    """Aggregate all nohl results for ARR resolution."""
    nohl_list: Dict[str, List[Dict[str, Any]]] = {"movies": [], "series": []}
    for entry in resolve_entries:
        path = entry["path"]
        results = find_nohl_files(path, logger) or {"movies": [], "series": []}
        if results and (results.get("movies") or results.get("series")):
            nohl_list["movies"].extend(results.get("movies", []))
            nohl_list["series"].extend(results.get("series", []))
        else:
            logger.warning(
                f"No non-hardlinked files found in {path}, skipping resolution for this path"
            )
            continue
    return nohl_list

def process_arr_instances(config, nohl_list, logger):
    """For each instance, filter and trigger searches, returning output_dict, data_list, media_dict, nohl_data."""
    output_dict: Dict[str, Any] = {}
    data_list: Dict[str, Any] = {}
    media_dict: Any = {}
    nohl_data: Any = {}
    if config.instances:
        instance_index = build_instance_index(config.instances, config.instances_config)
        for instance in config.instances:
            instance_name = instance if isinstance(instance, str) else list(instance.keys())[0]
            instance_type, instance_settings = instance_index[instance_name]
            if instance_type not in ("radarr", "sonarr"):
                continue  # skip plex here if only working with ARR
            app = create_arr_client(
                instance_settings["url"], instance_settings["api"], logger
            )
            if not (app and app.connect_status):
                logger.warning(f"Skipping {instance_name} (not connected)")
                continue
            server_name = app.get_instance_name()
            table = [[f"{server_name}"]]
            logger.info(create_table(table))
            nohl_data = (
                nohl_list["movies"] if instance_type == "radarr"
                else nohl_list["series"] if instance_type == "sonarr"
                else None
            )
            if not nohl_data:
                logger.info(f"No non-hardlinked files found for server: {server_name}")
                # continue
            media_dict = (
                app.get_all_media(include_episode=True)
                if instance_type == "sonarr"
                else app.get_all_media()
            )
            if not media_dict:
                logger.info(f"No media found for server: {server_name}")
                continue
            data_list = filter_media(app, media_dict, nohl_data, instance_type, config, logger)
            search_list = data_list.get("search_media", [])
            if search_list:
                search_list = handle_searches(app, search_list, instance_type, logger, config)
                data_list["search_media"] = search_list
            output_dict[instance_name] = {
                "server_name": server_name,
                "instance_type": instance_type,
                "data": data_list,
            }
            logger.debug(
                f"{server_name} processing complete. Search media: {len(data_list['search_media'])}, Filtered: {len(data_list['filtered_media'])}"
            )
    return output_dict, data_list, media_dict, nohl_data

def build_summary(scanned_results, output_dict):
    """Compute summary statistics for output reporting."""

    total_scanned_movies = sum(
        len(movie.get("nohl", []))
        for path, results in scanned_results.items()
        for movie in results.get("movies", [])
    )
    total_scanned_series = sum(
        sum(len(season.get("nohl", [])) for season in series.get("season_info", []))
        for path, results in scanned_results.items()
        for series in results.get("series", [])
    )
    resolved_movies = 0
    resolved_episodes = 0
    for instance, instance_data in output_dict.items():
        search_media = instance_data["data"].get("search_media", [])
        if instance_data["instance_type"] == "radarr":
            resolved_movies += len(search_media)
        elif instance_data["instance_type"] == "sonarr":
            for search_item in search_media:
                # Only count episodes in search_media (i.e., actually resolved)
                if "seasons" in search_item:
                    for season in search_item["seasons"]:
                        resolved_episodes += len(season.get("episode_data", []))
    summary = {
        "total_scanned_movies": total_scanned_movies,
        "total_scanned_series": total_scanned_series,
        "total_resolved_movies": resolved_movies,
        "total_resolved_series": resolved_episodes,
    }
    return summary

def dump_debug_json(data_list, media_dict, nohl_data, output_dict, logger, config):
    """Dump debug JSON payloads if needed."""
    table = [["Debug JSON Payloads"]]
    logger.debug(create_table(table))
    print_json(data_list, logger, config.module_name, "data_list")
    print_json(media_dict, logger, config.module_name, "media_dict")
    print_json(nohl_data, logger, config.module_name, "nohl_data")
    print_json(output_dict, logger, config.module_name, "output_dict")


def main() -> None:
    """
    Entrypoint for nohl.py. Scans for non-hardlinked files and triggers ARR actions.
    """
    config = Config("nohl")
    logger = Logger(config.log_level, config.module_name)
    try:
        if config.log_level.lower() == "debug":
            print_settings(logger, config)
        # Warn if running in dry run mode
        if config.dry_run:
            table = [["Dry Run"], ["NO CHANGES WILL BE MADE"]]
            logger.info(create_table(table))
        logger.debug("Logger initialized. Starting main process.")

        # Parse source entries
        scan_entries_list, resolve_entries_list = parse_source_entries(config)
        # Scan for non-hardlinked files
        scanned_results = scan_entries(scan_entries_list, logger)
        # Aggregate nohl results for ARR resolution
        nohl_list = aggregate_nohl_results(resolve_entries_list, logger)
        # ARR resolution: for each instance, filter and trigger searches
        output_dict, data_list, media_dict, nohl_data = process_arr_instances(config, nohl_list, logger)
        # Dump debug JSON payloads if needed
        if config.log_level == "debug":
            dump_debug_json(data_list, media_dict, nohl_data, output_dict, logger, config)
        # Prepare summary for output reporting
        summary = build_summary(scanned_results, output_dict)
        # Combine scan and resolve results for reporting and notification
        final_output = {
            "scanned": scanned_results,
            "resolved": output_dict,
            "summary": summary,
        }
        # Output results to console/log
        handle_messages(final_output, logger)
        # Send notification with scan+resolve results
        manager = NotificationManager(config, logger, module_name="health_checkarr")
        manager.send_notification(final_output)
    except KeyboardInterrupt:
        print("Keyboard Interrupt detected. Exiting...")
        sys.exit()
    except Exception:
        logger.error("\n\nAn error occurred:\n", exc_info=True)
        logger.error("\n\n")
    finally:
        # Log outro message with run time
        logger.log_outro()
