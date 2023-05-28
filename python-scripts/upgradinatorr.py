#   _    _                           _ _             _                  _____
#  | |  | |                         | (_)           | |                |  __ \
#  | |  | |_ __   __ _ _ __ __ _  __| |_ _ __   __ _| |_ ___  _ __ _ __| |__) |   _
#  | |  | | '_ \ / _` | '__/ _` |/ _` | | '_ \ / _` | __/ _ \| '__| '__|  ___/ | | |
#  | |__| | |_) | (_| | | | (_| | (_| | | | | | (_| | || (_) | |  | |_ | |   | |_| |
#   \____/| .__/ \__, |_|  \__,_|\__,_|_|_| |_|\__,_|\__\___/|_|  |_(_)|_|    \__, |
#         | |     __/ |                                                        __/ |
#         |_|    |___/                                                        |___/
# ===================================================================================================
# Author: Drazzilb
# Description: A script to upgrade Sonarr/Radarr libraries to the keep in line with trash-guides
# Usage: python3 /path/to/upgradinatorr.py
# Requirements: requests, yaml, logging
# Version: 1.0.1
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
            "seriesIds": series_id,
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

    def search_series(self, series_id):
        """
        Search for a series by ID.
        Parameters:
            series_id (int): The ID of the series to search for
            Raises:
                Exception: If the API call to search for the series fails
        """
        payload = {
            "name": "SeriesSearch",
            "seriesIds": series_id
        }
        endpoint = f"{self.url}/api/v3/command"
        response = self.session.post(endpoint, json=payload)
        response.raise_for_status()


class RadarrInstance():
    """
    A class representing a Radarr instance.
    """
    def __init__(self, url, api_key, logger):
        """
        Initialize a RadarrInstance object.
        Parameters:
            url (str): The URL of the Radarr instance
            api_key (str): The API key to use to connect to the Radarr instance
            logger (logging.Logger): a logger object for logging debug messages.
        Raises:
            ValueError: If the URL does not point to a valid Radarr instance
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
            A dictionary representing the system status of the Radarr instance.
        """
        endpoint = f"{self.url}/api/v3/system/status"
        response = self.session.get(endpoint)
        response.raise_for_status()
        return response.json()

    def get_all_tags(self):
        """
        Get all tags in the Radarr instance.
        Returns:
            A list of dictionaries representing all tags in the Radarr instance.
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
        Get all movies in the Radarr instance.
        Returns:
            A list of dictionaries representing all movies in the Radarr instance.
        
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
        Add a tag to a movie.
        Parameters:
            movie_id (int): The ID of the movie to add the tag to
            tag_id (int): The ID of the tag to add to the movie
        Raises:
            Exception: If the API call to add the tag to the movie fails
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
        Check if a tag exists in the Radarr instance and create it if it does not.
        Parameters:
            tag_name (str): The name of the tag to check for
            dry_run (bool): Whether or not to perform a dry run
            logger (logging.Logger): a logger object for logging debug messages.
        Returns:
            The ID of the tag
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

    def remove_tags(self, all_movies, tag_id, tag_name, logger):
        """
        Remove a tag from all movies in the Radarr instance.
        Parameters:
            all_movies (list): A list of dictionaries representing all movies in the Radarr instance.
            tag_id (int): The ID of the tag to remove from all movies
            tag_name (str): The name of the tag to remove from all movies
            logger (logging.Logger): a logger object for logging debug messages.
        Returns:
            True if the tag was removed from at least one movie, False otherwise.
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

    def search_movies(self, movie_id):
        """
        Search for a movie in the Radarr instance.
        Parameters:
            movie_id (int): The ID of the movie to search for
        Raises:
            Exception: If the API call to search for the movie fails
        """
        payload = {
            "name": "MoviesSearch",
            "movieIds": movie_id
        }
        endpoint = f"{self.url}/api/v3/command"
        response = self.session.post(endpoint, json=payload)
        response.raise_for_status()


def check_all_tagged(all_media, tag_id, status, monitored):
    """
    Check if all media with a given tag is in a given status and monitored state.
    Parameters:
        all_media (list): A list of dictionaries representing all media in the Radarr instance.
        tag_id (int): The ID of the tag to check for
        status (str): The status to check for
        monitored (bool): Whether or not to check for monitored media
    Returns:
        True if all media with the given tag is in the given status and monitored state, False otherwise.
    """
    for media in all_media:
        if monitored != media['monitored']:
            continue
        if status != "all" and status != media['status']:
            continue
        if tag_id not in media['tags']:
            return False
    return True


def validate_input(instance_name, url, api_key, dry_run, unattended, count, monitored, status, tag_name, logger):
    """
    Validate the input for a given instance.
    Parameters:
        instance_name (str): The name of the instance to validate
        url (str): The URL of the instance to validate
        api_key (str): The API key of the instance to validate
        dry_run (bool): Whether or not to perform a dry run
        unattended (bool): Whether or not to run unattended
        count (int): The number of movies to process
        monitored (bool): Whether or not to process monitored movies
        status (str): The status to process
        tag_name (str): The name of the tag to process
        logger (logging.Logger): a logger object for logging debug messages.
    Raises:
        ValueError: If the URL does not start with 'http://' or 'https://'
        ValueError: If the API key is not provided
        ValueError: If the dry run value is not True or False
        ValueError: If the unattended value is not True or False
        ValueError: If the status value is not 'all', 'released', 'missing', 'announced', 'cinemas', 'inCinemas', 'preDB', 'inCinemasPreDB', or 'releasedPreDB'
        ValueError: If the tag name is not provided
    Returns:
        True if the input is valid, False otherwise.
    """
    if not (url.startswith("http://") or url.startswith("https://")):
        raise ValueError(
            f'\'{instance_name}\' URL must start with \'http://\' or \'https://://\'')
    if url.startswith("http://") or url.startswith("https://"):
        if not api_key:
            raise ValueError(f'API key is required for \'{instance_name}\'')
        if dry_run is not True and dry_run is not False:
            logger.warning(
                f'Error: \'dry_run: {dry_run}\' in \'{instance_name}\' must be either True or False. Defaulting to True')
            dry_run = True
        if unattended is not True and unattended is not False:
            logger.warning(
                f'Error: \'unattended: {unattended}\' in \'{instance_name}\' must be either True or False. Defaulting to False')
            unattended = False
        status = status.lower()
        if (instance_name.startswith("radarr")):
            if status not in ("tba", "announced", "incinemas", "released", "deleted", "all"):
                logger.warning(
                    f'Error: \'status: {status}\' in \'{instance_name}\' is not one of the defined status types: tba, announced, inCinemas, released, deleted')
                logger.warning("Setting setting status to: 'released'")
                status = "released"
        elif (instance_name.startswith("sonarr")):
            if status not in ("continuing", "ended", "upcoming", "deleted", "all"):
                logger.warning(
                    f'Error: \'status: {status}\' in \'{instance_name}\' is not one of the defined status types: continuing, ended, upcoming, deleted')
                logger.warning("Setting setting status to: 'continuing'")
                status = "continuing"
        if count is None:
            logger.warning(
                f'Error: \'count: \' is empty in \'{instance_name}\': Setting count to default value of 1')
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
        if monitored is not True and monitored is not False:
            logger.warning(
                f'Error: \'monitored: {monitored}\' in \'{instance_name}\' must be either True or False. Setting monitored to default value of True')
            monitored = True
        if tag_name == None:
            raise ValueError(
                f'\'tag_name: \' in {instance_name} is empty. This must be set')
        return dry_run, unattended, count, monitored, status


def setup_logger(log_level):
    """
    Setup the logger.
    Parameters:
        log_level (str): The log level to use
    Returns:
        A logger object for logging messages.
    """
    log_dir = os.path.dirname(os.path.realpath(__file__)) + "/logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    today = time.strftime("%Y-%m-%d")
    log_file = f"{log_dir}/upgradinatorr_{today}.log"
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
        os.path.join(log_dir, f)) and f.startswith("upgradinatorr_")]
    log_files.sort(key=lambda x: os.path.getmtime(
        os.path.join(log_dir, x)), reverse=True)
    for file in log_files[3:]:
        os.remove(os.path.join(log_dir, file))
    return logger

def main():
    """
    Main function for the script.
    """
    cycle_count = 0
    script_dir = os.path.dirname(os.path.abspath(__file__))
    config_file_path = os.path.join(script_dir, 'config.yml')

    with open(config_file_path) as f:
        config = yaml.safe_load(f)

    global_data = config['global']
    upgradinatorr_data = config['upgradinatorr']

    radarr_data = global_data['radarr']
    sonarr_data = global_data['sonarr']

    log_level = upgradinatorr_data['log_level'].upper()
    dry_run = upgradinatorr_data['dry_run']
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
            if url is None:
                continue
            if url:
                logger.info('*' * 40)
                logger.info(f'* {instance_name:^36} *')
                logger.info('*' * 40)
                logger.info('')
            upgradinatorr_instance = next(
                (r for r in upgradinatorr_data.get(
                    instance_type.lower(), []) if r['name'] == instance_name),
                None
            )
            if upgradinatorr_instance:
                count = upgradinatorr_instance.get('count')
                tag_name = upgradinatorr_instance.get('tag_name')
                unattended = upgradinatorr_instance.get('unattended')
                monitored = upgradinatorr_instance.get('monitored')
                status = upgradinatorr_instance.get('status')

                dry_run, unattended, count, monitored, status = validate_input(
                    instance_name, url, api_key, dry_run, unattended, count, monitored, status, tag_name, logger)
                if cycle_count < 1:
                    logger.debug(f'{" Script Settings ":*^40}')
                    logger.debug(f'Dry_run: {dry_run}')
                    logger.debug(f"Log Level: {log_level}")
                    logger.debug(f'*' * 40)
                    logger.debug('')
                    cycle_count += 1
                logger.debug(f'{" Settings ":*^40}')
                logger.debug(f"Section Name: {instance_name}")
                logger.debug(f"URL: {url}")
                logger.debug(f"API Key: {'<redacted>' if api_key else 'None'}")
                logger.debug(f"Count: {count}")
                logger.debug(f"Monitored: {monitored}")
                logger.debug(f"status: {status}")
                logger.debug(f"Tag_name: {tag_name}")
                logger.debug(f"Unattended: {unattended}")
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
                            all_movies, radarr_tag_id, status, monitored)
                        if all_radarr_tagged is True and unattended is True:
                            all_radarr_tagged = radarr.remove_tags(
                                all_movies, radarr_tag_id, tag_name, logger)
                        elif all_radarr_tagged is True and unattended is False:
                            radarr_all_tagged = True
                            logger.info(
                                f'All of {instance_name} has been tagged with {tag_name} skipping.')
                            continue
                        if all_radarr_tagged is False:
                            untagged_movies = [m for m in all_movies if radarr_tag_id not in m['tags'] and m['monitored'] == monitored and (status == 'all' or m['status'] == status)]
                            movies_to_process = untagged_movies[:count]
                            for movies in movies_to_process:
                                movie_id = [int(m['id'])
                                            for m in movies_to_process]
                                if dry_run == False:
                                    radarr.search_movies(movie_id)
                                    radarr.add_tag(movie_id, radarr_tag_id)
                                    logger.info(
                                        f'Search request for the Movie: \'{movies["title"]}\' has been sent to \'{instance_name}\' and has been tagged with \'{tag_name}\'.')
                                else:
                                    logger.info(
                                        f'Search request for the Movie: \'{movies["title"]}\' would have been sent to \'{instance_name}\' and would have been tagged with \'{tag_name}\'.')
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
                            all_series, sonarr_tag_id, status, monitored)
                        if all_sonarr_tagged is True and unattended is True:
                            all_sonarr_tagged = sonarr.remove_tags(
                                all_series, sonarr_tag_id, tag_name, logger)
                        elif all_sonarr_tagged is True and unattended is False:
                            sonarr_all_tagged = True
                            logger.info(
                                f'All of {instance_name} has been tagged with {tag_name} skipping.')
                            break
                        if all_sonarr_tagged is False:
                            untagged_series = [s for s in all_series if sonarr_tag_id not in s['tags'] and s['monitored'] == monitored and (status == 'all' or s['status'] == status)]
                            series_to_process = untagged_series[:count]
                            for series in series_to_process:
                                series_id = [int(s['id']) for s in series_to_process]
                                if dry_run == False:
                                    sonarr.search_series(series_id)
                                    sonarr.add_tag(series_id, sonarr_tag_id)
                                    logger.info(
                                        f'Search request for the Series: \'{series["title"]}\' has been sent to \'{instance_name}\' and has been tagged with \'{tag_name}\'.')
                                else:
                                    logger.info(
                                        f'Search request for the Series: \'{series["title"]}\' would have been sent to \'{instance_name}\' and would have been tagged with \'{tag_name}\'.')
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
            except ValueError as e:
                logger.info(f"Skipping section {instance_name}: {e}")


if __name__ == '__main__':
    """
    Main entry point for the script.
    """
    main()
