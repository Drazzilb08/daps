import sys
import time
import json
import logging

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
            url (str): The URL of the ARR instance.
            api (str): The API key to use to connect to the ARR instance.
            logger (logging.Logger): a logger object for logging debug messages.
        Raises:
            ValueError: If the URL does not point to a valid ARR instance.
        """
        self.logger = logger
        self.max_retries = 5
        self.timeout = 60
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
            return None
            
    
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
        Args:
            url (str): The URL to make the GET request to.
            params (dict): The Args to pass to the GET request.
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
        self.logger.error(f'GET request failed after {self.max_retries} retries.')
        self.logger.error(f"endpoint: {endpoint}")
        self.logger.error(f"response: {response.text}")
        return None
    
    def make_post_request(self, endpoint, headers=None, json=None):
        """
        Make a POST request to the ARR instance.
        Args:
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
        self.logger.error(f'GET request failed after {self.max_retries} retries.')
        self.logger.error(f"endpoint: {endpoint}")
        self.logger.error(f"Payload: {json}")
        self.logger.error(f"response: {response.text}")
        return None

    
    def make_put_request(self, endpoint, headers=None, json=None):
        """
        Make a PUT request to the ARR instance.
        Args:
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
        self.logger.error(f'GET request failed after {self.max_retries} retries.')
        self.logger.error(f"endpoint: {endpoint}")
        self.logger.error(f"Payload: {json}")
        self.logger.error(f"response: {response.text}")
        return None

    def make_delete_request(self, endpoint, json=None, headers=None):
        """
        Make a DELETE request to the ARR instance.
        Args:
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
        self.logger.error(f'GET request failed after {self.max_retries} retries.')
        self.logger.error(f"endpoint: {endpoint}")
        self.logger.error(f"Payload: {json}")
        self.logger.error(f"response: {response.text}")
        return None
    

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
        media = None
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

    def refresh_item(self, media_id):
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
            "seriesId": media_id
        }
        self.logger.debug(f"Refresh payload: {payload}")
        endpoint = f"{self.url}/api/v3/command"
        return self.make_post_request(endpoint, headers=self.headers, json=payload)
    
    def refresh_items(self, media_ids):
        """
        Refresh a media item.
        Args:
            media_id (int): The ID of the media item to refresh.
        """
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
        if isinstance(media_ids, int):
            media_ids = [media_ids]
        if self.instance_type == 'Sonarr':
            name_type = "SeriesSearch"
            id_type = "seriesId"
            for id in media_ids:
                payload = {
                    "name": name_type,
                    id_type: id
                }
                self.logger.debug(f"Search payload: {payload}")
                result = self.make_post_request(endpoint, json=payload)
            return result
        elif self.instance_type == 'Radarr':
            name_type = "MoviesSearch"
            id_type = "movieIds"
            payload = {
                "name": name_type,
                id_type: media_ids
            }
            self.logger.debug(f"Search payload: {payload}")
            return self.make_post_request(endpoint, json=payload)
    
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
    
    def delete_media(self, media_id, instance_type):
        """
        Delete a media item.
        Args:
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
        Args:
            tag_name (str): The name of the tag to get the ID for.
        Returns:
            int: The ID of the tag.
        """
        all_tags = self.get_all_tags()
        tag_name = tag_name.lower()
        if all_tags:
            for tag in all_tags:
                if tag["label"] == tag_name:
                    tag_id = tag["id"]
                    return tag_id
            else:
                tag_id = self.create_tag(tag_name)
                return tag_id
        return None
    
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