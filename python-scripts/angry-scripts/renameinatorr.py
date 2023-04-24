#   _____                                 _             _                  _____
#  |  __ \                               (_)           | |                |  __ \
#  | |__) |___ _ __   __ _ _ __ ___   ___ _ _ __   __ _| |_ ___  _ __ _ __| |__) |   _
#  |  _  // _ \ '_ \ / _` | '_ ` _ \ / _ \ | '_ \ / _` | __/ _ \| '__| '__|  ___/ | | |
#  | | \ \  __/ | | | (_| | | | | | |  __/ | | | | (_| | || (_) | |  | |_ | |   | |_| |
#  |_|  \_\___|_| |_|\__,_|_| |_| |_|\___|_|_| |_|\__,_|\__\___/|_|  |_(_)|_|    \__, |
#                                                                                 __/ |
#                                                                                |___/
# v.1.1.0

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
                raise ValueError(
                    "URL does not point to a valid Sonarr instance.")
            logger.debug(
                f"\nConnected to {app_name} (v{app_version}) at {self.url}")
        except (requests.exceptions.RequestException, ValueError) as e:
            raise ValueError(
                f"Failed to connect to Sonarr instance at {self.url}: {e}")

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
            raise ValueError(
                f"Failed to get series with status code {response.status_code}")

    def add_tag(self, series_id, tag_id):
        """
        This function adds a tag with the given ID to a series with the given series ID.
        :param series_id: The ID of the series to which the tag will be added.
        :param tag_id: The ID of the tag to be added to the series.
        :return: None
        """
        payload = {
            "seriesIds": [series_id],
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
                logger.debug(
                    f'Tag Name: {tag_name} exists with tagId: {tag_id}')
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

    def remove_tags(self, all_series, tag_id, tag_name, logger):
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
            logger.debug(
                f"Successfully removed tag: {tag_name} with ID {tag_id} from {len(series_ids)} series.")
        else:
            logger.debug(
                f"Failed to remove tag: {tag_name} with ID {tag_id} from {len(series_ids)} series. Response status code: {response.status_code}")
        return False

    def get_rename_list(self, series_id):
        """
        This method retrieves the list of episodes to be renamed for the specified series ID.
        :param series_id: The ID of the series to retrieve the rename list for.
        :return: A list of episodes to be renamed.
        """
        # Get the list of episodes to be renamed
        endpoint = f"{self.url}/api/v3/rename?seriesId={series_id}"
        response = self.session.get(endpoint, headers=self.headers)
        response.raise_for_status()
        episodes_to_rename = response.json()
        return episodes_to_rename

    def rename_files(self, series_id, episode_file_ids, logger):
        """
        Sends a request to rename a list of episode files
        Parameters:
            series_id (int): ID of the series the episode files belong to
            episode_file_ids (List[int]): List of IDs of episode files to be renamed
            max_retries (int): Maximum number of retries for checking task status (default=10)
        Returns:
        bool: Returns `True` if the episode files were renamed successfully
        """
        max_retries = 10
        payload = {
            "name": "RenameFiles",
            "seriesId": series_id,
            "files": episode_file_ids
        }
        endpoint = f"{self.url}/api/v3/command"
        try:
            response = requests.post(
                endpoint, headers=self.headers, json=payload)
            response.raise_for_status()
            task_id = response.json()["id"]
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to rename files: {e}")
            return False
        task_complete = False
        retries = 0
        while not task_complete and retries < max_retries:
            endpoint = f"{self.url}/api/v3/command/{task_id}"
            try:
                response = self.session.get(endpoint, headers=self.headers)
                response.raise_for_status()
                task_status = response.json()
                if task_status["status"] == "completed":
                    task_complete = True
                else:
                    logger.debug(
                        f'Sleeping for 5 seconds until all episodes have been renamed')
                    time.sleep(5)
            except requests.exceptions.RequestException as e:
                logger.warning(f"Failed to check task status: {e}")
                retries += 1
                time.sleep(5)
        if not task_complete:
            logger.error(
                f"Failed to rename files: task did not complete after {max_retries} retries")
            return False
        return True
    # Send command to refresh all series

    def refresh_series(self, logger):
        """
        Sends a request to refresh all series
        Returns:
        bool: Returns `True` if the series were refreshed successfully
        """
        payload = {
            "name": "RefreshSeries"
        }
        endpoint = f"{self.url}/api/v3/command"
        try:
            response = requests.post(
                endpoint, headers=self.headers, json=payload)
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to refresh series: {e}")
            return False
        return True


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
                raise ValueError(
                    "URL does not point to a valid Radarr instance.")
            logger.debug(
                f"\nConnected to {app_name} (v{app_version}) at {self.url}")
        except (requests.exceptions.RequestException, ValueError) as e:
            raise ValueError(
                f"Failed to connect to Radarr instance at {self.url}: {e}")

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
            list: A list of dictionaries representing all movies in Radarr.
        """
        endpoint = f"{self.url}/api/v3/movie"
        response = self.session.get(endpoint, headers=self.headers)
        if response.status_code in [requests.codes.ok, 201]:
            all_movies = response.json()
            return all_movies
        else:
            raise ValueError(
                f"Failed to get movies with status code {response.status_code}")

    def add_tag(self, movie_id, tag_id):
        """Add a tag to a movie with given movie_id
        Args:
            movie_id (int): the id of the movie to add the tag to
            tag_id (int): the id of the tag to add
        Raises:
            requests.exceptions.HTTPError: if the response from the API is not a 202 (Accepted) status code
        """
        payload = {
            "movieIds": [movie_id],
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
                logger.debug(
                    f'Tag Name: {tag_name} exists with tagId: {tag_id}')
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
            logger.debug(
                f"Successfully removed tag: {tag_name} with ID {tag_id} from {len(movie_ids)} movies.")
        else:
            logger.debug(
                f"Failed to remove tag: {tag_name} with ID {tag_id} from {len(movie_ids)} movies. Response status code: {response.status_code}")
        return False

    def get_rename_list(self, movie_id):
        """
        This method retrieves the list of episodes to be renamed for the specified movie ID.

        :param movie_id: The ID of the movie to retrieve the rename list for.
        :return: A list of movies to be renamed.
        """
        # Get the list of movies to be renamed
        endpoint = f"{self.url}/api/v3/rename?movieId={movie_id}"
        response = requests.get(endpoint, headers=self.headers)
        # Convert the response to a list of movies to be renamed
        movies_to_rename = response.json()
        return movies_to_rename

    def rename_files(self, movie_id, movies_to_rename, logger):
        """
        Sends a request to rename a list of movie files
        Parameters:
            movie_id (int): ID of the movies the movie files belong to
            movies_to_rename (List[int]): List of IDs of movie files to be renamed
            max_retries (int): Maximum number of retries for checking task status (default=10)
        Returns:
        bool: Returns `True` if the movie files were renamed successfully
        """
        max_retries = 10
        payload = {
            "name": "RenameFiles",
            "movieId": movie_id,
            "files": movies_to_rename
        }
        endpoint = f"{self.url}/api/v3/command"
        try:
            response = requests.post(
                endpoint, headers=self.headers, json=payload)
            response.raise_for_status()
            task_id = response.json()["id"]
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to rename files: {e}")
            return False
        task_complete = False
        retries = 0
        while not task_complete and retries < max_retries:
            endpoint = f"{self.url}/api/v3/command/{task_id}"
            try:
                response = self.session.get(endpoint, headers=self.headers)
                response.raise_for_status()
                task_status = response.json()
                if task_status["status"] == "completed":
                    task_complete = True
                else:

                    logger.debug(
                        f'Sleeping for 5 seconds until all movies have been renamed')
                    time.sleep(5)
            except requests.exceptions.RequestException as e:
                logger.warning(f"Failed to check task status: {e}")
                retries += 1
                time.sleep(5)
        if not task_complete:
            logger.error(
                f"Failed to rename files: task did not complete after {max_retries} retries")
            return False
        return True
    # Send command to refresh movies

    def refresh_movies(self, logger):
        """
        Sends a request to refresh a list of movies
        Returns:
        bool: Returns `True` if the movies were refreshed successfully
        """
        payload = {
            "name": "RefreshMovie"
        }
        endpoint = f"{self.url}/api/v3/command"
        try:
            response = requests.post(
                endpoint, headers=self.headers, json=payload)
            response.raise_for_status()
            task_id = response.json()["id"]
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to refresh movies: {e}")
            return False
        return True


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


def print_format(media, to_rename, type, dry_run, logger):
    """
        Prints the output in a formatted manner for the given media type and dry_run status.
    Parameters:
        media (dict): The media information for the TV series/movie.
        to_rename (list): The list of files that have been renamed.
        type (str): The media type - "sonarr" or "radarr".
        dry_run (bool): Indicates if it's a dry run (True) or actual run (False).
    Returns:
        None
    """
    if dry_run == True:
        tagged = "would have been tagged"
    elif dry_run == False:
        tagged = "has been tagged"
    if type == "sonarr":
        series_title = media["title"]
        logger.info(f"Series Title: {series_title} {tagged}.")
        current_season = None
        for episode in to_rename:
            episode_number = episode["episodeNumbers"][0]
            season_number = episode["seasonNumber"]
            existing_path = episode["existingPath"]
            new_path = episode["newPath"]
            if current_season != season_number:
                current_season = season_number
                logger.info(f"\tSeason {season_number:02d}:")
            logger.info(
                f"\t\t{existing_path.split('/')[-1]} renamed to {new_path.split('/')[-1]}")
    if type == "radarr":
        for file in to_rename:
            existing_path = file["existingPath"]
            new_path = file["newPath"]
            movie_title = media["title"]
            logger.info(f"Movie Title: {movie_title} {tagged}.")
            logger.info(
                f"\t{existing_path.split('/')[-1]} renamed to {new_path.split('/')[-1]}")


def validate_input(instance_name, url, api_key, dry_run, unattended, count, tag_name, logger):
    if not (url.startswith("http://") or url.startswith("https://")):
        raise ValueError(
            f'\'{instance_name}\' URL must start with \'http://\' or \'https://://\'')
    if url.startswith("http://") or url.startswith("https://"):
        if not api_key:
            raise ValueError(f'API key is required for \'{instance_name}\'')
        if dry_run is not True and dry_run is not False:
            logger.warning(
                f'Error: \'unattended: {unattended}\' in \'{instance_name}\' must be either True or False. Defaulting to False')
            dry_run = True
        if unattended is not True and unattended is not False:
            logger.warning(
                f'Error: {unattended} in {instance_name} must be either True or False. Defaulting to False')
            unattended = False
        if count is None:
            logger.warning(
                f'Error: \'count: \' is empty: Setting count to default value of 1')
            count = 1
        else:
            if not isinstance(count, int):
                logger.warning(
                    f'Error: \'count: {count}\' in \'{instance_name}\' is not a valid count. Setting count to default value of 1')
                count = 1
            else:
                count = int(count)
        if count <= 0:
            logger.warning(
                f'Error: \'count: {count}\' in \'{instance_name}\' is not a valid count. Setting count to default value of 1')
            count = 1
        if tag_name == "":
            raise ValueError(
                f'\'tag_name: \' in {instance_name} is empty. This must be set')
        return dry_run, unattended, count


def setup_logger(log_level):
    # Create a directory to store logs, if it doesn't exist
    log_dir = os.path.dirname(os.path.realpath(__file__)) + "/logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    # Get the current date in YYYY-MM-DD format
    today = time.strftime("%Y-%m-%d")
    # Create a log file with the current date in its name
    log_file = f"{log_dir}/renameinatorr_{today}.log"
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
        logger.critical(
            f"Invalid log level '{log_level}', defaulting to 'INFO'")
        logger.setLevel(logging.INFO)
    # Set the formatter for the file handler
    formatter = logging.Formatter(
        fmt='%(asctime)s %(levelname)s: %(message)s', datefmt='%I:%M %p')
    # Add a TimedRotatingFileHandler to the logger, to log to a file that rotates daily
    handler = logging.handlers.TimedRotatingFileHandler(
        log_file, when='midnight', interval=1, backupCount=3)
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
    log_files = [f for f in os.listdir(log_dir) if os.path.isfile(
        os.path.join(log_dir, f)) and f.startswith("renameinatorr_")]
    log_files.sort(key=lambda x: os.path.getmtime(
        os.path.join(log_dir, x)), reverse=True)
    for file in log_files[3:]:
        os.remove(os.path.join(log_dir, file))
    return logger


def main():
    # Construct the path to the config file based on the script file's path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    config_file_path = os.path.join(script_dir, 'config.yml')

    # Load the config file
    with open(config_file_path) as f:
        config = yaml.safe_load(f)

    renameinator = config.get('renameinator', {})
    log_level = renameinator.get('log_level').upper()
    dry_run = renameinator.get('dry_run')

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
    logger.debug(f'*' * 40)
    logger.debug('')
    for instance, instance_settings in renameinator.items():
        if instance in ['log_level', 'dry_run']:
            continue
        for instance_setting in instance_settings:
            instance_name = instance_setting['name']
            instance_global_settings = None
            global_settings_list = config['global'].get(instance)
            if global_settings_list is None:
                continue
            # Check if instance_name exists in global_settings_list
            if not any(setting['name'] == instance_name for setting in global_settings_list):
                continue
            for global_settings in global_settings_list:
                if global_settings['name'] == instance_name:
                    instance_global_settings = global_settings
                    break
            if instance_global_settings is not None:
                url = instance_global_settings['url']
                api_key = instance_global_settings['api']
                if url is None and api_key is None:
                    continue
                count = instance_setting.get('count')
                tag_name = instance_setting.get('tag_name')
                unattended = instance_setting.get('unattended')
                reset = instance_setting.get('reset')
                dry_run, unattended, count = validate_input(
                    instance_name, url, api_key, dry_run, unattended, count, tag_name, logger)
                logger.debug(f'{" Settings ":*^40}')
                logger.debug(f"Section Name: {instance_name}")
                logger.debug(f"URL: {url}")
                logger.debug(f"API Key: {'<redacted>' if api_key else 'None'}")
                logger.debug(f"Count: {count}")
                logger.debug(f"Tag_name: {tag_name}")
                logger.debug(f"Unattended: {unattended}")
                logger.debug(f"Reset: {reset}")
                logger.debug(f'*' * 40)
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
                section_class = class_map.get(
                    instance_name.split('_')[0].capitalize())
                arr_instance = section_class(url, api_key, logger)
                radarr_all_tagged, sonarr_all_tagged = False, False
                # Add the instance to the appropriate list
                if section_class == RadarrInstance:
                    radarr_instances = []
                    radarr_instances.append(arr_instance)
                    for radarr in radarr_instances:
                        tagged_count = 0
                        untagged_count = 0
                        radarr_tag_id = radarr.check_and_create_tag(
                            tag_name, dry_run, logger)
                        all_movies = radarr.get_movies()
                        logger.debug(
                            f"Length of all_movies for {str(radarr)}: {len(all_movies)}")
                        all_radarr_tagged = check_all_tagged(
                            all_movies, radarr_tag_id)
                        if reset is True:
                            radarr.remove_tags(
                                all_movies, radarr_tag_id, tag_name, logger)
                            logger.info(
                                f'All of {instance_name} have had the tag {tag_name} removed.')
                            logger.info("Skipping...")
                            continue
                        elif all_radarr_tagged is True and unattended is True:
                            radarr.remove_tags(
                                all_movies, radarr_tag_id, tag_name, logger)
                            logger.info(
                                f'All of {instance_name} have had the tag {tag_name} removed.')
                        # If all the movies are tagged and unattended is False, set radarr_all_tagged to True
                        elif all_radarr_tagged is True and unattended is False:
                            logger.info(
                                f'All of {instance_name} has been tagged with {tag_name} skipping.')
                            radarr_all_tagged = True
                            continue
                        if all_radarr_tagged is False:
                            untagged_movies = [
                                m for m in all_movies if radarr_tag_id not in m['tags']]
                            movies_to_process = untagged_movies[:count]
                            checked = True
                            for movies in movies_to_process:
                                movie_id = movies["id"]
                                file_to_rename = radarr.get_rename_list(
                                    movie_id)
                                movies_to_rename = [file["movieFileId"]
                                                    for file in file_to_rename]
                                if movies_to_rename:
                                    if dry_run == False:
                                        checked = radarr.rename_files(
                                            movie_id, movies_to_rename, logger)
                                    print_format(
                                        movies, file_to_rename, "radarr", dry_run, logger)
                                if checked == True:
                                    if dry_run == False:
                                        radarr.add_tag(movie_id, radarr_tag_id)
                                        logger.info(
                                            f'Movie: \'{movies["title"]}\' has been tagged with \'{tag_name}\'.')
                                        radarr.refresh_movies(logger)
                                    if dry_run == True:
                                        logger.info(
                                            f'Movie file: \'{movies["title"]}\' doesn\'t require renaming it would have been been tagged with \'{tag_name}\'.')
                            for movies in all_movies:
                                if (radarr_tag_id in movies["tags"]):
                                    tagged_count += 1
                                elif (radarr_tag_id not in movies["tags"]):
                                    untagged_count += 1
                        total_count = 0
                        total_count = tagged_count + untagged_count
                        tagged_percent = (tagged_count / total_count) * 100
                        untagged_percent = (untagged_count / total_count) * 100
                        logger.info(
                            f'Total Movies: {total_count}, Tagged Movies: {tagged_count} ({tagged_percent:.2f}%), Untagged Movies: {untagged_count} ({untagged_percent:.2f}%)\n')
                elif section_class == SonarrInstance:
                    sonarr_instances = []
                    sonarr_instances.append(arr_instance)
                    for sonarr in sonarr_instances:
                        tagged_count = 0
                        untagged_count = 0
                        sonarr_tag_id = sonarr.check_and_create_tag(
                            tag_name, dry_run, logger)
                        all_series = sonarr.get_series()
                        logger.debug(
                            f"Length of all_series for {str(sonarr)}: {len(all_series)}")
                        all_sonarr_tagged = check_all_tagged(
                            all_series, sonarr_tag_id)
                        if reset is True:
                            sonarr.remove_tags(
                                all_series, sonarr_tag_id, tag_name, logger)
                            logger.info(
                                f'All of {instance_name} have had the tag {tag_name} removed.')
                            logger.info("Skipping...")
                            continue
                        elif all_sonarr_tagged is True and unattended is True:
                            sonarr.remove_tags(
                                all_series, sonarr_tag_id, tag_name, logger)
                            logger.info(
                                f'All of {instance_name} have had the tag {tag_name} removed.')
                        elif all_sonarr_tagged is True and unattended is False:
                            logger.info(
                                f'All of {instance_name} has been tagged with {tag_name} skipping.')
                            sonarr_all_tagged = True
                            continue
                        if all_sonarr_tagged is False:
                            untagged_series = [
                                s for s in all_series if sonarr_tag_id not in s['tags']]
                            series_to_process = untagged_series[:count]
                            checked = True
                            for series in series_to_process:
                                series_id = series["id"]
                                episodes_to_rename = sonarr.get_rename_list(
                                    series_id)
                                episode_file_ids = [
                                    episode["episodeFileId"] for episode in episodes_to_rename]
                                if episode_file_ids:
                                    if dry_run == False:
                                        checked = sonarr.rename_files(
                                            series_id, episode_file_ids, logger)
                                    print_format(
                                        series, episodes_to_rename, "sonarr", dry_run, logger)
                                if checked == True:
                                    if dry_run == False:
                                        logger.info(
                                            f'Series: \'{series["title"]}\' has been tagged with \'{tag_name}\'.')
                                        sonarr.add_tag(
                                            series_id, sonarr_tag_id)
                                        # Refresh all series
                                        sonarr.refresh_series(logger)
                                    if dry_run == True:
                                        logger.info(
                                            f'Series: \'{series["title"]}\' doesn\'t have any episodes that require renaming, the series would have been been tagged with \'{tag_name}\'.')
                        for series in all_series:
                            if (sonarr_tag_id in series["tags"]):
                                tagged_count += 1
                            elif (sonarr_tag_id not in series["tags"]):
                                untagged_count += 1
                        total_count = 0
                        total_count = tagged_count + untagged_count
                        tagged_percent = (tagged_count / total_count) * 100
                        untagged_percent = (untagged_count / total_count) * 100
                        logger.info(
                            f'Total Series: {total_count}, Tagged Series: {tagged_count} ({tagged_percent:.2f}%), Untagged Series: {untagged_count} ({untagged_percent:.2f}%)\n')
                if radarr_all_tagged == True and sonarr_all_tagged == True:
                    # If all series and movies have been tagged and renamed.
                    logger.info(
                        f'All series and movies in both Sonarr and Radarr have been renamed.')
                    # Running this unmonitored by setting the unattended variable to True
                    logger.info(
                        f'Please set the `unattended` variable to True if you\'d like to run this unmonitored')
                    # Alternatively, removing all tags by setting the reset variable to True
                    logger.info(
                        f'Alternatively you can set the `reset` variable to True if you\'d like to remove all Tags')
            except ValueError as e:
                logger.info(
                    f"Skipping section {instance_name} due to error: {e}")


if __name__ == "__main__":
    main()
