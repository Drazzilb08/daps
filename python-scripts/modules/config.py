import pathlib
import yaml
import os

base_dir = pathlib.Path(__file__).parent.parent
config_path = f'{base_dir}/config.yml'

class Config:
    def __init__(self, script_name):
        self.config_path = config_path
        self.script_name = script_name
        self.load_config()

    def load_config(self):
        # Read config from the YAML file
        with open(self.config_path, "r") as file:
            config = yaml.safe_load(file)

        # Load config into instance variables
        self.global_data = config['global']
        try:
            self.discord_data = config['discord']
        except KeyError:
            self.discord_data = {}
        self.webhook_data = self.discord_data.get('webhook', {})
        self.channel_id = self.discord_data.get('channel_id', '')
        self.script_data = config.get(f'{self.script_name}', {})
        

        # Global variables
        self.radarr_data = self.global_data.get('radarr', {})  # Use empty dict if radarr data is not found
        self.sonarr_data = self.global_data.get('sonarr', {})  # Use empty dict if sonarr data is not found
        self.qbit_data = self.global_data.get('qbittorrent', {})  # Use empty dict if qbit data is not found
        self.plex_data = self.global_data.get('plex', {})  # Use empty dict if plex data is not found

        # Typical variables
        self.log_level = self.script_data.get('log_level', 'info').lower()  # Use 'info' as default log level if not provided
        self.dry_run = self.script_data.get('dry_run', False)  # Use False as default value for dry_run if not provided
        self.asset_folders = self.script_data.get('asset_folders', [])  # Use empty list as default value for asset_folders if not provided
        self.radarr = self.script_data.get('radarr', False)  # Use False as default value for radarr if not provided')
        self.sonarr = self.script_data.get('sonarr', False)  # Use False as default value for sonarr if not provided')
        self.qbit = self.script_data.get('qbittorrent', False)  # Use False as default value for qbit if not provided')

        # Plex variables
        self.library_names = self.script_data.get('library_names', [])  # Use empty list as default value for library_names if not provided
        self.ignore_collections = self.script_data.get('ignore_collections', []) # Use empty list as default value for ignore_collections if not provided

        # Renamer variables
        self.use_plex = self.script_data.get('use_plex', False)  # Use False as default value for use_plex if not provided
        self.source_dir = self.script_data.get('source_dir', '')  # Use empty string as default value for source_dir if not provided
        self.source_overrides = self.script_data.get('source_overrides', [])  # Use empty list as default value for source_override if not provided
        self.destination_dir = self.script_data.get('destination_dir', '')  # Use empty string as default value for destination_dir if not provided
        self.movies_threshold = self.script_data.get('movies_threshold', 0)  # Use 0 as default value for movies_threshold if not provided
        self.series_threshold = self.script_data.get('series_threshold', 0)  # Use 0 as default value for series_threshold if not provided
        self.collection_threshold = self.script_data.get('collection_threshold', 0)  # Use 0 as default value for collection_threshold if not provided
        self.action_type = self.script_data.get('action_type', 'move')  # Use 'move' as default value for action_type if not provided
        self.print_only_renames = self.script_data.get('print_only_renames', False)  # Use False as default value for print_only_renames if not provided

        # unmatched-assets variables
        self.assets_path = self.script_data.get('assets_path', '') # Use empty string as default value for assets_path if not provided
        self.media_paths = self.script_data.get('media_paths', []) # Use empty list as default value for media_paths if not provided

        # nohl
        self.movies = self.script_data.get('movies', False)  # Use False as default value for movies if not provided
        self.series = self.script_data.get('series', False)  # Use False as default value for tv_shows if not provided
        self.maximum_searches = self.script_data.get('maximum_searches', 0)  # Use 0 as default value for maximum_searches if not provided

        #labelarr
        self.labels = self.script_data.get('labels', '[]')
        self.add_from_plex = self.script_data.get('add_from_plex', False)

