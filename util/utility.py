import re
import os
import json
import subprocess
from pathlib import Path
import math
import datetime
from util.normalization import normalize_titles
from util.extract import extract_year
from util.constants import year_regex
from util.construct import generate_title_variants

try:
    import html
    from unidecode import unidecode
    from tqdm import tqdm
    from plexapi.exceptions import NotFound
except ImportError as e:
    print(f"ImportError: {e}")
    print("Please install the required modules with 'pip install -r requirements.txt'")
    exit(1)

def create_table(data):
    """
    Create a table from the provided data

    Args:
        data (list): The data to create the table from
        log_level (str, optional): The log level to use for logging output. Defaults to None.
        logger (logger, optional): The logger to use for logging output. Defaults to None.

    Returns:
        str: The formatted table string
    """

    if not data:
        return "No data provided."

    num_rows = len(data)
    num_cols = len(data[0])

    # Calculate column widths
    col_widths = [max(len(str(data[row][col])) for row in range(num_rows)) for col in range(num_cols)]

    # Add two spaces padding to each cell
    col_widths = [max(width + 2, 5) for width in col_widths]  # Set minimum width of 5 for each column

    # Calculate total table width without including padding
    total_width = sum(col_widths) + num_cols - 1  # Separator widths between columns

    width = 76

    # Ensure minimum width of 40
    if total_width < width:
        additional_width = width - total_width
        extra_width_per_col = additional_width // num_cols
        remainder = additional_width % num_cols

        for i in range(num_cols):
            col_widths[i] += extra_width_per_col
            if remainder > 0:
                col_widths[i] += 1
                remainder -= 1

    # Recalculate total table width
    total_width = sum(col_widths) + num_cols - 1

    # Create the table
    table = "\n"

    # Top border
    table += "_" * (total_width + 2) + "\n"

    for row in range(num_rows):
        table += "|"
        for col in range(num_cols):
            cell_content = str(data[row][col])
            padding = col_widths[col] - len(cell_content)
            left_padding = padding // 2
            right_padding = padding - left_padding

            # Determine the separator for the cell
            separator = '|' if col < num_cols - 1 else '|'

            table += f"{' ' * left_padding}{cell_content}{' ' * right_padding}{separator}"
        table += "\n"
        if row < num_rows - 1:
            table += "|" + "-" * (total_width) + "|\n"

    # Bottom border
    table += "‾" * (total_width + 2) + ""

    return table

def get_media_folders(paths, logger):
    """
    Get media folders from the provided paths

    Args:
        paths (list): The paths to get media folders from
        logger (logger): The logger to use for logging output

    Returns:
        dict: A dictionary containing the media folders
    """

    media_dict = {}  # Initialize an empty dictionary to hold media folders
    if isinstance(paths, str):  # Ensure paths is a list
        list(paths)

    media_dict = {'movies': [], 'series': []}  # Initialize dictionaries for movies and series

    for path in paths:  # Loop through each path provided
        base_name = os.path.basename(os.path.normpath(path))  # Get the base folder name

        # Iterate through items in the directory
        progress_bar = tqdm(os.listdir(path), desc=f"Getting media folders for '{base_name}'", disable=None, leave=True)
        start_time = datetime.datetime.now()
        for item in progress_bar:
            if item.startswith('.') or item.startswith('@'):
                continue  # Skip hidden files/folders

            try:
                # Extract title and year information from item name using regex
                title = str(re.sub(year_regex, '', item))
                year = extract_year(item)
            except Exception as e:
                logger.warning(f"Warning: {e} - Skipping '{item}' in '{base_name}'")
                continue  # Continue to the next item

            normalized_title = normalize_titles(item)  # Normalize the item's title

            if os.path.isdir(os.path.join(path, item)) and any(os.path.isdir(os.path.join(path, item, sub_folder)) for sub_folder in os.listdir(os.path.join(path, item))):
                # If the item is a directory and contains sub folders
                sub_folders = [sub_folder for sub_folder in os.listdir(os.path.join(path, item)) if os.path.isdir(os.path.join(path, item, sub_folder)) and not sub_folder.startswith('.')]
                sub_folders.sort()  # Sort the sub folders

                season_numbers = []
                for folder in sub_folders:
                    if folder == "Specials":
                        season_data = '00'
                        season_numbers.append(season_data)
                    elif folder.startswith("Season"):
                        season_data = folder.replace("Season", "").strip().zfill(2)
                        season_numbers.append(season_data)

                # Add series data to the media dictionary
                media_dict['series'].append({
                    'title': unidecode(html.unescape(title)),
                    'year': year,
                    'normalized_title': normalized_title,
                    'season_numbers': season_numbers,
                    'path': os.path.join(path, item),
                    'location': base_name,
                })
            else:
                # Add movie data to the media dictionary
                media_dict['movies'].append({
                    'title': unidecode(html.unescape(title)),
                    'year': year,
                    'normalized_title': normalized_title,
                    'path': os.path.join(path, item),
                    'location': base_name,
                })
        end_time = datetime.datetime.now()
        elapsed_time = (end_time - start_time).total_seconds()
        items_per_second = len(os.listdir(path)) / elapsed_time if elapsed_time > 0 else 0
        logger.debug(f"Processed {len(os.listdir(path))} items in {elapsed_time:.2f} seconds ({items_per_second:.2f} items/s)")

    return media_dict

def handle_starr_data(app, server_name, instance_type, logger, include_episode=False):
    """
    Get data from Radarr or Sonarr

    Args:
        app (Radarr or Sonarr): The Radarr or Sonarr instance
        instance_type (str): The type of instance (Radarr or Sonarr)

    Returns:
        list: A list of dictionaries containing the data from Radarr or Sonarr
    """

    media_dict = []  # Initialize an empty list to hold media data
    media = app.get_media()  # Fetch media data from the Radarr or Sonarr instance
    if media:
        progress_bar = tqdm(media, desc=f"Getting {server_name.capitalize()} data", total=len(media), disable=None, leave=True)
        start_time = datetime.datetime.now()
        for item in progress_bar:
            # Fetch relevant data based on the instance type (Radarr or Sonarr)
            if instance_type == "radarr":
                file_id = item.get('movieFile', {}).get('id', None)  # Fetch file ID for Radarr
            elif instance_type == "sonarr":
                season_data = item.get('seasons', [])  # Fetch season data for Sonarr
                season_list = []  # Initialize a list to hold season data
                for season in season_data:
                    if include_episode:
                        episode_data = app.get_episode_data_by_season(item['id'], season['seasonNumber'])  # Fetch episode data for each season
                        episode_list = []  # Initialize a list to hold episode data
                        for episode in episode_data:
                            episode_list.append({
                                'episode_number': episode['episodeNumber'],
                                'monitored': episode['monitored'],
                                'episode_file_id': episode['episodeFileId'],
                                'episode_id': episode['id'],
                                'has_file': episode['hasFile'],
                            })  # Append episode data to the episode dictionary
                    # Check if season is complete
                    try:
                        status = season['statistics']['episodeCount'] == season['statistics']['totalEpisodeCount']
                    except:
                        status = False
                    try:
                        season_stats = season['statistics']['episodeCount']
                    except:
                        season_stats = 0
                    season_list.append({
                        'season_number': season['seasonNumber'],
                        'monitored': season['monitored'],
                        'season_pack': status,
                        'season_has_episodes': season_stats,
                        'episode_data': episode_list if include_episode else [],
                    })  # Append season data to the season dictionary

            alternate_titles = []
            normalized_alternate_titles = []
            if item['alternateTitles']:
                for alternate_title in item['alternateTitles']:
                    alternate_titles.append(alternate_title['title'])  # Collect alternate titles
                    normalized_alternate_titles.append(normalize_titles(alternate_title['title']))  # Normalize alternate titles
            # If year is in the name extract name and year
            if re.search(r"\s?\(\d{4}\)", item['title']):
                title = re.sub(r"\s?\(\d{4}\)", "", item['title'])
                year = extract_year(item['title'])
            else:
                title = item['title']
                year = item['year']
            # Check windows path
            reg = re.match(r"^([A-Z]:\\)", item['path'])
            if reg and reg.group(1):
                folder = item['path'][item['path'].rfind("\\")+1:]
            else:
                folder = os.path.basename(os.path.normpath(item['path']))
            # Construct a dictionary for each item and append it to media_dict
            media_dict.append({
                'title': unidecode(html.unescape(title)),
                'year': year,
                'media_id': item['id'],
                'tmdb_id' if instance_type == "radarr" else 'tvdb_id': item['tmdbId'] if instance_type == "radarr" else item['tvdbId'],
                'imdb_id': item.get('imdbId', None),
                'monitored': item['monitored'],
                'status': item['status'],
                'root_folder': item['rootFolderPath'],
                'quality_profile': item['qualityProfileId'],
                'normalized_title': normalize_titles(item['title']),
                'path_name': os.path.basename(item['path']),
                'original_title': item.get('originalTitle', None),
                'secondary_year': item.get('secondaryYear', None),
                'alternate_titles': alternate_titles,
                'normalized_alternate_titles': normalized_alternate_titles,
                'file_id': file_id if instance_type == "radarr" else None,
                'folder': folder,
                'has_file': item['hasFile'] if instance_type == "radarr" else None,
                'tags': item['tags'],
                'seasons': season_list if instance_type == "sonarr" else None,  # Add season_list for Sonarr items
                'season_numbers': [season['season_number'] for season in season_list] if instance_type == "sonarr" else None,
            })  # Append the constructed dictionary to media_dict
        end_time = datetime.datetime.now()
        elapsed_time = (end_time - start_time).total_seconds()
        items_per_second = len(media) / elapsed_time if elapsed_time > 0 else 0
        logger.debug(f"Processed {len(media)} items in {elapsed_time:.2f} seconds ({items_per_second:.2f} items/s)")
    else:
        return None

    return media_dict

def get_plex_data(plex, library_names, logger, include_smart, collections_only):
    """
    Get data from Plex

    Args:
        plex (Plex): The Plex instance
        library_names (list): The names of the libraries to get data from
        logger (logger): The logger to use for logging output
        include_smart (bool): Whether or not to include smart collections
        collections_only (bool): Whether or not to only get collection data

    Returns:
        list: A list of dictionaries containing the data from Plex
    """

    plex_dict = []  # Initialize an empty list to hold Plex data
    collection_names = {}  # Initialize an empty dictionary to hold raw collection data
    library_data = {}  # Initialize an empty dictionary to hold library data
    # Loop through each library name provided
    for library_name in library_names:
        try:
            library = plex.library.section(library_name)  # Get the library instance
        except NotFound:
            logger.error(f"Error: Library '{library_name}' not found, check your settings and try again.")
            continue

        if collections_only:
            if include_smart:
                collection_names[library_name] = [collection.title for collection in library.search(libtype="collection")]
            else:
                collection_names[library_name] = [collection.title for collection in library.search(libtype="collection") if not collection.smart]
        else:
            library_data[library_name] = library.all()  # Get all items from the library

    if collections_only:
        # Process collection data
        for library_name, collection_names in collection_names.items():
            progress_bar = tqdm(collection_names, desc=f"Processing Plex collection data for '{library_name}'", total=len(collection_names), disable=None, leave=True)
            start_time = datetime.datetime.now()
            for title in progress_bar:
                title = unidecode(html.unescape(title))
                normalized_title = normalize_titles(title)
                alternate_titles = generate_title_variants(title)
                plex_dict.append({
                    'title': title,
                    'normalized_title': normalized_title,
                    'location': library_name, # Library name
                    'year': None,
                    'folder': title,
                    'alternate_titles': alternate_titles['alternate_titles'],
                    'normalized_alternate_titles': alternate_titles['normalized_alternate_titles'],
                })
            end_time = datetime.datetime.now()
            elapsed_time = (end_time - start_time).total_seconds()
            items_per_second = len(collection_names) / elapsed_time if elapsed_time > 0 else 0
            logger.debug(f"Processed {len(collection_names)} collections in library '{library_name}' in {elapsed_time:.2f} seconds ({items_per_second:.2f} items/s)")

    else:
        for library_name, library_data in library_data.items():
            progress_bar = tqdm(library_data, desc=f"Processing {library_name} data", total=len(library_data), disable=None, leave=True)
            start_time = datetime.datetime.now()
            for item in progress_bar:
                labels = [str(label).lower() for label in item.labels]
                plex_dict.append({
                    'title': unidecode(html.unescape(item.title)),
                    'normalized_title': normalize_titles(item.title),
                    'year': item.year,
                    'labels': labels,
                })
            end_time = datetime.datetime.now()
            elapsed_time = (end_time - start_time).total_seconds()
            items_per_second = len(library_data) / elapsed_time if elapsed_time > 0 else 0
            logger.debug(f"Processed {len(collection_names)} collections in library '{library_name}' in {elapsed_time:.2f} seconds ({items_per_second:.2f} items/s)")

    return plex_dict


def validate(config, script_config, logger):
    """
    Validate the config file

    Args:
        config (Config): The Config instance
        script_config (dict): The script-specific config
        logger (logger): The logger to use for logging output

    Returns:
        bool: True if the config is valid, False otherwise
    """

    instances = script_config.get('instances', [])
    # validate instances
    list_of_instance_keys = [sub_key for key in config.instances_config.keys() for sub_key in config.instances_config[key].keys()]
    for instance in instances:
        if instance not in list_of_instance_keys:
            logger.error(f"Instance '{instance}' not found in config.yml.")
            return False
    else:
        return True

def get_current_git_branch():
    """
    Get the current git branch

    Returns:
        str: The current git branch
    """
    if os.environ.get('DOCKER_ENV'):
        branch = os.getenv('BRANCH', "master")
        return branch
    else:
        try:
            root_dir = Path(__file__).parents[1]
            # Run the git rev-parse command to get the current branch
            result = subprocess.run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'],
                                cwd=root_dir,
                                stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE,
                                check=True,
                                text=True)
            # Capture the output and return the current branch
            return result.stdout.strip()
        except (FileNotFoundError, subprocess.CalledProcessError) as e:
            # Handle any errors if the command fails
            print(f"Error: {e}")
            return None

def create_bar(middle_text):
    """
    Creates a separation bar with provided text in the center

    Args:
        middle_text (str): The text to place in the center of the separation bar

    Returns:
        str: The formatted separation bar
    """
    total_length = 80
    if len(middle_text) == 1:
        remaining_length = total_length - len(middle_text) - 2
        left_side_length = 0
        right_side_length = remaining_length
        return f"\n{middle_text * left_side_length}{middle_text}{middle_text * right_side_length}\n"
    else:
        remaining_length = total_length - len(middle_text) - 4
        left_side_length = math.floor(remaining_length / 2)
        right_side_length = remaining_length - left_side_length
        return f"\n{'*' * left_side_length} {middle_text} {'*' * right_side_length}\n"

def redact_sensitive_info(text):
    """
    Redact sensitive information from the provided text

    Args:
        text (str): The text to redact sensitive information from

    Returns:
        str: The text with sensitive information redacted
    """
    # Redact Discord webhook URLs
    text = re.sub(r'https://discord\.com/api/webhooks/[^/]+/\S+', r'https://discord.com/api/webhooks/[redacted]', text)

    # Redact Google OAuth client IDs
    text = re.sub(r'\b(\w{24})-[a-zA-Z0-9_-]{24}\.apps\.googleusercontent\.com\b', r'[redacted].apps.googleusercontent.com', text)

    # Redact Google OAuth refresh tokens
    text = re.sub(r'(?<=refresh_token": ")([^"]+)(?=")', r'[redacted]', text)

    # Redact Google Drive file IDs
    text = re.sub(r'(\b[A-Za-z0-9_-]{33}\b)', r'[redacted]', text)

    # Redact Discord access tokens
    text = re.sub(r'(?<=access_token": ")([^"]+)(?=")', r'[redacted]', text)

    # redact GOCSPX-8765434567654 to GOCSPX-[redacted]
    text = re.sub(r'GOCSPX-\S+', r'GOCSPX-[redacted]', text)

    pattern = r'(-i).*?(\.apps\.googleusercontent\.com)'
    text = re.sub(pattern, r'\1 [redacted]\2', text, flags=re.DOTALL | re.IGNORECASE)

    pattern = r'(-f)\s\S+'
    text = re.sub(pattern, r'\1 [redacted]', text, flags=re.DOTALL | re.IGNORECASE)

    return text

