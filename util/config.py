import pathlib
import yaml
import os
from pathlib import Path
from util.logger import setup_logger
from util.utility import *
import time

logger = setup_logger("info", "main")

# Set the config file path
if is_docker():
    # Set the config path
    config_path = os.getenv('CONFIG_DIR', '/config')
    # Set the config file path
    config_file_path = os.path.join(config_path, "config.yml")
else:
    # Set the config file path
    config_file_path = os.path.join(pathlib.Path(__file__).parents[1], "config/config.yml")


# Wait for the config file to be created
while not os.path.isfile(config_file_path):
    logger.info(f"Config file not found. Retrying in 60 seconds...")
    time.sleep(60)


class Config:
    """
    A class to represent the config file
    """
    def __init__(self, script_name):
        """
        Initialize the config file
        """
        self.config_path = config_file_path
        self.script_name = script_name
        self.load_config()

    def load_config(self):
        """
        Load the config file
        
        Args:
            None
            
        Returns:
            None
        """
        # Open the YAML config file and load its contents
        with open(self.config_path, "r") as file:
            config = yaml.safe_load(file)

        # Set various attributes from the loaded config
        self.instances_config = config['instances']  # Instance configurations
        self.bash_config = config['bash_scripts']  # Bash script configurations
        self.scheduler = config['schedule']  # Scheduler configurations
        self.discord = config.get('discord', {})  # Discord configurations, if available

        # If the script_name attribute exists, set script-specific configurations
        if self.script_name:
            self.script_config = config.get(f'{self.script_name}', None)  # Script-specific config
            try:
                self.log_level = self.script_config.get('log_level', 'info').lower()  # Log level
            except AttributeError:
                print(f"Invalid log level '{self.script_config.get('log_level', 'info')}', defaulting to 'info'")
                self.log_level = 'info'
            self.dry_run = self.script_config.get('dry_run', False)  # Dry run setting
            self.sync_gdrive = self.script_config.get('sync_gdrive', False)  # Google Drive sync setting

        # Set specific configurations for different services
        self.radarr_config = self.instances_config.get('radarr', {})  # Radarr configurations
        self.sonarr_config = self.instances_config.get('sonarr', {})  # Sonarr configurations
        self.qbit_config = self.instances_config.get('qbittorrent', {})  # qBittorrent configurations
        self.plex_config = self.instances_config.get('plex', {})  # Plex configurations