#   _____                                 _             _                              
#  |  __ \                               (_)           | |                             
#  | |__) |___ _ __   __ _ _ __ ___   ___ _ _ __   __ _| |_ ___  _ __ _ __ _ __  _   _ 
#  |  _  // _ \ '_ \ / _` | '_ ` _ \ / _ \ | '_ \ / _` | __/ _ \| '__| '__| '_ \| | | |
#  | | \ \  __/ | | | (_| | | | | | |  __/ | | | | (_| | || (_) | |  | |_ | |_) | |_| |
#  |_|  \_\___|_| |_|\__,_|_| |_| |_|\___|_|_| |_|\__,_|\__\___/|_|  |_(_)| .__/ \__, |
#                                                                         | |     __/ |
#                                                                         |_|    |___/ 
# V 1.0.0

import requests
import json
import os
import time
import argparse
import sys

class SonarrInstance:
    def __init__(self, url, api_key):
        """
        Initialize the SonarrInstance object
        Arguments:
            - url: the URL of the Sonarr API endpoint
            - api_key: the API key used to authenticate with the API
        """
        self.url = url
        self.api_key = api_key
        self.headers = {
            "x-api-key": api_key
        }
        self.session = requests.Session()
        self.session.headers.update({"X-Api-Key": self.api_key})

    def get_all_tags(self):
        """
        Get a list of all tags in Sonarr.
        
        Returns:
            A list of dictionaries representing all tags in Sonarr.
        """
        endpoint = f"{self.url}/api/v3/tag"
        response = requests.get(endpoint, headers=self.headers)
        return response.json()


    def check_and_create_tag(self):
        """
        Check if a "renamed" tag exists in Sonarr, and if not, create it.
        Returns the ID of the "renamed" tag.
        """
        # Get all existing tags in Sonarr
        all_tags = self.get_all_tags()
        # Initialize the variable to hold the ID of the "renamed" tag
        renamed_tag_id = None
        # Iterate over the list of existing tags
        for tag in all_tags:
            # Check if a tag with the label "renamed" exists
            if tag["label"] == "renamed":
                # Store the ID of the "renamed" tag
                renamed_tag_id = tag["id"]
                # Break out of the loop
                break
        # If the "renamed" tag doesn't exist
        if renamed_tag_id is None:
            # Call the `create_tag` function to create the "renamed" tag
            self.create_tag("renamed")
            # Get all tags again to retrieve the newly created tag's ID
            all_tags = self.get_all_tags()
            # Iterate over the list of existing tags
            for tag in all_tags:
                # Check if a tag with the label "renamed" exists
                if tag["label"] == "renamed":
                    # Store the ID of the "renamed" tag
                    renamed_tag_id = tag["id"]
                    # Break out of the loop
                    break
        # Return the ID of the "renamed" tag
        return renamed_tag_id

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
            print(f"Tag '{label}' created successfully.")

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
                print(f'Sleeping for 5 seconds until all episodes have been renamed')
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
                print(f'Sleeping for 5 seconds until all episodes have been renamed')
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

class RadarrInstance():
    def __init__(self, url, api_key):
        """
        Initialize the RadarrInstance object
        Arguments:
            - url: the URL of the Radarr API endpoint
            - api_key: the API key used to authenticate with the API
        """
        self.url = url
        self.api_key = api_key
        self.headers = {
            "x-api-key": api_key
        }
        self.session = requests.Session()
        self.session.headers.update({"X-Api-Key": self.api_key})

    def get_all_tags(self):
        """
        Get a list of all tags in Radarr.
        
        Returns:
            A list of dictionaries representing all tags in Radarr.
        """
        endpoint = f"{self.url}/api/v3/tag"
        response = requests.get(endpoint, headers=self.headers)
        return response.json()

    def check_and_create_tag(self):
        """
        Check if a "renamed" tag exists in Radarr, and if not, create it.
        Returns the ID of the "renamed" tag.
        """
        # Get all existing tags in Sonarr
        all_tags = self.get_all_tags()
        # Initialize the variable to hold the ID of the "renamed" tag
        renamed_tag_id = None
        # Iterate over the list of existing tags
        for tag in all_tags:
            # Check if a tag with the label "renamed" exists
            if tag["label"] == "renamed":
                # Store the ID of the "renamed" tag
                renamed_tag_id = tag["id"]
                # Break out of the loop
                break
        # If the "renamed" tag doesn't exist
        if renamed_tag_id is None:
            # Call the `create_tag` function to create the "renamed" tag
            self.create_tag("renamed")
            # Get all tags again to retrieve the newly created tag's ID
            all_tags = self.get_all_tags()
            # Iterate over the list of existing tags
            for tag in all_tags:
                # Check if a tag with the label "renamed" exists
                if tag["label"] == "renamed":
                    # Store the ID of the "renamed" tag
                    renamed_tag_id = tag["id"]
                    # Break out of the loop
                    break
        # Return the ID of the "renamed" tag
        return renamed_tag_id

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
            print(f"Tag '{label}' created successfully.")

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
                    print(f"Failed to remove tag with ID {tag_id} from movie with ID {movie_id}.")
                else:
                    print(f'Successfully removed {tag_id} (Renamed) from {movie["title"]}.')
        return False

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

def check_all_renamed(all_media, tag_id):
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

def print_format(media, to_rename, type, dry_run):
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
        print(f"Series Title: {series_title} {tagged}.")
        current_season = None
        for episode in to_rename:
            episode_number = episode["episodeNumbers"][0]
            season_number = episode["seasonNumber"]
            existing_path = episode["existingPath"]
            new_path = episode["newPath"]
            if current_season != season_number:
                current_season = season_number
                print(f"\tSeason {season_number:02d}:")
            print(f"\t\t{existing_path.split('/')[-1]} renamed to {new_path.split('/')[-1]}")
    if type == "radarr":
        for file in to_rename:
            existing_path = file["existingPath"]
            new_path = file["newPath"]
            movie_title = media["title"]
            print(f"Movie Title: {movie_title} {tagged}.")
            print(f"\t{existing_path.split('/')[-1]} renamed to {new_path.split('/')[-1]}")

def main(series_to_check, movies_to_check, sonarr_urls, sonarr_apis, radarr_urls, radarr_apis, dry_run, cycle, reset):
    # Initialize lists for Sonarr and Radarr instances
    sonarr_instances = []
    radarr_instances = []
    # Set default values for arguments
    # If `movies_to_check` is not provided, default to 1
    movies_to_check = movies_to_check if movies_to_check else 1
    # If `series_to_check` is not provided, default to 1
    series_to_check = series_to_check if series_to_check else 1
    # If `dry_run` is not provided, default to False
    dry_run = dry_run if dry_run else False
    # If `reset` is not provided, default to False
    reset = reset if reset else False
    # If `cycle` is not provided, default to False
    cycle = cycle if cycle else False
    # If `reset` is not provided, default to False
    reset = reset if reset else False
    # Initialize flags to track if all series or movies are tagged
    radarr_all_tagged = False
    sonarr_all_tagged = False
    # If Sonarr URLs and API keys are provided, create Sonarr instances
    if sonarr_urls is not None and sonarr_apis is not None:
        # If the number of Sonarr URLs and API keys do not match, raise an error
        if len(sonarr_urls) != len(sonarr_apis):
            raise ValueError('The number of Sonarr URLs and API keys must be equal.')
        for i in range(len(sonarr_urls)):
            # If both URL and API key are provided for this instance, add it to the list
            if sonarr_urls[i] and sonarr_apis[i]:
                sonarr_instances.append(SonarrInstance(sonarr_urls[i], sonarr_apis[i]))
    # If Radarr URLs and API keys are provided, create Radarr instances
    if radarr_urls is not None and radarr_apis is not None:
        # If the number of Radarr URLs and API keys do not match, raise an error
        if len(radarr_urls) != len(radarr_apis):
            raise ValueError('The number of Radarr URLs and API keys must be equal.')
        for i in range(len(radarr_urls)):
            # If both URL and API key are provided for this instance, add it to the list
            if radarr_urls[i] and radarr_apis[i]:
                radarr_instances.append(RadarrInstance(radarr_urls[i], radarr_apis[i]))
    # If no valid Radarr instances were provided, print a message
    if not radarr_instances:
        print("No valid radarr instances were provided")
    # If no valid Sonarr instances were provided, print a message
    if not sonarr_instances:
        print("No valid sonarr instances were provided")
    if not sonarr_instances and not radarr_instances:
        # If there are no radarr or sonarr instances provided, print message and exit the program.
        print("You have not provided any radarr or sonarr instances for me to check. exiting...")
        sys.exit(0)
    if dry_run:
    # If dry_run is activated, print a message indicating so and the status of other variables.
        print("*************************************")
        print("*         Dry_run Activated         *")
        print("*************************************")
        print("*******NO CHANGES WILL BE MADE*******")
        print(f"Dry_run: {dry_run}")
        print(f"Cycle: {cycle}")
        print(f"Reset: {reset}")
        print(f"Dry_run: {dry_run}")
        print(f"Movies to Check: {movies_to_check}")
        print(f"Series to Check: {series_to_check}")
    all_tagged = 0
    if sonarr_instances:
        # Loop through each Sonarr instance
        for sonarr in sonarr_instances:
            # Check if the tag exists, and create it if it doesn't
            sonarr_tag_id = sonarr.check_and_create_tag()
            # Get a list of all the series in this Sonarr instance
            all_series = sonarr.get_series()
            # Check if all series in this instance have already been tagged
            all_sonarr_tagged = check_all_renamed(all_series, sonarr_tag_id)
            # If all series are tagged, and the "cycle" argument is set to True, or "reset" is set to True, remove the tag from all series
            if all_sonarr_tagged is True and cycle is True or reset is True:
                all_sonarr_tagged = sonarr.remove_tags(all_series, sonarr_tag_id)
            # If all series are tagged and the "cycle" argument is set to False, set "sonarr_all_tagged" to True
            elif all_sonarr_tagged is True and cycle is False:
                sonarr_all_tagged = True
                break
            # If not all series are tagged
            if all_sonarr_tagged is False:
                # Initialize the counter for checked series
                series_checked = 0
                # Initialize the flag for whether a series has been renamed or not
                renamed = False
                # If the number of series to check is set to "Max", set it to the number of all series
                if series_to_check == "Max":
                    series_to_check = len(all_series)
                # Loop through each series
                for series in all_series:
                    # If the number of checked series has reached the limit, break the loop
                    if series_checked >= series_to_check:
                        break
                    # Get the series ID
                    series_id = series["id"]
                    # Get a list of episodes to rename for this series
                    episodes_to_rename = sonarr.get_rename_list(series_id)
                    # Get a list of episode file IDs for this series
                    episode_file_ids = [episode["episodeFileId"] for episode in episodes_to_rename]
                    # If this series has already been tagged, skip to the next series
                    if sonarr_tag_id in series["tags"]:
                        continue
                    else:
                        # If there are episode files to rename
                        if episode_file_ids:
                            # If the "dry_run" argument is set to True, print the series and episodes to be renamed
                            if dry_run == True:
                                print_format(series, episodes_to_rename, "sonarr", dry_run)
                                renamed = True
                            # If the "dry_run" argument is set to False, print the series and episodes to be renamed, and rename the files
                            elif dry_run == False:
                                # print the details of the series to be renamed
                                print_format(series, episodes_to_rename, "sonarr", dry_run)
                                # rename the episodes in the series and store the result in the `renamed` variable
                                renamed = sonarr.rename_files(series_id, episode_file_ids)
                        # If `renamed` is False, meaning movie files could not be renamed
                        if renamed == False:    
                            if dry_run == False:
                                # if the renaming was unsuccessful, print a message and tag the series
                                print(f'Series: {series["title"]} has been tagged')
                                sonarr.add_tag(series_id, sonarr_tag_id)
                            if dry_run == True:
                                # if dry run is True, print a message indicating the series would have been tagged
                                print(f'No series to rename: Series: {series["title"]} would have been been tagged.')
                        series_checked += 1
    # Check if there are any radarr instances
    if radarr_instances:
        # Loop through all radarr instances
        for radarr in radarr_instances:
            # Get the radarr tag id and create the tag if it does not exist
            radarr_tag_id = radarr.check_and_create_tag()
            # Get all the movies from the radarr instance
            all_movies = radarr.get_movies()
            # Check if all the movies are tagged with the radarr tag id
            all_radarr_tagged = check_all_renamed(all_movies, radarr_tag_id)
            # If all the movies are tagged and cycle is True or reset is True, remove the tags from all movies
            if all_radarr_tagged is True and cycle is True or reset is True:
                all_radarr_tagged = radarr.remove_tags(all_movies, radarr_tag_id)
            # If all the movies are tagged and cycle is False, set radarr_all_tagged to True
            elif all_radarr_tagged is True and cycle is False:
                radarr_all_tagged = True
                break
            if all_radarr_tagged is False:
                # get a list of all movies from the radarr instance
                all_movies = radarr.get_movies()
                # counter for the number of movies checked
                movies_checked = 0
                # boolean variable to keep track if renaming was successful
                renamed = False
                # if movies to check is set to "Max", set it to the total number of movies
                if movies_to_check == "Max":
                    movies_to_check = len(all_series)
                # loop through each movie in the list
                for movies in all_movies:
                    # if the number of movies checked is equal to or greater than the limit, break the loop
                    if movies_checked >= movies_to_check:
                        break
                    # get the movie id and path for each movie
                    movie_id = movies["id"]
                    movie_path = movies["path"]
                    # get a list of files that need to be renamed for the movie
                    file_to_rename = radarr.get_rename_list(movie_id)
                    # get a list of movie file ids that need to be renamed
                    movie_file_ids = [file["movieFileId"] for file in file_to_rename]
                    if radarr_tag_id in movies["tags"]:
                        # Skip the iteration if the movie has already been tagged with the radarr_tag_id
                        continue
                    else:
                        # Check if movie_file_ids is not empty
                        if movie_file_ids:
                            # If dry run is True, print the movie details and file names that would be renamed
                            if dry_run == True:
                                print_format(movies, file_to_rename, "radarr", dry_run)
                                renamed = True
                            # If dry run is False, call the `radarr.rename_files` method to actually rename the movie files
                            elif dry_run == False:
                                # print the details of the movies to be renamed
                                print_format(movies, file_to_rename, "radarr", dry_run)
                                # rename the movie in the movues and store the result in the `renamed` variable
                                renamed = radarr.rename_files(movie_id, movie_file_ids)
                        # If `renamed` is False, meaning movie files could not be renamed
                        if renamed == False:
                            # If dry run is False, add the tag to the movie
                            if dry_run == False:
                                print(f'Movie: {movies["title"]} has been tagged')
                                radarr.add_tag(movie_id, radarr_tag_id)
                            # If dry run is True, print a message saying the movie would have been tagged
                            if dry_run == True:
                                print(f'No movie to rename: Movie: {movies["title"]} would have been been tagged.')
                        # Increment the number of movies checked
                        movies_checked += 1
    # Printing final messages based on if all series and/or movies in both Sonarr and Radarr have been renamed.                                    
    if radarr_all_tagged == True:
        # If all movies have been tagged and renamed.
        print('All movies in Radarr have been tagged renamed.')
    if sonarr_all_tagged == True:
        # If all series have been tagged and renamed.
        print('All series in Sonarr have been tagged renamed.')
    if radarr_all_tagged == True and sonarr_all_tagged == True:
        # If all series and movies have been tagged and renamed.
        print(f'All series and movies in both Sonarr and Radarr have been renamed.')
        # Running this unmonitored by setting the cycle variable to True
        print(f'Please set the `cycle` variable to True if you\'d like to run this unmonitored') 
        # Alternatively, removing all tags by setting the reset variable to True
        print(f'Alternatively you can set the `reset` variable to True if you\'d like to remove all Tags')

if __name__ == "__main__":
    # Create an ArgumentParser object to handle command line arguments
    parser = argparse.ArgumentParser(description='Rename files for unlimited number of sonarr/radarr instances.', formatter_class=argparse.RawTextHelpFormatter,
    epilog='Example:\n\npython script.py --sonarr-urls http://localhost:8989 http://localhost:9090 --sonarr-apis abcdefghijklmnopqrstuvwxyz abc3efgh4jklmnopq5stuvwxyz --radarr-urls http://localhost:7878 --radarr-apis abcdefghijklmnopqrstuvwxyz')
    # Add a dry-run argument which will run the script without making any changes
    parser.add_argument('--dry-run', type=bool, help='Run Script without enacting any changes. (Default: False)\n', required=False)
    # Add a cycle argument which will cycle through the program until all movies/shows have been tagged
    parser.add_argument('--cycle', type=bool, help='When all movies/shows have been tagged cycle back through continously. (Default: False)\n', required=False)
    # Add a reset argument which will reset all tags for connected Sonarr/Radarr instances
    parser.add_argument('--reset', type=bool, help='Reset all tags for any connected Radarr/Sonarr instances. (Default: False)\n')
    # Create a group for Sonarr arguments
    sonarr_group = parser.add_argument_group(title='Sonarr Arguments', description='If using Sonarr please provide at least one sonarr URL and API Key pair')
    # Add a sonarr-urls argument which takes one or more Sonarr URLs
    sonarr_group.add_argument('--sonarr-urls', nargs='+', help='Sonarr URL(s)\n', required=False)
    # Add a sonarr-apis argument which takes one or more Sonarr API keys
    sonarr_group.add_argument('--sonarr-apis', nargs='+', help='Sonarr API Key(s)\n', required=False)
    # Add a sonarr-check argument which specifies the number of series to check
    sonarr_group.add_argument('--sonarr-check', type=int, help='Number of series to check. (Default: 1)', required=False)
    # Create a group for Radarr arguments
    radarr_group = parser.add_argument_group(title='Radarr Arguments', description='If using Radarr please provide at least one radarr URL and API Key pair')
    # Add a radarr-urls argument which takes one or more Radarr URLs
    radarr_group.add_argument('--radarr-urls', nargs='+', help='Radarr URL(s)\n', required=False)
    # Add a radarr-apis argument which takes one or more Radarr API keys
    radarr_group.add_argument('--radarr-apis', nargs='+', help='Radarr API Key(s)\n', required=False)
    # Add a radarr-check argument which specifies the number of movies to check
    radarr_group.add_argument('--radarr-check', type=int, help='Number of movies to check. (Default: 1)', required=False)
    # Parsing the command line arguments
    args = parser.parse_args()
    # Call the main function with the parsed arguments
    main(args.sonarr_check, args.radarr_check, args.sonarr_urls, args.sonarr_apis, args.radarr_urls, args.radarr_apis, args.dry_run, args.cycle, args.reset)