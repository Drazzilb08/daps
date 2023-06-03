import requests
import time

class SonarrInstance:
    """
    A class representing a Sonarr instance.
    """
    def __init__(self, url, api, logger):
        """
        nitialize a SonarrInstance object.
        Parameters:
            url (str): The URL of the Sonarr instance.
            api (str): The API key to use to connect to the Sonarr instance.
            logger (logging.Logger): a logger object for logging debug messages.
        Raises:
            ValueError: If the URL does not point to a valid Sonarr instance.
        """
        self.url = url.rstrip("/")
        self.url = url
        self.api = api
        self.headers = {
            "x-api-key": api
        }
        self.session = requests.Session()
        self.session.headers.update({"X-Api-Key": self.api})

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
            logger.info(f'Tag "{label}" created with ID {tag_id}.')
        else:
            logger.error(f"Failed to create tag: {response.text}")
            raise Exception(f"Failed to create tag: {label}")

    def add_tag(self, series_id, tag_id):
        """
        Add a tag to a series.
        Parameters:
            series_id (int): The ID of the series to add the tag to 
            tag_id (int): The ID of the tag to add to the series
        Raises:
            Exception: If the API call to add the tag fails
        """
        if isinstance(series_id, int):
            series_id = [series_id] 
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

    def get_rename_list(self, series_id):
        """
        Get the list of episodes to be renamed for a series.
        Parameters:
            series_id (int): The ID of the series to get the rename list for
        Returns:
            list: A list of dictionaries representing the episodes to be renamed
        """
        # Get the list of episodes to be renamed
        endpoint = f"{self.url}/api/v3/rename?seriesId={series_id}"
        response = self.session.get(endpoint, headers=self.headers)
        response.raise_for_status()
        episodes_to_rename = response.json()
        return episodes_to_rename

    def rename_files(self, series_id, logger, episode_file_ids,):
        """
        Rename the files for a series.
        Parameters:
            series_id (int): The ID of the series to rename
            episode_file_ids (list): A list of episode file IDs to rename
            logger (logging.Logger): a logger object for logging debug messages.
        Returns:
            bool: True if the files were renamed successfully, False otherwise
        """
        max_retries = 10
        payload = {
            "name": "RenameFiles",
            "seriesId": series_id,
            "files": episode_file_ids
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
                        f'Sleeping for 5 seconds until all episodes have been renamed')
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

    def refresh_media(self, logger, media_id, title):
        """
        Refresh a series.
        Parameters:
            logger (logging.Logger): a logger object for logging debug messages.
            media_id (int): The ID of the series to refresh
        Returns:
            bool: True if the series was refreshed successfully, False otherwise
        """
        payload = {
            "name": "RefreshSeries",
            "seriesIds": [media_id]
        }
        endpoint = f"{self.url}/api/v3/command"
        try:
            response = requests.post(
                endpoint, headers=self.headers, json=payload)
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to refresh series: {e}")
            return False
        return True

    def search_media(self, series_id):
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