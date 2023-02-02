#   _____                                      _____       
#  |  __ \                                    |  __ \      
#  | |__) |___ _ __   __ _ _ __ ___   ___ _ __| |__) |   _ 
#  |  _  // _ \ '_ \ / _` | '_ ` _ \ / _ \ '__|  ___/ | | |
#  | | \ \  __/ | | | (_| | | | | | |  __/ |  | |   | |_| |
#  |_|  \_\___|_| |_|\__,_|_| |_| |_|\___|_|  |_|    \__, |
#                                                     __/ |
#                                                    |___/ 
# v.1.0.0

import os
import requests
import shutil
import Levenshtein
import time
import re
import logging
from logging.handlers import RotatingFileHandler
from fuzzywuzzy import fuzz

# Radarr/Sonarr URL; Must begin with HTTP or HTTPS
radarr_url = 'http://IP_ADDRESS:PORT'
sonarr_url = 'http://IP_ADDRESS:PORT'
sonarr_url_1 = 'http://IP_ADDRESS:PORT'

# Radarr/Sonarr API Keys
radarr_api_key = 'RADARR_API'
sonarr_api_key = 'SONARR_API'
sonarr_api_key_1 = 'SONARR_1_API'

# Input directory containing the files to be renamed/moved
source_dir = '/mnt/user/data/posters/'

# Output directory to move the renamed files to
destination_dir = '/mnt/user/appdata/plex-meta-manager/assets/'

dry_run = False # If you'd like to see how things look prior to actually renaming/moving them
log_level = 'CRITICAL' # Log levels: CRITICAL, INFO, DEBUG: Debug being the most verbose, and CRITICAL being the least

# How much of a match a movie/show title needs to be before it is considered a "Match"
# Adjust these numbers 0-100 if you're getting false negatives or posatives. 0 being everythig goes, 100 exact match
movies_threshold=99
series_threshold=99
collection_threshold=99

file_list = sorted(os.listdir(source_dir))

def get_INFO(INFO_type):
    # Define headers with Content-Type and Radarr API Key
    headers = {'Content-Type': 'application/json', }
    headers['x-api-key'] = radarr_api_key
    
    # Get INFOrmation about collections or movies, depending on INFO_type
    try:
        if INFO_type == "collections":
            response = requests.get(radarr_url + '/api/v3/collection', headers=headers)
        elif INFO_type == "movies":
            response = requests.get(radarr_url + '/api/v3/movie', headers=headers)
        
        # Raise error if the status is not successful
        response.raise_for_status()
        
        # Log the success of connecting to Radarr and getting informationrmation
        logger.critical(f"Connected to Radarr.. Getting informationrmation about: {INFO_type}")
        
        # Return the response in JSON format
        return response.json()
    except requests.exceptions.RequestException as err:
        # Log the error while connecting to Radarr
        logger.critical(f"Error connecting to Radarr ({INFO_type}): ", err)
        return None

def get_series_INFO(sonarr_api_key, sonarr_url):
    # Define headers with Content-Type and Sonarr API Key
    headers = {'Content-Type': 'application/json', }
    headers['x-api-key'] = sonarr_api_key
    # Get series INFOrmation
    try:
        response = requests.get(sonarr_url + '/api/v3/series', headers=headers)
        # Raise error if the status is not successful
        response.raise_for_status()
        # Log the success of connecting to Sonarr and getting series INFOrmation
        logger.critical(f"Connected to Sonarr.. Getting series information...")
        # Return the response in JSON format
        return response.json()
    except requests.exceptions.RequestException as err:
        # Log the error while connecting to Sonarr
        if isinstance(err, requests.exceptions.ConnectionError):
            logger.critical(f"Error connecting to Sonarr. Check your network connection.")
        elif isinstance(err, requests.exceptions.Timeout):
            logger.critical(f"Error connecting to Sonarr. The connection timed out.")
        elif isinstance(err, requests.exceptions.HTTPError):
            logger.critical(f"Error connecting to Sonarr. The server responded with a non-200 status code.")
        else:
            logger.critical(f"Error connecting to Sonarr: {err}")
        return None

def match_series(series, file):
    # initialize the best_match to None
    best_match = None
    # initialize the best_distance to the series_threshold
    best_distance = series_threshold
    # Get the matched_series's name and year from the file
    file_name = file.split("(")[0].rstrip()
    logger.debug(f'file_name: {file_name}')
    year = file.split("(")[1].split(")")[0]
    logger.debug(f'year: {year}')
    
    # loop through the series list
    for matched_series in series:
        matched_series_name = matched_series['title']
        matched_series_year = matched_series['year']
        matched_series_year = str(matched_series_year)
        
        matched_series_name_match = fuzz.token_sort_ratio(file_name, matched_series_name)
        if matched_series_name_match >= series_threshold:
            if year == matched_series_year:
                best_match = matched_series
                break
    if best_match:
        
        return best_match, None
    else:
        file_name_with_year = f"{file_name} ({year})"
        matched_series_year = matched_series['year']
        for matched_series in series:
            matched_series_name = matched_series['title']
            matched_series_name_match = fuzz.token_sort_ratio(file_name_with_year, matched_series_name)
            if matched_series_name_match >= series_threshold:
                if year == matched_series_year:
                    best_match = matched_series
                break
        # if a best_match was found in the second loop
        if best_match:
            return best_match, None
        else:
            # if no match was found, return None and the error message
            return None, "No match found"

def match_movies(movies, file):
    # Split the file name and year from the file
    file_name = file.split("(")[0].rstrip()
    year = file.split("(")[1].split(")")[0]

    # Check if the file is a TV show (not a movie)
    if "Season" in file_name:
        return None, "Show"
    # Check if there are other files in the directory with the same name and the word "Season"
    elif any(f.startswith(file_name) and "Season" in f for f in os.listdir(source_dir)):
        return None, "Show"
    # If it's not a TV show, try to match it to a movie
    else:
        best_match = None
        for matched_movie in movies:
            matched_movie_name = matched_movie['title']
            matched_movie_year = matched_movie['year']
            matched_movie_year = str(matched_movie_year)

            matched_movie_name_match = fuzz.token_sort_ratio(file_name, matched_movie_name)
            if matched_movie_name_match >= movies_threshold:
                if year == matched_movie_year:
                    best_match = matched_movie
                    break
        return best_match, None

        # Return the best match, or None if no match was found
        if best_match:
            
            return best_match, None
        else:
            return None, "No match found"

def match_collection(collection, file):
    # Split the file name and extension and get the file name only
    file_name = os.path.splitext(file)[0]
    logger.debug(f'file_name: {file_name}')
    
    # Check if the file name contains the word "Season" or "Special", return None and "Show" if true
    if "Season" in file_name or "Special" in file_name:
        return None, "Show"
    
    # Check if there are other files in the directory with the same name and the word "Season", return None and "Show" if true
    elif any(f.startswith(file_name) and "Season" in f for f in os.listdir(source_dir)):
        return None, "Show"
    else:
        best_match = None
        best_distance = collection_threshold
        # Loop through the collection
        for matched_collection in collection:
            matched_collection_name = matched_collection['title']
            # Get the ratio of similarity between the file name and the matched collection name
            matched_collection_name_match = fuzz.token_sort_ratio(file_name, matched_collection_name)
            # If the ratio of similarity is higher than or equal to the collection threshold
            if matched_collection_name_match >= collection_threshold:
                best_distance = matched_collection_name_match
                best_match = matched_collection
        if best_match:
            
            return best_match, None
        else:
            return None, "No match found"

def rename_movies(matched_movie, file, destination_dir, source_dir):
    # Get the matched_movie's folder name and the file extension
    folder_path = matched_movie['folderName']
    matched_movie_folder = os.path.basename(folder_path)
    logger.debug(f"matched_movie_folder: {matched_movie_folder}")
    file_extension = os.path.basename(file).split(".")[-1]
    matched_movie_folder = matched_movie_folder + "." + file_extension
    
    # Create the full path to the destination folder
    destination = os.path.join(destination_dir, matched_movie_folder)
    source = os.path.join(source_dir, file)
    
    # Check if the file name is different from the matched_movie's folder name
    if os.path.basename(file) != matched_movie_folder:
        if dry_run:
            logger.critical(f"{file} -> {matched_movie_folder}")
            return
        else:
            # Move the file to the destination folder
            shutil.move(source, destination)
            logger.critical(f"{file} -> {matched_movie_folder}")
            return
    
    # Check if the file name is the same as the matched_movie's folder name
    if os.path.basename(file) == matched_movie_folder:
        if dry_run:
            logger.critical(f"{file} -->> {matched_movie_folder}")
            return
        else:
            # Move the file to the destination folder
            shutil.move(source, destination)
            logger.critical(f"{file} -->> {matched_movie_folder}")
            return

def rename_series(matched_series, file, destination_dir, source_dir):
    # Get the folder path and name of the matched series
    folder_path = matched_series['path']
    logger.debug(f"folder_path: {folder_path}")
    matched_series_folder = os.path.basename(folder_path)
    logger.debug(f"matched_series_folder: {matched_series_folder}")
    
    # Get the file extension of the input file
    file_extension = os.path.basename(file).split(".")[-1]
    # Check if the file name contains "Season" or "Specials" and append the corresponding INFO to the matched series folder name
    if "_Season" in file:
        show_name, season_info = file.split("_Season")
        if show_name == matched_series_folder:
            matched_series_folder = show_name + "_Season" + season_info
        else:
            matched_series_folder = matched_series_folder + "_Season" + season_info
    else:
        if "Season" in file:
            season_info = file.split("Season ")[1].split(".")[0]
            if int(season_info) < 10:
                matched_series_folder = matched_series_folder + "_Season0" + season_info + "." + file_extension
            elif int(season_info) >= 10:
                matched_series_folder = matched_series_folder + "_Season" + season_info + "." + file_extension
        elif "Specials" in file:
            matched_series_folder = matched_series_folder + "_Season00." + file_extension
        else:
            matched_series_folder = matched_series_folder + "." + file_extension
    
    # Set the destination path for the file to be renamed
    destination = os.path.join(destination_dir, matched_series_folder)
    
    # Set the source path for the file
    source = os.path.join(source_dir, file)
    
    # If the file name is not equal to the matched series folder name, then rename the file
    if os.path.basename(file) != matched_series_folder:
        if dry_run:
            logger.critical(f"{file} -> {matched_series_folder}")
            return
        else:
            logger.critical(f"{file} -> {matched_series_folder}")
            shutil.move(source, destination)
            return
    # If the file name is equal to the matched series folder name, then move the file to the destination folder
    if os.path.basename(file) == matched_series_folder:
        if dry_run:
            logger.critical(f"{file} -->> {matched_series_folder}")
            return
        else:
            shutil.move(source, destination)
            logger.critical(f"{file} -->> {matched_series_folder}")
            return 


# def remove_illegal_chars(string):
#     return re.sub(r'[^\w\s-]', '', string)
def remove_illegal_chars(string):
    # Define a regular expression pattern to match illegal characters
    illegal_characters = re.compile(r'[\\/:*?"<>|\0]')
    
    # Replace all instances of illegal characters with an empty string
    return illegal_characters.sub("", string)

def rename_collections(matched_collection, file, destination_dir, source_dir):
    # Get the title of the matched collection
    matched_collection_title = matched_collection['title']
    logger.debug(f"matched_collection_title: {matched_collection_title}")
    
    # Get the file extension of the file
    file_extension = os.path.basename(file).split(".")[-1]
    
    # Concatenate the matched collection title and file extension to form the new file name
    matched_collection_title = matched_collection_title + "." + file_extension
    
    matched_collection_title = remove_illegal_chars(matched_collection_title)
    
    # Get the destination path for the renamed file
    destination = os.path.join(destination_dir, matched_collection_title)
    
    # Get the source path for the current file
    source = os.path.join(source_dir, file)
    
    # If the current file name is not the same as the new file name
    if os.path.basename(file) != matched_collection_title:
        # If the code is in dry run mode, log the intended file rename operation
        if dry_run:
            logger.critical(f"{file} -> {matched_collection_title}")
            return
        # If the code is not in dry run mode, perform the file rename operation and log it
        else:
            shutil.move(source, destination)
            logger.critical(f"{file} -> {matched_collection_title}")
            return
    
    # If the current file name is the same as the new file name
    if os.path.basename(file) == matched_collection_title:
        # If the code is in dry run mode, log the intended file rename operation
        if dry_run:
            logger.critical(f"{file} -->> {matched_collection_title}")
            return
        # If the code is not in dry run mode, perform the file rename operation and log it
        else:
            shutil.move(source, destination)
            logger.critical(f"{file} -->> {matched_collection_title}")
            return

def validate_input(source_dir, destination_dir, radarr_url, sonarr_url, sonarr_url_1, dry_run, log_level):
    if not source_dir:
        raise ValueError("Source directory not set")
    if not os.path.isdir(source_dir):
        raise ValueError("The source_dir {} is not a valid directory.".format(source_dir))
    if not destination_dir:
        raise ValueError("Destination directory not set")
    if not os.path.isdir(destination_dir):
        raise ValueError("The destination_dir {} is not a valid directory.".format(destination_dir))
    if not radarr_url and not sonarr_url:
        raise ValueError("Both Radarr and Sonarr URLs are not set")
    if type(dry_run) != bool:
        raise ValueError("dry_run must be either True or False")
    if radarr_url:
        if not (radarr_url.startswith("http://") or radarr_url.startswith("https://")):
            raise ValueError("Radarr URL must start with 'http://' or 'https://'.")
    if sonarr_url:       
        if not (sonarr_url.startswith("http://") or sonarr_url.startswith("https://")):
            raise ValueError("Sonarr URL must start with 'http://' or 'https://'.")
    if sonarr_url_1:
        if sonarr_url_1 and not (sonarr_url_1.startswith("http://") or sonarr_url_1.startswith("https://")):
            raise ValueError("Sonarr URL 1 must start with 'http://' or 'https://'.")
    if log_level not in ["DEBUG", "INFO", "CRITICAL"]:
        raise ValueError("Invalid log level. Must be one of 'DEBUG', 'INFO', 'CRITICAL'.")

def main():
    validate_input(source_dir, destination_dir, radarr_url, sonarr_url, sonarr_url_1, dry_run, log_level)

    # Check if dry_run is set to True
    if dry_run:
        logger.info("********************************")
        logger.info("*         Dry_run True         *")
        logger.info("********************************")
        # Log a warning message that no changes will be made
        logger.info("****NO CHANGES WILL BE MADE*****")

    # Log the destination directory
    logger.critical(f"Destination folder: {destination_dir}")

    # Check if both radarr_api_key and radarr_url are set
    if radarr_api_key and radarr_url:
        logger.info("********************************")
        logger.info("*     Connecting to Radarr     *")
        logger.info("********************************")
        # Get movie and collection INFOrmation from Radarr
        movies = get_INFO("movies")
        collection = get_INFO("collections")
        logger.info("********************************")
        # Iterate through files in source_dir
        for file in tqdm(file_list, desc='Processing files', total=len(file_list)):
            # Check if the file name contains "(" or ")"
            if not re.search(r'\(\d{4}\).', file):
                # If collections are available
                if collection is not None:
                    # Try to match the file with a collection in the Radarr library
                    matched_collection, reason = match_collection(collection, file)
                    # If a match is found, rename the file
                    if matched_collection:
                        rename_collections(matched_collection, file, destination_dir, source_dir)
                    # If a reason is given for not finding a match, log it
                    elif reason:
                        logger.info(f"{file} was skipped because: {reason}")
                        continue
                    # If no reason is given, do nothing
                    else:
                        pass
            else:
                # If movies are available
                if movies is not None:
                    # Try to match the file with a movie in the Radarr library
                    matched_movie, reason = match_movies(movies, file)
                    # If a match is found, rename the file
                    if matched_movie:
                        rename_movies(matched_movie, file, destination_dir, source_dir)
                    # If a reason is given for not finding a match, log it
                    elif reason:
                        logger.info(f"{file} was skipped because: {reason}")
                    # If no reason is given, do nothing
                    else:
                        pass
    # Check if sonarr_api_key and sonarr_url are both present
    if sonarr_api_key and sonarr_url:
        # Log a header indicating the start of connecting to Sonarr
        logger.info("********************************")
        logger.info("*     Connecting to Sonarr     *")
        logger.info("********************************")
        # Get the series INFOrmation from Sonarr
        series = get_series_INFO(sonarr_api_key, sonarr_url)
        # Log a header indicating the end of connecting to Sonarr
        logger.info("********************************")
        # Loop through all the files in the source directory
        for file in tqdm(file_list, desc='Processing files', total=len(file_list)):
            # Skip files that don't contain "(" or ")" in their names
            if not re.search(r'\(\d{4}\).', file):
                continue
            else:
                # Try to match the file with a series in the Sonarr library
                matched_series, reason = match_series(series, file)
                # If a match is found, rename the file
                if matched_series:
                    rename_series(matched_series, file, destination_dir, source_dir)
                # If the file was skipped for a reason, log the reason
                elif reason:
                    logger.info(f"{file} was skipped because: {reason}")
                    pass
                # If no match was found, log a CRITICAL error
                else:
                    logger.critical(f"No match found for {file}")

# Check if sonarr_api_key_1 and sonarr_url_1 are both present
    if sonarr_api_key_1 and sonarr_url_1:
        # Log a header indicating the start of connecting to Sonarr 2
        logger.info("********************************")
        logger.info("*    Connecting to Sonarr 2    *")
        logger.info("********************************")
        # Get the series INFOrmation from Sonarr 2
        series_1 = get_series_INFO(sonarr_api_key_1, sonarr_url_1)
        # Log a header indicating the end of connecting to Sonarr 2
        logger.info("********************************")
        # Loop through all the files in the source directory
        for file in tqdm(file_list, desc='Processing files', total=len(file_list)):
            # Skip files that don't contain "(" or ")" in their names
            if '(' not in file or ')' not in file:
                continue
            else:
                # Try to match the file with a series in the Sonarr 2 library
                matched_series, reason = match_series(series_1, file)
                # If a match is found, rename the file
                if matched_series:
                    rename_series(matched_series, file, destination_dir, source_dir)
                # If the file was skipped for a reason, log the reason
                elif reason:
                    logger.info(f"{file} was skipped because: {reason}")
                    pass
                # If no match was found, log a CRITICAL error
                else:
                    logger.critical(f"No match found for {file}")
    permissions = 0o777
    os.chmod(destination_dir, permissions)

def setup_logger(log_level):
    # Create a directory to store logs, if it doesn't exist
    log_dir = "logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    # Get the current date in YYYY-MM-DD format
    today = time.strftime("%Y-%m-%d")
    # Create a log file with the current date in its name
    log_file = f"{log_dir}/renamer_{today}.log"
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
        print(f"Invalid log level '{log_level}', defaulting to 'CRITICAL'")
        logger.setLevel(logging.CRITICAL)
    # Set the formatter for the file handler
    formatter = logging.Formatter(fmt='%(asctime)s %(levelname)s: %(message)s', datefmt='%I:%M %p')
    # Add a TimedRotatingFileHandler to the logger, to log to a file that rotates daily
    handler = logging.handlers.TimedRotatingFileHandler(log_file, when='midnight', interval=1, backupCount=5)
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    # Set the formatter for the console handler
    formatter = logging.Formatter()
        # Add a StreamHandler to the logger, to log to the console
    console_handler = logging.StreamHandler()
    if log_level == 'debug':
        console_handler.setLevel(logging.DEBUG)
    elif log_level == 'info':
        console_handler.setLevel(logging.INFO)
    elif log_level == 'critical':
        console_handler.setLevel(logging.CRITICAL)
    logger.addHandler(console_handler)

    return logger

if __name__ == '__main__':
    # Call the function to setup the logger and pass the log level
    logger = setup_logger(log_level)
    # Call the main function
    main()
