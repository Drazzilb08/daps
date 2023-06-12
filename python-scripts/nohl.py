#               _    _ _                    
#              | |  | | |                   
#   _ __   ___ | |__| | |       _ __  _   _ 
#  | '_ \ / _ \|  __  | |      | '_ \| | | |
#  | | | | (_) | |  | | |____ _| |_) | |_| |
#  |_| |_|\___/|_|  |_|______(_) .__/ \__, |
#                              | |     __/ |
#                              |_|    |___/ 
# ===================================================================================================
# Author: Drazzilb
# Description: This script will find all files that are not hardlinked and will process them in Radarr
#              and Sonarr. This script is meant to be run after a Plex library scan.
# Usage: python3 nohl.py
# Requirements: Python 3.8+, requests
# Version: 0.0.2
# License: MIT License
# ===================================================================================================


import os
import re
import sys
import time
import json
import re
from modules.config import Config
from modules.logger import setup_logger
from modules.arrpy import StARR

config = Config(script_name="nohl")
logger = setup_logger(config.log_level, "nohl")

illegal_chars_regex = re.compile(r"[^\w\s\-\(\)/.]+")
season_regex = r"(?:S|s)(\d{1,2})"
episode_regex = r"(?:E|e)(\d{1,2})"
series_title_regex = title_regex = r"/([^/]+)/Season \d+/\1"
movie_title_regex = r"/([^/]+)/\1"
regex_pattern = re.compile(f"{series_title_regex}|{movie_title_regex}")
year_regex = r"(\d{4})"

def find_no_hl_files(media_paths):
    no_hl_files = []
    while True:
        for dir in media_paths:
            try:
                for root, dirs, files in os.walk(dir):
                    for file in files:
                        try:
                            if file.endswith(".mkv") or file.endswith(".mp4"):
                                file_path = os.path.join(root, file)
                                if (os.path.isfile(file_path) and os.stat(file_path).st_nlink == 1):
                                    no_hl_files.append(file_path)
                        except Exception as e:
                            logger.warning(f"Error processing file: {file}. Error: {e}")
            except Exception as e:
                logger.warning(f"Error processing directory: {dir}. Error: {e}")
        if no_hl_files:
            break
        time.sleep(60)
    return no_hl_files

def process_instances(instance_type, url, api, nohl_files, include_profiles, exclude_profiles, dry_run, exclude_series):
    nohl_files.sort()
    media_data = []
    media_data_episodes = []
    app = StARR(url, api, logger)
    media = app.get_media()
    if instance_type == 'Radarr':
        logger.info("Processing Radarr")
        for file in nohl_files:
            title = re.search(movie_title_regex, file).group(1)
            year = int(re.search(year_regex, title).group(1))
            title = re.sub(r"\(\d{4}\)", "", title).strip()
            labled_data = {'title': title, 'year': year}
            media_data.append(labled_data)
    if instance_type == 'Sonarr':
        logger.info("Processing Sonarr")
        for file in nohl_files:
            season_number = re.search(season_regex, file).group(1)
            title = re.search(series_title_regex, file).group(1)
            year = int(re.search(year_regex, title).group(1))
            title = re.sub(r"\(\d{4}\)", "", title).strip()
            episode = int(re.search(episode_regex, file).group(1))
            if season_number:
                season_number_modified = int(season_number.lstrip('0'))
            existing_dict = next((d for d in media_data if d['title'] == title and d['year'] == year), None)
            if existing_dict:
                for season_info in existing_dict['season_info']:
                    if season_info['season_number'] == season_number_modified:
                        season_info['episodes'].append(episode)
                        break
                else:
                    existing_dict['season_info'].append({'season_number': season_number_modified, 'episodes': [episode]})
            else:
                media_data.append({'title': title, 'year': year, 'season_info': [{'season_number': season_number_modified, 'episodes': [episode]}]})
    results = []
    file_ids = []
    for data in media_data:
        title = data['title']
        year = data['year']
        for m in media:
            quality_profile_id = None
            quality_profile_name = None
            media_title = m['title']
            media_title = illegal_chars_regex.sub("", media_title)
            media_year = m['year']
            media_id = m['id']
            monitored = m['monitored']
            if media_title in exclude_series if exclude_series else False:
                continue
            quality_profile_id = m['qualityProfileId']
            quality_profile_name = app.get_quality_profile_name(quality_profile_id)
            if title == media_title and year == media_year:
                if (quality_profile_name in include_profiles if include_profiles else True) and (quality_profile_name not in exclude_profiles if exclude_profiles else True):
                    if instance_type == 'Radarr':
                        if monitored == True:
                            try:
                                file_ids = (m['movieFile']['id'])
                                results.append({'title': media_title, 'media_id': media_id, 'file_ids': file_ids})
                            except:
                                continue
                    if instance_type == 'Sonarr':
                        if exclude_profiles != None and quality_profile_name in exclude_profiles:
                            continue
                        monitored_seasons = []
                        media_data_seasons = [season['season_number'] for season in data['season_info']]
                        media_seasons = m['seasons']
                        episode_info = []
                        if monitored == True:
                            for s in media_seasons:
                                season_monitored = s['monitored']
                                if season_monitored == True:
                                    monitored_seasons.append(s['seasonNumber'])
                            common_seasons = list(set(monitored_seasons) & set(media_data_seasons))
                            season_info = []
                            for item in media_seasons:
                                if item['seasonNumber'] in common_seasons:
                                    stats = item['statistics']
                                    episodeCount = stats['episodeFileCount']
                                    totalEpisodeCount = stats['totalEpisodeCount']
                                    if episodeCount == totalEpisodeCount:
                                        season_pack = True
                                    else:
                                        season_pack = False
                                    season_info.append({'season_number': item['seasonNumber'], 'season_pack': season_pack, 'episode_info': []})  
                                
                            season_data = app.get_season_data(media_id)
                            for item in season_info:
                                season_number = item['season_number']
                                season_pack = item['season_pack']
                                episode_info = item['episode_info']
                                episode_file_id = []
                                episode_ids = []
                                episode_numbers = []
                                for season_data_item in season_data:
                                    if season_data_item['monitored'] == False:
                                        continue
                                    if season_data_item['seasonNumber'] == season_number:
                                        media_data_episodes = [episode for season in data['season_info'] if season['season_number'] == season_number for episode in season['episodes']]
                                        if season_pack:
                                            episode_file_id.append(season_data_item['episodeFileId'])
                                        elif not season_pack:
                                            if season_data_item['episodeNumber'] in media_data_episodes:
                                                episode_file_id.append(season_data_item['episodeFileId'])
                                                episode_ids.append(season_data_item['id'])
                                                episode_numbers.append(season_data_item['episodeNumber'])
                                episode_info.append({'episode_file_id': episode_file_id, 'episode_ids': episode_ids, 'episode_numbers': episode_numbers})
                            results.append({'title': media_title, 'media_id': media_id, 'seasons': season_info})
    final_step(app, results, instance_type, dry_run)
    
                                

def final_step(app, results, instance_type, dry_run):
    searches = config.maximum_searches
    tmp_file_path = 'tmp/search_count.txt'
    if not os.path.exists(tmp_file_path):
        with open(tmp_file_path, 'w') as f:
            f.write('0\n0')
    try:
        with open(tmp_file_path, 'r') as f:
            search_count, last_search_time = map(int, f.read().split('\n'))
    except ValueError:
        search_count, last_search_time = 0, 0
    current_time = int(time.time())
    if current_time - last_search_time >= 3600:
        search_count = 0
        last_search_time = current_time
    for result in results:
        if search_count >= searches:
            print('Maximum number of searches reached, cannot perform search')
            break
        media_id = result['media_id']
        title = result['title']
        if instance_type == 'Sonarr':
            seasons = result['seasons']
            for season in seasons:
                season_number = season['season_number']
                season_pack = season['season_pack']
                episode_info = season['episode_info']
                if season_pack:
                    episode_file_id = episode_info[0]['episode_file_id']
                    if not dry_run:
                        app.delete_episode_files(episode_file_id)
                        app.refresh_media(media_id)
                        app.search_season(media_id, season_number)
                        logger.info(f"Deleted episode file for {title} Season {season_number}, and the entire season was searched for a replacement")
                    else:
                        logger.info(f"Would have deleted episode file for {title} Season {season_number}, and the entire season would have been searched for a replacement")
                elif not season_pack:
                    episode_file_id = episode_info[0]['episode_file_id']
                    episode_ids = episode_info[0]['episode_ids']
                    episode_numbers = episode_info[0]['episode_numbers']
                    if not dry_run:
                        app.delete_episode_files(episode_file_id)
                        app.refresh_media(media_id)
                        app.search_episodes(episode_ids)
                        logger.info(f"Deleted episode file for {title} Season {season_number}, and the individual episodes {episode_numbers} were searched for a replacement")
                    else:
                        logger.info(f"Would have deleted episode file for {title} Season {season_number}, and the individual episodes {episode_numbers} would have been searched for a replacement")
                search_count += 1  
        elif instance_type == 'Radarr':
            file_ids = result['file_ids']
            if not dry_run:
                app.delete_movie_file(file_ids)
                app.refresh_media(media_id)
                app.search_media(media_id)
                logger.info(f"Deleted movie file for {title}, and the movie was searched for a replacement")
            else:
                logger.info(f"Would have deleted movie file for {title}, and the movie would have been searched for a replacement")
            search_count += 1   
    with open(tmp_file_path, 'w') as f:
        f.write(f'{search_count}\n{last_search_time}')
    logger.info("Done!")
                    


def main():
    dry_run = config.dry_run
    if config.dry_run:
        logger.info('*' * 40)
        logger.info(f'* {"Dry_run Activated":^36} *')
        logger.info('*' * 40)
        logger.info(f'* {" NO CHANGES WILL BE MADE ":^36} *')
        logger.info('*' * 40)
        logger.info('')
    search = config.maximum_searches
    if search >= 20:
        logger.error(f"Maximum searches set to {search}. This can cause devistating issues with your trackers. I will not be held responsible for any issues that arise from this. Please set this to a lower number.")
        logger.error(f"Exiting...")
        sys.exit()
    elif search >= 10:
        logger.warning(f"Maximum searches set to {search}. This can cause issues with your trackers. Please be careful.")
        time.sleep(5)
    elif search > 0 and search < 10:
        pass
    elif search == 0:
        logger.info(f"Maximum searches set to {search}, nothing will be searched for.")
    else:
        logger.error(f"Maximum searches set to {search}. This is not a valid number. Please set this to a positive number.")
        logger.error(f"Exiting...")
        sys.exit()
    paths = [] 
    monitored_paths = []
    if config.radarr:
        for radarr_config in config.radarr: 
            paths.extend(radarr_config['paths'])
            monitored_paths.append(radarr_config['paths'])
    if config.sonarr:
        for sonarr_config in config.sonarr: 
            paths.extend(sonarr_config['paths'])
            monitored_paths.append(sonarr_config['paths'])
    for i in monitored_paths:
        print(f"Monitoring:" +i[0])
    # while True:
    nohl_files = find_no_hl_files(paths)
    if nohl_files:
        instances_to_run = []
        if config.script_data['radarr']:
            for radarr_config in config.script_data['radarr']:
                if any(nohl_path.startswith(radarr_path) for nohl_path in nohl_files for radarr_path in radarr_config['paths']):
                    instances_to_run.append({'instance_name': radarr_config['name'], 'files_to_process':[]})
                    for nohl_file in nohl_files:
                        for radarr_path in radarr_config['paths']:
                            if nohl_file.startswith(radarr_path):
                                instances_to_run[-1]['files_to_process'].append(nohl_file)
        if config.script_data['sonarr']:
            for sonarr_config in config.script_data['sonarr']:
                if any(nohl_path.startswith(sonarr_path) for nohl_path in nohl_files for sonarr_path in sonarr_config['paths']):
                    instances_to_run.append({'instance_name': sonarr_config['name'], 'files_to_process':[]})
                    for nohl_file in nohl_files:
                        for sonarr_path in sonarr_config['paths']:
                            if nohl_file.startswith(sonarr_path):
                                instances_to_run[-1]['files_to_process'].append(nohl_file)
    for instance_type, instances in config.global_data.items():
        for instance in instances:
            instance_name = instance['name']
            instance_type = instance_type.capitalize()
            if instance_type == "Qbittorrent":
                continue
            url = instance['url']
            api = instance['api']
            for _instance in instances_to_run:
                if instance_name == _instance['instance_name']:
                    if instance_type == "Radarr":
                        print(f"Running {instance_type} instance {instance_name}")
                        data = next((data for data in config.radarr if data['name'] == instance_name), None)
                        if data:
                            include_profiles = data['include_profiles']
                            exclude_profiles = data['exclude_profiles']
                            nohl_files = _instance['files_to_process']
                            print(f"Processing {len(nohl_files)} files")
                            process_instances(instance_type, url, api, nohl_files, include_profiles, exclude_profiles, dry_run, exclude_series=None)
                    elif instance_type == "Sonarr":
                        print(f"Running {instance_type} instance {instance_name}")
                        data = next((data for data in config.sonarr if data['name'] == instance_name), None)
                        if data:
                            include_profiles = data['include_profiles']
                            exclude_profiles = data['exclude_profiles']
                            exclude_series = data['exclude_series']
                            nohl_files = _instance['files_to_process']
                            print(f"Processing {len(nohl_files)} files")
                            process_instances(instance_type, url, api, nohl_files, include_profiles, exclude_profiles, dry_run, exclude_series)
        time.sleep(5)

if __name__ == "__main__":
    main()
    logger.info("Script finished")