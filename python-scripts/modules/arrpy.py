import sys
import requests
import json
import logging


logging.getLogger("qbittorrentapi").setLevel(logging.WARNING)
logging.getLogger("requests").setLevel(logging.WARNING)
logging.getLogger('urllib3').setLevel(logging.CRITICAL)

class StARR:
    def __init__(self, url, api, logger):
        """
        nitialize a Instance object.
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
        self.logger.error(f'GET request failed after {self.max_retries} retries, exiting script')
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
        self.logger.error(f'POST request failed after {self.max_retries} retries, exiting script')
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
        self.logger.error(f'PUT request failed after {self.max_retries} retries, exiting script')
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
        self.logger.error(f'DELETE request failed after {self.max_retries} retries, exiting script')
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
        print(json.dumps(response, indent=4))
        for r in response:
            if r['movieId'] == movie_id:
                print(f"Found file ID {r['id']} for movie ID {movie_id}")
                exit()
                return r['id']

    def get_media(self):
        """
        Get all media from the ARR instance.
        Returns:
            list: A list of media objects.
        """
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
            dict: The JSON response from the POST request.
        """
        payload = {
            "label": tag
        }
        endpoint = f"{self.url}/api/v3/tag"
        return self.make_post_request(endpoint, json=payload)

    def add_tag(self, media_id, tag_id):
        """
        Add a tag to a media item.
        Parameters:
            media_id (int): The ID of the media item to add the tag to.
            tag_id (int): The ID of the tag to add to the media item.
        Returns:
            dict: The JSON response from the POST request.
        """
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
        endpoint = f"{self.url}/api/v3/{media}/editor"
        return self.make_put_request(endpoint, json=payload)
    

    def check_and_create_tag(self, tag_name, dry_run):
        """
        Check if a tag exists on the ARR instance, and create it if it doesn't.
        Parameters:
            tag_name (str): The name of the tag to check.
            dry_run (bool): Whether or not to actually create the tag.
        Returns:
            int: The ID of the tag.
        """
        all_tags = self.get_all_tags()
        tag_id = None
        for tag in all_tags:
            if tag["label"] == tag_name:
                tag_id = tag["id"]
                self.logger.debug(
                    f'Tag Name: {tag_name} exists with tagId: {tag_id}, no need to create.')
                break
        if tag_id is None:
            if not dry_run:
                self.create_tag(tag_name)
                all_tags = self.get_all_tags()
                for tag in all_tags:
                    if tag["label"] == tag_name:
                        tag_id = tag["id"]
                        break
            else:
                self.logger.info(
                    f'Tag Name: {tag_name} does not exist, dry run enabled, skipping.')
        return tag_id
    
    def remove_tags(self, all_media, tag_id, tag_name):
        """
        Remove a tag from all media.
        Parameters:
            all_media (list): A list of media objects.
            tag_id (int): The ID of the tag to remove.
            tag_name (str): The name of the tag to remove.
        """
        media_ids = []
        for media in all_media:
            if tag_id in media['tags']:
                media_ids.append(media['id'])
        if not media_ids:
            self.logger.info(f"No media found with tag '{tag_name}'")
            return False
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
        endpoint = f"{self.url}/api/v3/{media}/editor"
        response = self.make_put_request(endpoint, json=payload)
        if response:
            self.logger.info(f"Removed tag '{tag_name}' from {len(media_ids)} media items")
            return True
        else:
            self.logger.error(f"Failed to remove tag '{tag_name}' from media items")
            return False
    
    def get_rename_list(self, media_id):
        """
        Get a list of media items to rename.
        Parameters:
            all_media (list): A list of media objects.
        Returns:
            list: A list of media items to rename.
        """
        if self.instance_type == 'Sonarr':
            rename_endpoint = "seriesId"
        elif self.instance_type == 'Radarr':
            rename_endpoint = "movieId"
        endpoint = f"{self.url}/api/v3/rename?{rename_endpoint}={media_id}"
        response = self.make_get_request(endpoint, headers=self.headers)
        return response
    
    def rename_media(self, media_id, file_ids):
        """
        Rename a media item.
        Parameters:
            media_id (int): The ID of the media item to rename.
            file_ids (list): A list of file IDs to rename.
            dry_run (bool): Whether or not to actually rename the media item.
        """
        if isinstance(file_ids, int):
            file_ids = [file_ids]
        if self.instance_type == 'Sonarr':
            id_type = "seriesId"
        elif self.instance_type == 'Radarr':
            id_type = "movieId"
        payload = {
            "name": "RenameFiles",
            id_type: media_id,
            "files": file_ids
        }
        endpoint = f"{self.url}/api/v3/command"
        response = self.make_post_request(endpoint, json=payload)
        if response:
            return True
        else:
            self.logger.error(f"Failed to rename media item")
            return False
    
    def refresh_media(self, media_id):
        """
        Refresh a media item.
        Parameters:
            media_id (int): The ID of the media item to refresh.
        """
        if isinstance(media_id, int):
            media_id = [media_id]
        if self.instance_type == 'Sonarr':
            id_type = "seriesIds"
            name_type = "RefreshSeries"
        elif self.instance_type == 'Radarr':
            id_type = "movieIds"
            name_type = "RefreshMovie"
        payload = {
            "name": name_type,
            id_type: media_id
        }
        endpoint = f"{self.url}/api/v3/command"
        response = self.make_post_request(endpoint, headers=self.headers, json=payload)
        if response:
            return True
        else:
            self.logger.error(f"Failed to refresh media item with ID {media_id}")
            return False
    
    def search_media(self, media_id):
        """
        Search for a media item.
        Parameters:
            media_id (int): The ID of the media item to search for.
        """
        if isinstance(media_id, int):
            media_id = [media_id]
        if self.instance_type == 'Sonarr':
            id_type = "seriesIds"
            name_type = "SeriesSearch"
        elif self.instance_type == 'Radarr':
            id_type = "movieIds"
            name_type = "MoviesSearch"
        payload = {
            "name": name_type,
            id_type: media_id
        }
        endpoint = f"{self.url}/api/v3/command"
        response = self.make_post_request(endpoint, json=payload)
        if response:
            return True
        else:
            self.logger.error(f"Failed to search for media item with ID {media_id}")
            return False
    
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
        response = self.make_post_request(endpoint, json=payload)
        if response:
            return True
        else:
            self.logger.error(f"Failed to search for season {season_number} of series with ID {media_id}")
            return False
    
    def get_season_data(self, media_id):
        """
        Get data for a season.
        Parameters:
            media_id (int): The ID of the series to get data for
        Returns:
            list: A list of dictionaries representing the episodes for the season
        """
        endpoint = f"{self.url}/api/v3/episode?seriesId={media_id}"
        response = self.make_get_request(endpoint, headers=self.headers)
        if response:
            return response
        else:
            self.logger.error(f"Failed to get data for series with ID {media_id}")
            return False

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
        endpoint = f"{self.url}/api/v3/episodefile/bulk"
        response = self.make_delete_request(endpoint, payload)
        if response.status_code == 200:
            return True
        else:
            self.logger.error(f"Failed to delete episode files for series with ID {media_id}")
            return False

    def delete_movie_file(self, media_id):
        """
        Delete a media item.
        Parameters:
            media_id (int): The ID of the media item to delete.
        """
        endpoint = f"{self.url}/api/v3/moviefile/{media_id}"
        response = self.make_delete_request(endpoint)
        if response.status_code == 200:
            return True
        else:
            self.logger.error(f"Failed to delete media item with ID {media_id}")
            return False

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
        response = self.make_post_request(endpoint, json=payload)
        if response:
            return True
        else:
            self.logger.error(f"Failed to search for episode with ID {episode_ids}")
            return False
        
    def get_queue(self):
        """
        Get the queue.
        """
        endpoint = f"{self.url}/api/v3/queue"
        response = self.make_get_request(endpoint, headers=self.headers)
        if response:
            return response
        else:
            self.logger.error(f"Failed to get queue")
            return False
    
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