
import os
import re
import sys

from util.logger import Logger
from util.arrpy import create_arr_client
from util.notification import send_notification
from util.utility import (
    normalize_titles,
    create_table,
    print_json,
    print_settings,
    progress,
)
from util.constants import (
    season_regex,
    episode_regex,
    year_regex,
)

VIDEO_EXTS = ('.mkv', '.mp4')

from typing import TYPE_CHECKING, List, Dict, Any, Optional, Tuple
if TYPE_CHECKING:
    from util.arrpy import BaseARRClient

def find_nohl_files(path: str, logger: Logger) -> Optional[Dict[str, List[Dict[str, Any]]]]:
    """
    Find all video files in a directory tree that are not hardlinked.
    Args:
        path: Root directory to scan.
        logger: Logger instance for debug output.
    Returns:
        Dictionary with non-hardlinked movies and series details.
    """
    path_basename = os.path.basename(path.rstrip('/'))
    nohl_data: Dict[str, List[Dict[str, Any]]] = {'movies': [], 'series': []}
    logger.debug(f"Scanning directory: {path}")
    try:
        entries = [i for i in os.listdir(path) if os.path.isdir(os.path.join(path, i))]
    except FileNotFoundError as e:
        logger.error(f"Error: {e}")
        return None
    for item in progress(entries, desc=f"Searching '{path_basename}'", unit="item", total=len(entries), logger=logger):
        if item.startswith('.'):
            continue
        # Remove year from directory name for title
        title = re.sub(year_regex, '', item)
        try:
            year = int(year_regex.search(item).group(1))
        except AttributeError:
            year = 0
        asset_list: Dict[str, Any] = {
            'title': title,
            'year': year,
            'normalized_title': normalize_titles(title),
            'root_path': os.path.join(*path.rstrip(os.sep).split(os.sep)[-2:]),
            'path': os.path.join(path, item)
        }
        item_path = os.path.join(path, item)
        # Detect if this is a series (has subfolders) or a movie (just files)
        if os.path.isdir(item_path) and any(os.path.isdir(os.path.join(item_path, sub_folder)) for sub_folder in os.listdir(item_path)):
            sub_folders = [
                sub_folder for sub_folder in os.listdir(item_path)
                if os.path.isdir(os.path.join(item_path, sub_folder)) and not sub_folder.startswith('.')
            ]
            asset_list['season_info'] = []
            for sub_folder in sub_folders:
                sub_folder_path = os.path.join(item_path, sub_folder)
                sub_folder_files = [
                    file for file in os.listdir(sub_folder_path)
                    if os.path.isfile(os.path.join(sub_folder_path, file)) and not file.startswith('.')
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
                    logger.debug(f"Found {len(nohl_files)} non-hardlinked files in '{sub_folder_path}'")
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
                    'season_number': season_number,
                    'episodes': episodes,
                    'nohl': nohl_files
                }
                if nohl_files:
                    asset_list['season_info'].append(season_list)
            # Only add if there are any non-hardlinked episodes in any season
            if asset_list.get('season_info') and any(season['nohl'] for season in asset_list['season_info']):
                nohl_data['series'].append(asset_list)
        else:
            files_path = item_path
            files = [
                file for file in os.listdir(files_path)
                if os.path.isfile(os.path.join(files_path, file)) and not file.startswith('.')
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
                logger.debug(f"Found {len(nohl_files)} non-hardlinked files in '{item_path}'")
            asset_list['nohl'] = nohl_files
            if nohl_files:
                nohl_data['movies'].append(asset_list)
    # Sort seasons and episodes numerically for each series
    for series in nohl_data['series']:
        if 'season_info' in series:
            series['season_info'].sort(key=lambda s: int(s['season_number']))
            for season in series['season_info']:
                if 'episodes' in season:
                    season['episodes'].sort(key=int)
    return nohl_data

def handle_searches(
    app: "BaseARRClient",
    search_list: List[Dict[str, Any]],
    instance_type: str,
    logger: Logger,
    config
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
    logger.debug(f"Initiating search for {len(search_list)} items in {instance_type}")
    print("Searching for files... this may take a while.")
    searched_for: List[Dict[str, Any]] = []
    searches = 0
    for item in progress(search_list, desc="Searching...", unit="item", total=len(search_list), logger=logger):
        if instance_type == 'radarr':
            # Radarr: delete file(s) and trigger search for the movie
            if config.dry_run:
                logger.info(f"[Dry Run] Would search: {item['title']} ({item['year']}) and delete file IDs: {item['file_ids']}")
                searched_for.append(item)
                searches += 1
            else:
                app.delete_movie_file(item['file_ids'])
                results = app.refresh_items(item['media_id'])
                ready = app.wait_for_command(results['id'])
                if ready:
                    logger.debug(f"Performing a Search for {item['media_id']} ({item['year']})")
                    app.search_media(item['media_id'])
                    searched_for.append(item)
                    searches += 1
            logger.debug(f"Searched: {item['title']} ({item['year']})")
        elif instance_type == 'sonarr':
            # Sonarr: for each season, trigger episode or season pack search
            seasons = item.get('seasons', [])
            if seasons:
                for season in seasons:
                    season_pack = season['season_pack']
                    file_ids = list(set([episode['episode_file_id'] for episode in season['episode_data']]))
                    episode_ids = [episode['episode_id'] for episode in season['episode_data']]
                    if season_pack:
                        if config.dry_run:
                            logger.info(f"[Dry Run] Would search season: {season['season_number']} of {item['title']} ({item['year']})")
                        else:
                            app.delete_episode_files(file_ids)
                            results = app.refresh_items(item['media_id'])
                            ready = app.wait_for_command(results['id'])
                            if ready:
                                logger.debug(f"Performing a season search for {item['media_id']} ({item['year']}) Season Number: {season['season_number']}")
                                app.search_season(item['media_id'], season['season_number'])
                    else:
                        if config.dry_run:
                            episode_numbers = [ep['episode_number'] for ep in season['episode_data']]
                            logger.info(f"[Dry Run] Would search episodes: {episode_numbers} of {item['title']} ({item['year']})")
                        else:
                            app.delete_episode_files(file_ids)
                            results = app.refresh_items(item['media_id'])
                            ready = app.wait_for_command(results['id'])
                            if ready:
                                logger.debug(f"Performing an episode search for {item['title']} ({item['year']}), Episodes IDs: {episode_ids}")
                                app.search_episodes(episode_ids)
                searched_for.append(item)
            logger.debug(f"Searched: {item['title']} ({item['year']})")
    print(f"Searches performed: {searches}")
    return searched_for

def filter_media(
    app: "BaseARRClient",
    media_dict: List[Dict[str, Any]],
    nohl_data: List[Dict[str, Any]],
    instance_type: str,
    config,
    logger: Logger
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
    logger.debug(f"Filtering {len(nohl_data)} nohl items against {len(media_dict)} media items from {instance_type}")
    quality_profiles = app.get_quality_profile_names()
    exclude_profile_ids = []
    if config.exclude_profiles:
        for profile in config.exclude_profiles:
            if profile in quality_profiles:
                exclude_profile_ids.append(quality_profiles[profile])

    def build_season_filtering(media_season: Dict[str, Any], file_season: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Split a season into filtered (excluded) and search-needed episodes based on monitoring and matches.
        """
        season_data: List[Dict[str, Any]] = []
        filtered_seasons: List[Dict[str, Any]] = []
        if not media_season['monitored']:
            # Unmonitored season, add to filtered
            filtered_seasons.append({
                'season_number': media_season['season_number'],
                'monitored': False,
            })
        else:
            if media_season['season_pack']:
                # Monitored season pack, add all to search
                season_data.append({
                    'season_number': media_season['season_number'],
                    'season_pack': True,
                    'episode_data': media_season['episode_data']
                })
            else:
                # For non-season-pack, filter out unmonitored and select monitored matching episodes
                episode_set = set(file_season['episodes'])
                filtered_episodes = []
                episode_data = []
                for episode in media_season['episode_data']:
                    if not episode['monitored']:
                        # Unmonitored episode, add to filtered
                        filtered_episodes.append(episode)
                    elif episode['episode_number'] in episode_set:
                        # Monitored and present in file_season, add to search
                        episode_data.append(episode)
                if filtered_episodes:
                    # Unmonitored chunk
                    filtered_seasons.append({
                        'season_number': media_season['season_number'],
                        'monitored': True,
                        'episodes': filtered_episodes
                    })
                if episode_data:
                    # Monitored chunk that needs searching
                    season_data.append({
                        'season_number': media_season['season_number'],
                        'season_pack': False,
                        'episode_data': episode_data
                    })
        return season_data, filtered_seasons

    data_list: Dict[str, List[Dict[str, Any]]] = {'search_media': [], 'filtered_media': []}
    for nohl_item in progress(nohl_data, desc="Filtering media...", unit="item", total=len(nohl_data), logger=logger):
        for media_item in media_dict:
            # ARR resolution: match normalized title and year
            if media_item['normalized_title'] == nohl_item['normalized_title'] and media_item['year'] == nohl_item['year']:
                # Only match root_path if not dry_run
                if nohl_item['root_path'] not in media_item['root_folder'] and not config.dry_run:
                    logger.debug(f"Skipping {media_item['title']} ({media_item['year']}), root folder mismatch.")
                    continue
                # Exclusion checks: monitored, exclusion lists, quality profile
                if (
                    media_item['monitored'] is False or
                    (instance_type == 'radarr' and config.exclude_movies and media_item['title'] in config.exclude_movies) or
                    (instance_type == 'sonarr' and config.exclude_series and media_item['title'] in config.exclude_series) or
                    media_item['quality_profile'] in exclude_profile_ids
                ):
                    data_list['filtered_media'].append({
                        'title': media_item['title'],
                        'year': media_item['year'],
                        'monitored': media_item['monitored'],
                        'excluded': (
                            (instance_type == 'radarr' and config.exclude_movies and media_item['title'] in config.exclude_movies) or
                            (instance_type == 'sonarr' and config.exclude_series and media_item['title'] in config.exclude_series)
                        ),
                        'quality_profile': quality_profiles.get(media_item['quality_profile']) if media_item['quality_profile'] in exclude_profile_ids else None
                    })
                    logger.debug(
                        f"Filtered out: {media_item['title']} ({media_item['year']}), reason(s): "
                        f"{'not monitored' if media_item['monitored'] is False else ''}"
                        f"{', excluded' if (instance_type == 'radarr' and config.exclude_movies and media_item['title'] in config.exclude_movies) or (instance_type == 'sonarr' and config.exclude_series and media_item['title'] in config.exclude_series) else ''}"
                        f"{', quality profile' if media_item['quality_profile'] in exclude_profile_ids else ''}"
                    )
                    continue
                if instance_type == 'radarr':
                    # Add movie to search list
                    file_ids = media_item['file_id']
                    data_list['search_media'].append({
                        'media_id': media_item['media_id'],
                        'title': media_item['title'],
                        'year': media_item['year'],
                        'file_ids': file_ids
                    })
                    logger.debug(
                        f"Radarr: Will resolve {media_item['title']} ({media_item['year']}), file_ids={file_ids}"
                    )
                elif instance_type == 'sonarr':
                    # Season filtering for Sonarr: build per-season search/exclude lists
                    media_seasons_info = media_item.get('seasons', {})
                    file_season_info = nohl_item.get('season_info', [])
                    season_data = []
                    filtered_seasons = []
                    for media_season in media_seasons_info:
                        for file_season in file_season_info:
                            if media_season['season_number'] == file_season['season_number']:
                                sdata, sfiltered = build_season_filtering(media_season, file_season)
                                season_data.extend(sdata)
                                filtered_seasons.extend(sfiltered)
                    if filtered_seasons:
                        data_list['filtered_media'].append({
                            'title': media_item['title'],
                            'year': media_item['year'],
                            'seasons': filtered_seasons
                        })
                        logger.debug(
                            f"Filtered out: {media_item['title']} ({media_item['year']}), reason(s): "
                            f"{'not monitored' if media_item['monitored'] is False else ''}"
                            f"{', excluded' if (instance_type == 'radarr' and config.exclude_movies and media_item['title'] in config.exclude_movies) or (instance_type == 'sonarr' and config.exclude_series and media_item['title'] in config.exclude_series) else ''}"
                            f"{', quality profile' if media_item['quality_profile'] in exclude_profile_ids else ''}"
                        )
                    if season_data:
                        logger.debug(f"{media_item['title']} ({media_item['year']}): {len(season_data)} seasons selected for search")
                        data_list['search_media'].append({
                            'media_id': media_item['media_id'],
                            'title': media_item['title'],
                            'year': media_item['year'],
                            'monitored': media_item['monitored'],
                            'seasons': season_data
                        })
                        logger.debug(
                            f"Sonarr: Will resolve {media_item['title']} ({media_item['year']}), seasons: "
                            f"{[s['season_number'] for s in season_data]}"
                        )
    # Limit number of searches if configured
    if len(data_list['search_media']) >= config.searches:
        data_list['search_media'] = data_list['search_media'][:config.searches]
    return data_list

def handle_messages(output: Dict[str, Any], logger: Logger) -> None:
    """
    Print a formatted summary of scanned non-hardlinked files and resolved ARR actions.
    Args:
        output: Output dictionary containing scan and resolve results.
        logger: Logger instance.
    """
    # Output scanned section: show all non-hardlinked movies and series found
    logger.info(create_table([["Scanned Non-Hardlinked Files"]]))
    for path, results in output.get('scanned', {}).items():
        logger.info(f"Scanning results for: {path}")
        for item in results.get('movies', []):
            logger.info(f"{item['title']} ({item['year']})")
            if item.get('nohl'):
                for file_path in item['nohl']:
                    logger.info(f"\t{os.path.basename(file_path)}")
            logger.info("")
        for item in results.get('series', []):
            logger.info(f"{item['title']} ({item['year']})")
            for season in item.get('season_info', []):
                if season.get('nohl'):
                    logger.info(f"\tSeason {season['season_number']}")
                    for file_path in season['nohl']:
                        logger.info(f"\t\t{os.path.basename(file_path)}")
            logger.info("")
    # Output resolved section: show all ARR actions performed or skipped
    logger.info(create_table([["Resolved ARR Actions"]]))
    for instance, instance_data in output.get('resolved', {}).items():
        search_media = instance_data['data']['search_media']
        filtered_media = instance_data['data']['filtered_media']
        # Output searched ARR media
        if search_media:
            for search_item in search_media:
                if instance_data['instance_type'] == 'radarr':
                    logger.info(f"{search_item['title']} ({search_item['year']})")
                    logger.info(f"\tDeleted and searched.\n")
                else:
                    logger.info(f"{search_item['title']} ({search_item['year']})")
                    if search_item.get('seasons', None):
                        for season in search_item['seasons']:
                            if season['season_pack']:
                                logger.info(f"\tSeason {season['season_number']}, deleted and searched.")
                            else:
                                logger.info(f"\tSeason {season['season_number']}")
                                for episode in season['episode_data']:
                                    logger.info(f"\t   Episode {episode['episode_number']}, deleted and searched.")
                            logger.info("")
        # Output filtered ARR media (excluded or unmonitored)
        table = [["Filtered Media"]]
        if filtered_media:
            logger.debug(create_table(table))
            for filtered_item in filtered_media:
                monitored = filtered_item.get('monitored', None)
                logger.debug(f"{filtered_item['title']} ({filtered_item['year']})")
                if monitored is False:
                    logger.debug(f"\tSkipping, not monitored.")
                elif filtered_item.get('exclude_media', None):
                    logger.debug(f"\tSkipping, excluded.")
                elif filtered_item.get('quality_profile', None):
                    logger.debug(f"\tSkipping, quality profile: {filtered_item['quality_profile']}")
                elif filtered_item.get('seasons', None):
                    for season in filtered_item['seasons']:
                        if season['monitored'] is False:
                            logger.debug(f"\tSeason {season['season_number']}, skipping, not monitored.")
                        elif season.get('episodes', None):
                            logger.debug(f"\tSeason {season['season_number']}")
                            for episode in season['episodes']:
                                logger.debug(f"\t   Episode {episode['episode_number']}, skipping, not monitored.")
                            logger.debug("")
        else:
            logger.debug(f"No filtered files for {instance_data['server_name']}")
        logger.debug("")
    # Output summary table
    summary = output.get('summary', {})
    if not all(value == 0 for value in summary.values()):
        logger.info(create_table([
            ["Metric", "Count"],
            ["Total Scanned Movies", summary.get('total_scanned_movies', 0)],
            ["Total Scanned Episodes", summary.get('total_scanned_series', 0)],
            ["Total Resolved Movies", summary.get('total_resolved_movies', 0)],
            ["Total Resolved Episodes", summary.get('total_resolved_series', 0)],
        ]))
    else:
        logger.info(f"\n\n\t\t✅ Congratulations, there is nothing to report.\n\n")


def main(config) -> None:
    """
    Entrypoint for nohl.py. Scans for non-hardlinked files and triggers ARR actions.
    Args:
        config: Parsed configuration namespace.
    """
    logger = Logger(config.log_level, config.module_name)
    try:
        if config.log_level.lower() == "debug":
            print_settings(logger, config)
        # Warn if running in dry run mode
        if config.dry_run:
            table = [["Dry Run"], ["NO CHANGES WILL BE MADE"]]
            logger.info(create_table(table))
        logger.debug("Logger initialized. Starting main process.")
        # Ensure ARR instances are configured
        if config.instances is None:
            logger.error("No instances set in config file.")
            return
        # Parse source_dirs into entries with path+mode
        source_entries = []
        if getattr(config, 'source_dirs', None):
            for entry in config.source_dirs:
                if isinstance(entry, dict):
                    source_entries.append({'path': entry.get('path'), 'mode': entry.get('mode', 'resolve')})
                else:
                    source_entries.append({'path': entry, 'mode': 'resolve'})
        # Separate scan vs resolve entries
        scan_entries = [e for e in source_entries if e['mode'] == 'scan']
        resolve_entries = [e for e in source_entries if e['mode'] == 'resolve']
        # Scan-only: gather all non-hardlinked files for reporting
        scanned_results: Dict[str, Any] = {}
        for entry in scan_entries:
            path = entry['path']
            results = find_nohl_files(path, logger)
            scanned_results[path] = results or {'movies': [], 'series': []}
        # Resolve-only: aggregate all nohl results for ARR resolution
        nohl_list: Dict[str, List[Dict[str, Any]]] = {'movies': [], 'series': []}
        for entry in resolve_entries:
            path = entry['path']
            results = find_nohl_files(path, logger) or {'movies': [], 'series': []}
            if results and (results.get('movies') or results.get('series')):
                nohl_list['movies'].extend(results.get('movies', []))
                nohl_list['series'].extend(results.get('series', []))
            else:
                logger.warning(f"No non-hardlinked files found in {path}, skipping resolution for this path")
                continue
        # Compute summary statistics for output reporting
        total_movies = sum(len(movie.get('nohl', [])) for results in scanned_results.values() for movie in results.get('movies', []))
        total_series = sum(
            sum(len(season.get('nohl', [])) for season in series.get('season_info', []))
            for results in scanned_results.values()
            for series in results.get('series', [])
        )
        total_nohl_movies = sum(len(movie.get('nohl', [])) for movie in nohl_list['movies'])
        total_nohl_series = sum(
            sum(len(season.get('nohl', [])) for season in series.get('season_info', []))
            for series in nohl_list['series']
        )
        total_scanned_movies = sum(
            len(movie.get('nohl', [])) for path, results in scanned_results.items() for movie in results.get('movies', [])
        )
        total_scanned_series = sum(
            sum(len(season.get('nohl', [])) for season in series.get('season_info', []))
            for path, results in scanned_results.items()
            for series in results.get('series', [])
        )
        logger.debug(f"Total scanned movie files: {total_movies}")
        logger.debug(f"Total scanned series files: {total_series}")
        logger.debug(f"Total non-hardlinked movie files: {total_nohl_movies}")
        logger.debug(f"Total non-hardlinked series files: {total_nohl_series}")
        logger.debug(f"Total scanned results - movies: {total_scanned_movies}")
        logger.debug(f"Total scanned results - series: {total_scanned_series}")
        output_dict: Dict[str, Any] = {}
        data_list: Dict[str, Any] = {}
        media_dict: Any = {}
        nohl_data: Any = {}
        print(f"nohl_list: {nohl_list}")
        # ARR resolution: for each instance, filter and trigger searches
        for instance_type, instance_data in config.instances_config.items():
            for instance in config.instances:
                if instance in instance_data:
                    data_list = {'search_media': [], 'filtered_media': []}
                    instance_settings = instance_data.get(instance, None)
                    app = create_arr_client(instance_settings['url'], instance_settings['api'], logger)
                    if app and app.connect_status:
                        server_name = app.get_instance_name()
                        table = [[f"{server_name}"]]
                        logger.info(create_table(table))
                        if (instance_type == "radarr" and not nohl_list['movies']) or (instance_type == "sonarr" and not nohl_list['series']):
                            logger.info(f"No non-hardlinked files found for server: {server_name}")
                        nohl_data = nohl_list['movies'] if instance_type == "radarr" else nohl_list['series'] if instance_type == "sonarr" else None
                        if nohl_data:
                            # Pull all media from ARR and filter for resolution
                            if instance_type == "sonarr":
                                media_dict = app.get_parsed_media(include_episode=True)
                            else:
                                media_dict = app.get_parsed_media()
                            if media_dict:
                                data_list = filter_media(app, media_dict, nohl_data, instance_type, config, logger)
                            else:
                                logger.info(f"No media found for server: {server_name}")
                            search_list = data_list.get('search_media', [])
                            if search_list:
                                # Conduct searches, with dry run support
                                search_list = handle_searches(app, search_list, instance_type, logger, config)
                                data_list['search_media'] = search_list
                        output_dict[instance] = {
                            'server_name': server_name,
                            'instance_type': instance_type,
                            'data': data_list
                        }
                        logger.debug(f"{server_name} processing complete. Search media: {len(data_list['search_media'])}, Filtered: {len(data_list['filtered_media'])}")
        # Dump debug JSON payloads if needed
        if config.log_level == "debug":
            print_json(data_list, logger, config.module_name, 'data_list')
            print_json(media_dict, logger, config.module_name, 'media_dict')
            print_json(nohl_data, logger, config.module_name, 'nohl_data')
            print_json(output_dict, logger, config.module_name, 'output_dict')
        # Prepare summary for output reporting (only count actual resolved items in search_media)
        resolved_movies = 0
        resolved_episodes = 0
        for instance, instance_data in output_dict.items():
            search_media = instance_data['data'].get('search_media', [])
            if instance_data['instance_type'] == 'radarr':
                resolved_movies += len(search_media)
            elif instance_data['instance_type'] == 'sonarr':
                for search_item in search_media:
                    # Only count episodes in search_media (i.e., actually resolved)
                    if 'seasons' in search_item:
                        for season in search_item['seasons']:
                            resolved_episodes += len(season.get('episode_data', []))
        summary = {
            'total_scanned_movies': total_scanned_movies,
            'total_scanned_series': total_scanned_series,
            'total_resolved_movies': resolved_movies,
            'total_resolved_series': resolved_episodes
        }
        # Combine scan and resolve results for reporting and notification
        final_output = {
            'scanned': scanned_results,
            'resolved': output_dict,
            'summary': summary
        }
        # Output results to console/log
        handle_messages(final_output, logger)
        # Send notification with scan+resolve results
        send_notification(
            logger=logger,
            module_name=config.module_name,
            config=config,
            output=final_output,
        )
    except KeyboardInterrupt:
        print("Keyboard Interrupt detected. Exiting...")
        sys.exit()
    except Exception:
        logger.error(f"\n\nAn error occurred:\n", exc_info=True)
        logger.error(f"\n\n")