#   _____                                 _             _                  _____
#  |  __ \                               (_)           | |                |  __ \
#  | |__) |___ _ __   __ _ _ __ ___   ___ _ _ __   __ _| |_ ___  _ __ _ __| |__) |   _
#  |  _  // _ \ '_ \ / _` | '_ ` _ \ / _ \ | '_ \ / _` | __/ _ \| '__| '__|  ___/ | | |
#  | | \ \  __/ | | | (_| | | | | | |  __/ | | | | (_| | || (_) | |  | |_ | |   | |_| |
#  |_|  \_\___|_| |_|\__,_|_| |_| |_|\___|_|_| |_|\__,_|\__\___/|_|  |_(_)|_|    \__, |
#                                                                                 __/ |
#                                                                                |___/
# ===================================================================================================
# Author: Drazzilb
# Description: This script will rename all series in Sonarr/Radarr to match the naming scheme of the
#              Naming Convention within Radarr/Sonarr. It will also add a tag to the series so that it can be easily
#              identified as having been renamed.
# Usage: python3 /path/to/renameinatorr.py
# Requirements: requests, yaml, logging
# Version: 1.2.2
# License: MIT License
# ===================================================================================================

import requests
import json
import os
import time
import yaml
import sys
from logging.handlers import RotatingFileHandler
import logging


class SonarrInstance:
    """
    A class representing a Sonarr instance.
    """
    def __init__(self, url, api_key, logger):
        """
        Initialize a SonarrInstance object.
        Parameters:
            url (str): The URL of the Sonarr instance.
            api_key (str): The API key to use to connect to the Sonarr instance.
            logger (logging.Logger): a logger object for logging debug messages.
            Raises:
            ValueError: If the URL does not point to a valid Sonarr instance.
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
        """
        Return a string representation of the SonarrInstance object.
        Returns:
            A string representation of the SonarrInstance object.
        """
        return f"SonarrInstance(url={self.url})"

    def get_system_status(self):
        """
        Get the status of the Sonarr instance.
        Returns:
            A dictionary representing the status of the Sonarr instance.
        """
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
        Add a tag to a series.
        Parameters:
            series_id (int): The ID of the series to add the tag to 
            tag_id (int): The ID of the tag to add to the series
        Raises:
            Exception: If the API call to add the tag fails
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
        Check if a tag exists and create it if it doesn't.
        Parameters:
            tag_name (str): The name of the tag to check for
            dry_run (bool): If True, don't actually create the tag
            logger (logging.Logger): a logger object for logging debug messages.
        Returns:
            int: The ID of the tag
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
        Remove a tag from all series that have it.
        Parameters:
            all_series (list): A list of dictionaries representing all series in Sonarr.
            tag_id (int): The ID of the tag to remove
            tag_name (str): The name of the tag to remove
            logger (logging.Logger): a logger object for logging debug messages.
        Returns:
            bool: True if the tag was removed from at least one series, False otherwise
        """
        series_ids = []
        for series in all_series:
            if tag_id in series["tags"]:
                series_ids.append(series["id"])
        if not series_ids:
            return False
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
        Get the list of episodes to be renamed for a series.
        Parameters:
            series_id (int): The ID of the series to get the rename list for
        Returns:
            list: A list of dictionaries representing the episodes to be renamed
        """
        # Get the list of episodes to be renamed
        endpoint = f"{self.url}/api/v3/rename?seriesId={series_id}"
        response = self.session.get(endpoint, headers=self.headers)
        response.raise_for_status()
        episodes_to_rename = response.json()
        return episodes_to_rename

    def rename_files(self, series_id, episode_file_ids, logger):
        """
        Rename the files for a series.
        Parameters:
            series_id (int): The ID of the series to rename
            episode_file_ids (list): A list of episode file IDs to rename
            logger (logging.Logger): a logger object for logging debug messages.
        Returns:
            bool: True if the files were renamed successfully, False otherwise
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
    # Send command to refresh renamed series

    def refresh_series(self, logger, series_id):
        """
        Refresh a series.
        Parameters:
            logger (logging.Logger): a logger object for logging debug messages.
            series_id (int): The ID of the series to refresh
        Returns:
            bool: True if the series was refreshed successfully, False otherwise
        """
        payload = {
            "name": "RefreshSeries",
            "seriesIds": [series_id]
        }
        endpoint = f"{self.url}/api/v3/command"
        try:
            response = requests.post(
                endpoint, headers=self.headers, json=payload)
            response.raise_for_status()
            task_id = response.json()["id"]
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to refresh series: {e}")
            return False
        return True


class RadarrInstance():
    """
    A class representing a Radarr instance.
    """
    def __init__(self, url, api_key, logger):
        """
        Initialize a RadarrInstance object.
        Parameters:
            url (str): The URL of the Radarr instance
            api_key (str): The API key to use when connecting to the Radarr instance
            logger (logging.Logger): a logger object for logging debug messages.
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
        """
        Return a string representation of the RadarrInstance object.
        """
        return f"RadarrInstance(url={self.url})"

    def get_system_status(self):
        """
        Get the system status of the Radarr instance.
        Returns:
            dict: A dictionary containing the system status of the Radarr instance
        """
        endpoint = f"{self.url}/api/v3/system/status"
        response = self.session.get(endpoint)
        response.raise_for_status()
        return response.json()

    def get_all_tags(self):
        """
        Get all tags from the Radarr instance.
        Returns:
            dict: A dictionary containing all tags from the Radarr instance
        """
        endpoint = f"{self.url}/api/v3/tag"
        response = self.session.get(endpoint, headers=self.headers)
        return response.json()

    def create_tag(self, label, logger):
        """
        Create a tag in the Radarr instance.
        Parameters:
            label (str): The label of the tag to create
            logger (logging.Logger): a logger object for logging debug messages.
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
        Get all movies from the Radarr instance.
        Returns:
            dict: A dictionary containing all movies from the Radarr instance
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
        """
        Add a tag to a movie in the Radarr instance.
        Parameters:
            movie_id (int): The ID of the movie to add the tag to
            tag_id (int): The ID of the tag to add to the movie
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
        Check if a tag exists in the Radarr instance, and create it if it doesn't.
        Parameters:
            tag_name (str): The name of the tag to check
            dry_run (bool): Whether or not to actually create the tag
            logger (logging.Logger): a logger object for logging debug messages.
        Returns:
            int: The ID of the tag
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
        Remove a tag from all movies in the Radarr instance.
        Parameters:
            all_movies (dict): A dictionary containing all movies from the Radarr instance
            tag_id (int): The ID of the tag to remove
            tag_name (str): The name of the tag to remove
            logger (logging.Logger): a logger object for logging debug messages.
        Returns:
            bool: Whether or not the tag was removed from any movies
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
        Get the list of movies to be renamed.
        Parameters:
            movie_id (int): The ID of the movie to get the rename list for
        Returns:
            list: A list of movies to be renamed
        """
        # Get the list of movies to be renamed
        endpoint = f"{self.url}/api/v3/rename?movieId={movie_id}"
        response = requests.get(endpoint, headers=self.headers)
        # Convert the response to a list of movies to be renamed
        movies_to_rename = response.json()
        return movies_to_rename

    def rename_files(self, movie_id, movies_to_rename, logger):
        """
        Rename the files for a movie in the Radarr instance.
        Parameters:
            movie_id (int): The ID of the movie to rename
            movies_to_rename (list): A list of movies to be renamed
            logger (logging.Logger): a logger object for logging debug messages.
        Returns:
            bool: Whether or not the files were renamed
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

    def refresh_movies(self, logger, movies_to_rename):
        """
        Refresh the movies in the Radarr instance.
        Parameters:
            logger (logging.Logger): a logger object for logging debug messages.
            movies_to_rename (list): A list of movies to be renamed
        Returns:
            bool: Whether or not the movies were refreshed
        """
        payload = {
            "name": "RefreshMovie",
            "movieIds": movies_to_rename
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
    Check if all media is tagged with the specified tag.
    Parameters:
        all_media (list): A list of all media in the Plex instance
        tag_id (int): The ID of the tag to check for
    Returns:
        bool: Whether or not all media is tagged with the specified tag
    """
    for media in all_media:
        if tag_id not in media['tags']:
            return False
    return True


def print_format(media, to_rename, type, dry_run, logger):
    """
    Print the format of the rename list.
    Parameters:
        media (dict): The media to be renamed
        to_rename (list): A list of media to be renamed
        type (str): The type of media to be renamed
        dry_run (bool): Whether or not this is a dry run
        logger (logging.Logger): a logger object for logging debug messages.
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
    """
    Validate the input for the specified instance.
    Parameters:
        instance_name (str): The name of the instance
        url (str): The URL of the instance
        api_key (str): The API key of the instance
        dry_run (bool): Whether or not this is a dry run
        unattended (bool): Whether or not this is an unattended run
        count (int): The number of media to be renamed
        tag_name (str): The name of the tag to be used
        logger (logging.Logger): a logger object for logging debug messages.
    Returns:
        None
    """
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
    """
    Setup the logger.
    Parameters:
        log_level (str): The log level to use
    Returns:
        None
    """
    log_dir = os.path.dirname(os.path.realpath(__file__)) + "/logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    today = time.strftime("%Y-%m-%d")
    log_file = f"{log_dir}/renameinatorr_{today}.log"
    logger = logging.getLogger()
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
    formatter = logging.Formatter(
        fmt='%(asctime)s %(levelname)s: %(message)s', datefmt='%I:%M %p')
    handler = logging.handlers.TimedRotatingFileHandler(
        log_file, when='midnight', interval=1, backupCount=3)
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    formatter = logging.Formatter()
    console_handler = logging.StreamHandler()
    if log_level == 'debug':
        console_handler.setLevel(logging.DEBUG)
    elif log_level == 'info':
        console_handler.setLevel(logging.info)
    elif log_level == 'critical':
        console_handler.setLevel(logging.CRITICAL)
    logger.addHandler(console_handler)
    log_files = [f for f in os.listdir(log_dir) if os.path.isfile(
        os.path.join(log_dir, f)) and f.startswith("renameinatorr_")]
    log_files.sort(key=lambda x: os.path.getmtime(
        os.path.join(log_dir, x)), reverse=True)
    for file in log_files[3:]:
        os.remove(os.path.join(log_dir, file))
    return logger


def main():
    """
    Main function for the script.
    """

    script_dir = os.path.dirname(os.path.abspath(__file__))
    config_file_path = os.path.join(script_dir, 'config.yml')

    with open(config_file_path) as f:
        config = yaml.safe_load(f)

    global_data = config['global']
    renameinatorr_data = config['renameinatorr']

    radarr_data = global_data['radarr']
    sonarr_data = global_data['sonarr']

    log_level = renameinatorr_data['log_level'].upper()
    dry_run = renameinatorr_data['dry_run']
    logger = setup_logger(log_level)
    if dry_run:
        logger.info('*' * 40)
        logger.info(f'* {"Dry_run Activated":^36} *')
        logger.info('*' * 40)
        logger.info(f'* {" NO CHANGES WILL BE MADE ":^36} *')
        logger.info('*' * 40)
        logger.info('')
    for instance_type, instance_data in [('Radarr', radarr_data), ('Sonarr', sonarr_data)]:
        for instance in instance_data:
            instance_name = instance['name']
            api_key = instance.get('api', '')
            url = instance.get('url', '')
            if url:
                logger.info('*' * 40)
                logger.info(f'* {instance_name:^36} *')
                logger.info('*' * 40)
                logger.info('')
            if not url and not api_key:
                continue
            renameinatorr_instance = next(
                (r for r in renameinatorr_data.get(
                    instance_type.lower(), []) if r['name'] == instance_name),
                None
            )
            if renameinatorr_instance:
                count = renameinatorr_instance.get('count')
                tag_name = renameinatorr_instance.get('tag_name')
                unattended = renameinatorr_instance.get('unattended')
                reset = renameinatorr_instance.get('reset')

                dry_run, unattended, count = validate_input(
                    instance_name, url, api_key, dry_run, unattended, count, tag_name, logger)
                logger.debug(f'{" Script Settings ":*^40}')
                logger.debug(f'Dry_run: {dry_run}')
                logger.debug(f"Log Level: {log_level}")
                logger.debug(f'*' * 40)
                logger.debug('')
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
                class_map = {
                    'Radarr': RadarrInstance,
                    'Sonarr': SonarrInstance,
                }
                section_class = class_map.get(
                    instance_name.split('_')[0].capitalize())
                arr_instance = section_class(url, api_key, logger)
                radarr_all_tagged, sonarr_all_tagged = False, False
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
                                        if movies_to_rename:
                                            radarr.refresh_movies(
                                                logger, movies_to_rename)
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
                                        if episodes_to_rename:
                                            sonarr.refresh_series(
                                                logger, series_id)
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
                    logger.info(
                        f'All series and movies in both Sonarr and Radarr have been renamed.')
                    logger.info(
                        f'Please set the `unattended` variable to True if you\'d like to run this unmonitored')
                    logger.info(
                        f'Alternatively you can set the `reset` variable to True if you\'d like to remove all Tags')
            except ValueError as e:
                logger.info(
                    f"Skipping section {instance_name} due to error: {e}")


if __name__ == "__main__":
    """
    Main entry point for the script.
    """
    main()
