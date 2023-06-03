import os
import sys
from modules import formatter

class ValidateInput():
    """
    Validate input from the config file
    """
    def __init__(self, 
                log_level, 
                dry_run,
                logger, 
                source_dir = None, 
                library_names = None, 
                destination_dir = None, 
                movies_threshold = None,
                series_threshold = None, 
                collection_threshold = None, 
                action_type = None,  
                print_only_renames = None,
                ):
        """
        :param log_level: The log level to use (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        :param dry_run: Whether or not to perform the actions or just print them
        :param logger: The logger object to use
        :param source_dir: The source directory to use
        :param library_names: The library names to use
        :param destination_dir: The destination directory to use
        :param movies_threshold: The movies threshold to use
        :param series_threshold: The series threshold to use
        :param collection_threshold: The collection threshold to use
        :param action_type: The action type to use
        :param print_only_renames: Whether or not to only print renames
        """
        self.log_level = log_level
        self.dry_run = dry_run
        logger = logger
        self.source_dir = source_dir
        self.library_names = library_names
        self.destination_dir = destination_dir
        self.movies_threshold = movies_threshold
        self.series_threshold = series_threshold
        self.collection_threshold = collection_threshold
        self.action_type = action_type
        self.print_only_renames = print_only_renames

    def validate_global(self, url, api_key, instance_name, instance_type):
        """
        Validate global config options

        :param url: The URL to validate
        :param api_key: The API key to validate
        :param instance_name: The instance name to validate
        :param instance_type: The instance type to validate
        
        :raises ValueError: If the URL or API key is invalid
        """
        if instance_type == "Radarr" or instance_type == "Sonarr" or instance_type == "Plex":
            if not (url.startswith("http://") or url.startswith("https://")):
                raise ValueError(
                    f'\'{instance_name}\' URL must start with \'http://\' or \'https://://\'')
            if not api_key:
                raise ValueError(f'API key is required for \'{instance_name}\'')
            if url.startswith("http://") or url.startswith("https://"):
                if not api_key:
                    raise ValueError(f'API key is required for \'{instance_name}\'')
    def validate_script(self, logger):
        if self.dry_run not in [True, False]:
            self.dry_run = True
            raise ValueError(f'\'dry_run must be either True or False')
        if self.log_level not in ['debug', 'info', 'critical']:
            logger.warning(f"{formatter.color('ERROR', 'red')}: \'log_level: {self.log_level}\' must be either \'DEBUG\', \'INFO\', or \'CRITICAL\'. Defaulting to \'INFO\'")
            self.log_level = 'INFO'
            if not self.source_dir:
                raise ValueError(f'\'source_dir is required.')
            if not os.path.exists(self.source_dir):
                logger.error(f"Source directory does not exist: {self.source_dir}")
                sys.exit(1)
            if not self.destination_dir:
                raise ValueError(f'\'destination_dir is required.')
            if not os.path.exists(self.destination_dir):
                logger.error(f"Destination directory does not exist: {self.destination_dir}")
                sys.exit(1)
            if not self.movies_threshold:
                raise ValueError(f'\'movies_threshold is required.')
            if self.movies_threshold:
                try:
                    int(self.movies_threshold)
                except ValueError:
                    raise ValueError(
                        f'\'movies_threshold\' must be an integer.')
            if not self.series_threshold:
                raise ValueError(
                    f'\'series_threshold\' is required.')
            if self.series_threshold:
                try:
                    int(self.series_threshold)
                except ValueError:
                    raise ValueError(
                        f'\'series_threshold\' must be an integer.')
            if not self.collection_threshold:
                raise ValueError(
                    f'\'collection_threshold\' is required.')
            if self.collection_threshold:
                try:
                    int(self.collection_threshold)
                except ValueError:
                    raise ValueError(
                        f'\'collection_threshold\' must be an integer.')
            if not self.action_type:
                raise ValueError(f'\'action_type\' is required.')
            if self.action_type not in ['move', 'copy']:
                raise ValueError(
                    f'\'action_type\' must be either \'move\' or \'copy\'.')
            if self.print_only_renames not in [True, False]:
                self.print_only_renames = False
                raise ValueError(f'\'print_only_renames must be either True or False')
        logger.debug("Validated input")
        return self.log_level, self.dry_run