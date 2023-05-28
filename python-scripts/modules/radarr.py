import requests

class RadarrInstance:
    def __init__(self, url, api_key, logger):
        """
        Initialize a RadarrInstance object.
        Parameters:
            url (str): The URL of the Radarr instance.
            api_key (str): The API key to use to connect to the Radarr instance.
            logger (logging.Logger): a logger object for logging debug messages.
        Raises:
            ValueError: If the URL does not point to a valid Radarr instance.
        """
        self.url = url.rstrip("/")
        self.url = url
        self.api_key = api_key
        self.logger = logger
        self.headers = {
            "x-api-key": api_key
        }
        self.session = requests.Session()
        self.session.headers.update({"X-Api-Key": self.api_key})
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