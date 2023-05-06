#   _____                                      _____
#  |  __ \                                    |  __ \
#  | |__) |___ _ __   __ _ _ __ ___   ___ _ __| |__) |   _
#  |  _  // _ \ '_ \ / _` | '_ ` _ \ / _ \ '__|  ___/ | | |
#  | | \ \  __/ | | | (_| | | | | | |  __/ |  | |   | |_| |
#  |_|  \_\___|_| |_|\__,_|_| |_| |_|\___|_|  |_|    \__, |
#                                                     __/ |
#                                                    |___/
# ===================================================================================================
# Author: Drazzilb
# Description: This script will check for unmatched assets in your Plex library.
#              It will output the results to a file in the logs folder.
# Usage: python3 unmatched-asset.py
# Requirements: requests, tqdm
# Version: 2.2.8
# License: MIT License
# ===================================================================================================

import os
import requests
import shutil
import Levenshtein
import time
import re
import logging
import yaml
import filecmp
import xml.etree.ElementTree as etree
from logging.handlers import RotatingFileHandler
from fuzzywuzzy import fuzz
from tqdm import tqdm


class SonarrInstance:
    """
    A class representing a Sonarr instance.
    """
    def __init__(self, url, api_key, logger):
        """
        nitialize a SonarrInstance object.
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
        Get the system status of the Sonarr instance.
        Returns:
            dict: A dictionary representing the system status of the Sonarr instance.
        """
        url = f"{self.url}/api/v3/system/status"
        response = self.session.get(url)
        response.raise_for_status()
        return response.json()

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


class RadarrInstance:
    def __init__(self, url, api_key, logger):
        """
        Initialize a RadarrInstance object.
        Parameters:
            url (str): The URL of the Radarr instance.
            api_key (str): The API key to use to connect to the Radarr instance.
            logger (logging.Logger): a logger object for logging debug messages.
        Raises:
            ValueError: If the URL does not point to a valid Radarr instance.
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
        Returns:
            A string representation of the RadarrInstance object.
        """
        return f"RadarrInstance(url={self.url})"

    def get_system_status(self):
        endpoint = f"{self.url}/api/v3/system/status"
        response = self.session.get(endpoint)
        response.raise_for_status()
        return response.json()

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


def get_collections(plex_url, token, library_names, logger):
    """
    Get a list of collections in Plex.
    Parameters:
        plex_url (str): The URL of the Plex instance.
        token (str): The Plex authentication token.
        library_names (list): A list of library names to get collections from.
        logger (logging.Logger): a logger object for logging debug messages.
    Returns:
        list: A list of dictionaries representing all collections in Plex.
    """
    try:
        response = requests.get(f"{plex_url}/library/sections", headers={
            "X-Plex-Token": token
        })
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        logger.error("An error occurred while getting the libraries:", e)
        return []
    try:
        xml = etree.fromstring(response.content)
    except etree.ParseError as e:
        logger.error("An error occurred while parsing the response:", e)
        return []
    libraries = xml.findall(".//Directory[@type='movie']")
    collections = set()
    for library_name in library_names:
        target_library = None
        for library in libraries:
            if library.get("title") == library_name:
                target_library = library
                break
        if target_library is None:
            logger.error(f"Library with name {library_name} not found")
            continue
        library_id = target_library.get("key")
        try:
            response = requests.get(f"{plex_url}/library/sections/{library_id}/collections", headers={
                "X-Plex-Token": token
            })
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            logger.error("an error occurred while getting the collections:", e)
            continue
        try:
            xml = etree.fromstring(response.content)
        except etree.ParseError as e:
            logger.error("An error occurred while parsing the response:", e)
            continue
        library_collections = xml.findall(".//Directory")
        library_collection_names = [collection.get(
            "title") for collection in library_collections if collection.get("smart") != "1"]
        for collection_name in library_collection_names:
            if collection_name not in collections:
                collections.add((collection_name))
    logger.info(f"Connected to Plex.. Gathering informationrmation...")
    return collections


def match_series(series, file, logger, series_threshold):
    """
    Match a file to a series in Radarr.
    Parameters:
        series (list): A list of dictionaries representing all series in Radarr.
        file (str): The file name to match.
        logger (logging.Logger): a logger object for logging debug messages.
        series_threshold (int): The minimum score for a series to be considered a match.
    Returns:
        dict: A dictionary representing the matched series, or None if no match was found.
    """
    year = None
    best_match = None
    closest_match = None
    closest_score = 0
    logger.debug(f'File Name: {file}')
    file_name = file.split("(")[0].rstrip()
    logger.debug(f'Series Name: {file_name}')
    year_match = re.search(r'\((\d{4})\)', file)
    if year_match:
        year = year_match.group(1)
        logger.debug(f'Year: {year}')
    else:
        logger.debug("Year not found")
    year = str(year)
    for matched_series in series:
        year_in_title = re.search(r'\((\d{4})\)', matched_series['title'])
        if year_in_title:
            matched_series_name = matched_series['title'].split("(")[
                0].rstrip()
        else:
            matched_series_name = matched_series['title']
        matched_series_name = remove_illegal_chars(matched_series_name)
        matched_series_year = matched_series['year']
        matched_series_year = str(matched_series_year)

        matched_series_name_match = fuzz.token_sort_ratio(
            file_name, matched_series_name)
        if matched_series_name_match >= series_threshold:
            if year == matched_series_year:
                best_match = matched_series
                break
        elif matched_series_name_match >= (series_threshold - 5):
            if year == matched_series_year:
                if closest_score < matched_series_name_match:
                    closest_match = matched_series
                    closest_year = matched_series_year
                    closest_score = matched_series_name_match
    if best_match:
        return best_match, None
    elif closest_match:
        return None, f"No match found, closest match for {file} was {closest_match['title']} ({closest_year}) with a score of {closest_score}"
    else:
        return None, None


def match_movies(movies, file, logger, movies_threshold):
    """
    Match a file to a movie in Radarr.
    Parameters:
        movies (list): A list of dictionaries representing all movies in Radarr.
        file (str): The file name to match.
        logger (logging.Logger): a logger object for logging debug messages.
        movies_threshold (int): The minimum score for a movie to be considered a match.
    Returns:
        dict: A dictionary representing the matched movie, or None if no match was found.
    """
    if " - Season" in file or " - Special" in file:
        return None, f"File {file} ignored because it contains 'Season' or 'Special'"
    year = None
    best_match = None
    closest_match = None
    closest_score = 0
    logger.debug(f'File Name: {file}')
    file_name = file.split("(")[0].rstrip()
    logger.debug(f'Movie Name: {file_name}')
    year_match = re.search(r'\((\d{4})\)', file)
    if year_match:
        year = year_match.group(1)
        logger.debug(f'Year: {year}')
    else:
        logger.debug("Year not found")
    year = str(year)
    for matched_movie in movies:
        year_in_title = re.search(r'\((\d{4})\)', matched_movie['title'])
        if year_in_title:
            matched_movie_name = matched_movie['title'].split("(")[0].rstrip()
        else:
            matched_movie_name = matched_movie['title']
        matched_movie_name = remove_illegal_chars(matched_movie_name)
        matched_movie_year = matched_movie['year']
        matched_movie_year = str(matched_movie_year)
        matched_movie_name_match = fuzz.token_sort_ratio(
            file_name, matched_movie_name)
        if matched_movie_name_match >= movies_threshold:
            if year == matched_movie_year:
                best_match = matched_movie
                break
        elif matched_movie_name_match >= (movies_threshold - 5):
            if year == matched_movie_year:
                if closest_score < matched_movie_name_match:
                    closest_match = matched_movie
                    closest_year = matched_movie_year
                    closest_score = matched_movie_name_match
    if best_match:
        return best_match, None
    elif closest_match:
        return None, f"No match found, closest match for {file} was {closest_match['title']} ({closest_year}) with a score of {closest_score}"
    else:
        return None, None


def match_collection(plex_collections, file, logger, collection_threshold):
    """
    Match a file to a collection in Radarr.
    Parameters:
        plex_collections (list): A list of strings representing all collections in Plex.
        file (str): The file name to match.
        logger (logging.Logger): a logger object for logging debug messages.
        collection_threshold (int): The minimum score for a collection to be considered a match.
    Returns:
        str: A string representing the matched collection, or None if no match was found.
    """
    file_name = os.path.splitext(file)[0]
    logger.debug(f'file_name: {file_name}')
    best_match = None
    closest_match = None
    closest_score = 0
    best_distance = collection_threshold
    for plex_collection in plex_collections:
        plex_collection_match = fuzz.token_sort_ratio(
            file_name, plex_collection)
        if plex_collection_match >= collection_threshold:
            return plex_collection, None
        elif plex_collection_match >= (collection_threshold - 5):
            if closest_score < plex_collection_match:
                closest_match = plex_collection
                closest_score = plex_collection_match
    if best_match:
        return best_match, None
    elif closest_match:
        return None, f"No match found, closest match for {file} was {closest_match} with a score of {closest_score}"
    else:
        return None, None


def rename_movies(matched_movie, file, destination_dir, source_dir, dry_run, logger, action_type, print_only_renames):
    """
    Rename a file to match the movie in Radarr.
    Parameters:
        matched_movie (dict): A dictionary representing the matched movie.
        file (str): The file name to rename.
        destination_dir (str): The directory to move the file to.
        source_dir (str): The directory the file is currently in.
        dry_run (bool): Whether or not to actually rename the file.
        logger (logging.Logger): a logger object for logging debug messages.
        action_type (str): Whether to move or copy the file.
        print_only_renames (bool): Whether to print only the rename or not.
    Returns:
        None
    """
    folder_path = matched_movie['folderName']
    if folder_path.endswith('/'):
        folder_path = folder_path[:-1]
    matched_movie_folder = os.path.basename(folder_path)
    logger.debug(f"matched_movie_folder: {matched_movie_folder}")
    file_extension = os.path.basename(file).split(".")[-1]
    matched_movie_folder = matched_movie_folder + "." + file_extension
    destination = os.path.join(destination_dir, matched_movie_folder)
    source = os.path.join(source_dir, file)
    # Checks if the file already exists in the destination folder and if it's the same file as the source
    if os.path.exists(destination) and filecmp.cmp(source, destination):
        return
    else:
        if os.path.basename(file) != matched_movie_folder:
            if dry_run:
                logger.info(f"{file} -> {matched_movie_folder}")
                return
            else:
                if action_type == "move":
                    shutil.move(source, destination)
                elif action_type == "copy":
                    shutil.copy(source, destination)
                logger.info(f"{file} -> {matched_movie_folder}")
                return
        if print_only_renames == False:
            if os.path.basename(file) == matched_movie_folder:
                if dry_run:
                    logger.info(f"{file} -->> {matched_movie_folder}")
                    return
                else:
                    if action_type == "move":
                        shutil.move(source, destination)
                    elif action_type == "copy":
                        shutil.copy(source, destination)
                    logger.info(f"{file} -->> {matched_movie_folder}")
                    return


def rename_series(matched_series, file, destination_dir, source_dir, dry_run, logger, action_type, print_only_renames):
    """
    Rename a file to match the series in Sonarr.
    Parameters:
        matched_series (dict): A dictionary representing the matched series.
        file (str): The file name to rename.
        destination_dir (str): The directory to move the file to.
        source_dir (str): The directory the file is currently in.
        dry_run (bool): Whether or not to actually rename the file.
        logger (logging.Logger): a logger object for logging debug messages.
        action_type (str): Whether to move or copy the file.
        print_only_renames (bool): Whether to print only the rename or not.
    Returns:
        None
    """
    folder_path = matched_series['path']
    if folder_path.endswith('/'):
        folder_path = folder_path[:-1]
    logger.debug(f"folder_path: {folder_path}")
    matched_series_folder = os.path.basename(folder_path)
    logger.debug(f"matched_series_folder: {matched_series_folder}")
    file_extension = os.path.basename(file).split(".")[-1]
    if "_Season" in file:
        show_name, season_info = file.split("_Season")
        if show_name == matched_series_folder:
            matched_series_folder = show_name + "_Season" + season_info
        else:
            matched_series_folder = matched_series_folder + "_Season" + season_info
    else:
        if "Season" in file:
            season_info = file.split("Season ")[1].split(".")[0]
            try:
                season_number = int(season_info)
            except ValueError:
                logger.error(
                    f"Error: Cannot convert {season_info} to an integer in file {file}")
                return
            if season_number < 10:
                matched_series_folder = matched_series_folder + \
                    "_Season0" + season_info + "." + file_extension
            elif season_number >= 10:
                matched_series_folder = matched_series_folder + \
                    "_Season" + season_info + "." + file_extension
        elif "Specials" in file:
            matched_series_folder = matched_series_folder + "_Season00." + file_extension
        else:
            matched_series_folder = matched_series_folder + "." + file_extension
    destination = os.path.join(destination_dir, matched_series_folder)
    source = os.path.join(source_dir, file)
    if os.path.exists(destination) and filecmp.cmp(source, destination):
        return
    else:
        if os.path.basename(file) != matched_series_folder:
            if dry_run:
                logger.info(f"{file} -> {matched_series_folder}")
                return
            else:
                if action_type == "move":
                    shutil.move(source, destination)
                elif action_type == "copy":
                    shutil.copy(source, destination)
                logger.info(f"{file} -> {matched_series_folder}")
                return
        if print_only_renames == False:
            if os.path.basename(file) == matched_series_folder:
                if dry_run:
                    logger.info(f"{file} -->> {matched_series_folder}")
                    return
                else:
                    if action_type == "move":
                        shutil.move(source, destination)
                    elif action_type == "copy":
                        shutil.copy(source, destination)
                    logger.info(f"{file} -->> {matched_series_folder}")
                    return


def remove_illegal_chars(string):
    """
    Remove illegal characters from a string.
    Parameters:
        string (str): The string to remove illegal characters from.
    Returns:
        string (str): The string with illegal characters removed.
    """
    illegal_characters = re.compile(r'[\\/:*?"<>|\0]')
    return illegal_characters.sub("", string)


def rename_collections(matched_collection, file, destination_dir, source_dir, dry_run, logger, action_type, print_only_renames):
    """
    Rename a file to match the collection in Radarr.
    Parameters:
        matched_collection (dict): A dictionary representing the matched collection.
        file (str): The file name to rename.
        destination_dir (str): The directory to move the file to.
        source_dir (str): The directory the file is currently in.
        dry_run (bool): Whether or not to actually rename the file.
        logger (logging.Logger): a logger object for logging debug messages.
        action_type (str): Whether to move or copy the file.
        print_only_renames (bool): Whether to print only the rename or not.
    Returns:
        None
    """
    matched_collection_title = matched_collection
    logger.debug(f"matched_collection_title: {matched_collection_title}")
    file_extension = os.path.basename(file).split(".")[-1]
    matched_collection_title = matched_collection_title + "." + file_extension
    matched_collection_title = remove_illegal_chars(matched_collection_title)
    destination = os.path.join(destination_dir, matched_collection_title)
    source = os.path.join(source_dir, file)
    if os.path.exists(destination) and filecmp.cmp(source, destination):
        return
    else:
        if os.path.basename(file) != matched_collection_title:
            if dry_run:
                logger.info(f"{file} -> {matched_collection_title}")
                return
            else:
                if action_type == "move":
                    shutil.move(source, destination)
                elif action_type == "copy":
                    shutil.copy(source, destination)
                logger.info(f"{file} -> {matched_collection_title}")
                return
        if print_only_renames == False:
            if os.path.basename(file) == matched_collection_title:
                if dry_run:
                    logger.info(f"{file} -->> {matched_collection_title}")
                    return
                else:
                    if action_type == "move":
                        shutil.move(source, destination)
                    elif action_type == "copy":
                        shutil.copy(source, destination)
                    logger.info(f"{file} -->> {matched_collection_title}")
                    return


def validate_input(instance_name, url, api_key, log_level, dry_run, plex_url, token, source_dir, library_names, destination_dir, movies_threshold, series_threshold, collection_threshold, action_type, logger, print_only_renames):
    """
    Validate the input from the config file.
    Parameters:
        instance_name (str): The name of the instance.
        url (str): The URL of the instance.
        api_key (str): The API key of the instance.
        log_level (str): The log level of the instance.
        dry_run (bool): Whether or not to actually rename the file.
        plex_url (str): The URL of the Plex instance.
        token (str): The token of the Plex instance.
        source_dir (str): The directory to move files from.
        library_names (list): A list of library names to rename files from.
        destination_dir (str): The directory to move files to.
        movies_threshold (int): The number of movies in a collection to rename files from.
        series_threshold (int): The number of series in a collection to rename files from.
        collection_threshold (int): The number of collections to rename files from.
        action_type (str): Whether to move or copy the file.
        logger (logging.Logger): a logger object for logging debug messages.
        print_only_renames (bool): Whether to print only the rename or not.
    Returns:
        None
    """
    if not (url.startswith("http://") or url.startswith("https://")):
        raise ValueError(
            f'\'{instance_name}\' URL must start with \'http://\' or \'https://://\'')
    if not api_key:
        raise ValueError(f'API key is required for \'{instance_name}\'')
    if url.startswith("http://") or url.startswith("https://"):
        if not api_key:
            raise ValueError(f'API key is required for \'{instance_name}\'')
        if dry_run not in [True, False]:
            raise ValueError(
                f'\'dry_run must be either True or False')
            dry_run = True
        if log_level not in ['DEBUG', 'INFO', 'CRITICAL']:
            logger.warning(
                f'Error: \'log_level: {log_level}\' must be either \'DEBUG\', \'INFO\', or \'CRITICAL\'. Defaulting to \'INFO\'')
            log_level = 'INFO'
        if plex_url:
            if not token:
                raise ValueError(
                    f'\Plex token is required for if you\'re going to use plex as a source for collections.\'\nIf you do not know your Plex token, please refer to the https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/ for instructions on how to find it')
            if not library_names:
                raise ValueError(
                    f'\'library_names is required if you\'re having it compare collections.\'')
        if not source_dir:
            raise ValueError(f'\'source_dir is required.')
        if not destination_dir:
            raise ValueError(f'\'destination_dir is required.')
        if not movies_threshold:
            raise ValueError(f'\'movies_threshold is required.')
        if movies_threshold:
            try:
                int(movies_threshold)
            except ValueError:
                raise ValueError(
                    f'\'{instance_name}\' movies_threshold must be an integer.')
        if not series_threshold:
            raise ValueError(
                f'\'{instance_name}\' series_threshold is required.')
        if series_threshold:
            try:
                int(series_threshold)
            except ValueError:
                raise ValueError(
                    f'\'{instance_name}\' series_threshold must be an integer.')
        if not collection_threshold:
            raise ValueError(
                f'\'{instance_name}\' collection_threshold is required.')
        if collection_threshold:
            try:
                int(collection_threshold)
            except ValueError:
                raise ValueError(
                    f'\'{instance_name}\' collection_threshold must be an integer.')
        if not action_type:
            raise ValueError(f'\'{instance_name}\' action_type is required.')
        if action_type not in ['move', 'copy']:
            raise ValueError(
                f'\'{instance_name}\' action_type must be either \'move\' or \'copy\'.')
        if print_only_renames not in [True, False]:
            print_only_renames = False
            raise ValueError(
                f'\'print_only_renames must be either True or False')
    return log_level, dry_run


def setup_logger(log_level):
    """
    Setup the logger.
    Parameters:
        log_level (str): The log level of the instance.
    Returns:
        None
    """
    log_dir = os.path.dirname(os.path.realpath(__file__)) + "/logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    today = time.strftime("%Y-%m-%d")
    log_file = f"{log_dir}/renamer_{today}.log"
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
    list_handler = ListHandler()
    logger.addHandler(list_handler)
    log_files = [f for f in os.listdir(log_dir) if os.path.isfile(
        os.path.join(log_dir, f)) and f.startswith("renamer")]
    log_files.sort(key=lambda x: os.path.getmtime(
        os.path.join(log_dir, x)), reverse=True)
    for file in log_files[3:]:
        os.remove(os.path.join(log_dir, file))
    return logger, list_handler.messages


class ListHandler(logging.Handler):
    """
    A logging handler that appends messages to a list.
    """
    def __init__(self):
        """
        Initialize the handler.
        """
        logging.Handler.__init__(self)
        self.messages = []

    def emit(self, record):
        """
        Emit a record.
        Parameters:
            record (str): The record to emit.
        Returns:
        """
        self.messages.append(self.format(record))


def main():
    """
    Main function.
    """
    cycle_count = 0
    script_dir = os.path.dirname(os.path.abspath(__file__))
    config_file_path = os.path.join(script_dir, 'config.yml')

    with open(config_file_path) as f:
        config = yaml.safe_load(f)

    global_data = config['global']
    renamer_data = config['renamer']

    radarr_data = global_data['radarr']
    sonarr_data = global_data['sonarr']

    log_level = renamer_data['log_level'].upper()
    dry_run = renamer_data['dry_run']
    plex_url = renamer_data['plex_url']
    token = renamer_data['token']
    library_names = renamer_data['library_names']
    source_dir = renamer_data['source_dir']
    destination_dir = renamer_data['destination_dir']
    movies_threshold = renamer_data['movies_threshold']
    series_threshold = renamer_data['series_threshold']
    collection_threshold = renamer_data['collection_threshold']
    action_type = renamer_data['action_type']
    print_only_renames = renamer_data['print_only_renames']

    file_list = sorted(os.listdir(source_dir))
    logger, messages = setup_logger(log_level)
    list_handler = ListHandler()
    logger.addHandler(list_handler)

    if dry_run:
        logger.info('*' * 40)
        logger.info(f'* {"Dry_run Activated":^36} *')
        logger.info('*' * 40)
        logger.info(f'* {" NO CHANGES WILL BE MADE ":^36} *')
        logger.info('*' * 40)
        logger.info('')
    plex_executed = False
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
            renamer_instance = next(
                (r for r in renamer_data.get(
                    instance_type.lower(), []) if r['name'] == instance_name),
                None
            )
            if renamer_instance:
                log_level, dry_run = validate_input(instance_name, url, api_key, log_level, dry_run, plex_url, token, source_dir, library_names, destination_dir, movies_threshold, series_threshold, collection_threshold, action_type, logger, print_only_renames)
                if cycle_count < 1:
                    logger.debug(f'{" Script Settings ":*^40}')
                    logger.debug(f'Dry_run: {dry_run}')
                    logger.debug(f"Log Level: {log_level}")
                    logger.debug(f"plex_url: {plex_url}")
                    logger.debug(f"token: {'<redacted>' if token else 'None'}")
                    logger.debug(f"library_names: {library_names}")
                    logger.debug(f"source_dir: {source_dir}")
                    logger.debug(f"destination_dir: {destination_dir}")
                    logger.debug(f"movies_threshold: {movies_threshold}")
                    logger.debug(f"series_threshold: {series_threshold}")
                    logger.debug(
                        f"collection_threshold: {collection_threshold}")
                    logger.debug(f"action_type: {action_type}")
                    logger.debug(f'*' * 40)
                    logger.debug('')
                    cycle_count += 1
                logger.debug(f'{" Settings ":*^40}')
                logger.debug(f"Instance Name: {instance_name}")
                logger.debug(f"URL: {url}")
                logger.debug(f"API Key: {'<redacted>' if api_key else 'None'}")
            try:
                class_map = {
                    'Radarr': RadarrInstance,
                    'Sonarr': SonarrInstance,
                }
                section_class = class_map.get(
                    (instance_name.split('_')[0]).capitalize())
                arr_instance = section_class(url, api_key, logger)
                if plex_executed is False:
                    if plex_url and token and library_names:
                        plex_collections = get_collections(
                            plex_url, token, library_names, logger)
                        for file in tqdm(file_list, desc='Processing Plex Collections', total=len(file_list)):
                            if not re.search(r'\(\d{4}\).', file):
                                if plex_collections is not None:
                                    matched_collection, reason = match_collection(
                                        plex_collections, file, logger, collection_threshold)
                                    if matched_collection:
                                        rename_collections(
                                            matched_collection, file, destination_dir, source_dir, dry_run, logger, action_type, print_only_renames)
                                    elif reason:
                                        logger.debug(
                                            f"{file} was skipped because: {reason}")
                                        continue
                            else:
                                continue
                        plex_executed = True
                    else:
                        logger.debug(
                            'Plex URL, Token, or Library Names not defined. Skipping Plex Collection renaming.')
                if section_class == RadarrInstance:
                    radarr_instances = []
                    radarr_instances.append(arr_instance)
                    for radarr in radarr_instances:
                        movies = radarr.get_movies()
                        for file in tqdm(file_list, desc=f"Processing {instance_name}", total=len(file_list)):
                            if movies is not None:
                                matched_movie, reason = match_movies(
                                    movies, file, logger, movies_threshold)
                                if matched_movie:
                                    rename_movies(
                                        matched_movie, file, destination_dir, source_dir, dry_run, logger, action_type, print_only_renames)
                                elif reason:
                                    logger.debug(
                                        f"{file} was skipped because: {reason}")
                                    continue
                elif section_class == SonarrInstance:
                    sonarr_instances = []
                    sonarr_instances.append(arr_instance)
                    for sonarr in sonarr_instances:
                        series = sonarr.get_series()
                        for file in tqdm(file_list, desc=f"Processing {instance_name}", total=len(file_list)):
                            if not re.search(r'\(\d{4}\).', file):
                                continue
                            else:
                                matched_series, reason = match_series(
                                    series, file, logger, series_threshold)
                                if matched_series:
                                    rename_series(
                                        matched_series, file, destination_dir, source_dir, dry_run, logger, action_type, print_only_renames)
                                elif reason:
                                    logger.debug(
                                        f"{file} was skipped because: {reason}")
            except ValueError as e:
                logger.error(
                    f"An error occured while processing {instance_name}. Please check the logs for more details.")
                permissions = 0o777
                os.chmod(destination_dir, permissions)
                os.chmod(source_dir, permissions)
    messages = list_handler.messages
    for message in messages:
        print(message)


if __name__ == '__main__':
    """
    Main entry point for the script.
    """
    main()
