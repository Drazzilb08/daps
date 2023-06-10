import os
import re
import time
from modules.config import Config
from modules.logger import setup_logger
from modules.arrpy import StARR

config = Config(script_name="nohl")
logger = setup_logger(config.log_level, "nohl")

season_regex = r"(?:S|s)(\d{1,2})"
episode_regex = r"(?:E|e)(\d{1,2})"
series_title_regex = title_regex = r"/([^/]+)/Season \d+/\1"
movie_title_regex = r"/([^/]+)/\1"
regex_pattern = re.compile(f"{series_title_regex}|{movie_title_regex}")
year_regex = r"(\d{4})"

def find_no_hl_files(media_paths):
    no_hl_files = None
    no_hl_files = []
    for dir in media_paths:
        print(f"Processing: {dir}")
        for root, dirs, files in os.walk(dir):
            for file in files:
                if file.endswith(".mkv") or file.endswith(".mp4"):
                    file_path = os.path.join(root, file)
                    if (os.path.isfile(file_path) and os.stat(file_path).st_nlink == 1):
                        no_hl_files.append(file_path)
    return no_hl_files

def process_instances(instance_type, url, api, nohl_files, include_profiles, exclude_profiles, exclude_series, dry_run):
    messages = []
    nohl_files.sort()
    media_data = []
    app = StARR(url, api, logger)
    media = app.get_media()
    if instance_type == 'Radarr':
        print("Processing Radarr")
        for file in nohl_files:
            title = re.search(movie_title_regex, file).group(1)
            year = int(re.search(year_regex, title).group(1))
            title = re.sub(r"\(\d{4}\)", "", title).strip()
            labled_data = {'title': title, 'year': year}
            media_data.append(labled_data)
    if instance_type == 'Sonarr':
        print("Processing Sonarr")
        for file in nohl_files:
            season_number = re.search(season_regex, file).group(1)
            title = re.search(series_title_regex, file).group(1)
            year = int(re.search(year_regex, title).group(1))
            title = re.sub(r"\(\d{4}\)", "", title).strip()
            if season_number:
                season_number_modified = int(season_number.lstrip('0'))
            existing_dict = next((d for d in media_data if d['title'] == title and d['year'] == year), None)
            if existing_dict:
                if season_number_modified not in existing_dict['seasons']:
                    existing_dict['seasons'].append(season_number_modified)
            else:
                media_data.append({'title': title, 'year': year, 'seasons': [season_number_modified]})
    fileIds = []
    results = []
    current_media_id = None
    for data in media_data:
        title = data['title']
        year = data['year']
        if instance_type == 'Sonarr':
            media_data_seasons = data['seasons']
        for m in media:
            quality_profile_id = None
            quality_profile_name = None
            media_title = m['title']
            media_year = m['year']
            media_id = m['id']
            monitored = m['monitored']
            quality_profile_id = m['qualityProfileId']
            quality_profile_name = app.get_quality_profile_name(quality_profile_id)
            if title == media_title and year == media_year:
                if exclude_profiles:
                    if quality_profile_name in exclude_profiles:
                        print(f"Excluding {media_title} because it is in the exclude list")
                        media.remove(m)
                        continue
                if quality_profile_name in include_profiles or (include_profiles is None or exclude_profiles is None):
                    if instance_type == 'Radarr':
                        if monitored == True:
                            fileids = (m['movieFile']['movieId'])
                            results.append({'title': media_title, 'media_id': media_id, 'fileIds': fileids})
                    if instance_type == 'Sonarr':
                        if exclude_series:
                            if media_title in exclude_series:
                                print(f"Excluding {media_title} because it is in the exclude series list")
                                media.remove(m)
                                continue
                        monitored_seasons = []
                        media_seasons = m['seasons']
                        if monitored == True:
                            for s in media_seasons:
                                season_number = s['seasonNumber']
                                season_monitored = s['monitored']
                                if season_monitored == True:
                                    monitored_seasons.append(season_number)
                            common_seasons = list(set(media_data_seasons) & set(monitored_seasons))
                            season_data = app.get_season_data(media_id)
                            fileIds = []
                            for s in season_data:
                                if s['seasonNumber'] in common_seasons:
                                    fileId = s['id']
                                    fileIds.append(fileId)
                            if current_media_id != media_id:
                                current_media_id = media_id
                                results.append({'title': media_title, 'media_id': media_id, 'seasons': common_seasons, 'fileIds': fileIds})
                media.remove(m)
    for result in results:
        media_id = result['media_id']
        title = result['title']
        fileIds = result['fileIds']
        if instance_type == 'Radarr':
            if not dry_run:
                app.delete_media(fileIds)
                app.refresh_media(media_id)
                app.search_media(media_id)
                message = f"Title: {title} would have been deleted and searched for."
            else: 
                print(f"Title: {title} would have been deleted and searched for")
        if instance_type == 'Sonarr':
            seasons = result['seasons']
            if not dry_run:
                app.delete_media(fileIds)
                app.refresh_media(media_id)
                for season in seasons:
                    app.search_season(media_id, season)
            else:
                print(f"Title: {title}, seasons: {seasons} would have been deleted and searched for a season pack")


def main():
    script_name = None
    exclude_series = None
    dry_run = config.dry_run
    instance_data = {
        'Radarr': config.radarr_data,
        'Sonarr': config.sonarr_data
    }
    for instance_type, instances in instance_data.items():
        for instance in instances:
            instance_name = instance['name']
            url = instance['url']
            api = instance['api']
            if instance_type == "Radarr" and config.radarr:
                data = next((data for data in config.radarr if data['name'] == instance_name), None)
                if data:
                    script_name = data['name']
                    paths = data['paths']
                    include_profiles = data['include_profiles']
                    exclude_profiles = data['exclude_profiles']
                    nohl_files = find_no_hl_files(paths)
            elif instance_type == "Sonarr" and config.sonarr:
                data = next((data for data in config.sonarr if data['name'] == instance_name), None)
                if data:
                    script_name = data['name']
                    paths = data['paths']
                    nohl_files = find_no_hl_files(paths)
                    include_profiles = data['include_profiles']
                    exclude_profiles = data['exclude_profiles']
                    exclude_series = data['exclude_series']
            if script_name and instance_name == script_name:
                    process_instances(instance_type, url, api, nohl_files, include_profiles, exclude_profiles, exclude_series, dry_run)


if __name__ == "__main__":
    main()
    logger.info("Script finished")