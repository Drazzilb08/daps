import requests
import time

class RadarrInstance:
    """
    A class representing a Radarr instance.
    """
    def __init__(self, url, api, logger):
        """
        Initialize a RadarrInstance object.
        Parameters:
            url (str): The URL of the Radarr instance.
            api (str): The API key to use to connect to the Radarr instance.
            logger (logging.Logger): a logger object for logging debug messages.
        Raises:
            ValueError: If the URL does not point to a valid Radarr instance.
        """
        self.url = url.rstrip("/")
        self.url = url
        self.api = api
        self.logger = logger
        self.headers = {
            "x-api-key": api
        }
        self.session = requests.Session()
        self.session.headers.update({"X-Api-Key": self.api})
        try:
            status = self.get_system_status()
            app_name = status.get("appName")
            app_version = status.get("version")
            if not app_name.startswith("Radarr"):
                raise ValueError(
                    "URL does not point to a valid Radarr instance.")
            self.logger.debug(
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
            raise ValueError(f"Failed to get movies with status code {response.status_code}")

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

    def add_tag(self, movie_id, tag_id):
        """
        Add a tag to a movie in the Radarr instance.
        Parameters:
            movie_id (int): The ID of the movie to add the tag to
            tag_id (int): The ID of the tag to add to the movie
        """
        if isinstance(movie_id, int):
            movie_id = [movie_id]   
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
                    f'Tag Name: {tag_name} exists with tagId: {tag_id}, no need to create.')
                break
        if tag_id is None:
            if not dry_run:
                self.create_tag(tag_name, logger)
                all_tags = self.get_all_tags()
                for tag in all_tags:
                    if tag["label"] == tag_name:
                        tag_id = tag["id"]
                        break
            
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

    def rename_files(self, movie_id, logger, movies_to_rename,):
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

    def refresh_media(self, logger, movie_id, title):
        """
        Refresh a movie in the Radarr instance.
        Parameters:
            logger (logging.Logger): a logger object for logging debug messages.
            movie_id (int): The ID of the movie to refresh
        Returns:
            bool: Whether or not the movie was refreshed
        """
        payload = {
            "name": "RefreshMovie",
            "movieIds": [movie_id]
        }
        endpoint = f"{self.url}/api/v3/command"
        try:
            response = requests.post(
                endpoint, headers=self.headers, json=payload)
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to refresh movie: {e}")
            return False
        return True

    def search_media(self, movie_id):
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