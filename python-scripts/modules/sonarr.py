import requests

class SonarrInstance:
    """
    A class representing a Sonarr instance.
    """
    def __init__(self, url, api_key, logger):
        """
        nitialize a SonarrInstance object.
        Parameters:
            url (str): The URL of the Sonarr instance.
            api_key (str): The API key to use to connect to the Sonarr instance.
            logger (logging.Logger): a logger object for logging debug messages.
        Raises:
            ValueError: If the URL does not point to a valid Sonarr instance.
        """
        self.url = url.rstrip("/")
        self.url = url
        self.api_key = api_key
        self.headers = {
            "x-api-key": api_key
        }
        self.session = requests.Session()
        self.session.headers.update({"X-Api-Key": self.api_key})

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