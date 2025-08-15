import html
import logging
import os
import time
from typing import Any, Dict, List, Optional, Union

import requests
from unidecode import unidecode

from util.constants import windows_path_regex, year_regex
from util.extract import extract_year
from util.normalization import normalize_titles

logging.getLogger("requests").setLevel(logging.WARNING)


class BaseARRClient:
    """Base class for interacting with ARR (Radarr/Sonarr) instances."""

    def __init__(self, url: str, api: str, logger: Any) -> None:
        """
        Initialize the base ARR client.

        Args:
            url (str): API URL.
            api (str): API key.
            logger (Any): Logger instance.
        """
        self.logger = logger
        self.max_retries = 5
        self.timeout = 60
        self.url = url.rstrip("/")
        self.api = api
        self.headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Api-Key": api,
        }
        self.session = requests.Session()
        self.session.headers.update({"X-Api-Key": self.api})
        self.connect_status = False
        self.instance_type = None
        self.instance_name = None
        self.app_name = None
        self.app_version = None
        status = self.get_system_status()
        if not status:
            return
        self.app_name = status.get("appName")
        self.app_version = status.get("version")
        self.instance_name = status.get("instanceName")
        self.connect_status = True
        self.logger.debug(
            f"Connected to {self.app_name} v{self.app_version} at {self.url}"
        )

    def get_health(self) -> Optional[Dict[str, Any]]:
        """
        Get the health status of the ARR instance.

        Returns:
            Optional[Dict[str, Any]]: Health status.
        """
        endpoint = f"{self.url}/api/v3/health"
        return self.make_get_request(endpoint, headers=self.headers)

    def wait_for_command(self, command_id: int) -> bool:
        """
        Poll the given command ID until it completes, fails, or times out.

        Args:
            command_id (int): Command ID to wait for.
        Returns:
            bool: True if successful, False otherwise.
        """
        self.logger.debug("Waiting for command to complete...")
        cycle = 0
        while True:
            endpoint = f"{self.url}/api/v3/command/{command_id}"
            response = self.make_get_request(endpoint)
            if response and response.get("status") == "completed":
                return True
            if response and response.get("status") == "failed":
                return False
            time.sleep(5)
            cycle += 1
            if cycle % 5 == 0:
                self.logger.debug(
                    f"Still waiting for command {command_id}... (cycle {cycle})"
                )
            if cycle > 120:
                self.logger.error(f"Command {command_id} timed out after 10 minutes.")
                return False

    def create_tag(self, tag: str) -> int:
        """
        Create a new tag.

        Args:
            tag (str): Tag label.
        Returns:
            int: Created tag ID.
        """
        payload = {"label": tag}
        self.logger.debug(f"Create tag payload: {payload}")
        endpoint = f"{self.url}/api/v3/tag"
        response = self.make_post_request(endpoint, json=payload)
        return response["id"]

    def get_instance_name(self) -> Optional[str]:
        """
        Get instance name.

        Returns:
            Optional[str]: Instance name.
        """
        status = self.get_system_status()
        return status.get("instanceName") if status else None

    def get_system_status(self) -> Optional[Dict[str, Any]]:
        """
        Get ARR system status.

        Returns:
            Optional[Dict[str, Any]]: System status.
        """
        endpoint = f"{self.url}/api/v3/system/status"
        return self.make_get_request(endpoint)

    def make_get_request(
        self, endpoint: str, headers: Optional[Dict[str, str]] = None
    ) -> Any:
        """
        Make a GET request to endpoint.

        Args:
            endpoint (str): API endpoint.
            headers (Optional[Dict[str, str]]): Headers.
        Returns:
            Any: Response or JSON.
        """
        return self._request_with_retries("GET", endpoint, headers=headers)

    def make_post_request(
        self, endpoint: str, headers: Optional[Dict[str, str]] = None, json: Any = None
    ) -> Any:
        """
        Make a POST request to endpoint.

        Args:
            endpoint (str): API endpoint.
            headers (Optional[Dict[str, str]]): Headers.
            json (Any): JSON payload.
        Returns:
            Any: Response or JSON.
        """
        return self._request_with_retries("POST", endpoint, headers=headers, json=json)

    def make_put_request(
        self, endpoint: str, headers: Optional[Dict[str, str]] = None, json: Any = None
    ) -> Any:
        """
        Make a PUT request to endpoint.

        Args:
            endpoint (str): API endpoint.
            headers (Optional[Dict[str, str]]): Headers.
            json (Any): JSON payload.
        Returns:
            Any: Response or JSON.
        """
        return self._request_with_retries("PUT", endpoint, headers=headers, json=json)

    def make_delete_request(self, endpoint: str, json: Any = None) -> Any:
        """
        Make a DELETE request to endpoint.

        Args:
            endpoint (str): API endpoint.
            json (Any): JSON payload.
        Returns:
            Any: Response or JSON.
        """
        return self._request_with_retries("DELETE", endpoint, json=json)

    def _request_with_retries(
        self,
        method: str,
        endpoint: str,
        headers: Optional[Dict[str, str]] = None,
        json: Any = None,
    ) -> Any:
        """
        Perform HTTP request with retry logic.

        Args:
            method (str): HTTP method.
            endpoint (str): API endpoint.
            headers (Optional[Dict[str, str]]): Headers.
            json (Any): JSON payload.
        Returns:
            Any: Response or JSON.
        """
        response = None
        for i in range(self.max_retries):
            try:
                response = self.session.request(
                    method, endpoint, headers=headers, json=json, timeout=self.timeout
                )
                response.raise_for_status()
                return response if method == "DELETE" else response.json()
            except (
                requests.exceptions.Timeout,
                requests.exceptions.HTTPError,
                requests.exceptions.RequestException,
            ) as ex:
                if i < self.max_retries - 1:
                    self.logger.warning(
                        f"{method} request failed ({ex}), retrying ({i+1}/{self.max_retries})..."
                    )
                    time.sleep(1)
                else:
                    self._handle_request_exception(method, endpoint, ex, response, json)
        return None

    def _handle_request_exception(
        self,
        method: str,
        endpoint: str,
        ex: Exception,
        response: Any,
        payload: Any = None,
    ) -> None:
        """
        Handle exceptions during HTTP request.

        Args:
            method (str): HTTP method.
            endpoint (str): API endpoint.
            ex (Exception): Exception.
            response (Any): Response object.
            payload (Any): Payload data.
        """
        status_code = (
            response.status_code
            if response is not None
            and hasattr(response, "status_code")
            and response.status_code
            else "No response"
        )
        hint = (
            self._get_error_hint(status_code)
            if isinstance(status_code, int)
            else "No HTTP response received, check URL"
        )
        self.logger.error(f"{method} request failed after {self.max_retries} retries.")
        self.logger.error(f"Endpoint: {endpoint}")
        if payload:
            self.logger.error(f"Payload: {payload}")
        if response is not None and hasattr(response, "text"):
            self.logger.error(f"Response: {response.text} Code: {status_code}")
        self.logger.error(f"Status: {status_code}, Error: {ex}")
        self.logger.error(f"\nHint: {hint}\n")

    def _get_error_hint(self, status_code: int) -> str:
        """
        Get a user-friendly hint for a given HTTP status code.

        Args:
            status_code (int): HTTP status code.
        Returns:
            str: Hint.
        """
        hints = {
            400: "Bad Request – likely malformed or missing parameters.",
            401: "Unauthorized – check that your API key is correct.",
            403: "Forbidden – the API key may not have the necessary permissions.",
            404: "Not Found – the endpoint may be incorrect or the resource doesn't exist.",
            429: "Too Many Requests – you may have hit a rate limit.",
            500: "Internal Server Error – something went wrong on the server.",
            503: "Service Unavailable – the server is currently down or overloaded.",
        }
        return hints.get(status_code, "Unknown error – check logs for more info.")

    def get_tag_id_from_name(self, tag_name: str) -> int:
        """
        Retrieve a tag ID by its name, create if not exists.

        Args:
            tag_name (str): Tag name.
        Returns:
            int: Tag ID.
        """
        all_tags = self.get_all_tags() or []
        tag_name = tag_name.lower()
        for tag in all_tags:
            if tag["label"] == tag_name:
                tag_id = tag["id"]
                return tag_id
        tag_id = self.create_tag(tag_name)
        return tag_id

    def get_all_tags(self) -> Optional[List[Dict[str, Any]]]:
        """
        Get all tags from the ARR instance.

        Returns:
            Optional[List[Dict[str, Any]]]: List of tags.
        """
        endpoint = f"{self.url}/api/v3/tag"
        return self.make_get_request(endpoint)

    def get_quality_profile_names(self) -> Optional[Dict[str, int]]:
        """
        Get names and IDs of all quality profiles.

        Returns:
            Optional[Dict[str, int]]: Mapping of profile names to IDs.
        """
        dict_of_names_and_ids: Dict[str, int] = {}
        endpoint = f"{self.url}/api/v3/qualityprofile"
        response = self.make_get_request(endpoint, headers=self.headers)
        if response:
            for profile in response:
                dict_of_names_and_ids[profile["name"]] = profile["id"]
            return dict_of_names_and_ids


class RadarrClient(BaseARRClient):
    """Client for interacting with Radarr API."""

    def __init__(self, url: str, api: str, logger: Any) -> None:
        """
        Initialize the Radarr client.

        Args:
            url (str): API URL.
            api (str): API key.
            logger (Any): Logger instance.
        """
        super().__init__(url, api, logger)
        self.instance_type = "Radarr"

    def get_media(self) -> Optional[List[Dict[str, Any]]]:
        """
        Get all movies from Radarr.

        Returns:
            Optional[List[Dict[str, Any]]]: List of movies.
        """
        endpoint = f"{self.url}/api/v3/movie"
        return self.make_get_request(endpoint)

    def add_tags(self, media_id: Union[int, List[int]], tag_id: int) -> Any:
        """
        Add a tag to one or more movies.
        Args:
            media_id (Union[int, List[int]]): Movie ID(s).
            tag_id (int): Tag ID.
        Returns:
            Any: API response.
        """
        if isinstance(media_id, int):
            media_id = [media_id]
        payload = {"movieIds": media_id, "tags": [tag_id], "applyTags": "add"}
        self.logger.debug(f"Add tag payload: {payload}")
        endpoint = f"{self.url}/api/v3/movie/editor"
        return self.make_put_request(endpoint, json=payload)

    def remove_tags(self, media_ids: List[int], tag_id: int) -> Any:
        """
        Remove a tag from movies.
        Args:
            media_ids (List[int]): Movie IDs.
            tag_id (int): Tag ID.
        Returns:
            Any: API response.
        """
        payload = {"movieIds": media_ids, "tags": [tag_id], "applyTags": "remove"}
        self.logger.debug(f"Remove tag payload: {payload}")
        endpoint = f"{self.url}/api/v3/movie/editor"
        return self.make_put_request(endpoint, json=payload)

    def get_rename_list(self, media_id: int) -> Any:
        """
        Preview renaming for a movie.
        Args:
            media_id (int): Movie ID.
        Returns:
            Any: API response.
        """
        endpoint = f"{self.url}/api/v3/rename?movieId={media_id}"
        return self.make_get_request(endpoint, headers=self.headers)

    def rename_media(self, media_ids: List[int]) -> Any:
        """
        Trigger renaming of movies.
        Args:
            media_ids (List[int]): Movie IDs.
        Returns:
            Any: API response.
        """
        payload = {
            "name": "RenameMovie",
            "movieIds": media_ids,
        }
        self.logger.debug(f"Rename payload: {payload}")
        endpoint = f"{self.url}/api/v3/command"
        return self.make_post_request(endpoint, json=payload)

    def rename_folders(self, media_ids: List[int], root_folder_path: str) -> Any:
        """
        Rename folders for given movies.
        Args:
            media_ids (List[int]): Movie IDs.
            root_folder_path (str): Root folder path.
        Returns:
            Any: API response.
        """
        payload = {
            "movieIds": media_ids,
            "moveFiles": True,
            "rootFolderPath": root_folder_path,
        }
        self.logger.debug(f"Rename Folder Payload: {payload}")
        endpoint = f"{self.url}/api/v3/movie/editor"
        return self.make_put_request(endpoint, json=payload)

    def refresh_items(self, media_ids: Union[int, List[int]]) -> Any:
        """
        Refresh one or more movies.
        Args:
            media_ids (Union[int, List[int]]): Movie IDs.
        Returns:
            Any: API response.
        """
        if isinstance(media_ids, int):
            media_ids = [media_ids]
        payload = {"name": "RefreshMovie", "movieIds": media_ids}
        self.logger.debug(f"Refresh payload: {payload}")
        endpoint = f"{self.url}/api/v3/command"
        return self.make_post_request(endpoint, headers=self.headers, json=payload)

    def refresh_media(self) -> Any:
        """
        Refresh all movies.
        Returns:
            Any: API response.
        """
        payload = {
            "name": "RefreshMovie",
        }
        self.logger.debug(f"Refresh payload: {payload}")
        endpoint = f"{self.url}/api/v3/command"
        return self.make_post_request(endpoint, headers=self.headers, json=payload)

    def search_media(self, media_ids: Union[int, List[int]]) -> Optional[Any]:
        """
        Trigger a search for one or more movies.
        Args:
            media_ids (Union[int, List[int]]): Movie IDs.
        Returns:
            Optional[Any]: API response or None if search fails.
        """
        self.logger.debug(f"Media ID: {media_ids}")
        endpoint = f"{self.url}/api/v3/command"
        payloads = []
        if isinstance(media_ids, int):
            media_ids = [media_ids]
        payloads.append({"name": "MoviesSearch", "movieIds": media_ids})
        self.logger.debug(f"Search payload: {payloads}")
        result = None
        for payload in payloads:
            result = self.make_post_request(
                endpoint, headers=self.headers, json=payload
            )
        if result:
            return result
        else:
            self.logger.error(f"Search failed for media ID: {media_ids}")
            return None

    def get_movie_data(self, media_id: int) -> Any:
        """
        Get movie file data for a specific movie.
        Args:
            media_id (int): Movie ID.
        Returns:
            Any: API response.
        """
        endpoint = f"{self.url}/api/v3/moviefile?movieId={media_id}"
        return self.make_get_request(endpoint, headers=self.headers)

    def get_grab_history(self, media_id: int) -> Any:
        """
        Get grab history for a movie.
        Args:
            media_id (int): Movie ID.
        Returns:
            Any: API response.
        """
        url_addon = f"movie?movieId={media_id}&eventType=grabbed&includeMovie=false"
        endpoint = f"{self.url}/api/v3/history/{url_addon}"
        return self.make_get_request(endpoint, headers=self.headers)

    def get_import_history(self, media_id: int) -> Any:
        """
        Get import history for a movie.
        Args:
            media_id (int): Movie ID.
        Returns:
            Any: API response.
        """
        url_addon = f"movie?movieId={media_id}&eventType=downloadFolderImported&includeMovie=false"
        endpoint = f"{self.url}/api/v3/history/{url_addon}"
        return self.make_get_request(endpoint, headers=self.headers)

    def get_queue(self) -> Any:
        """
        Get the current queue from Radarr.
        Returns:
            Any: API response.
        """
        url_addon = "page=1&pageSize=200&includeMovie=true"
        endpoint = f"{self.url}/api/v3/queue?{url_addon}"
        return self.make_get_request(endpoint, headers=self.headers)

    def delete_media(self, media_id: int) -> Any:
        """
        Delete a movie from Radarr.
        Args:
            media_id (int): Movie ID.
        Returns:
            Any: API response.
        """
        endpoint = f"{self.url}/api/v3/movie/{media_id}"
        return self.make_delete_request(endpoint)

    def delete_movie_file(self, media_id: int) -> Any:
        """
        Delete a movie file by file ID.
        Args:
            media_id (int): Movie file ID.
        Returns:
            Any: API response.
        """
        endpoint = f"{self.url}/api/v3/moviefile/{media_id}"
        return self.make_delete_request(endpoint)

    def get_parsed_media(self, include_episode: bool = False, include_unmonitored: bool = True) -> List[Dict[str, Any]]:
        """
        Return a structured list of normalized movie items.

        Args:
            include_episode (bool): Ignored for Radarr.
            include_unmonitored (bool): Include unmonitored items. Defaults to True
        Returns:
            List[Dict[str, Any]]: List of normalized media entries.
        """
        media_dict = []
        media = self.get_media()
        if not media:
            return media_dict
        for item in media:
            file_id = item.get("movieFile", {}).get("id", None)
            alternate_titles = [t["title"] for t in item["alternateTitles"]]
            normalized_alternate_titles = [
                normalize_titles(t["title"]) for t in item["alternateTitles"]
            ]
            if year_regex.search(item["title"]):
                title = year_regex.sub("", item["title"])
                year = extract_year(item["title"])
            else:
                title = item["title"]
                year = item["year"]
            reg = windows_path_regex.match(item["path"])
            if reg and reg.group(1):
                folder = item["path"][item["path"].rfind("\\") + 1 :]
            else:
                folder = os.path.basename(os.path.normpath(item["path"]))
            if not include_unmonitored and not item.get("monitored", False):
                continue
            media_dict.append(
                {
                    "title": unidecode(html.unescape(title)),
                    "year": year,
                    "media_id": item["id"],
                    "tmdb_id": item["tmdbId"],
                    "imdb_id": item.get("imdbId", None),
                    "monitored": item["monitored"],
                    "status": item["status"],
                    "root_folder": item["rootFolderPath"],
                    "quality_profile": item["qualityProfileId"],
                    "normalized_title": normalize_titles(item["title"]),
                    "path_name": os.path.basename(item["path"]),
                    "original_title": item.get("originalTitle", None),
                    "secondary_year": item.get("secondaryYear", None),
                    "alternate_titles": alternate_titles,
                    "normalized_alternate_titles": normalized_alternate_titles,
                    "file_id": file_id,
                    "folder": folder,
                    "normalized_folder": normalize_titles(folder),
                    "has_file": item["hasFile"],
                    "tags": item["tags"],
                    "seasons": None,
                    "season_numbers": None,
                }
            )
        return media_dict


class SonarrClient(BaseARRClient):
    """Client for interacting with Sonarr API."""

    def __init__(self, url: str, api: str, logger: Any) -> None:
        """
        Initialize the Sonarr client.

        Args:
            url (str): API URL.
            api (str): API key.
            logger (Any): Logger instance.
        """
        super().__init__(url, api, logger)
        self.instance_type = "Sonarr"

    def get_media(self) -> Optional[List[Dict[str, Any]]]:
        """
        Get all series from Sonarr.

        Returns:
            Optional[List[Dict[str, Any]]]: List of series.
        """
        endpoint = f"{self.url}/api/v3/series"
        return self.make_get_request(endpoint)

    def add_tags(self, media_id: Union[int, List[int]], tag_id: int) -> Any:
        """
        Add a tag to one or more series.
        Args:
            media_id (Union[int, List[int]]): Series ID(s).
            tag_id (int): Tag ID.
        Returns:
            Any: API response.
        """
        if isinstance(media_id, int):
            media_id = [media_id]
        payload = {"seriesIds": media_id, "tags": [tag_id], "applyTags": "add"}
        self.logger.debug(f"Add tag payload: {payload}")
        endpoint = f"{self.url}/api/v3/series/editor"
        return self.make_put_request(endpoint, json=payload)

    def remove_tags(self, media_ids: List[int], tag_id: int) -> Any:
        """
        Remove a tag from series.
        Args:
            media_ids (List[int]): Series IDs.
            tag_id (int): Tag ID.
        Returns:
            Any: API response.
        """
        payload = {"seriesIds": media_ids, "tags": [tag_id], "applyTags": "remove"}
        self.logger.debug(f"Remove tag payload: {payload}")
        endpoint = f"{self.url}/api/v3/series/editor"
        return self.make_put_request(endpoint, json=payload)

    def get_rename_list(self, media_id: int) -> Any:
        """
        Preview renaming for a series.
        Args:
            media_id (int): Series ID.
        Returns:
            Any: API response.
        """
        endpoint = f"{self.url}/api/v3/rename?seriesId={media_id}"
        return self.make_get_request(endpoint, headers=self.headers)

    def rename_media(self, media_ids: List[int]) -> Any:
        """
        Trigger renaming of series.
        Args:
            media_ids (List[int]): Series IDs.
        Returns:
            Any: API response.
        """
        payload = {
            "name": "RenameSeries",
            "seriesIds": media_ids,
        }
        self.logger.debug(f"Rename payload: {payload}")
        endpoint = f"{self.url}/api/v3/command"
        return self.make_post_request(endpoint, json=payload)

    def rename_folders(self, media_ids: List[int], root_folder_path: str) -> Any:
        """
        Rename folders for given series.
        Args:
            media_ids (List[int]): Series IDs.
            root_folder_path (str): Root folder path.
        Returns:
            Any: API response.
        """
        payload = {
            "seriesIds": media_ids,
            "moveFiles": True,
            "rootFolderPath": root_folder_path,
        }
        self.logger.debug(f"Rename Folder Payload: {payload}")
        endpoint = f"{self.url}/api/v3/series/editor"
        return self.make_put_request(endpoint, json=payload)

    def refresh_items(self, media_ids: Union[int, List[int]]) -> Any:
        """
        Refresh one or more series.
        Args:
            media_ids (Union[int, List[int]]): Series IDs.
        Returns:
            Any: API response.
        """
        if isinstance(media_ids, int):
            media_ids = [media_ids]
        payload = {"name": "RefreshSeries", "seriesIds": media_ids}
        self.logger.debug(f"Refresh payload: {payload}")
        endpoint = f"{self.url}/api/v3/command"
        return self.make_post_request(endpoint, headers=self.headers, json=payload)

    def refresh_media(self) -> Any:
        """
        Refresh all series.
        Returns:
            Any: API response.
        """
        payload = {
            "name": "RefreshSeries",
        }
        self.logger.debug(f"Refresh payload: {payload}")
        endpoint = f"{self.url}/api/v3/command"
        return self.make_post_request(endpoint, headers=self.headers, json=payload)

    def search_media(self, media_ids: Union[int, List[int]]) -> Optional[Any]:
        """
        Trigger a search for one or more series.
        Args:
            media_ids (Union[int, List[int]]): Series IDs.
        Returns:
            Optional[Any]: API response or None if search fails.
        """
        self.logger.debug(f"Media ID: {media_ids}")
        endpoint = f"{self.url}/api/v3/command"
        payloads = []
        if isinstance(media_ids, int):
            media_ids = [media_ids]
        for id in media_ids:
            payloads.append({"name": "SeriesSearch", "seriesId": id})
        self.logger.debug(f"Search payload: {payloads}")
        result = None
        for payload in payloads:
            result = self.make_post_request(
                endpoint, headers=self.headers, json=payload
            )
        if result:
            return result
        else:
            self.logger.error(f"Search failed for media ID: {media_ids}")
            return None

    def search_season(self, media_id: int, season_number: int) -> Any:
        """
        Trigger a search for a specific season of a series.
        Args:
            media_id (int): Series ID.
            season_number (int): Season number.
        Returns:
            Any: API response.
        """
        payload = {
            "name": "SeasonSearch",
            "seriesId": media_id,
            "SeasonNumber": season_number,
        }
        endpoint = f"{self.url}/api/v3/command"
        return self.make_post_request(endpoint, json=payload)

    def get_episode_data(self, media_id: int) -> Any:
        """
        Get episode file data for a specific series.
        Args:
            media_id (int): Series ID.
        Returns:
            Any: API response.
        """
        endpoint = f"{self.url}/api/v3/episodefile?seriesId={media_id}"
        return self.make_get_request(endpoint, headers=self.headers)

    def get_episode_data_by_season(self, media_id: int, season_number: int) -> Any:
        """
        Get episode data for a specific season of a series.
        Args:
            media_id (int): Series ID.
            season_number (int): Season number.
        Returns:
            Any: API response.
        """
        endpoint = f"{self.url}/api/v3/episode?seriesId={media_id}&seasonNumber={season_number}"
        return self.make_get_request(endpoint, headers=self.headers)

    def get_season_data(self, media_id: int) -> Any:
        """
        Get all episode data for a specific series.
        Args:
            media_id (int): Series ID.
        Returns:
            Any: API response.
        """
        endpoint = f"{self.url}/api/v3/episode?seriesId={media_id}"
        return self.make_get_request(endpoint, headers=self.headers)

    def delete_episode_file(self, episode_file_id: int) -> Any:
        """
        Delete an episode file by file ID.
        Args:
            episode_file_id (int): Episode file ID.
        Returns:
            Any: API response.
        """
        endpoint = f"{self.url}/api/v3/episodefile/{episode_file_id}"
        return self.make_delete_request(endpoint)

    def delete_episode_files(self, episode_file_ids: Union[int, List[int]]) -> Any:
        """
        Delete multiple episode files by their IDs.
        Args:
            episode_file_ids (Union[int, List[int]]): Episode file IDs.
        Returns:
            Any: API response.
        """
        if isinstance(episode_file_ids, int):
            episode_file_ids = [episode_file_ids]
        payload = {"episodeFileIds": episode_file_ids}
        self.logger.debug(f"Delete episode files payload: {payload}")
        endpoint = f"{self.url}/api/v3/episodefile/bulk"
        return self.make_delete_request(endpoint, payload)

    def search_episodes(self, episode_ids: List[int]) -> Any:
        """
        Trigger a search for specific episodes.
        Args:
            episode_ids (List[int]): Episode IDs.
        Returns:
            Any: API response.
        """
        endpoint = f"{self.url}/api/v3/command"
        payload = {"name": "EpisodeSearch", "episodeIds": episode_ids}
        self.logger.debug(f"Search payload: {payload}")
        return self.make_post_request(endpoint, json=payload)

    def get_grab_history(self, media_id: int) -> Any:
        """
        Get grab history for a series.
        Args:
            media_id (int): Series ID.
        Returns:
            Any: API response.
        """
        url_addon = f"series?seriesId={media_id}&eventType=grabbed&includeSeries=false&includeEpisode=false"
        endpoint = f"{self.url}/api/v3/history/{url_addon}"
        return self.make_get_request(endpoint, headers=self.headers)

    def get_import_history(self, media_id: int) -> Any:
        """
        Get import history for a series.
        Args:
            media_id (int): Series ID.
        Returns:
            Any: API response.
        """
        url_addon = f"series?seriesId={media_id}&eventType=downloadFolderImported&includeSeries=false&includeEpisode=false"
        endpoint = f"{self.url}/api/v3/history/{url_addon}"
        return self.make_get_request(endpoint, headers=self.headers)

    def get_season_grab_history(self, media_id: int, season: int) -> Any:
        """
        Get grab history for a specific season of a series.
        Args:
            media_id (int): Series ID.
            season (int): Season number.
        Returns:
            Any: API response.
        """
        url_addon = f"series?seriesId={media_id}&seasonNumber={season}&eventType=grabbed&includeSeries=false&includeEpisode=false"
        endpoint = f"{self.url}/api/v3/history/{url_addon}"
        return self.make_get_request(endpoint, headers=self.headers)

    def get_season_import_history(self, media_id: int, season: int) -> Any:
        """
        Get import history for a specific season of a series.
        Args:
            media_id (int): Series ID.
            season (int): Season number.
        Returns:
            Any: API response.
        """
        url_addon = f"series?seriesId={media_id}&seasonNumber={season}&eventType=downloadFolderImported&includeSeries=false&includeEpisode=false"
        endpoint = f"{self.url}/api/v3/history/{url_addon}"
        return self.make_get_request(endpoint, headers=self.headers)

    def get_queue(self) -> Any:
        """
        Get the current queue from Sonarr.
        Returns:
            Any: API response.
        """
        url_addon = "page=1&pageSize=200&includeSeries=true"
        endpoint = f"{self.url}/api/v3/queue?{url_addon}"
        return self.make_get_request(endpoint, headers=self.headers)

    def delete_media(self, media_id: int) -> Any:
        """
        Delete a series from Sonarr.
        Args:
            media_id (int): Series ID.
        Returns:
            Any: API response.
        """
        endpoint = f"{self.url}/api/v3/series/{media_id}"
        return self.make_delete_request(endpoint)

    def get_parsed_media(self, include_episode: bool = False, include_unmonitored: bool = True) -> List[Dict[str, Any]]:
        """
        Return a structured list of normalized series items.

        Args:
            include_episode (bool): If True, include episode-level metadata.
            include_unmonitored (bool): Include unmonitored items. Defaults to True
        Returns:
            List[Dict[str, Any]]: List of normalized media entries.
        """
        media_dict = []
        media = self.get_media()
        if not media:
            return media_dict
        for item in media:
            season_data = item.get("seasons", [])
            season_list = []
            for season in season_data:
                if include_episode:
                    episode_data = self.get_episode_data_by_season(
                        item["id"], season["seasonNumber"]
                    )
                    episode_list = [
                        {
                            "episode_number": ep["episodeNumber"],
                            "monitored": ep["monitored"],
                            "episode_file_id": ep["episodeFileId"],
                            "episode_id": ep["id"],
                            "has_file": ep["hasFile"],
                        }
                        for ep in episode_data if include_unmonitored or ep.get("monitored", False)
                    ]
                else:
                    episode_list = []
                try:
                    status = (
                        season["statistics"]["episodeCount"]
                        == season["statistics"]["totalEpisodeCount"]
                    )
                except Exception:
                    status = False
                try:
                    season_stats = season["statistics"]["episodeCount"]
                except Exception:
                    season_stats = 0
                if not include_unmonitored and not season.get("monitored", False):
                    continue
                season_list.append(
                    {
                        "season_number": season["seasonNumber"],
                        "monitored": season["monitored"],
                        "season_pack": status,
                        "season_has_episodes": season_stats,
                        "episode_data": episode_list,
                    }
                )
            alternate_titles = [t["title"] for t in item["alternateTitles"]]
            normalized_alternate_titles = [
                normalize_titles(t["title"]) for t in item["alternateTitles"]
            ]
            if year_regex.search(item["title"]):
                title = year_regex.sub("", item["title"])
                year = extract_year(item["title"])
            else:
                title = item["title"]
                year = item["year"]
            reg = windows_path_regex.match(item["path"])
            if reg and reg.group(1):
                folder = item["path"][item["path"].rfind("\\") + 1 :]
            else:
                folder = os.path.basename(os.path.normpath(item["path"]))
            if not include_unmonitored and not item.get("monitored", False):
                continue
            media_dict.append(
                {
                    "title": unidecode(html.unescape(title)),
                    "year": year,
                    "media_id": item["id"],
                    "tvdb_id": item["tvdbId"],
                    "imdb_id": item.get("imdbId", None),
                    "monitored": item["monitored"],
                    "status": item["status"],
                    "root_folder": item["rootFolderPath"],
                    "quality_profile": item["qualityProfileId"],
                    "normalized_title": normalize_titles(item["title"]),
                    "path_name": os.path.basename(item["path"]),
                    "original_title": item.get("originalTitle", None),
                    "secondary_year": item.get("secondaryYear", None),
                    "alternate_titles": alternate_titles,
                    "normalized_alternate_titles": normalized_alternate_titles,
                    "file_id": None,
                    "folder": folder,
                    "normalized_folder": normalize_titles(folder),
                    "has_file": None,
                    "tags": item["tags"],
                    "seasons": season_list,
                    "season_numbers": [s["season_number"] for s in season_list],
                }
            )
        return media_dict

    def refresh_queue(self) -> Any:
        """
        Refresh the queue in Sonarr.
        Returns:
            Any: API response.
        """
        endpoint = f"{self.url}/api/v3/command"
        payload = {"name": "RefreshMonitoredDownloads"}
        self.logger.debug(f"Refresh queue payload: {payload}")
        return self.make_post_request(endpoint, json=payload)

    def remove_item_from_queue(self, queue_ids: Union[int, List[int]]) -> Any:
        """
        Remove an item or items from the queue.
        Args:
            queue_ids (Union[int, List[int]]): Queue item IDs.
        Returns:
            Any: API response.
        """
        if isinstance(queue_ids, int):
            queue_ids = [queue_ids]
        payload = {"ids": queue_ids}
        endpoint = f"{self.url}/api/v3/queue/bulk?removeFromClient=false&blocklist=false&skipRedownload=false&changeCategory=false"
        return self.make_delete_request(endpoint, payload)


def create_arr_client(
    url: str, api: str, logger: Any
) -> Optional[Union[RadarrClient, SonarrClient]]:
    """
    Factory to create a Radarr or Sonarr client.

    Args:
        url (str): API URL.
        api (str): API key.
        logger (Any): Logger instance.
    Returns:
        Optional[Union[RadarrClient, SonarrClient]]: The client or None on failure.
    """

    class SilentLogger:
        def debug(self, *args, **kwargs):
            pass

        def info(self, *args, **kwargs):
            pass

        def warning(self, *args, **kwargs):
            pass

        def error(self, *args, **kwargs):
            pass

    temp = BaseARRClient(url, api, SilentLogger())
    if not temp.connect_status:
        return None
    if temp.app_name == "Radarr":
        return RadarrClient(url, api, logger)
    if temp.app_name == "Sonarr":
        return SonarrClient(url, api, logger)
    logger.error("Unknown ARR type")
    return None
