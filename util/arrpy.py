import time
import json
import logging
import time

try:
    import requests
except ImportError as e:
    print(f"ImportError: {e}")
    print("Please install the required modules with 'pip install -r requirements.txt'")
    exit(1)

logging.getLogger("requests").setLevel(logging.WARNING)

class StARR:
    def __init__(self, url, api, logger):
        """
        Initialize the StARR class.
        
        Args:
            url (str): The base URL of the ARR instance (Sonarr/Radarr).
            api (str): The API key for authenticating with the ARR instance.
            logger (logging.Logger): Logger for debug and error messages.
            connect_status (bool): Connection status to the ARR instance.
            instance_type (str): Type of ARR instance (Sonarr or Radarr).
        """
        self.logger = logger
        self.max_retries = 5
        self.timeout = 60
        self.url = url.rstrip('/')
        self.api = api
        self.headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Api-Key": api
        }
        self.session = requests.Session()
        self.session.headers.update({"X-Api-Key": self.api})

        status = self.get_system_status()
        if not status:
            self.connect_status = False
            return
        app_name = status.get("appName")
        app_version = status.get("version")

        if app_name == 'Radarr':
            self.instance_type = 'Radarr'
        elif app_name == 'Sonarr':
            self.instance_type = 'Sonarr'

        self.connect_status = True
        self.logger.debug(f"Connected to {app_name} v{app_version} at {self.url}")

    def get_instance_name(self):
        """Retrieve the instance name from system status."""
        status = self.get_system_status()
        return status.get("instanceName")

    def get_system_status(self):
        """Get ARR system status info."""
        endpoint = f"{self.url}/api/v3/system/status"
        return self.make_get_request(endpoint)

    def make_get_request(self, endpoint, headers=None):
        return self._request_with_retries("GET", endpoint, headers=headers)

    def make_post_request(self, endpoint, headers=None, json=None):
        return self._request_with_retries("POST", endpoint, headers=headers, json=json)

    def make_put_request(self, endpoint, headers=None, json=None):
        return self._request_with_retries("PUT", endpoint, headers=headers, json=json)

    def make_delete_request(self, endpoint, headers=None, json=None):
        return self._request_with_retries("DELETE", endpoint, headers=headers, json=json)

    def _request_with_retries(self, method, endpoint, headers=None, json=None):
        """
        Perform HTTP request with retry logic.

        Args:
            method (str): HTTP method (GET, POST, PUT, DELETE).
            endpoint (str): Full API endpoint URL.
            headers (dict): Optional headers for the request.
            json (dict): Optional JSON payload.

        Returns:
            dict or response object or None: Response content or None if failed.
        """
        response = None
        for i in range(self.max_retries):
            try:
                # Make the request according to method
                if method == "GET":
                    response = self.session.get(endpoint, headers=headers, timeout=self.timeout)
                elif method == "POST":
                    response = self.session.post(endpoint, headers=headers, json=json, timeout=self.timeout)
                elif method == "PUT":
                    response = self.session.put(endpoint, headers=headers, json=json, timeout=self.timeout)
                elif method == "DELETE":
                    response = self.session.delete(endpoint, headers=headers, json=json, timeout=self.timeout)
                else:
                    raise ValueError(f"Unsupported method: {method}")

                # Raise an HTTPError if the response was unsuccessful
                response.raise_for_status()

                # Return raw response for DELETE; JSON for everything else
                return response if method == "DELETE" else response.json()

            except (requests.exceptions.Timeout,
                    requests.exceptions.HTTPError,
                    requests.exceptions.RequestException) as ex:
                if i < self.max_retries - 1:
                    self.logger.warning(f'{method} request failed ({ex}), retrying ({i+1}/{self.max_retries})...')
                    time.sleep(1)  # Throttle retries to avoid server overload
                else:
                    # Final failure after all retries
                    self._handle_request_exception(method, endpoint, ex, response, json)

        return None

    def _handle_request_exception(self, method, endpoint, ex, response, payload=None):
        """
        Centralized exception logger for failed requests.
        """
        status_code = response.status_code if response is not None and response.status_code else "No response"
        hint = self._get_error_hint(status_code) if isinstance(status_code, int) else "No HTTP response received, check URL"

        self.logger.error(f'{method} request failed after {self.max_retries} retries.')
        self.logger.error(f"Endpoint: {endpoint}")
        if payload:
            self.logger.error(f"Payload: {payload}")
        if response is not None:
            self.logger.error(f"Response: {response.text} Code: {status_code}")
        self.logger.error(f"Status: {status_code}, Error: {ex}")
        self.logger.error(f"\nHint: {hint}\n")

    def _get_error_hint(self, status_code):
        """
        Return a human-readable explanation for common HTTP errors.
        """
        hints = {
            400: "Bad Request – likely malformed or missing parameters.",
            401: "Unauthorized – check that your API key is correct.",
            403: "Forbidden – the API key may not have the necessary permissions.",
            404: "Not Found – the endpoint may be incorrect or the resource doesn't exist.",
            429: "Too Many Requests – you may have hit a rate limit.",
            500: "Internal Server Error – something went wrong on the server.",
            503: "Service Unavailable – the server is currently down or overloaded."
        }
        return hints.get(status_code, "Unknown error – check logs for more info.")

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
        Args:
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
        Args:
            media_id (int): The ID of the media item to add the tag to.
            tag_id (int): The ID of the tag to add to the media item.
        Returns:
            dict: The JSON response from the POST request.
        """
        id_type = None
        if isinstance(media_id, int):
            media_id = [media_id]
        if self.instance_type == 'Sonarr':
            media_type = "series"
            id_type = "seriesIds"
        elif self.instance_type == 'Radarr':
            media_type = "movie"
            id_type = "movieIds"
        payload = {
            id_type: media_id,
            "tags": [tag_id],
            "applyTags": "add"
        }
        self.logger.debug(f"Add tag payload: {payload}")
        endpoint = f"{self.url}/api/v3/{media_type}/editor"
        return self.make_put_request(endpoint, json=payload)

    def remove_tags(self, media_ids, tag_id):
        """
        Remove a tag from all media.
        Args:
            media_ids (list): A list of media IDs to remove the tag from.
            tag_id (int): The ID of the tag to remove from the media.
        Returns:
            dict: The JSON response from the POST request.
        """
        id_type = None
        media = None
        if self.instance_type == 'Sonarr':
            media_type = "series"
            id_type = "seriesIds"
        elif self.instance_type == 'Radarr':
            media_type = "movie"
            id_type = "movieIds"
        payload = {
            id_type: media_ids,
            "tags": [tag_id],
            "applyTags": "remove"
        }
        self.logger.debug(f"Remove tag payload: {payload}")
        endpoint = f"{self.url}/api/v3/{media_type}/editor"
        return self.make_put_request(endpoint, json=payload)
    
    def get_rename_list(self, media_id):
        """
        Get a list of media items to rename.
        Args:
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
        Args:
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

    def rename_folders(self, media_ids, root_folder_path):
        """
        Rename a media item.
        Args:
            media_ids (list): A list of media IDs to attempt rename.
        """
        id_type = None
        if self.instance_type == 'Sonarr':
            media_type = "series"
            id_type = "seriesIds"
        elif self.instance_type == 'Radarr':
            media_type = "movie"
            id_type = "movieIds"
        payload = {
            id_type: media_ids,
            "moveFiles": True,
            "rootFolderPath": root_folder_path,
        }
        self.logger.debug(f"Payload: {payload}")
        endpoint = f"{self.url}/api/v3/{media_type}/editor"
        return self.make_put_request(endpoint, json=payload)
    
    def wait_for_command(self, command_id):
        """
        Wait for a refresh to complete.
        Args:
            command_id (int): The ID of the refresh command.
        Returns:
            bool: True if the refresh was successful, False otherwise.
        """
        print(f"Waiting for command to complete...")
        while True:
            endpoint = f"{self.url}/api/v3/command/{command_id}"
            response = self.make_get_request(endpoint)
            if response['status'] == 'completed':
                return True
            elif response['status'] == 'failed':
                return False
            time.sleep(5)
    
    def refresh_items(self, media_ids):
        """
        Refresh a media item.
        Args:
            media_id (int): The ID of the media item to refresh.
        """
        if isinstance(media_ids, int):
            media_ids = [media_ids]
        if self.instance_type == 'Sonarr':
            name_type = "RefreshSeries"
            media_type = "seriesIds"
        elif self.instance_type == 'Radarr':
            name_type = "RefreshMovie"
            media_type = "movieIds"
        payload = {
            "name": name_type,
            media_type: media_ids
        }
        self.logger.debug(f"Refresh payload: {payload}")
        endpoint = f"{self.url}/api/v3/command"
        return self.make_post_request(endpoint, headers=self.headers, json=payload)
    
    def refresh_media(self):
        """
        Refresh a media item.
        Args:
            media_id (int): The ID of the media item to refresh.
        """
        if self.instance_type == 'Sonarr':
            name_type = "RefreshSeries"
        elif self.instance_type == 'Radarr':
            name_type = "RefreshMovie"
        payload = {
            "name": name_type,
        }
        self.logger.debug(f"Refresh payload: {payload}")
        endpoint = f"{self.url}/api/v3/command"
        return self.make_post_request(endpoint, headers=self.headers, json=payload)
    
    def search_media(self, media_ids):
        """
        Search for a media item.
        Args:
            media_id (int): The ID of the media item to search for.
        """
        name_type = None
        id_type = None
        self.logger.debug(f"Media ID: {media_ids}")
        endpoint = f"{self.url}/api/v3/command"
        payloads = []
        if isinstance(media_ids, int):
            media_ids = [media_ids]
        if self.instance_type == 'Sonarr':
            name_type = "SeriesSearch"
            id_type = "seriesId"
            for id in media_ids:
                payloads.append({
                    "name": name_type,
                    id_type: id
                })
        elif self.instance_type == 'Radarr':
            name_type = "MoviesSearch"
            id_type = "movieIds"
            payloads.append({
                "name": name_type,
                id_type: media_ids
            })
        self.logger.debug(f"Search payload: {payloads}")
        for payload in payloads:
            result = self.make_post_request(endpoint, headers=self.headers, json=payload)
        if result:
            return result
        else:
            self.logger.error(f"Search failed for media ID: {media_ids}")
            return None
    
    def search_season(self, media_id, season_number):
        """
        Search for a series by ID.
        Args:
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
    
    def get_episode_data(self, media_id):
        """
        Get data for an episode.
        Args:
            media_id (int): The ID of the series to get data for
        Returns:
            list: A list of dictionaries representing the episodes for the series
        """
        endpoint = f"{self.url}/api/v3/episodefile?seriesId={media_id}"
        return self.make_get_request(endpoint, headers=self.headers)
    
    def get_episode_data_by_season(self, media_id, season_number):
        """
        Get data for an episode.
        Args:
            media_id (int): The ID of the series to get data for
        Returns:
            list: A list of dictionaries representing the episodes for the series
        """
        endpoint = f"{self.url}/api/v3/episode?seriesId={media_id}&seasonNumber={season_number}"
        return self.make_get_request(endpoint, headers=self.headers)
    
    def get_season_data(self, media_id):
        """
        Get data for a season.
        Args:
            media_id (int): The ID of the series to get data for
        Returns:
            list: A list of dictionaries representing the episodes for the season
        """
        endpoint = f"{self.url}/api/v3/episode?seriesId={media_id}"
        return self.make_get_request(endpoint, headers=self.headers)
    
    def delete_episode_file(self, episode_file_id):
        """
        Delete an episode file.
        Args:
            episode_file_id (int): The ID of the episode file to delete.
        """
        endpoint = f"{self.url}/api/v3/episodefile/{episode_file_id}"
        return self.make_delete_request(endpoint)

    def delete_episode_files(self, episode_file_ids):
        """
        Delete all episode files for a series.
        Args:
            media_id (int): The ID of the series to delete episode files for
        """
        if isinstance(episode_file_ids, int):
            episode_file_ids = [episode_file_ids]
        payload = {
            "episodeFileIds": episode_file_ids
        }
        self.logger.debug(f"Delete episode files payload: {payload}")
        endpoint = f"{self.url}/api/v3/episodefile/bulk"
        return self.make_delete_request(endpoint, payload)

    def delete_movie_file(self, media_id):
        """
        Delete a media item.
        Args:
            media_id (int): The ID of the media item to delete.
        """
        endpoint = f"{self.url}/api/v3/moviefile/{media_id}"
        return self.make_delete_request(endpoint)

    def search_episodes(self, episode_ids):
        """
        Search for an episode.
        Args:
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
    
    def get_movie_data(self, media_id):
        """
        Get data for a movie.
        Args:
            media_id (int): The ID of the movie to get data for
        Returns:
            dict: A dictionary representing the movie
        """
        endpoint = f"{self.url}/api/v3/moviefile?movieId={media_id}"
        return self.make_get_request(endpoint, headers=self.headers)
    
    def get_grab_history(self, media_id, instance_type):
        """
        Get grab history.
        Args:
            media_id (int): The ID of the media item to get the history for.
            instance_type (str): The type of instance to get the history for.
        
        Returns:
            dict: A dictionary representing the history.
        """
        if instance_type == 'radarr':
            url_addon = f"movie?movieId={media_id}&eventType=grabbed&includeMovie=false"
        elif instance_type == 'sonarr':
            url_addon = f"series?seriesId={media_id}&eventType=grabbed&includeSeries=false&includeEpisode=false"
        endpoint = f"{self.url}/api/v3/history/{url_addon}"
        return self.make_get_request(endpoint, headers=self.headers)
    
    def get_import_history(self, media_id, instance_type):
        """
        Get import history.
        Args:
            media_id (int): The ID of the media item to get the history for.
            instance_type (str): The type of instance to get the history for.

        Returns:
            dict: A dictionary representing the history.
        """
        if instance_type == 'radarr':
            url_addon = f"movie?movieId={media_id}&eventType=downloadFolderImported&includeMovie=false"
        elif instance_type == 'sonarr':
            url_addon = f"series?seriesId={media_id}&eventType=downloadFolderImported&includeSeries=false&includeEpisode=false"
        endpoint = f"{self.url}/api/v3/history/{url_addon}"
        return self.make_get_request(endpoint, headers=self.headers)
    
    def get_season_grab_history(self, media_id, season):
        """
        Get season grab history.
        Args:
            media_id (int): The ID of the media item to get the history for.
            season (int): The season to get the history for.

        Returns:
            dict: A dictionary representing the history.
        """
        url_addon = f"series?seriesId={media_id}&seasonNumber={season}&eventType=grabbed&includeSeries=false&includeEpisode=false"
        endpoint = f"{self.url}/api/v3/history/{url_addon}"
        return self.make_get_request(endpoint, headers=self.headers)
    
    def get_season_import_history(self, media_id, season):
        """
        Get season import history.
        Args:
            media_id (int): The ID of the media item to get the history for.
            season (int): The season to get the history for.

        Returns:
            dict: A dictionary representing the history.
        """
        url_addon = f"series?seriesId={media_id}&seasonNumber={season}&eventType=downloadFolderImported&includeSeries=false&includeEpisode=false"
        endpoint = f"{self.url}/api/v3/history/{url_addon}"
        return self.make_get_request(endpoint, headers=self.headers)
    
    def get_import_history(self, media_id, instance_type):
        """
        Get import history.
        Args:
            media_id (int): The ID of the media item to get the history for.
            instance_type (str): The type of instance to get the history for.

        Returns:
            dict: A dictionary representing the history.
        """
        if instance_type == 'radarr':
            url_addon = f"movie?movieId={media_id}&eventType=downloadFolderImported&includeMovie=false"
        elif instance_type == 'sonarr':
            url_addon = f"series?seriesId={media_id}&eventType=downloadFolderImported&includeSeries=false&includeEpisode=false"
        endpoint = f"{self.url}/api/v3/history/{url_addon}"
        return self.make_get_request(endpoint, headers=self.headers)
    
    def get_queue(self, instance_type):
        """
        Get the queue.
        Args:
            instance_type (str): The type of instance to get the queue for.
        Returns:
            dict: A dictionary representing the queue.
        """
        if instance_type == 'radarr':
            url_addon = "page=1&pageSize=200&includeMovie=true"
        elif instance_type == 'sonarr':
            url_addon = "page=1&pageSize=200&includeSeries=true"

        endpoint = f"{self.url}/api/v3/queue?{url_addon}"
        return self.make_get_request(endpoint, headers=self.headers)
    
    def get_quality_profile_names(self):
        """
        Get the names of all quality profiles.
        Returns:
            dict: A dictionary of quality profile names and IDs.
        
        returns:
            dict: A dictionary of quality profile names and IDs.
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

        Returns:
            dict: A dictionary representing the queue.
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
        Returns:    
            dict: A dictionary representing the health status.
        """
        endpoint = f"{self.url}/api/v3/health"
        return self.make_get_request(endpoint, headers=self.headers)
    
    def delete_media(self, media_id):
        """
        Delete a media item.
        Args:
            media_id (int): The ID of the media item to delete.
        """
        endpoint = None
        if self.instance_type == 'Sonarr':
            endpoint = f"{self.url}/api/v3/series/{media_id}"
        elif self.instance_type == 'Radarr':
            endpoint = f"{self.url}/api/v3/movie/{media_id}"
        return self.make_delete_request(endpoint)

    def get_tag_id_from_name(self, tag_name):
        """
        Get the ID of a tag from its name. If the tag does not yet
        exist, it will be created.
        Args:
            tag_name (str): The name of the tag to get the ID for.
        Returns:
            int: The ID of the tag.
        """
        all_tags = self.get_all_tags() or []
        tag_name = tag_name.lower()

        for tag in all_tags:
            if tag["label"] == tag_name:
                tag_id = tag["id"]
                return tag_id

        # If the tag doesn't already exist, create it.
        tag_id = self.create_tag(tag_name)
        return tag_id
    
    def remove_item_from_queue(self, queue_ids):
        """
        Remove an item from the queue.
        Args:
            queue_id (int): The ID of the queue item to remove.
        """
        # if one item in list, convert to int
        if isinstance(queue_ids, int):
            queue_ids = [queue_ids]
        payload = {
            "ids": queue_ids
        }
        endpoint = f"{self.url}/api/v3/queue/bulk?removeFromClient=false&blocklist=false&skipRedownload=false&changeCategory=false"
        return self.make_delete_request(endpoint, payload)
