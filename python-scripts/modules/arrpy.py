import sys
import requests
import logging
import json

arrpy_py_version = "1.1.7"

logging.getLogger("qbittorrentapi").setLevel(logging.WARNING)
logging.getLogger("requests").setLevel(logging.WARNING)
logging.getLogger('urllib3').setLevel(logging.WARNING)

class StARR:
    def __init__(self, url, api, logger):
        """
        Initialize the StARR class.
        Parameters:
            url (str): The URL of the ARR instance.
            api (str): The API key to use to connect to the ARR instance.
            logger (logging.Logger): a logger object for logging debug messages.
        Raises:
            ValueError: If the URL does not point to a valid ARR instance.
        """
        self.logger = logger
        self.max_retries = 5
        self.timeout = 30
        self.url = url
        self.api = api
        self.headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Api-Key": api
        }
        self.session = requests.Session()
        self.session.headers.update({"X-Api-Key": self.api})
        try:
            status = self.get_system_status()
            app_name = status.get("appName")
            app_version = status.get("version")
            if app_name == 'Radarr':
                self.instance_type = 'Radarr'
            elif app_name == 'Sonarr':
                self.instance_type = 'Sonarr'
            self.logger.debug(f"Connected to {app_name} v{app_version} at {self.url}")
        except requests.exceptions.ConnectionError as e:
            self.logger.error(f"Could not connect to {self.url}: {e}")
            self.logger.error("Exiting script")
            sys.exit(1)
    
    def get_instance_name(self):
        """
        Get the name of the ARR instance.
        Returns:
            str: The name of the ARR instance.
        """
        status = self.get_system_status()
        return status.get("instanceName")

    def get_system_status(self):
        """
        Get the system status of the ARR instance.
        Returns:
            dict: The JSON response from the GET request.
        """
        endpoint = f"{self.url}/api/v3/system/status"
        return self.make_get_request(endpoint)
    
    def make_get_request(self, endpoint, headers=None):
        """
        Make a GET request to the ARR instance.
        Parameters:
            url (str): The URL to make the GET request to.
            params (dict): The parameters to pass to the GET request.
        Returns:
            dict: The JSON response from the GET request.
        Raises:
            requests.exceptions.ConnectionError: If the GET request fails.
        """
        response = None
        for i in range(self.max_retries):
            try:
                response = self.session.get(endpoint, headers=headers, timeout=self.timeout)
                response.raise_for_status()
                return response.json()
            except (requests.exceptions.Timeout, requests.exceptions.HTTPError) as ex:
                self.logger.warning(f'GET request failed ({ex}), retrying ({i+1}/{self.max_retries})...')
        self.logger.error(f'GET request failed after {self.max_retries} retries')
        self.logger.error(f"endpoint: {endpoint}")
        self.logger.error(f"response: {response}")
        self.logger.error(f"exiting script")
        sys.exit(1)
    
    def make_post_request(self, endpoint, headers=None, json=None):
        """
        Make a POST request to the ARR instance.
        Parameters:
            url (str): The URL to make the POST request to.
            headers (dict): The headers to pass to the POST request.
            json (dict): The JSON data to pass to the POST request.
        Returns:
            dict: The JSON response from the POST request.
        Raises:
            requests.exceptions.ConnectionError: If the POST request fails.
        """
        response = None
        for i in range(self.max_retries):
            try:
                response = self.session.post(endpoint, headers=headers, json=json, timeout=self.timeout)
                response.raise_for_status()
                return response.json()
            except (requests.exceptions.Timeout, requests.exceptions.HTTPError) as ex:
                self.logger.warning(f'POST request failed ({ex}), retrying ({i+1}/{self.max_retries})...')
        self.logger.error(f'GET request failed after {self.max_retries} retries')
        self.logger.error(f"endpoint: {endpoint}")
        self.logger.error(f"Payload: {json}")
        self.logger.error(f"response: {response}")
        self.logger.error(f"exiting script")
        sys.exit(1)

    
    def make_put_request(self, endpoint, headers=None, json=None):
        """
        Make a PUT request to the ARR instance.
        Parameters:
            url (str): The URL to make the PUT request to.
            headers (dict): The headers to pass to the PUT request.
            json (dict): The JSON data to pass to the PUT request.
        Returns:
            dict: The JSON response from the PUT request.
        Raises:
            requests.exceptions.ConnectionError: If the PUT request fails.
        """
        response = None
        for i in range(self.max_retries):
            try:
                response = self.session.put(endpoint, headers=headers, json=json, timeout=self.timeout)
                response.raise_for_status()
                return response.json()
            except (requests.exceptions.Timeout, requests.exceptions.HTTPError) as ex:
                self.logger.warning(f'PUT request failed ({ex}), retrying ({i+1}/{self.max_retries})...')
        self.logger.error(f'GET request failed after {self.max_retries} retries')
        self.logger.error(f"endpoint: {endpoint}")
        self.logger.error(f"Payload: {json}")
        self.logger.error(f"response: {response}")
        self.logger.error(f"exiting script")
        sys.exit(1)

    def make_delete_request(self, endpoint, json=None, headers=None):
        """
        Make a DELETE request to the ARR instance.
        Parameters:
            url (str): The URL to make the DELETE request to.
            headers (dict): The headers to pass to the DELETE request.
        Returns:
            dict: The JSON response from the DELETE request.
        Raises:
            requests.exceptions.ConnectionError: If the DELETE request fails.
        """
        response = None
        for i in range(self.max_retries):
            try:
                response = self.session.delete(endpoint, headers=headers, json=json, timeout=self.timeout)
                response.raise_for_status()
                return response
            except (requests.exceptions.Timeout, requests.exceptions.HTTPError) as ex:
                self.logger.warning(f'DELETE request failed ({ex}), retrying ({i+1}/{self.max_retries})...')
        self.logger.error(f'GET request failed after {self.max_retries} retries')
        self.logger.error(f"endpoint: {endpoint}")
        self.logger.error(f"Payload: {json}")
        self.logger.error(f"response: {response}")
        self.logger.error(f"exiting script")
        sys.exit(1)
    
    def get_movie_fileid(self, movie_id):
        """
        Get the file for a movie.
        Parameters:
            movie_id (int): The ID of the movie.
        Returns:
            dict: The JSON response from the GET request.
        """
        endpoint = f"{self.url}/api/v3/moviefile/{movie_id}"
        response = self.make_get_request(endpoint)
        for r in response:
            if r['movieId'] == movie_id:
                print(f"Found file ID {r['id']} for movie ID {movie_id}")
                exit()

    def get_media(self):
        """
        Get all media from the ARR instance.
        Returns:
            list: A list of media objects.
        """
        media = None
        if self.instance_type == 'Sonarr':
            media = "series"
        elif self.instance_type == 'Radarr':
            media = "movie"
        endpoint = f"{self.url}/api/v3/{media}"
        return self.make_get_request(endpoint)

    def get_all_tags(self):
        """
        Get all tags from the ARR instance.
        Returns:
            list: A list of tag objects.
        """
        endpoint = f"{self.url}/api/v3/tag"
        return self.make_get_request(endpoint)

    def create_tag(self, tag):
        """
        Create a tag on the ARR instance.
        Parameters:
            tag (dict): The tag to create.
        Returns:
            int: The ID of the created tag.
        """
        payload = {
            "label": tag
        }
        self.logger.debug(f"Create tag payload: {payload}")
        endpoint = f"{self.url}/api/v3/tag"
        response = self.make_post_request(endpoint, json=payload)
        return response['id']

    def add_tags(self, media_id, tag_id):
        """
        Add a tag to a media item.
        Parameters:
            media_id (int): The ID of the media item to add the tag to.
            tag_id (int): The ID of the tag to add to the media item.
        Returns:
            dict: The JSON response from the POST request.
        """
        id_type = None
        media = None
        if isinstance(media_id, int):
            media_id = [media_id]
        if self.instance_type == 'Sonarr':
            media = "series"
            id_type = "seriesIds"
        elif self.instance_type == 'Radarr':
            media = "movie"
            id_type = "movieIds"
        payload = {
            id_type: media_id,
            "tags": [tag_id],
            "applyTags": "add"
        }
        self.logger.debug(f"Add tag payload: {payload}")
        endpoint = f"{self.url}/api/v3/{media}/editor"
        return self.make_put_request(endpoint, json=payload)

    def remove_tags(self, media_ids, tag_id):
        """
        Remove a tag from all media.
        Parameters:
            media_ids (list): A list of media IDs to remove the tag from.
            tag_id (int): The ID of the tag to remove from the media.
        """
        id_type = None
        media = None
        if self.instance_type == 'Sonarr':
            media = "series"
            id_type = "seriesIds"
        elif self.instance_type == 'Radarr':
            media = "movie"
            id_type = "movieIds"
        payload = {
            id_type: media_ids,
            "tags": [tag_id],
            "applyTags": "remove"
        }
        self.logger.debug(f"Remove tag payload: {payload}")
        endpoint = f"{self.url}/api/v3/{media}/editor"
        return self.make_put_request(endpoint, json=payload)
    
    def get_rename_list(self, media_id):
        """
        Get a list of media items to rename.
        Parameters:
            all_media (list): A list of media objects.
        Returns:
            list: A list of media items to rename.
        """
        rename_endpoint = None
        if self.instance_type == 'Sonarr':
            rename_endpoint = "seriesId"
        elif self.instance_type == 'Radarr':
            rename_endpoint = "movieId"
        endpoint = f"{self.url}/api/v3/rename?{rename_endpoint}={media_id}"
        return self.make_get_request(endpoint, headers=self.headers)

    def rename_media(self, media_ids):
        """
        Rename a media item.
        Parameters:
            media_ids (list): A list of media IDs to attempt rename.
        """
        id_type = None
        name = None
        if self.instance_type == 'Sonarr':
            name = "RenameSeries"
            id_type = "seriesIds"
        elif self.instance_type == 'Radarr':
            name = "RenameMovie"
            id_type = "movieIds"
        payload = {
            "name": name,
            id_type: media_ids,
        }
        self.logger.debug(f"Rename payload: {payload}")
        endpoint = f"{self.url}/api/v3/command"
        return self.make_post_request(endpoint, json=payload)
    
    def refresh_media(self, media_ids):
        """
        Refresh a media item.
        Parameters:
            media_id (int): The ID of the media item to refresh.
        """
        name_type = None
        id_type = None
        if self.instance_type == 'Sonarr':
            if isinstance(media_ids, list) and len(media_ids) == 1:
                id_type = "seriesId"
                media_ids = int(media_ids[0])
            elif isinstance(media_ids, int):
                id_type = "seriesId"
                media_ids = int(media_ids)
            else:
                id_type = "seriesIds"
            name_type = "RefreshSeries"
        elif self.instance_type == 'Radarr':
            if isinstance(media_ids, list) and len(media_ids) == 1:
                id_type = "movieId"
                media_ids = int(media_ids[0])
            elif isinstance(media_ids, int): 
                id_type = "movieId"
                media_ids = int(media_ids)
            else:
                id_type = "movieIds"
            name_type = "RefreshMovie"
        payload = {
            "name": name_type,
            id_type: media_ids
        }
        self.logger.debug(f"Refresh payload: {payload}")
        endpoint = f"{self.url}/api/v3/command"
        return self.make_post_request(endpoint, headers=self.headers, json=payload)
    
    def search_media(self, media_id):
        """
        Search for a media item.
        Parameters:
            media_id (int): The ID of the media item to search for.
        """
        name_type = None
        id_type = None
        self.logger.debug(f"Media ID: {media_id}")
        endpoint = f"{self.url}/api/v3/command"
        if self.instance_type == 'Sonarr':
            for id in media_id:
                name_type = "SeriesSearch"
                id_type = "seriesId"
                payload = {
                    "name": name_type,
                    id_type: id
                }
                self.logger.debug(f"Search payload: {payload}")
                self.make_post_request(endpoint, json=payload)
        elif self.instance_type == 'Radarr':
            name_type = "MoviesSearch"
            id_type = "movieIds"
            id = media_id
            payload = {
                "name": name_type,
                id_type: id
            }
            self.logger.debug(f"Search payload: {payload}")
            self.make_post_request(endpoint, json=payload)
    
    def search_season(self, media_id, season_number):
        """
        Search for a series by ID.
        Parameters:
            media_id (int): The ID of the series to search for
            Raises:
                Exception: If the API call to search for the series fails
        """
        payload = {
            "name": "SeasonSearch",
            "seriesId": media_id,
            "SeasonNumber": season_number
            }
        endpoint = f"{self.url}/api/v3/command"
        return self.make_post_request(endpoint, json=payload)
    
    def get_season_data(self, media_id):
        """
        Get data for a season.
        Parameters:
            media_id (int): The ID of the series to get data for
        Returns:
            list: A list of dictionaries representing the episodes for the season
        """
        endpoint = f"{self.url}/api/v3/episode?seriesId={media_id}"
        return self.make_get_request(endpoint, headers=self.headers)

    def delete_episode_files(self, media_id):
        """
        Delete all episode files for a series.
        Parameters:
            media_id (int): The ID of the series to delete episode files for
        """
        if isinstance(media_id, int):
            media_id = [media_id]
        payload = {
            "episodeFileIds": media_id
        }
        self.logger.debug(f"Delete episode files payload: {payload}")
        endpoint = f"{self.url}/api/v3/episodefile/bulk"
        return self.make_delete_request(endpoint, payload)

    def delete_movie_file(self, media_id):
        """
        Delete a media item.
        Parameters:
            media_id (int): The ID of the media item to delete.
        """
        endpoint = f"{self.url}/api/v3/moviefile/{media_id}"
        return self.make_delete_request(endpoint)

    def search_episodes(self, episode_ids):
        """
        Search for an episode.
        Parameters:
            media_id (int): The ID of the series to search for
            fileIds (int): The episode number to search for
        """
        endpoint = f"{self.url}/api/v3/command"
        payload = {
            "name": "EpisodeSearch",
            "episodeIds": episode_ids
        }
        self.logger.debug(f"Search payload: {payload}")
        return self.make_post_request(endpoint, json=payload)
        
    def get_queue(self):
        """
        Get the queue.
        """
        endpoint = f"{self.url}/api/v3/queue"
        return self.make_get_request(endpoint, headers=self.headers)
    
    def get_quality_profile_names(self):
        """
        Get the names of all quality profiles.
        """
        dict_of_names_and_ids = {}
        endpoint = f"{self.url}/api/v3/qualityprofile"
        response = self.make_get_request(endpoint, headers=self.headers)
        if response:
            for profile in response:
                dict_of_names_and_ids[profile["name"]] = profile["id"]
            return dict_of_names_and_ids

    def refresh_queue(self):
        """
        Refresh the queue.
        """
        endpoint = f"{self.url}/api/v3/command"
        payload = {
            "name": "RefreshMonitoredDownloads"
        }
        self.logger.debug(f"Refresh queue payload: {payload}")
        return self.make_post_request(endpoint, json=payload)

    def get_health(self):
        """
        Get the health status.
        """
        endpoint = f"{self.url}/api/v3/health"
        return self.make_get_request(endpoint, headers=self.headers)
    
    def delete_media(self, media_id, instance_type):
        """
        Delete a media item.
        Parameters:
            media_id (int): The ID of the media item to delete.
        """
        endpoint = None
        if instance_type == 'Sonarr':
            endpoint = f"{self.url}/api/v3/series/{media_id}"
        elif instance_type == 'Radarr':
            endpoint = f"{self.url}/api/v3/movie/{media_id}"
        return self.make_delete_request(endpoint)

    def get_tag_id_from_name(self, tag_name):
        """
        Get the ID of a tag from its name.
        Parameters:
            tag_name (str): The name of the tag to get the ID for.
        Returns:
            int: The ID of the tag.
        """
        all_tags = self.get_all_tags()
        tag_name = tag_name.lower()
        for tag in all_tags:
            if tag["label"] == tag_name:
                tag_id = tag["id"]
                return tag_id
        return None