# Renameinatorr
<br>
Credit: This script was originally written in powershell by AngryCuban13 from his repo [here](https://github.com/angrycuban13/Just-A-Bunch-Of-Starr-Scripts)<br>
Thanks to him and others who have helped me in making this script a thing.
<br>
## Description
This is a script for renaming media files for unlimited number of Sonarr and/or Radarr instances. The script can be run in a dry-run mode to preview changes without enacting any changes, or in a cycle mode where it will continuously cycle through all movies and series after they have all been tagged and renamed. The script also provides the option to reset all tags for any connected Sonarr/Radarr instances.

In order to use the script, you need to provide the URLs and API keys for your Sonarr and/or Radarr instances. The script will then connect to each instance, retrieve the list of movies or series, and rename the media files accordingly.

## Help Menu
To run the script, you need to provide the following arguments:
```
--dry-run: (optional) Run the script in dry-run mode to preview changes without enacting any changes.
--cycle: (optional) Run the script in cycle mode to continuously cycle through all movies and series after they have all been tagged and renamed.
--reset: (optional) Reset all tags for any connected Sonarr/Radarr instances.
--sonarr-urls: (optional) List of URLs for Sonarr instances.
--sonarr-apis: (optional) List of API keys for Sonarr instances.
--sonarr-check: (optional) Number of series to check.
--radarr-urls: (optional) List of URLs for Radarr instances.
--radarr-apis: (optional) List of API keys for Radarr instances.
--radarr-check: (optional) Number of movies to check.
```
## Usage
Example usage:
```
python script.py --sonarr-urls http://localhost:8989 http://localhost:9090 --sonarr-apis abcdefghijklmnopqrstuvwxyz abc3efgh4jklmnopq5stuvwxyz --radarr-urls http://localhost:7878 --radarr-apis abcdefghijklmnopqrstuvwxyz
```
This script can be used to manage multiple Sonarr and Radarr instances from a single location, saving time and effort in renaming and tagging media files.