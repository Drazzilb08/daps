#   _    _                           _ _             _                  _____       
#  | |  | |                         | (_)           | |                |  __ \      
#  | |  | |_ __   __ _ _ __ __ _  __| |_ _ __   __ _| |_ ___  _ __ _ __| |__) |   _ 
#  | |  | | '_ \ / _` | '__/ _` |/ _` | | '_ \ / _` | __/ _ \| '__| '__|  ___/ | | |
#  | |__| | |_) | (_| | | | (_| | (_| | | | | | (_| | || (_) | |  | |_ | |   | |_| |
#   \____/| .__/ \__, |_|  \__,_|\__,_|_|_| |_|\__,_|\__\___/|_|  |_(_)|_|    \__, |
#         | |     __/ |                                                        __/ |
#         |_|    |___/                                                        |___/ 
# V 1.0.0

import requests
import json
import os
import time
import yaml
import sys
from logging.handlers import RotatingFileHandler
import logging

class SonarrInstance:
    def __init__(self, url, api_key, logger):
        """

        Initialize the SonarrInstance object
        Arguments:
            - url: the URL of the Sonarr API endpoint
            - api_key: the API key used to authenticate with the API
        """
        self.url = url.rstrip("/")
        self.url = url
        self.api_key = api_key
        self.headers = {
            "x-api-key": api_key
        }
        self.session = requests.Session()
        self.session.headers.update({"X-Api-Key": self.api_key})
        
        try:
            status = self.get_system_status()
            app_name = status.get("appName")
            app_version = status.get("version")
            if not app_name.startswith("Sonarr"):
                raise ValueError("URL does not point to a valid Sonarr instance.")
            logger.debug(f"\nConnected to {app_name} (v{app_version}) at {self.url}")
        except (requests.exceptions.RequestException, ValueError) as e:
            raise ValueError(f"Failed to connect to Sonarr instance at {self.url}: {e}")

    def __str__(self):
        return f"SonarrInstance(url={self.url})"

    def get_system_status(self):
        url = f"{self.url}/api/v3/system/status"
        response = self.session.get(url)
        response.raise_for_status()
        return response.json()

    def get_all_tags(self):
        """
        Get a list of all tags in Sonarr.
        
        Returns:
            A list of dictionaries representing all tags in Sonarr.
        """
        endpoint = f"{self.url}/api/v3/tag"
        response = self.session.get(endpoint, headers=self.headers)
        return response.json()

    def create_tag(self, label, logger):
        """
        Create a new tag with the specified label
        Parameters:
            label (str): The label for the new tag
            logger (logging.Logger): a logger object for logging debug messages.
        Raises:
            Exception: If the API call to create the tag fails
        """
        payload = {
            "label": label
        }
        endpoint = f"{self.url}/api/v3/tag"
        response = self.session.post(endpoint, json=payload)
        if response.status_code == requests.codes.created:
            tag_data = response.json()
            tag_id = tag_data.get("id")
            logger.debug(f'Tag "{label}" created with ID {tag_id}.')
        else:
            logger.error(f"Failed to create tag: {response.text}")
            raise Exception(f"Failed to create tag: {label}")

    def get_series(self):
        """
        Get a list of all series in Sonarr.
        Returns:
            list: A list of dictionaries representing all series in Sonarr.
        """
        endpoint = f"{self.url}/api/v3/series"
        response = self.session.get(endpoint, headers=self.headers)
        if response.status_code in [requests.codes.ok, 201]:
            all_series = response.json()
            return all_series
        else:
            raise ValueError(f"Failed to get series with status code {response.status_code}")

    def add_tag(self, series_id, tag_id):
        """
        This function adds a tag with the given ID to a series with the given series ID.
        :param series_id: The ID of the series to which the tag will be added.
        :param tag_id: The ID of the tag to be added to the series.
        :return: None
        """
        payload = {
            "seriesIds": series_id,
            "tags": [tag_id],
            "applyTags": "add"
        }
        endpoint = f"{self.url}/api/v3/series/editor"
        response = self.session.put(endpoint, json=payload)
        response.raise_for_status()

    def check_and_create_tag(self, tag_name, dry_run, logger):
        """
        Check if a the desired tag exists in Sonarr, and if not, create it.
        Returns the ID of the desired tag.
        """
        all_tags = self.get_all_tags()
        tag_id = None
        for tag in all_tags:
            if tag["label"] == tag_name:
                tag_id = tag["id"]
                logger.debug(f'Tag Name: {tag_name} exists with tagId: {tag_id}')
                break
        if tag_id is None:
            if dry_run == False:
                self.create_tag(tag_name, logger)
                all_tags = self.get_all_tags()
                for tag in all_tags:
                    if tag["label"] == tag_name:
                        tag_id = tag["id"]
                        break
            else:
                logger.info(f'Tag Name: {tag_name} would have been created.')
        return tag_id

    def remove_tags(self, all_series, tag_id, tag_name):
        """
        Remove a specific tag from a list of series.
        Parameters:
            all_series (list): a list of series dictionaries, each containing information about a series.
            tag_id (int): the ID of the tag to be removed.
        Returns:
            False: always returns False, since this function only updates the tags of serise and does not return any data.
        """
        series_ids = []
        for series in all_series:
            if tag_id in series["tags"]:
                series_ids.append(series["id"])
        if not series_ids:
            return false
        endpoint = f"{self.url}/api/v3/series/editor"
        payload = {
            "seriesIds": series_ids,
            "tags": [tag_id],
            "applyTags": "remove"
        }
        endpoint = f"{self.url}/api/v3/series/editor"
        response = self.session.put(endpoint, json=payload)
        if response.status_code == 202:
            logger.debug(f"Successfully removed tag: {tag_name} with ID {tag_id} from {len(movie_ids)} movies.")
        else:
            logger.debug(f"Failed to remove tag: {tag_name} with ID {tag_id} from {len(movie_ids)} movies. Response status code: {response.status_code}")
        return False

    def search_series(self, series_id):
        # Create the payload data for the API request
        payload = {
            "name": "SeriesSearch",
            "seriesIds": series_id
        }
        endpoint = f"{self.url}/api/v3/command"
        response = self.session.post(endpoint, json=payload)
        response.raise_for_status() 

class RadarrInstance():
    def __init__(self, url, api_key, logger):
        """
        Initialize the RadarrInstance object
        Arguments:
            - url: the URL of the Radarr API endpoint
            - api_key: the API key used to authenticate with the API
        """
        self.url = url.rstrip("/")
        self.url = url
        self.api_key = api_key
        self.headers = {
            "x-api-key": api_key
        }
        self.session = requests.Session()
        self.session.headers.update({"X-Api-Key": self.api_key})
        try:
            status = self.get_system_status()
            app_name = status.get("appName")
            app_version = status.get("version")
            if not app_name.startswith("Radarr"):
                raise ValueError("URL does not point to a valid Radarr instance.")
            logger.debug(f"\nConnected to {app_name} (v{app_version}) at {self.url}")
        except (requests.exceptions.RequestException, ValueError) as e:
            raise ValueError(f"Failed to connect to Radarr instance at {self.url}: {e}")

    def __str__(self):
        return f"RadarrInstance(url={self.url})"

    def get_system_status(self):
        endpoint = f"{self.url}/api/v3/system/status"
        response = self.session.get(endpoint)
        response.raise_for_status()
        return response.json()

    def get_all_tags(self):
        """
        Get a list of all tags in Radarr.
        
        Returns:
            A list of dictionaries representing all tags in Radarr.
        """
        endpoint = f"{self.url}/api/v3/tag"
        response = self.session.get(endpoint, headers=self.headers)
        return response.json()

    def create_tag(self, label, logger):
        """
        Create a new tag with the specified label
        Parameters:
            label (str): The label for the new tag
            logger (logging.Logger): a logger object for logging debug messages.
        Raises:
            Exception: If the API call to create the tag fails
        """
        payload = {
            "label": label
        }
        endpoint = f"{self.url}/api/v3/tag"
        response = self.session.post(endpoint, json=payload)
        if response.status_code == requests.codes.created:
            tag_data = response.json()
            tag_id = tag_data.get("id")
            logger.debug(f'Tag "{label}" created with ID {tag_id}.')
        else:
            logger.error(f"Failed to create tag: {response.text}")
            raise Exception(f"Failed to create tag: {label}")

    def get_movies(self):
        """
        Get a list of all movies in Radarr.
        Returns:
            list: A list of dictionaries representing all series in Radarr.
        """
        endpoint = f"{self.url}/api/v3/movie"
        response = self.session.get(endpoint, headers=self.headers)
        if response.status_code in [requests.codes.ok, 201]:
            all_movies = response.json()
            return all_movies
        else:
            raise ValueError(f"Failed to get movies with status code {response.status_code}")

    def add_tag(self, movie_id, tag_id):
        """Add a tag to a movie with given movie_id
        Args:
            movie_id (int): the id of the movie to add the tag to
            tag_id (int): the id of the tag to add
        Raises:
            requests.exceptions.HTTPError: if the response from the API is not a 202 (Accepted) status code
        """
        payload = {
            "movieIds": movie_id,
            "tags": [tag_id],
            "applyTags": "add"
        }
        endpoint = f"{self.url}/api/v3/movie/editor"
        response = self.session.put(endpoint, json=payload)
        response.raise_for_status()

    def check_and_create_tag(self, tag_name, dry_run, logger):
        """
        Check if a the desired tag exists in Radarr, and if not, create it.
        Returns the ID of the desired tag.
        """
        all_tags = self.get_all_tags()
        tag_id = None
        for tag in all_tags:
            if tag["label"] == tag_name:
                tag_id = tag["id"]
                logger.debug(f'Tag Name: {tag_name} exists with tagId: {tag_id}')
                break
        if tag_id is None:
            if dry_run == False:
                self.create_tag(tag_name, logger)
                all_tags = self.get_all_tags()
                for tag in all_tags:
                    if tag["label"] == tag_name:
                        tag_id = tag["id"]
                        # Break out of the loop
                        break  
            else:
                logger.info(f'Tag Name: {tag_name} would have been created.')
        return tag_id

    def remove_tags(self, all_movies, tag_id, tag_name, logger):
        """
        Remove a specific tag from a list of movies.
        Parameters:
            all_movies (list): a list of movie dictionaries, each containing information about a movie.
            tag_id (int): the ID of the tag to be removed.
            tag_name (str): the name of the tag to be removed.
            logger (logging.Logger): a logger object for logging debug messages.
        Returns:
            False: always returns False, since this function only updates the tags of movies and does not return any data.
        """
        movie_ids = []
        for movie in all_movies:
            if tag_id in movie["tags"]:
                movie_ids.append(movie["id"])
        if not movie_ids:
            return False
        payload = {
            "movieIds": movie_ids,
            "tags": [tag_id],
            "applyTags": "remove"
        }
        endpoint = f"{self.url}/api/v3/movie/editor"
        response = self.session.put(endpoint, json=payload)
        if response.status_code == 202:
            logger.debug(f"Successfully removed tag: {tag_name} with ID {tag_id} from {len(movie_ids)} movies.")
        else:
            logger.debug(f"Failed to remove tag: {tag_name} with ID {tag_id} from {len(movie_ids)} movies. Response status code: {response.status_code}")
        return False

    def search_movies(self, movie_id):
        payload = {
            "name": "MoviesSearch",
            "movieIds": movie_id
        }
        endpoint = f"{self.url}/api/v3/command"
        response = self.session.post(endpoint, json=payload)
        response.raise_for_status() 

def check_all_tagged(all_media, tag_id):
    """
        Check if all the media in the `all_media` list has the `tag_id` tag applied.
    Parameters:
        all_media (list): A list of dictionaries containing media information.
        tag_id (int): The ID of the tag to check.
    Returns:
        bool: True if all media in the list has the tag applied, False otherwise.
    """
    for media in all_media:
        if tag_id not in media['tags']:
            return False
    return True

def discord_notification(discord_webhook):
    pass

def validate_input(instance_name, url, api_key, dry_run, unattended, count, monitored, status, tag_name, logger):
    if not (url.startswith("http://") or url.startswith("https://")):
        raise ValueError(f'\'{instance_name}\' URL must start with \'http://\' or \'https://://\'')
    if url.startswith("http://") or url.startswith("https://"):
        if not api_key:
            raise ValueError(f'API key is required for \'{instance_name}\'')
        if dry_run is not True and dry_run is not False:
            logger.warning(f'Error: \'dry_run: {dry_run}\' in \'{instance_name}\' must be either True or False. Defaulting to True')
            dry_run = True
        if unattended is not True and unattended is not False:
            logger.warning(f'Error: \'unattended: {unattended}\' in \'{instance_name}\' must be either True or False. Defaulting to False')
            unattended = False
        if (instance_name.startswith("radarr")):
            if status not in ("tba", "announced", "incinemas", "released", "deleted"):
                logger.warning(f'Error: \'status: {status}\' in \'{instance_name}\' is not one of the defined status types: tba, announced, inCinemas, released, deleted')
                logger.warning("Setting setting status to: 'released'")
                status = "released"
        elif (instance_name.startswith("sonarr")):
            if status not in ("continuing", "ended", "upcoming", "deleted"):
                logger.warning(f'Error: \'status: {status}\' in \'{instance_name}\' is not one of the defined status types: continuing, ended, upcoming, deleted')
                logger.warning("Setting setting status to: 'continuing'")
                status = "continuing"
        if count is None:
            logger.warning(f'Error: \'count: \' is empty in \'{instance_name}\': Setting count to default value of 1')
            count = 1
        else:
            if not isinstance(count, int):
                logger.warning(f'Error: \'count: {count}\' in \'{instance_name}\' is not a valid count. Setting count to default value of 1')
                count = 1
            else:
                count = int(count)
        if count <= 0:
            logger.warning(f'Error: \'count: {count}\' in \'{instance_name}\' is not a valid count. Setting count to default value of 1')
            count = 1
        if monitored is not True and monitored is not False:
            logger.warning(f'Error: \'monitored: {monitored}\' in \'{instance_name}\' must be either True or False. Setting monitored to default value of True')
            monitored = True
        if tag_name == None:
            raise ValueError(f'\'tag_name: \' in {instance_name} is empty. This must be set')
        return dry_run, unattended, count, monitored, status

def main():
    # Construct the path to the config file based on the script file's path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    config_file_path = os.path.join(script_dir, 'config.yml')

    # Load the config file
    with open(config_file_path) as f:
        config = yaml.safe_load(f)
        
    upgradinatorr = config.get('upgradinatorr', {})
    log_level = upgradinatorr.get('log_level').upper()
    dry_run = upgradinatorr.get('dry_run')
    discord_webhook = upgradinatorr.get('discord_webhook', '')
    
    logger = setup_logger(log_level)
    
    if dry_run:
    # If dry_run is activated, print a message indicating so and the status of other variables.
        logger.info('*' * 40)
        logger.info(f'* {"Dry_run Activated":^36} *')
        logger.info('*' * 40)
        logger.info(f'* {" NO CHANGES WILL BE MADE ":^36} *')
        logger.info('*' * 40)
        logger.info('')
    logger.debug(f'{" Script Settings ":*^40}')
    logger.debug(f'Dry_run: {dry_run}')
    logger.debug(f"Log Level: {log_level}")
    logger.debug(f"Discord Webhook URL: {discord_webhook}")
    logger.debug(f'*' * 40 )
    logger.debug('')
    for instance, instance_settings in upgradinatorr.items():
        if instance in ['log_level', 'dry_run', 'discord_webhook']:
            continue
        for instance_setting in instance_settings:
            instance_name = instance_setting['name']
            instance_global_settings = None
            for global_settings in config['global'][instance]:
                if global_settings['name'] == instance_name:
                    instance_global_settings = global_settings
                    break
            if instance_global_settings is not None:
                url = instance_global_settings['url']
                api_key = instance_global_settings['api']
                if url is None and api_key is None:
                    continue
                count = instance_setting.get('count')
                monitored = instance_setting.get('monitored')
                status = instance_setting.get('status')
                tag_name = instance_setting.get('tag_name')
                unattended = instance_setting.get('unattended')
                dry_run, unattended, count, monitored, status = validate_input(instance_name, url, api_key, dry_run, unattended, count, monitored, status, tag_name, logger)
                logger.debug(f'{" Settings ":*^40}')
                logger.debug(f"Section Name: {instance_name}")
                logger.debug(f"URL: {url}")
                logger.debug(f"API Key: {'<redacted>' if api_key else 'None'}") 
                logger.debug(f"Count: {count}")
                logger.debug(f"Monitored: {monitored}")
                logger.debug(f"status: {status}")
                logger.debug(f"Tag_name: {tag_name}")
                logger.debug(f"Unattended: {unattended}")
                logger.debug(f'*' * 40 )
                logger.debug('')
            try:
                if url:
                    logger.info('*' * 40)
                    logger.info(f'* {instance_name:^36} *')
                    logger.info('*' * 40)
                    logger.info('')
            
                if not url and not api_key:
                    continue
                # Instantiate the class for this section
                class_map = {
                    'Radarr': RadarrInstance,
                    'Sonarr': SonarrInstance,
                }
                section_class = class_map.get(instance_name.split('_')[0].capitalize())
                arr_instance = section_class(url, api_key, logger)
                # Add the instance to the appropriate list
                if section_class == RadarrInstance:
                    radarr_instances = []
                    radarr_instances.append(arr_instance)
                    for radarr in radarr_instances:
                        tagged_count = 0
                        untagged_count = 0
                        radarr_tag_id = radarr.check_and_create_tag(tag_name, dry_run, logger)
                        all_movies = radarr.get_movies()
                        logger.debug(f"Length of all_movies for {str(radarr)}: {len(all_movies)}")
                        all_radarr_tagged = check_all_tagged(all_movies, radarr_tag_id)
                        if all_radarr_tagged is True and unattended is True:
                            all_radarr_tagged = radarr.remove_tags(all_movies, radarr_tag_id, tag_name)
                        elif all_radarr_tagged is True and unattended is False:
                            radarr_all_tagged = True
                            logger.info(f'All of {instance_name} has been tagged with {tag_name} skipping.')
                            continue
                        if all_radarr_tagged is False:
                            untagged_movies = [m for m in all_movies if radarr_tag_id not in m['tags'] and m['monitored'] == monitored and m['status'] == status]
                            movies_to_process = untagged_movies[:count]
                            for movies in movies_to_process:
                                movie_id = [int(m['id']) for m in movies_to_process]
                                if dry_run == False:
                                    radarr.search_movies(movie_id)
                                    radarr.add_tag(movie_id, radarr_tag_id)
                                    logger.info(f'Search request for the Movie: \'{movies["title"]}\' has been sent to \'{instance_name}\' and has been tagged with \'{tag_name}\'.')
                                else:
                                    logger.info(f'Search request for the Movie: \'{movies["title"]}\' would have been sent to \'{instance_name}\' and would have been tagged with \'{tag_name}\'.')
                            for movies in all_movies:
                                if (radarr_tag_id in movies["tags"]):
                                    tagged_count += 1
                                elif (radarr_tag_id not in movies["tags"]):
                                    untagged_count += 1
                        total_count = 0
                        total_count = tagged_count + untagged_count
                        tagged_percent = (tagged_count / total_count) * 100
                        untagged_percent = (untagged_count / total_count) * 100
                        logger.info(f'Total Movies: {total_count}, Tagged Movies: {tagged_count} ({tagged_percent:.2f}%), Untagged Movies: {untagged_count} ({untagged_percent:.2f}%)\n')               
                elif section_class == SonarrInstance:
                    sonarr_instances = []
                    sonarr_instances.append(arr_instance)
                    for sonarr in sonarr_instances:
                        tagged_count = 0
                        untagged_count = 0
                        sonarr_tag_id = sonarr.check_and_create_tag(tag_name, dry_run, logger)
                        all_series = sonarr.get_series()
                        logger.debug(f"Length of all_series for {str(sonarr)}: {len(all_series)}")
                        all_sonarr_tagged = check_all_tagged(all_series, sonarr_tag_id)
                        if all_sonarr_tagged is True and unattended is True:
                            all_sonarr_tagged = sonarr.remove_tags(all_series, sonarr_tag_id, tag_name)
                        elif all_sonarr_tagged is True and unattended is False:
                            sonarr_all_tagged = True
                            logger.info(f'All of {instance_name} has been tagged with {tag_name} skipping.')
                            break
                        if all_sonarr_tagged is False:
                            untagged_series = [s for s in all_series if sonarr_tag_id not in s['tags'] and s['monitored'] == monitored and s['status'] == status]
                            series_to_process = untagged_series[:count]
                            for series in series_to_process:
                                series_id = [int(s['id']) for s in series_to_process]
                                if dry_run == False:
                                    sonarr.search_series(series_id)
                                    sonarr.add_tag(series_id, sonarr_tag_id)
                                    logger.info(f'Search request for the Series: \'{series["title"]}\' has been sent to \'{instance_name}\' and has been tagged with \'{tag_name}\'.')
                                else:
                                    logger.info(f'Search request for the Series: \'{series["title"]}\' would have been sent to \'{instance_name}\' and would have been tagged with \'{tag_name}\'.')
                        for series in all_series:
                            if (sonarr_tag_id in series["tags"]):
                                tagged_count += 1
                            elif (sonarr_tag_id not in series["tags"]):
                                untagged_count += 1
                        total_count = 0
                        total_count = tagged_count + untagged_count
                        tagged_percent = (tagged_count / total_count) * 100
                        untagged_percent = (untagged_count / total_count) * 100
                        logger.info(f'Total Series: {total_count}, Tagged Series: {tagged_count} ({tagged_percent:.2f}%), Untagged Series: {untagged_count} ({untagged_percent:.2f}%)\n')
            except ValueError as e:
                logger.info(f"Skipping section {instance_name}: {e}")

def setup_logger(log_level):
    # Create a directory to store logs, if it doesn't exist
    log_dir = os.path.dirname(os.path.realpath(__file__)) + "/logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    # Get the current date in YYYY-MM-DD format
    today = time.strftime("%Y-%m-%d")
    # Create a log file with the current date in its name
    log_file = f"{log_dir}/upgradinatorr_{today}.log"
    # Set up the logger
    logger = logging.getLogger()
    # Convert the log level string to upper case and set the logging level accordingly
    log_level = log_level.upper()
    if log_level == 'DEBUG':
        logger.setLevel(logging.DEBUG)
    elif log_level == 'INFO':
        logger.setLevel(logging.INFO)
    elif log_level == 'CRITICAL':
        logger.setLevel(logging.CRITICAL)
    else:
        logger.critical(f"Invalid log level '{log_level}', defaulting to 'INFO'")
        logger.setLevel(logging.INFO)
    # Set the formatter for the file handler
    formatter = logging.Formatter(fmt='%(asctime)s %(levelname)s: %(message)s', datefmt='%I:%M %p')
    # Add a TimedRotatingFileHandler to the logger, to log to a file that rotates daily
    handler = logging.handlers.TimedRotatingFileHandler(log_file, when='midnight', interval=1, backupCount=3)
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    # Set the formatter for the console handler
    formatter = logging.Formatter()
        # Add a StreamHandler to the logger, to log to the console
    console_handler = logging.StreamHandler()
    if log_level == 'debug':
        console_handler.setLevel(logging.DEBUG)
    elif log_level == 'info':
        console_handler.setLevel(logging.info)
    elif log_level == 'critical':
        console_handler.setLevel(logging.CRITICAL)
    logger.addHandler(console_handler)
    # Delete the old log files
    log_files = [f for f in os.listdir(log_dir) if os.path.isfile(os.path.join(log_dir, f)) and f.startswith("upgradinatorr_")]
    log_files.sort(key=lambda x: os.path.getmtime(os.path.join(log_dir, x)), reverse=True)
    for file in log_files[3:]:
        os.remove(os.path.join(log_dir, file))
    return logger

if __name__ == '__main__':
    # Call the main function
    main()

