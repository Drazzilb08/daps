#   _____                                 _             _                  _____       
#  |  __ \                               (_)           | |                |  __ \      
#  | |__) |___ _ __   __ _ _ __ ___   ___ _ _ __   __ _| |_ ___  _ __ _ __| |__) |   _ 
#  |  _  // _ \ '_ \ / _` | '_ ` _ \ / _ \ | '_ \ / _` | __/ _ \| '__| '__|  ___/ | | |
#  | | \ \  __/ | | | (_| | | | | | |  __/ | | | | (_| | || (_) | |  | |_ | |   | |_| |
#  |_|  \_\___|_| |_|\__,_|_| |_| |_|\___|_|_| |_|\__,_|\__\___/|_|  |_(_)|_|    \__, |
#                                                                                 __/ |
#                                                                                |___/ 
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
        response = requests.get(endpoint, headers=self.headers)
        return response.json()


    def check_and_create_tag(self, tag_name, dry_run, logger):
        """
        Check if a the desired tag exists in Sonarr, and if not, create it.
        Returns the ID of the desired tag.
        """
        # Get all existing tags in Sonarr
        all_tags = self.get_all_tags()
        # Initialize the variable to hold the ID of the desired tag
        tag_id = None
        # Iterate over the list of existing tags
        for tag in all_tags:
            # Check if a tag with the label desired exists
            if tag["label"] == tag_name:
                # Store the ID of the desired tag
                tag_id = tag["id"]
                # Break out of the loop
                logger.debug(f'Tag Name: {tag_name} exists with tagId: {tag_id}')
                break
        # If the desired tag doesn't exist
        if tag_id is None:
            if dry_run == False:
                # Call the `create_tag` function to create the desired tag
                self.create_tag(tag_name, logger)
                # Get all tags again to retrieve the newly created tag's ID
                all_tags = self.get_all_tags()
                # Iterate over the list of existing tags
                for tag in all_tags:
                    # Check if a tag with the label "desired exists
                    if tag["label"] == tag_name:
                        # Store the ID of the desired tag
                        tag_id = tag["id"]
                        # Break out of the loop
                        break
            else:
                logger.info(f'Tag Name: {tag_name} would have been created.')
        # Return the ID of the desired tag
        return tag_id

    def create_tag(self, label):
        """
        Create a new tag with the specified label
        Args:
            label (str): The label for the new tag
        Returns:
            None
        Raises:
            Exception: If the API call to create the tag fails
        """
        # Create the data for the API request to create the tag
        tag_data = {"label": label}
        # Make a POST request to the API to create the tag
        create_tag_response = self.session.post(f"{self.url}/api/v3/tag", json=tag_data)
        # Check if the API call was successful
        if create_tag_response.status_code != 201:
            raise Exception(f"Failed to create tag: {create_tag_response.text}")
        else:
            logger.info(f"Tag '{label}' created successfully.")

    def get_series(self):
        """
        Get a list of all series in Sonarr.
        Returns:
            list: A list of dictionaries representing all series in Sonarr.
        """
        # Send a GET request to the /api/v3/series endpoint to retrieve information about all series
        all_series = requests.get(f"{self.url}/api/v3/series", headers=self.headers)
        # Convert the JSON response to a Python list of dictionaries
        all_series = all_series.json()
        return all_series

    def get_rename_list(self, series_id):
        """
        This method retrieves the list of episodes to be renamed for the specified series ID.
        :param series_id: The ID of the series to retrieve the rename list for.
        :return: A list of episodes to be renamed.
        """
        # Get the list of episodes to be renamed
        episodes_to_rename = requests.get(f"{self.url}/api/v3/rename?seriesId={series_id}", headers=self.headers)
        # Convert the response to a list of episodes to be renamed
        episodes_to_rename = episodes_to_rename.json()
        return episodes_to_rename

    def rename_files(self, series_id, episode_file_ids):
        """
        Sends a request to rename a list of episode files
        Parameters:
            series_id (int): ID of the series the episode files belong to
            episode_file_ids (List[int]): List of IDs of episode files to be renamed
            Returns:
        bool: Returns `True` if the episode files were renamed successfully
        """
        # Create the payload data for the API request
        payload = {
            "name": "RenameFiles",
            "seriesId": series_id,
            "files": episode_file_ids
        }
        # Send the API request to rename the episode files
        rename_response = requests.post(f"{self.url}/api/v3/command", headers=self.headers, json=payload)
        # Get the task ID for the rename operation
        task_id = rename_response.json()["id"]
        # Check the status of the rename task until it's completed
        task_complete = False
        while not task_complete:
            task_status = requests.get(f"{self.url}/api/v3/command/{task_id}", headers=self.headers)
            task_status = task_status.json()
            if task_status["status"] == "completed":
                task_complete = True
            else:
                logger.info(f'Sleeping for 5 seconds until all episodes have been renamed')
                time.sleep(5)
        return True

    def rename_files(self, series_id, episode_file_ids):
        """
        Sends a request to rename a list of episode files
        Parameters:
            series_id (int): ID of the series the episode files belong to
            episode_file_ids (List[int]): List of IDs of episode files to be renamed
        Returns:
            bool: Returns `True` if the episode files were renamed successfully
        """
        # Create the payload data for the API request
        payload = {
            "name": "RenameFiles",
            "seriesId": series_id,
            "files": episode_file_ids
        }
        # Send the API request to rename the episode files
        rename_response = requests.post(f"{self.url}/api/v3/command", headers=self.headers, json=payload)
        # Get the task ID for the rename operation
        task_id = rename_response.json()["id"]
        # Check the status of the rename task until it's completed
        task_complete = False
        while not task_complete:
            task_status = requests.get(f"{self.url}/api/v3/command/{task_id}", headers=self.headers)
            task_status = task_status.json()
            if task_status["status"] == "completed":
                task_complete = True
            else:
                logger.info(f'Sleeping for 5 seconds until all episodes have been renamed')
                time.sleep(5)
        return True

    def add_tag(self, series_id, tag_id):
        """
        This function adds a tag with the given ID to a series with the given series ID.
        :param series_id: The ID of the series to which the tag will be added.
        :param tag_id: The ID of the tag to be added to the series.
        :return: None
        """
        endpoint = f"{self.url}/api/v3/series/editor"
        data = {
            "seriesIds": [series_id],
            "tags": [tag_id],
            "applyTags": "add"
        }
        add_tag_response = self.session.put(endpoint, json=data)
        add_tag_response.raise_for_status()

    def remove_tags(self, all_series, tag_id):
        """
        Remove a specific tag from a list of series.

        Parameters:
            all_series (list): a list of series dictionaries, each containing information about a series.
            tag_id (int): the ID of the tag to be removed.

        Returns:
            False: always returns False, since this function only updates the tags of serise and does not return any data.
        """
        endpoint = f"{self.url}/api/v3/series/editor"
        for movie in all_series:
            if tag_id in series["tags"]:
                series_id = series["id"]
                data = {
                    "movieIds": [series_id],
                    "tags": [tag_id],
                    "applyTags": "remove"
                }
                response = self.session.put(endpoint, json=data)
                if response.status_code != 202:
                    logger.critical(f"Failed to remove tag with ID {tag_id} from series with ID {series_id}.")
                else:
                    logger.info(f'Successfully removed {tag_id} (Renamed) from {movie["title"]}.')

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
        url = f"{self.url}/api/v3/system/status"
        response = self.session.get(url)
        response.raise_for_status()
        return response.json()

    def get_all_tags(self):
        """
        Get a list of all tags in Radarr.
        
        Returns:
            A list of dictionaries representing all tags in Radarr.
        """
        endpoint = f"{self.url}/api/v3/tag"
        response = requests.get(endpoint, headers=self.headers)
        return response.json()

    def check_and_create_tag(self, tag_name, dry_run, logger):
        """
        Check if a the desired tag exists in Radarr, and if not, create it.
        Returns the ID of the desired tag.
        """
        # Get all existing tags in Radarr
        all_tags = self.get_all_tags()
        # Initialize the variable to hold the ID of the desired tag
        tag_id = None
        # Iterate over the list of existing tags
        for tag in all_tags:
            # Check if a tag with the label desired exists
            if tag["label"] == tag_name:
                # Store the ID of the desired tag
                tag_id = tag["id"]
                # Break out of the loop
                logger.debug(f'Tag Name: {tag_name} exists with tagId: {tag_id}')
                break
        # If the desired tag doesn't exist
        if tag_id is None:
            if dry_run == False:
                # Call the `create_tag` function to create the desired tag
                self.create_tag(tag_name, logger)
                # Get all tags again to retrieve the newly created tag's ID
                all_tags = self.get_all_tags()
                # Iterate over the list of existing tags
                for tag in all_tags:
                    # Check if a tag with the label "desired exists
                    if tag["label"] == tag_name:
                        # Store the ID of the desired tag
                        tag_id = tag["id"]
                        # Break out of the loop
                        break  
            else:
                logger.info(f'Tag Name: {tag_name} would have been created.')
        # Return the ID of the desired tag
        return tag_id

    def create_tag(self, label):
        """
        Create a new tag with the specified label
        Args:
            label (str): The label for the new tag
        Returns:
            None
        Raises:
            Exception: If the API call to create the tag fails
        """
        # Create the data for the API request to create the tag
        tag_data = {"label": label}
        # Make a POST request to the API to create the tag
        create_tag_response = self.session.post(f"{self.url}/api/v3/tag", json=tag_data)
        # Check if the API call was successful
        if create_tag_response.status_code != 201:
            raise Exception(f"Failed to create tag: {create_tag_response.text}")
        else:
            logger.info(f"Tag '{label}' created successfully.")

    def get_movies(self):
        """
        Get a list of all series in Sonarr.
        Returns:
            list: A list of dictionaries representing all series in Sonarr.
        """
        # Send a GET request to the /api/v3/movie endpoint to retrieve information about all movies
        all_movies = requests.get(f"{self.url}/api/v3/movie", headers=self.headers)
        # Convert the JSON response to a Python list of dictionaries
        all_movies = all_movies.json()
        return all_movies

    def get_rename_list(self, movie_id):
        """
        This method retrieves the list of episodes to be renamed for the specified series ID.

        :param series_id: The ID of the series to retrieve the rename list for.
        :return: A list of episodes to be renamed.
        """
        # Get the list of episodes to be renamed
        movie_to_rename = requests.get(f"{self.url}/api/v3/rename?movieId={movie_id}", headers=self.headers)
        # Convert the response to a list of movies to be renamed
        movie_to_rename = movie_to_rename.json()
        return movie_to_rename

    def rename_files(self, movie_id, movie_file_id):
        """
        Renames movie files.

        Parameters:
            movie_id (int): The ID of the movie to be renamed.
            movie_file_id (list of ints): The ID(s) of the file(s) to be renamed.

        Returns:
            bool: Returns True if the files were successfully renamed.
        """
        payload = {
            "name": "RenameFiles",
            "movieId": movie_id,
            "files": movie_file_id
        }
        rename_response = requests.post(f"{self.url}/api/v3/command", headers=self.headers, json=payload)
        task_id = rename_response.json()["id"]
        task_complete = False
        while not task_complete:
            task_status = requests.get(f"{self.url}/api/v3/command/{task_id}", headers=self.headers)
            task_status = task_status.json()
            if task_status["status"] == "completed":
                task_complete = True
        return True

    def remove_tags(self, all_movies, tag_id):
        """
        Remove a specific tag from a list of movies.

        Parameters:
            all_movies (list): a list of movie dictionaries, each containing information about a movie.
            tag_id (int): the ID of the tag to be removed.

        Returns:
            False: always returns False, since this function only updates the tags of movies and does not return any data.
        """
        endpoint = f"{self.url}/api/v3/movie/editor"
        for movie in all_movies:
            if tag_id in movie["tags"]:
                movie_id = movie["id"]
                data = {
                    "movieIds": [movie_id],
                    "tags": [tag_id],
                    "applyTags": "remove"
                }
                response = self.session.put(endpoint, json=data)
                if response.status_code != 202:
                    logger.critical(f"Failed to remove tag with ID {tag_id} from movie with ID {movie_id}.")
                else:
                    logger.info(f'Successfully removed {tag_id} (Renamed) from {movie["title"]}.')

    def add_tag(self, movie_id, tag_id):
        """Add a tag to a movie with given movie_id
        Args:
            movie_id (int): the id of the movie to add the tag to
            tag_id (int): the id of the tag to add
        Raises:
            requests.exceptions.HTTPError: if the response from the API is not a 202 (Accepted) status code
        """
        # Endpoint for adding tags to a movie
        endpoint = f"{self.url}/api/v3/movie/editor"
        # Data to be sent in the API request
        data = {
            "movieIds": [movie_id],
            "tags": [tag_id],
            "applyTags": "add"
        }
        # Make the API request to add the tag
        add_tag_response = self.session.put(endpoint, json=data)
        # Raise an error if the API response is not 202 (Accepted)
        add_tag_response.raise_for_status()

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
            logger.info(f"\t\t{existing_path.split('/')[-1]} renamed to {new_path.split('/')[-1]}")
    if type == "radarr":
        for file in to_rename:
            existing_path = file["existingPath"]
            new_path = file["newPath"]
            movie_title = media["title"]
            logger.info(f"Movie Title: {movie_title} {tagged}.")
            logger.info(f"\t{existing_path.split('/')[-1]} renamed to {new_path.split('/')[-1]}")

def validate_input(instance_name, url, api_key, dry_run, unattended, count, tag_name, logger):
    if not (url.startswith("http://") or url.startswith("https://")):
        raise ValueError(f"{instance_name}' URL must start with 'http://' or 'https://")
    if url.startswith("http://") or url.startswith("https://"):
        if not api_key:
            raise ValueError(f"API key is required for {instance_name}")
        if dry_run is not True and dry_run is not False:
            logger.warning(f'Error: {dry_run} in {instance_name} must be either True or False. Defaulting to False')
            dry_run = False
        if unattended is not True and unattended is not False:
            logger.warning(f'Error: {unattended} in {instance_name} must be either True or False. Defaulting to False')
            unattended = False
        try:
            count = int(count)
            if count <= 0:
                logger.warning(f'Error: {count} in {instance_name} is not a valid count. Setting count to default value of 1')
                count = 1
        except ValueError:
            logger.warning(f'Error: {count} in {instance_name} is not a valid count. Setting count to default value of 1')
            count = 1
        if tag_name == "":
            raise ValueError(f'Tag name in {instance_name} is empty. This must be set')
        return dry_run, unattended, count
def setup_logger(log_level):
    # Create a directory to store logs, if it doesn't exist
    log_dir = os.path.dirname(os.path.realpath(__file__)) + "/logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    # Get the current date in YYYY-MM-DD format
    today = time.strftime("%Y-%m-%d")
    # Create a log file with the current date in its name
    log_file = f"{log_dir}/renameinator_{today}.log"
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
    log_files = [f for f in os.listdir(log_dir) if os.path.isfile(os.path.join(log_dir, f)) and f.startswith("renamer_")]
    log_files.sort(key=lambda x: os.path.getmtime(os.path.join(log_dir, x)), reverse=True)
    for file in log_files[3:]:
        os.remove(os.path.join(log_dir, file))
    return logger

def main():
    # Load the config file
    with open('config.yml') as f:
        config = yaml.safe_load(f)
        
    renameinator = config.get('renameinator', {})
    log_level = renameinator.get('log_level').upper()
    dry_run = renameinator.get('dry_run')
    discord_webhook = renameinator.get('discord_webhook', '')
    
    logger = setup_logger(log_level)
    
    if dry_run:
    # If dry_run is activated, print a message indicating so and the status of other variables.
        logger.debug('*' * 40)
        logger.debug(f'* {"Dry_run Activated":^36} *')
        logger.debug('*' * 40)
        logger.debug(f'* {" NO CHANGES WILL BE MADE ":^36} *')
        logger.debug('*' * 40)
        logger.debug('')
    logger.debug(f'{" Script Settings ":*^40}')
    logger.debug(f'Dry_run: {dry_run}')
    logger.debug(f"Log Level: {log_level}")
    logger.debug(f"Discord Webhook URL: {discord_webhook}")
    logger.debug(f'*' * 40 )
    logger.debug('')
    for instance, instance_settings in renameinator.items():
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
                count = instance_setting.get('count')
                tag_name = instance_setting.get('tag_name')
                unattended = instance_setting.get('unattended')
                reset = instance_setting.get('reset')
                
                logger.debug(f'{" Settings ":*^40}')
                logger.debug(f"Section Name: {instance_name}")
                logger.debug(f"Unattended: {unattended}")
                logger.debug(f"Count: {count}")
                logger.debug(f"URL: {url}")
                logger.debug(f"API Key: {api_key}") #{'<redacted>' if api_key else 'None'}"
                logger.debug(f"Tag_name: {tag_name}")
                logger.debug(f"Reset: {reset}")
                logger.debug(f"Unattended: {unattended}")
                logger.debug(f'*' * 40 )
                logger.debug('')

        try:
            if url:
                logger.info('*' * 40)
                logger.info(f'* {instance_name:^36} *')
                logger.info('*' * 40)
                logger.info('')
                dry_run, unattended, count = validate_input(instance_name, url, api_key, dry_run, unattended, count, tag_name, logger)
            
            if not url and not api_key:
                continue
            # Instantiate the class for this section
            class_map = {
                'Radarr': RadarrInstance,
                'Sonarr': SonarrInstance,
            }
            # instance_name = instance_name.capitalize()
            section_class = class_map.get(instance_name.split('_')[0].capitalize())
            instance = section_class(url, api_key, logger)
            radarr_all_tagged, sonarr_all_tagged = False, False
            # Add the instance to the appropriate list
            if section_class == RadarrInstance:
                radarr_instances = []
                radarr_instances.append(instance)
                # Loop through all radarr instances
                for radarr in radarr_instances:
                    tagged_count = 0
                    untagged_count = 0
                    # Get the radarr tag id and create the tag if it does not exist
                    radarr_tag_id = radarr.check_and_create_tag(tag_name, dry_run, logger)
                    # Get all the movies from the radarr instance
                    all_movies = radarr.get_movies()
                    logger.debug(f"Length of all_movies for {str(radarr)}: {len(all_movies)}")
                    # Check if all the movies are tagged with the radarr tag id
                    all_radarr_tagged = check_all_tagged(all_movies, radarr_tag_id)
                    # If all the movies are tagged and cycle is True or reset is True, remove the tags from all movies
                    if all_radarr_tagged is True and cycle is True or reset is True:
                        radarr.remove_tags(all_movies, radarr_tag_id, tag_name)
                        logger.info(f'All of {instance_name} have had the tag {tag_name} removed.')
                    # If all the movies are tagged and cycle is False, set radarr_all_tagged to True
                    elif all_radarr_tagged is True and cycle is False:
                        logger.info(f'All of {instance_name} has been tagged with {tag_name} skipping.')
                        radarr_all_tagged = True
                        continue
                    if all_radarr_tagged is False:
                        untagged_movies = [m for m in all_movies if radarr_tag_id not in m['tags']]
                        movies_to_process = untagged_movies[:count]
                        renamed = False
                        for movies in movies_to_process:
                            movie_id = movies["id"]
                            file_to_rename = radarr.get_rename_list(movie_id)
                            movie_file_ids = [file["movieFileId"] for file in file_to_rename]
                            if movie_file_ids:
                                if dry_run == True:
                                    print_format(movies, file_to_rename, "radarr", dry_run, logger)
                                    renamed = True
                                elif dry_run == False:
                                    print_format(movies, file_to_rename, "radarr", dry_run, logger)
                                    renamed = radarr.rename_files(movie_id, movie_file_ids)
                            if renamed == False:
                                if dry_run == False:
                                    logger.info(f'Movie: \'{movies["title"]}\' has been tagged with \'{tag_name}\'.')
                                    radarr.add_tag(movie_id, radarr_tag_id)
                                if dry_run == True:
                                    logger.info(f'Movie file: \'{movies["title"]}\' doesn\'t require renaming it would have been been tagged with \'{tag_name}\'.')
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
                sonarr_instances.append(instance)
                for sonarr in sonarr_instances:
                    tagged_count = 0
                    untagged_count = 0
                    sonarr_tag_id = sonarr.check_and_create_tag(tag_name, dry_run, logger)
                    all_series = sonarr.get_series()
                    logger.debug(f"Length of all_series for {str(sonarr)}: {len(all_series)}")
                    all_sonarr_tagged = check_all_tagged(all_series, sonarr_tag_id)
                    if all_sonarr_tagged is True and cycle is True or reset is True:
                        sonarr.remove_tags(all_series, sonarr_tag_id, tag_name)
                        logger.info(f'All of {instance_name} have had the tag {tag_name} removed.')
                    elif all_sonarr_tagged is True and cycle is False:
                        logger.info(f'All of {instance_name} has been tagged with {tag_name} skipping.')
                        sonarr_all_tagged = True
                        continue
                    if all_sonarr_tagged is False:
                        renamed = False
                        untagged_series = [m for m in all_series if sonarr_tag_id not in m['tags']]
                        series_to_process = untagged_series[:count]
                        for series in series_to_process:
                            series_id = series["id"]
                            episodes_to_rename = sonarr.get_rename_list(series_id)
                            episode_file_ids = [episode["episodeFileId"] for episode in episodes_to_rename]
                            if episode_file_ids:
                                if dry_run == True:
                                    print_format(series, episodes_to_rename, "sonarr", dry_run, logger)
                                    renamed = True
                                elif dry_run == False:
                                    print_format(series, episodes_to_rename, "sonarr", dry_run, logger)
                                    renamed = sonarr.rename_files(series_id, episode_file_ids)
                            if renamed == False:    
                                if dry_run == False:
                                    logger.info(f'Series: \'{series["title"]}\' has been tagged with \'{tag_name}\'.')
                                    sonarr.add_tag(series_id, sonarr_tag_id)
                                if dry_run == True:
                                    logger.info(f'Series: \'{series["title"]}\' doesn\'t have any episodes that require renaming, the series would have been been tagged with \'{tag_name}\'.') 
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

            if radarr_all_tagged == True and sonarr_all_tagged == True:
                # If all series and movies have been tagged and renamed.
                logger.info(f'All series and movies in both Sonarr and Radarr have been renamed.')
                # Running this unmonitored by setting the cycle variable to True
                logger.info(f'Please set the `cycle` variable to True if you\'d like to run this unmonitored') 
                # Alternatively, removing all tags by setting the reset variable to True
                logger.info(f'Alternatively you can set the `reset` variable to True if you\'d like to remove all Tags')
        except ValueError as e:
            logger.info(f"Skipping section {section_name}: {e}")


if __name__ == "__main__":
    main()
    