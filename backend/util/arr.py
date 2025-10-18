import html
import json
import logging
import os
import time
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Union

import requests
from unidecode import unidecode

from backend.util.constants import year_regex
from backend.util.helper import extract_year
from backend.util.normalization import normalize_titles

logging.getLogger("requests").setLevel(logging.WARNING)


# Custom exception types for specific error categories
class ARRConnectionError(Exception):
    """Raised when cannot connect to ARR instance"""

    pass


class ARRAuthenticationError(Exception):
    """Raised when API key is invalid or unauthorized"""

    pass


class ARRRateLimitError(Exception):
    """Raised when rate limited by ARR API"""

    pass


class ARRTemporaryError(Exception):
    """Raised for temporary failures that should be retried"""

    pass


class ARRPermanentError(Exception):
    """Raised for permanent failures that should not be retried"""

    pass


@dataclass
class RetryConfig:
    """Configuration for retry behavior"""

    max_attempts: int = 5
    base_delay: float = 1.0
    max_delay: float = 60.0
    exponential_base: float = 2.0
    jitter: bool = True


class RetryHandler:
    """Handles exponential backoff retry logic with jitter"""

    def __init__(self, config: RetryConfig = None):
        self.config = config or RetryConfig()

    def calculate_delay(self, attempt: int) -> float:
        """Calculate delay for given attempt with exponential backoff and jitter"""
        delay = min(
            self.config.base_delay * (self.config.exponential_base**attempt),
            self.config.max_delay,
        )

        if self.config.jitter:
            import random

            delay *= 0.5 + 0.5 * random.random()  # Add 0-50% jitter

        return delay

    def should_retry(self, attempt: int, exception: Exception) -> bool:
        """Determine if we should retry based on attempt count and exception type"""
        if attempt >= self.config.max_attempts:
            return False

        # Don't retry permanent errors
        if isinstance(exception, (ARRAuthenticationError, ARRPermanentError)):
            return False

        # Retry temporary errors and connection issues
        if isinstance(
            exception, (ARRTemporaryError, ARRConnectionError, ARRRateLimitError)
        ):
            return True

        # Retry specific HTTP errors
        if isinstance(exception, requests.exceptions.RequestException):
            if hasattr(exception, "response") and exception.response:
                status_code = exception.response.status_code
                # Retry server errors and rate limits
                return status_code >= 500 or status_code == 429

        return False


@contextmanager
def database_transaction(db_connection):
    """Context manager for database transactions with automatic rollback"""
    transaction = db_connection.begin()
    try:
        yield transaction
        transaction.commit()
    except Exception:
        transaction.rollback()
        raise
    finally:
        if hasattr(transaction, "close"):
            transaction.close()


class BaseARRClient:
    """Improved base class with better error handling"""

    def __init__(self, url: str, api: str, logger: Any) -> None:
        self.logger = logger
        self.url = url.rstrip("/")
        self.api = api
        self.retry_handler = RetryHandler()
        self.session = None
        self.connect_status = False

        # Add these missing attributes:
        self.headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Api-Key": api,
        }
        self.max_retries = 5
        self.timeout = 60
        self.instance_type = None
        self.instance_name = None
        self.app_name = None
        self.app_version = None

        # Initialize with specific error handling
        try:
            self._initialize_session()
            self._verify_connection()
        except ARRAuthenticationError as e:
            self.logger.error(f"Authentication failed for {url}: {e}")
            raise
        except ARRConnectionError as e:
            self.logger.error(f"Connection failed for {url}: {e}")
            raise
        except Exception as e:
            self.logger.error(f"Unexpected error during initialization: {e}")
            raise ARRConnectionError(f"Failed to initialize ARR client: {e}")

    def is_connected(self) -> bool:
        """
        Returns True if client is connected to ARR instance, else False.
        """
        return self.connect_status

    def get_health(self) -> Optional[Dict[str, Any]]:
        """
        Get the health status of the ARR instance.

        Returns:
            Optional[Dict[str, Any]]: Health status.
        """
        endpoint = f"{self.url}/api/v3/health"
        return self.make_get_request(endpoint)

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
        status = self._get_system_status_with_retry()
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

    def _initialize_session(self) -> None:
        """Initialize HTTP session with proper configuration"""
        try:
            self.session = requests.Session()
            self.session.headers.update(
                {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "X-Api-Key": self.api,
                    "User-Agent": "DAPS/1.0",
                }
            )
            # Set reasonable timeouts
            self.session.timeout = (10, 60)  # (connect, read) timeouts
        except Exception as e:
            raise ARRConnectionError(f"Failed to initialize session: {e}")

    def _verify_connection(self) -> None:
        """Verify connection and get system status"""
        try:
            status = self._get_system_status_with_retry()
            if not status:
                raise ARRConnectionError("Could not retrieve system status")

            self.app_name = status.get("appName")
            self.app_version = status.get("version")
            self.instance_name = status.get("instanceName")
            self.connect_status = True

            self.logger.debug(
                f"Connected to {self.app_name} v{self.app_version} at {self.url}"
            )

        except ARRAuthenticationError:
            raise
        except Exception as e:
            raise ARRConnectionError(f"Connection verification failed: {e}")

    def _get_system_status_with_retry(self) -> Optional[Dict[str, Any]]:
        """Get system status with retry logic"""
        endpoint = f"{self.url}/api/v3/system/status"

        for attempt in range(self.retry_handler.config.max_attempts):
            try:
                response = self.session.get(endpoint, timeout=self.session.timeout)

                # Handle specific HTTP status codes
                if response.status_code == 401:
                    raise ARRAuthenticationError("Invalid API key")
                elif response.status_code == 403:
                    raise ARRAuthenticationError("API key lacks necessary permissions")
                elif response.status_code == 429:
                    raise ARRRateLimitError("Rate limited")
                elif response.status_code >= 500:
                    raise ARRTemporaryError(f"Server error: {response.status_code}")

                response.raise_for_status()
                return response.json()

            except (ARRAuthenticationError, ARRPermanentError):
                # Don't retry authentication or permanent errors
                raise
            except Exception as e:
                if not self.retry_handler.should_retry(attempt, e):
                    self.logger.error(
                        f"Failed to get system status after {attempt + 1} attempts: {e}"
                    )
                    raise ARRConnectionError(f"System status check failed: {e}")

                delay = self.retry_handler.calculate_delay(attempt)
                self.logger.warning(
                    f"System status attempt {attempt + 1} failed, retrying in {delay:.2f}s: {e}"
                )
                time.sleep(delay)

        return None

    def _request_with_retries(
        self,
        method: str,
        endpoint: str,
        headers: Optional[Dict[str, str]] = None,
        json: Any = None,
    ) -> Any:
        """Enhanced request method with improved error handling and retries"""

        for attempt in range(self.retry_handler.config.max_attempts):
            try:
                response = self.session.request(
                    method,
                    endpoint,
                    headers=headers,
                    json=json,
                    timeout=self.session.timeout,
                )

                # Handle specific status codes
                if response.status_code == 401:
                    raise ARRAuthenticationError("API request unauthorized")
                elif response.status_code == 403:
                    raise ARRAuthenticationError("API request forbidden")
                elif response.status_code == 404:
                    raise ARRPermanentError(f"Endpoint not found: {endpoint}")
                elif response.status_code == 429:
                    # Extract retry-after header if available
                    retry_after = response.headers.get("Retry-After")
                    if retry_after:
                        try:
                            delay = int(retry_after)
                            raise ARRRateLimitError(
                                f"Rate limited, retry after {delay}s"
                            )
                        except ValueError:
                            pass
                    raise ARRRateLimitError("Rate limited")
                elif response.status_code >= 500:
                    raise ARRTemporaryError(f"Server error: {response.status_code}")

                response.raise_for_status()

                # Return appropriate response type
                if method == "DELETE":
                    return response
                else:
                    try:
                        return response.json()
                    except ValueError as e:
                        self.logger.warning(f"Failed to parse JSON response: {e}")
                        return response.text

            except (ARRAuthenticationError, ARRPermanentError):
                # Don't retry these
                self.logger.error(f"{method} request to {endpoint} failed permanently")
                raise

            except Exception as e:
                if not self.retry_handler.should_retry(attempt, e):
                    self._log_request_failure(
                        method,
                        endpoint,
                        e,
                        response if "response" in locals() else None,
                        json,
                    )
                    return None

                delay = self.retry_handler.calculate_delay(attempt)
                self.logger.warning(
                    f"{method} request attempt {attempt + 1} failed, retrying in {delay:.2f}s: {e}"
                )
                time.sleep(delay)

        return None

    def _log_request_failure(
        self,
        method: str,
        endpoint: str,
        exception: Exception,
        response: Any = None,
        payload: Any = None,
    ) -> None:
        """Comprehensive logging for request failures"""
        status_code = (
            getattr(response, "status_code", "No response")
            if response
            else "No response"
        )

        self.logger.error(
            f"{method} request failed after {self.retry_handler.config.max_attempts} attempts"
        )
        self.logger.error(f"Endpoint: {endpoint}")
        self.logger.error(f"Status Code: {status_code}")
        self.logger.error(f"Exception: {type(exception).__name__}: {exception}")

        if payload:
            self.logger.error(f"Payload: {payload}")

        if response and hasattr(response, "text"):
            # Truncate very long responses
            response_text = (
                response.text[:1000] + "..."
                if len(response.text) > 1000
                else response.text
            )
            self.logger.error(f"Response: {response_text}")

        # Provide helpful hints
        hint = self._get_error_hint(
            status_code if isinstance(status_code, int) else None
        )
        if hint:
            self.logger.error(f"Hint: {hint}")

    def _get_error_hint(self, status_code: Optional[int]) -> str:
        """Get helpful error hints based on status code"""
        if not status_code:
            return "No HTTP response received. Check if the service is running and URL is correct."

        hints = {
            400: "Bad Request - Check request parameters and payload format",
            401: "Unauthorized - Verify API key is correct and has proper permissions",
            403: "Forbidden - API key may not have required permissions for this operation",
            404: "Not Found - Endpoint may be incorrect or resource doesn't exist",
            429: "Rate Limited - Reduce request frequency or implement backoff",
            500: "Internal Server Error - Check service logs, may be temporary",
            502: "Bad Gateway - Service may be behind a proxy with issues",
            503: "Service Unavailable - Service may be down or overloaded",
            504: "Gateway Timeout - Service may be slow to respond",
        }

        return hints.get(
            status_code, f"HTTP {status_code} - Check service documentation"
        )

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
        Get all movies from Radarr with enhanced metadata.

        Returns:
            Optional[List[Dict[str, Any]]]: List of movies with full metadata including genres, ratings, etc.
        """
        # Use includeImages=false to reduce payload size while keeping metadata
        endpoint = f"{self.url}/api/v3/movie?includeImages=false"
        return self.make_get_request(endpoint)

    def get_movie(self, media_id: int) -> Any:
        endpoint = f"{self.url}/api/v3/movie/{media_id}"
        result = self.make_get_request(endpoint)
        tags = self.get_all_tags() or []
        if result:
            return normalize_arr_media(
                result, tags, arr_type="radarr", logger=self.logger
            )

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

    def add_tags_by_name(
        self, media_id: Union[int, List[int]], tag_names: Union[str, List[str]]
    ) -> Any:
        """
        Add tag(s) to one or more movies by tag name(s).
        Args:
            media_id (Union[int, List[int]]): Movie ID(s).
            tag_names (Union[str, List[str]]): Tag name(s).
        Returns:
            Any: API response.
        """
        if isinstance(tag_names, str):
            tag_names = [tag_names]

        tag_ids = []
        for tag_name in tag_names:
            tag_id = self.get_tag_id_from_name(tag_name)
            tag_ids.append(tag_id)

        if isinstance(media_id, int):
            media_id = [media_id]

        payload = {"movieIds": media_id, "tags": tag_ids, "applyTags": "add"}
        self.logger.debug(f"Add tags by name payload: {payload}")
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

    def remove_tags_by_name(
        self, media_ids: List[int], tag_names: Union[str, List[str]]
    ) -> Any:
        """
        Remove tag(s) from movies by tag name(s).
        Args:
            media_ids (List[int]): Movie IDs.
            tag_names (Union[str, List[str]]): Tag name(s).
        Returns:
            Any: API response.
        """
        if isinstance(tag_names, str):
            tag_names = [tag_names]

        tag_ids = []
        for tag_name in tag_names:
            tag_id = self.get_tag_id_from_name(tag_name)
            tag_ids.append(tag_id)

        payload = {"movieIds": media_ids, "tags": tag_ids, "applyTags": "remove"}
        self.logger.debug(f"Remove tags by name payload: {payload}")
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

    def get_all_media(self, include_episode: bool = False) -> List[Dict[str, Any]]:
        items = self.get_media()
        tags = self.get_all_tags() or []
        return [
            normalize_arr_media(item, tags, arr_type="radarr", logger=self.logger)
            for item in items or []
        ]


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
        Get all series from Sonarr with enhanced metadata.

        Returns:
            Optional[List[Dict[str, Any]]]: List of series with full metadata including genres, ratings, etc.
        """
        # Use includeSeasonImages=false to reduce payload size while keeping metadata
        endpoint = f"{self.url}/api/v3/series?includeSeasonImages=false"
        return self.make_get_request(endpoint)

    def get_show(self, media_id: int) -> Any:
        endpoint = f"{self.url}/api/v3/series/{media_id}"
        result = self.make_get_request(endpoint)
        tags = self.get_all_tags() or []
        if result:
            return normalize_arr_media(
                result, tags, arr_type="sonarr", logger=self.logger
            )

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

    def add_tags_by_name(
        self, media_id: Union[int, List[int]], tag_names: Union[str, List[str]]
    ) -> Any:
        """
        Add tag(s) to one or more series by tag name(s).
        Args:
            media_id (Union[int, List[int]]): Series ID(s).
            tag_names (Union[str, List[str]]): Tag name(s).
        Returns:
            Any: API response.
        """
        if isinstance(tag_names, str):
            tag_names = [tag_names]

        tag_ids = []
        for tag_name in tag_names:
            tag_id = self.get_tag_id_from_name(tag_name)
            tag_ids.append(tag_id)

        if isinstance(media_id, int):
            media_id = [media_id]

        payload = {"seriesIds": media_id, "tags": tag_ids, "applyTags": "add"}
        self.logger.debug(f"Add tags by name payload: {payload}")
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

    def remove_tags_by_name(
        self, media_ids: List[int], tag_names: Union[str, List[str]]
    ) -> Any:
        """
        Remove tag(s) from series by tag name(s).
        Args:
            media_ids (List[int]): Series IDs.
            tag_names (Union[str, List[str]]): Tag name(s).
        Returns:
            Any: API response.
        """
        if isinstance(tag_names, str):
            tag_names = [tag_names]

        tag_ids = []
        for tag_name in tag_names:
            tag_id = self.get_tag_id_from_name(tag_name)
            tag_ids.append(tag_id)

        payload = {"seriesIds": media_ids, "tags": tag_ids, "applyTags": "remove"}
        self.logger.debug(f"Remove tags by name payload: {payload}")
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

    def get_all_media(self, include_episode: bool = False) -> List[Dict[str, Any]]:
        items = self.get_media()
        tags = self.get_all_tags() or []
        # Only for Sonarr, we can optionally pull episode data for each season:
        episode_lookup = None
        if include_episode:
            # Define a closure to fetch episodes for a series+season
            def episode_lookup(media_id, season_number):
                return self.get_episode_data_by_season(media_id, season_number)

        return [
            normalize_arr_media(
                item,
                tags,
                arr_type="sonarr",
                include_episode=include_episode,
                episode_lookup=episode_lookup,
                logger=self.logger,
            )
            for item in items or []
        ]

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

    logger = logger.get_adapter("ARR")

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


def extract_poster_url(item: dict) -> Optional[str]:
    """
    Extract poster URL from ARR response images array.

    Looks for the first available poster image from:
    1. 'poster' coverType
    2. Any image with URL if no poster found

    Args:
        item: ARR API response item

    Returns:
        Optional[str]: Poster URL or None if no suitable image found
    """
    images = item.get("images", [])
    if not images:
        return None

    # First priority: find image with coverType 'poster'
    for image in images:
        if image.get("coverType") == "poster":
            # Prefer remoteUrl over url for external accessibility
            poster_url = image.get("remoteUrl") or image.get("url")
            if poster_url:
                return poster_url

    # Fallback: use the first image with a URL
    for image in images:
        poster_url = image.get("remoteUrl") or image.get("url")
        if poster_url:
            return poster_url

    return None


def normalize_arr_media(
    item, tags, arr_type, include_episode=False, episode_lookup=None, logger=None
):
    """
    Normalize a single ARR media item (Radarr/Sonarr) into a unified dict structure.
    - arr_type: "radarr" or "sonarr"
    - include_episode: (sonarr only) whether to pull episode data
    - episode_lookup: func(media_id, season_number) -> episode list (for Sonarr)
    - logger: Optional logger for debugging metadata extraction
    """

    def extract_language_code(language_obj):
        """Extract language code from ARR language object or return as string."""
        if language_obj is None:
            return None
        if isinstance(language_obj, dict):
            # ARR returns language as dict like {"id": 1, "name": "English"}
            return language_obj.get("name", str(language_obj))
        return str(language_obj)

    tag_lookup = {tag.get("id"): tag.get("label") for tag in tags or []}
    tags_field = item.get("tags") or []
    tag_names = [tag_lookup.get(tid, str(tid)) for tid in tags_field if tid is not None]

    alt_titles_field = item.get("alternateTitles") or []
    alternate_titles = [t.get("title", "") for t in alt_titles_field if t]
    normalized_alternate_titles = [normalize_titles(t) for t in alternate_titles]

    title_val = item.get("title", "")
    if year_regex.search(title_val or ""):
        title = year_regex.sub("", title_val or "")
        year = extract_year(title_val or "")
    else:
        title = title_val or ""
        year = item.get("year")

    folder = os.path.basename(
        os.path.normpath(item.get("path", "") or item.get("folderPath"))
    )

    # Extract poster URL from images
    poster_url = extract_poster_url(item)

    if arr_type == "radarr":
        movie_file = item.get("movieFile") or {}
        file_id = movie_file.get("id")

        # Extract additional metadata for advanced search filtering
        certification = item.get("certification")

        # Extract studio/network from production companies or studio
        studio = item.get("studio") or ""
        if not studio:
            # Try to get from production companies if available
            companies = item.get("productionCompanies", [])
            if companies and isinstance(companies, list):
                # Extract name from company dict if it's a dict, otherwise use as string
                first_company = companies[0]
                if isinstance(first_company, dict):
                    studio = first_company.get("name", str(first_company))
                else:
                    studio = str(first_company)
            elif companies:
                studio = str(companies)

        # Extract genres - handle both list of strings and list of objects
        genres = []
        genre_data = item.get("genres", [])
        if isinstance(genre_data, list):
            for genre in genre_data:
                if isinstance(genre, str):
                    genres.append(genre)
                elif isinstance(genre, dict) and genre.get("name"):
                    genres.append(genre["name"])

        # Skip user ratings - inconsistent between Radarr/Sonarr
        user_rating = None

        # Debug logging for extracted metadata
        if logger and (genres or certification or studio):
            logger.debug(
                f"Extracted metadata for {item.get('title')}: "
                f"genres={genres}, rating={certification}, studio={studio}"
            )

        return {
            "title": unidecode(html.unescape(title or "")),
            "year": year,
            "media_id": item.get("id"),
            "arr_id": item.get("id"),  # ARR media ID for direct API operations
            "tmdb_id": item.get("tmdbId"),
            "imdb_id": item.get("imdbId"),
            "monitored": item.get("monitored"),
            "status": item.get("status"),
            "root_folder": item.get("rootFolderPath"),
            "quality_profile": item.get("qualityProfileId"),
            "normalized_title": normalize_titles(title_val or ""),
            "path_name": os.path.basename(item.get("path", "") or ""),
            "original_title": item.get("originalTitle"),
            "secondary_year": item.get("secondaryYear"),
            "alternate_titles": alternate_titles,
            "normalized_alternate_titles": normalized_alternate_titles,
            "file_id": file_id,
            "folder": folder,
            "normalized_folder": normalize_titles(folder or ""),
            "has_file": item.get("hasFile"),
            "tags": tag_names,
            "seasons": None,
            "season_numbers": None,
            "poster_url": poster_url,
            # Advanced search filtering fields
            "rating": certification,  # Content rating (PG, R, etc.)
            "user_rating": user_rating,  # User/critic rating
            "studio": studio,  # Production studio
            "edition": None,  # Not typically available from ARR
            "runtime": item.get("runtime"),  # Duration in minutes
            "language": extract_language_code(
                item.get("originalLanguage")
            ),  # Original language
            "genre": json.dumps(genres) if genres else None,  # JSON string of genres
        }
    else:
        season_list = []
        for season in item.get("seasons", []) or []:
            season_number = season.get("seasonNumber")
            episode_list = []
            if include_episode and episode_lookup and season_number is not None:
                episode_data = episode_lookup(item.get("id"), season_number) or []
                episode_list = [
                    {
                        "episode_number": ep.get("episodeNumber"),
                        "monitored": ep.get("monitored"),
                        "episode_file_id": ep.get("episodeFileId"),
                        "episode_id": ep.get("id"),
                        "has_file": ep.get("hasFile"),
                    }
                    for ep in episode_data
                    if ep
                ]
            try:
                stats = season.get("statistics") or {}
                status = stats.get("episodeCount", 0) == stats.get(
                    "totalEpisodeCount", 0
                )
                season_stats = stats.get("episodeCount", 0)
            except Exception:
                status = False
                season_stats = 0
            season_list.append(
                {
                    "season_number": season_number,
                    "monitored": season.get("monitored"),
                    "season_pack": status,
                    "season_has_episodes": season_stats,
                    "episode_data": episode_list,
                }
            )
        # Extract additional metadata for advanced search filtering (Sonarr)
        certification = item.get("certification")

        # Extract network/studio
        network = item.get("network") or item.get("studio") or ""

        # Extract genres - handle both list of strings and list of objects
        genres = []
        genre_data = item.get("genres", [])
        if isinstance(genre_data, list):
            for genre in genre_data:
                if isinstance(genre, str):
                    genres.append(genre)
                elif isinstance(genre, dict) and genre.get("name"):
                    genres.append(genre["name"])

        # Skip user ratings - inconsistent between Radarr/Sonarr
        user_rating = None

        # Debug logging for extracted metadata
        if logger and (genres or certification or network):
            logger.debug(
                f"Extracted metadata for {item.get('title')}: "
                f"genres={genres}, rating={certification}, network={network}"
            )

        # Calculate average runtime from seasons if available
        avg_runtime = item.get("runtime")
        if not avg_runtime and season_list:
            # Try to calculate from season data if available
            total_runtime = 0
            episode_count = 0
            for season in season_list:
                stats = season.get("statistics", {})
                if stats.get("totalEpisodeCount"):
                    # Estimate based on typical TV episode length (varies by genre/network)
                    total_runtime += (
                        stats.get("totalEpisodeCount", 0) * 45
                    )  # Assume 45 min episodes
                    episode_count += stats.get("totalEpisodeCount", 0)

            if episode_count > 0:
                avg_runtime = total_runtime // episode_count

        return {
            "title": unidecode(html.unescape(title or "")),
            "year": year,
            "media_id": item.get("id"),
            "arr_id": item.get("id"),  # ARR media ID for direct API operations
            "tvdb_id": item.get("tvdbId"),
            "imdb_id": item.get("imdbId"),
            "monitored": item.get("monitored"),
            "status": item.get("status"),
            "root_folder": item.get("rootFolderPath"),
            "quality_profile": item.get("qualityProfileId"),
            "normalized_title": normalize_titles(title_val or ""),
            "path_name": os.path.basename(item.get("path", "") or ""),
            "original_title": item.get("originalTitle"),
            "secondary_year": item.get("secondaryYear"),
            "alternate_titles": alternate_titles,
            "normalized_alternate_titles": normalized_alternate_titles,
            "file_id": None,
            "folder": folder,
            "normalized_folder": normalize_titles(folder or ""),
            "has_file": None,
            "tags": tag_names,
            "season_number": None,
            "media_folder": None,
            "seasons": season_list,
            "poster_url": poster_url,
            # Advanced search filtering fields
            "rating": certification,  # Content rating (TV-MA, TV-14, etc.)
            "user_rating": user_rating,  # User/critic rating
            "studio": network,  # TV Network/Studio
            "edition": None,  # Not typically available from ARR
            "runtime": avg_runtime,  # Average episode runtime in minutes
            "language": extract_language_code(
                item.get("originalLanguage")
            ),  # Original language
            "genre": json.dumps(genres) if genres else None,  # JSON string of genres
        }
