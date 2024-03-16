import pathlib
import yaml
import os
from pathlib import Path
from util.utility import *
import time
from ruamel.yaml import YAML


# Set the config file path
if os.environ.get('DOCKER_ENV'):
    # Set the config path
    config_path = os.getenv('CONFIG_DIR', '/config')
    # Set the config file path
    config_file_path = os.path.join(config_path, "config.yml")
else:
    # Set the config file path
    config_file_path = os.path.join(pathlib.Path(__file__).parents[1], "config/config.yml")


# Wait for the config file to be created
while not os.path.isfile(config_file_path):
    print(f"Config file not found. Retrying in 60 seconds...")
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
        try:
            try:
                with open(self.config_path, "r") as file:
                    config = yaml.safe_load(file)
            except FileNotFoundError:
                print(f"Config file not found at {self.config_path}")
                return
            except yaml.parser.ParserError as e:
                print(f"Error parsing config file: {e}")
                return
        except FileNotFoundError:
            print(f"Config file not found at {self.config_path}")
            return

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


    # Add data to config file
    def add_to_config(self, add_type, container, logger, message=None):
        """
        Add data to the config file for the backup_appdata key
        
        Args:
            add_type (str): stop_list or no_stop_list
            container_name (str): Name of the container to add to the config file

        Returns:
            None
        """
        yaml = YAML()

        # Load the config file
        with open(self.config_path, "r") as file:
            config = yaml.load(file)

        container_name = container.name
        container_name_message = f"{container_name}\t\t\t{message}" if message else f"{container_name}"
        stop_list = config['backup_appdata']['stop_list']
        no_stop_list = config['backup_appdata']['no_stop_list']
        exclusion_list = config['backup_appdata']['exclusion_list']
        
        logger.debug(f"Adding {container_name} to {add_type} list")
        # Add the container to the stop_list or no_stop_list
        if add_type == "stop":
            if not stop_list:
                stop_list = [container_name_message]
            elif container_name_message not in stop_list:
                stop_list.append(container_name_message)
        elif add_type == "no_stop":
            if not no_stop_list:
                no_stop_list = [container_name_message]
            elif container_name_message not in no_stop_list:
                no_stop_list.append(container_name_message)
        elif add_type == "exclude":
            if not exclusion_list:
                exclusion_list = [container_name_message]
            elif container_name_message not in exclusion_list:
                exclusion_list.append(container_name_message)

        # Add the new data to the config file
        config['backup_appdata']['stop_list'] = stop_list
        config['backup_appdata']['no_stop_list'] = no_stop_list
        config['backup_appdata']['exclusion_list'] = exclusion_list

        with open(self.config_path, "w") as file:
            yaml.dump(config, file)

    def remove_from_config(self, containers_to_remove, logger):
        """
        Removes container names from appdata_backup stop_list or no_stop_list
        if the container is removed from the system
        
        Args:
            remove_type (str): stop_list or no_stop_list
            container_name (str): Name of the container to remove from the config file

        Returns:
            None
        """
        yaml = YAML()

        # Load the config file
        with open(self.config_path, "r") as file:
            config = yaml.load(file)

        stop_list = config['backup_appdata']['stop_list']
        no_stop_list = config['backup_appdata']['no_stop_list']
        exclusion_list = config['backup_appdata']['exclusion_list']

        for container in containers_to_remove:
            if container in stop_list:
                logger.debug(f"Removing {container} from stop_list")
                stop_list.remove(container)
            if container in no_stop_list:
                logger.debug(f"Removing {container} from no_stop_list")
                no_stop_list.remove(container)
            if container in exclusion_list:
                logger.debug(f"Removing {container} from exclusion_list")
                exclusion_list.remove(container)

        # Add the new data to the config file
        config['backup_appdata']['stop_list'] = stop_list
        config['backup_appdata']['no_stop_list'] = no_stop_list
        config['backup_appdata']['exclusion_list'] = exclusion_list

        with open(self.config_path, "w") as file:
            yaml.dump(config, file)