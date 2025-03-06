import re
import os
import json
from pathlib import Path
import subprocess
import math
import pathlib
import datetime

try:
    import html
    from unidecode import unidecode
    from tqdm import tqdm
    from plexapi.exceptions import NotFound
except ImportError as e:
    print(f"ImportError: {e}")
    print("Please install the required modules with 'pip install -r requirements.txt'")
    exit(1)

# Regex to remove illegal characters from file names
illegal_chars_regex = re.compile(r'[<>:"/\\|?*\x00-\x1f]+')
# Regex to extract the year from parentheses in the title
year_regex = re.compile(r"\s?\((\d{4})\)(?!.*Collection).*")
# Regex to extract the year from parentheses in the folder name
folder_year_regex = re.compile(r"(.*)\s\((\d{4})\)")
# Regex to remove special characters from the title
remove_special_chars = re.compile(r'[^a-zA-Z0-9\s]+')
# Season number regex
season_number_regex = re.compile(r'[-_]\s*Season\s*(\d+)')

# List of season name info to match against
season_name_info = [
    "_Season",
    " - Season ",
    " - Specials"
]

# List of words to remove from titles
words_to_remove = [
    "(US)",
    "(UK)",
    "(AU)",
    "(CA)",
    "(NZ)",
    "(FR)",
]

# List of prefixes and suffixes to remove from titles for comparison
prefixes = [
    "The",
    "A",
    "An"
]

# List of prefixes and suffixes to remove from titles for comparison
suffixes = [
    "Collection",
]

# dict per asset type to map asset prefixes to the assets, themselves.
prefix_index = {
    'movies': {},
    'series': {},
    'collections': {}
}

# length to use as a prefix.  anything shorter than this will be used as-is
prefix_length = 3

asset_list_file = "asset_list.json"

def preprocess_name(name: str) -> str:
    """
    Preprocess a name for consistent matching:
    - Convert to lowercase
    - Remove special characters
    - Remove common words
    """
    # Convert to lowercase and remove special characters
    name = re.sub(r'[^a-zA-Z0-9\s]', '', name.lower())
    # Remove extra whitespace
    name = ' '.join(name.split())

    # Optionally remove common words
    common_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to'}
    return ' '.join(word for word in name.split() if word not in common_words)

def save_cached_structs_to_disk(assets_list, path, logger):
    """
    Persist asset list to disk to avoid future runs having to re-process all of the posters
    """
    asset_list_path = os.path.join(path, asset_list_file)
    with open(asset_list_path, 'w') as file:
        json.dump(assets_list, file)


def load_cached_structs(path, refresh_after_n_hours, logger):
    """
    load the asset list from disk
    """

    assets_list = None
    # config_dir_path
    # join
    asset_list_path = os.path.join(path, asset_list_file)
    if os.path.isfile(asset_list_path):
        created_time_epoch = os.path.getctime(asset_list_path)
        created_datetime = datetime.datetime.fromtimestamp(created_time_epoch)
        if refresh_after_n_hours > 0:
                if (datetime.datetime.now() - created_datetime) >= datetime.timedelta(hours=refresh_after_n_hours):
                    logger.info(f"existing file was created more than {refresh_after_n_hours} ago, forcing a refresh")
                    return None
        try:
            with open(asset_list_path, 'r') as file:
                assets_list = json.load(file)
        except Exception as e:
            logger.info(f"Failure to load asset file from disk: {e}")
    return assets_list

def build_search_index(title, asset, asset_type, logger):
    """
    Build an index of preprocessed movie names for efficient lookup
    Returns both the index and preprocessed forms
    """
    asset_type_processed_forms = prefix_index[asset_type]
    processed = preprocess_name(title)
    debug = False # (processed == 'mission impossible' or processed == 'mission impossible collection')

    if debug:
        print('debug_build_search_index')
        print(processed)
        print(asset_type)
        print(asset)

    # Store word-level index for partial matches
    words = processed.split()
    if debug:
        print(words)

    # only need to do the first word here
    # also - store add to a prefix to expand possible matches
    for word in words:
    # if len(word) > 2 or len(words)==1:  # Only index words longer than 2 chars unless it's the only word
        if word not in asset_type_processed_forms:
            asset_type_processed_forms[word] = list() #maybe consider moving to dequeue?
        asset_type_processed_forms[word].append(asset)

        # also add the prefix.  if shorter than prefix_length then it was already added above.
        if len(word) > prefix_length:
            prefix = word[0:prefix_length]
            if debug:
                print(prefix)
            if prefix not in asset_type_processed_forms:
                asset_type_processed_forms[prefix] = list()
            asset_type_processed_forms[prefix].append(asset)
        break

    return

def search_matches(movie_title, asset_type, logger, debug_search=False):
    """ search for matches in the index """
    matches = list()
    
    processed_filename = preprocess_name(movie_title)
    asset_type_processed_forms = prefix_index[asset_type]

    if (debug_search):
        print('debug_search_matches')
        print(processed_filename)

    words = processed_filename.split()
    if (debug_search):
        print(words)
    # Try word-level matches
    for word in words:
        # first add any prefix matches to the beginning of the list.
        if len(word) > prefix_length:
            prefix = word[0:prefix_length]
            if (debug_search):
                print(prefix)
                print(prefix in asset_type_processed_forms)

            if prefix in asset_type_processed_forms:
                matches.extend(asset_type_processed_forms[prefix])

        # then add the full word matches as items.
        # TODO: is this even needed any more given everything would grab the prefix
        #       or maybe this is an else to the above?
        if word in asset_type_processed_forms:
            matches.extend(asset_type_processed_forms[word])
        if (debug_search):
            print(matches)
        break

    return matches

def normalize_file_names(file_name):
    """
    Normalize file names for comparison
    
    Args:
        file_name (str): The file name to normalize
        
    Returns:
        str: The normalized file name
    """

    # remove extension
    file_name, extension = os.path.splitext(file_name)

    # Remove specific words from the title
    for word in words_to_remove:
        file_name = file_name.replace(word, '')
        if file_name != file_name:
            break
    # Remove illegal characters from the file name using regex
    file_name = illegal_chars_regex.sub('', file_name)

    # Convert special characters to ASCII equivalent
    file_name = unidecode(html.unescape(file_name))

    # Remove trailing whitespaces
    file_name = file_name.rstrip()

    # Remove leading whitespaces
    file_name = file_name.lstrip()

    # Replace '&' with 'and'
    file_name = file_name.replace('&', 'and')

    # Remove special characters using regex
    file_name = re.sub(remove_special_chars, '', file_name).lower()

    # Remove spaces in the file name
    file_name = file_name.replace(' ', '')

    return file_name

def normalize_titles(title):
    """
    Normalize titles for comparison
    
    Args:
        title (str): The title to normalize
        
    Returns:
        str: The normalized title
    """
    
    # Initialize the normalized title as the original title
    normalized_title = title
    
    # Remove specific words from the title
    for word in words_to_remove:
        normalized_title = title.replace(word, '')
        if normalized_title != title:
            break
    
    # Extract the year from parentheses in the title
    normalized_title = year_regex.sub('', normalized_title)
    
    # Remove illegal characters from the title using regex
    normalized_title = illegal_chars_regex.sub('', normalized_title)
    
    # Convert special characters to ASCII equivalent
    normalized_title = unidecode(html.unescape(normalized_title))

    # Remove trailing whitespaces
    normalized_title = normalized_title.rstrip()

    # Remove leading whitespaces
    normalized_title = normalized_title.lstrip()
    
    # Replace '&' with 'and'
    normalized_title = normalized_title.replace('&', 'and')

    # Remove special characters using regex
    normalized_title = re.sub(remove_special_chars, '', normalized_title).lower()
    
    # Remove spaces in the title
    normalized_title = normalized_title.replace('  ', ' ')
    
    return normalized_title

def _is_asset_folders(folder_path):
    """
    Check if the folder contains asset folders
    
    Args:
        folder_path (str): The path to the folder to check
        
    Returns:
        bool: True if the folder contains asset folders, False otherwise
    """
    if not os.path.exists(folder_path):
        return False
    else:
        for item in os.listdir(folder_path):
            if item.startswith('.') or item.startswith('@') or item == "tmp":
                continue
            if os.path.isdir(os.path.join(folder_path, item)):
                return True
        return False

def categorize_files(folder_path, logger):
    """
    Categorize files into movies, collections, and series
    
    Args:
        folder_path (str): The path to the folder to sort
        asset_folders (bool): Whether or not to sort by folders
        
    Returns:
        list: A list of dictionaries containing the sorted files
    """

    asset_folders = _is_asset_folders(folder_path)

    assets_dict = []

    # Define asset types to categorize
    folder_path = folder_path.rstrip('/')  # Remove trailing slash from folder path
    base_name = os.path.basename(folder_path)  # Get the base folder name

    # If asset_folders is False, categorize files within the folder
    if not asset_folders:
        # Get list of files in the folder
        try:
            files = [f.name for f in os.scandir(folder_path) if f.is_file()]
        except FileNotFoundError:
            return None
        files = sorted(files, key=lambda x: x.lower())  # Sort files alphabetically
        if files:
            # Loop through each file in the folder
            progress_bar = tqdm(files, desc=f"Processing '{base_name}' folder", total=len(files), disable=None, leave=True)
            for file in progress_bar:
                if file.startswith('.') or "(N-A)" in file:
                    continue  # Skip hidden files or files with "(N-A)" in the name

                # Extract information from the file name
                base_name, extension = os.path.splitext(file)
                title = re.sub(year_regex, '', base_name)
                normalize_title = normalize_titles(base_name)

                try:
                    year = int(year_regex.search(base_name).group(1))
                except:
                    year = None

                file_path = f"{folder_path}/{file}"  # Full file path

                if not year:  # If year is not found in the file name
                    # Categorize as a collection
                    # Additional processing for collection items
                    no_prefix = [re.sub(r'\b{}\b'.format(prefix), '', title).strip() for prefix in prefixes if title.startswith(prefix) and re.sub(r'\b{}\b'.format(prefix), '', title).strip() != title]
                    no_suffix = [re.sub(r'\b{}\b'.format(suffix), '', title).strip() for suffix in suffixes if title.endswith(suffix) and re.sub(r'\b{}\b'.format(suffix), '', title).strip() != title]
                    no_prefix_normalized = [normalize_titles(re.sub(r'\b{}\b'.format(prefix), '', title).strip()) for prefix in prefixes if title.startswith(prefix) and normalize_titles(re.sub(r'\b{}\b'.format(prefix), '', title).strip()) != normalize_title]
                    no_suffix_normalized = [normalize_titles(re.sub(r'\b{}\b'.format(suffix), '', title).strip()) for suffix in suffixes if title.endswith(suffix) and normalize_titles(re.sub(r'\b{}\b'.format(suffix), '', title).strip()) != normalize_title]
                    assets_dict.append({
                        'title': title,
                        'year': year,
                        'normalized_title': normalize_title,
                        'no_prefix': no_prefix,
                        'no_suffix': no_suffix,
                        'no_prefix_normalized': no_prefix_normalized,
                        'no_suffix_normalized': no_suffix_normalized,
                        'path': None,
                        'files': [file_path],
                    })
                else:
                    # Categorize as a series
                    if any(file.startswith(base_name) and any(base_name + season_name in file for season_name in season_name_info) for file in files):
                        # Check if the series entry already exists in the assets dictionary
                        series_entry = next((d for d in assets_dict if d['normalized_title'] == normalize_title and d['year'] == year), None)
                        if series_entry is None:
                            # If not, add a new series entry
                            series_entry = {
                                'title': title,
                                'year': year,
                                'normalized_title': normalize_title,
                                'files': [file_path],
                                'season_numbers': []
                            }
                            assets_dict.append(series_entry)
                        else:
                            # Add the file path to the current series entry
                            if file_path not in series_entry['files']:
                                if normalize_file_names(file_path) not in [normalize_file_names(f) for f in series_entry['files']]:
                                    series_entry['files'].append(file_path)
                    
                    elif any(word in file for word in season_name_info):
                        # Check if the series entry already exists in the assets dictionary
                        series_entry = next((d for d in assets_dict if d['normalized_title'] == normalize_title and d['year'] == year), None)
                        if series_entry is None:
                            # If not, add a new series entry
                            series_entry = {
                                'title': title,
                                'year': year,
                                'normalized_title': normalize_title,
                                'files': [file_path],
                                'season_numbers': []
                            }
                            assets_dict.append(series_entry)
                        else:
                            # Add the file path to the current series entry
                            if file_path not in series_entry['files']:
                                if normalize_file_names(file_path) not in [normalize_file_names(f) for f in series_entry['files']]:
                                    series_entry['files'].append(file_path)

                    # Categorize as a movie
                    else:
                        assets_dict.append({
                            'title': title,
                            'year': year,
                            'normalized_title': normalize_title,
                            'path': None,
                            'files': [file_path],
                        })
            logger.info(str(progress_bar))
        else:
            return None

        # Add Season number information to the series entries
        if assets_dict:
            # Get Season numbers from each series entry
            series = [d for d in assets_dict if 'season_numbers' in d]
            if series:
                for series_entry in series:
                    for file in series_entry['files']:
                        if " - Specials" in file:
                            series_entry['season_numbers'].append(0)

                        # Check for season numbers in the file name using regex
                        elif re.search(season_number_regex, file):
                            match = re.search(season_number_regex, file)
                            if match:
                                series_entry['season_numbers'].append(int(match.group(1)))
                    # Sort the season numbers and file paths for the current series entry
                    if series_entry is not None:
                        # Remove duplicates
                        series_entry['season_numbers'] = list(set(map(int, series_entry['season_numbers'])))
                        series_entry['season_numbers'].sort()
                        # Remove duplicates
                        series_entry['files'] = list(set(series_entry['files']))
                        series_entry['files'].sort()
    else:  # If asset_folders is True, sort assets based on folders
        try:
            progress_bar = tqdm(os.scandir(folder_path), desc='Processing posters', total=len(os.listdir(folder_path)), disable=None)
            for dir_entry in progress_bar:
                if dir_entry.is_dir():
                    dir = dir_entry.path
                    files = [f.name for f in os.scandir(dir) if f.is_file()]
                    if dir == folder_path or dir.endswith("tmp"):
                        continue  # Skip root folder and temporary folders

                    base_name = os.path.basename(dir)
                    title = re.sub(year_regex, '', base_name)
                    normalize_title = normalize_titles(base_name)

                    try:
                        year = int(year_regex.search(base_name).group(1))
                    except:
                        year = None

                    if not year:  # If year is not found in the folder name
                        # Categorize as a collection
                        # Process files within the folder and add to the collection
                        files = []
                        for file in os.listdir(dir):
                            if file.startswith('.'):
                                continue
                            files.append(f"{dir}/{file}")
                        assets_dict.append({
                            'title': title,
                            'year': year,
                            'normalized_title': normalize_title,
                            'no_prefix': [title.replace(prefix, '').strip() for prefix in prefixes if title.startswith(prefix)],
                            'no_suffix': [title.replace(suffix, '').strip() for suffix in suffixes if title.endswith(suffix)],
                            'no_prefix_normalized': [normalize_titles(title.replace(prefix, '').strip()) for prefix in prefixes if title.startswith(prefix)],
                            'no_suffix_normalized': [normalize_titles(title.replace(suffix, '').strip()) for suffix in suffixes if title.endswith(suffix)],
                            'path': dir,
                            'files': files,
                        })
                    else:
                        # If year is found in the folder name
                        # Check if the folder contains series or movies based on certain criteria
                        # (presence of Season information for series, etc. - specific to the context)
                        if any("Season" in file for file in files):
                            list_of_season_numbers = []
                            list_of_files = []
                            for file in files:
                                if file.startswith('.'):
                                    continue
                                if "season" in file.lower():
                                    season_numbers = int(re.search(r'Season\s*(\d+)', file).group(1))
                                    if season_numbers not in list_of_season_numbers:
                                        list_of_season_numbers.append(season_numbers)
                                    if file not in list_of_files:
                                        list_of_files.append(f"{dir}/{file}")
                                if "poster" in file.lower():
                                    list_of_files.append(f"{dir}/{file}")
                            
                            # sort the season numbers and files
                            list_of_season_numbers.sort()
                            list_of_files.sort()
                            
                            # Add series data to the assets dictionary
                            assets_dict.append({
                                'title': title,
                                'year': year,
                                'normalized_title': normalize_title,
                                'season_numbers': list_of_season_numbers,
                                'path': dir,
                                'files': list_of_files,
                            })
                            
                        else:
                            files = []
                            for file in os.listdir(dir):
                                if file.startswith('.'):
                                    continue
                                files.append(f"{dir}/{file}")
                            assets_dict.append({
                                'title': title,
                                'year': year,
                                'normalized_title': normalize_title,
                                'path': dir,
                                'files': files,
                            })
            logger.info(str(progress_bar))
        except FileNotFoundError:
            return None

    return assets_dict

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
        for item in progress_bar:
            if item.startswith('.') or item.startswith('@'):
                continue  # Skip hidden files/folders
            
            try:
                # Extract title and year information from item name using regex
                title = str(re.sub(year_regex, '', item))
                year = int(year_regex.search(item).group(1))
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
                    'title': title,
                    'year': year,
                    'normalized_title': normalized_title,
                    'season_numbers': season_numbers,
                    'path': os.path.join(path, item),
                    'location': base_name,
                })
            else:
                # Add movie data to the media dictionary
                media_dict['movies'].append({
                    'title': title,
                    'year': year,
                    'normalized_title': normalized_title,
                    'path': os.path.join(path, item),
                    'location': base_name,
                })
        logger.info(str(progress_bar))
    
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
                year = int(re.search(r"\s?\((\d{4})\)", item['title']).group(1))
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
                'title': title,
                'year': year,
                'media_id': item['id'],
                'db_id': item['tmdbId'] if instance_type == "radarr" else item['tvdbId'],
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
        logger.info(str(progress_bar))
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
            for collection in progress_bar:
                plex_dict.append({
                    'title': collection,
                    'normalized_title': normalize_titles(collection),
                    'location': library_name,
                    'year': None,
                    'folder': collection,
                })  # Append collection information to plex_dict
            logger.info(str(progress_bar))
    else:
        # Process library item data
        for library_name, library_data in library_data.items():
            progress_bar = tqdm(library_data, desc=f"Processing {library_name} data", total=len(library_data), disable=None, leave=True)
            for item in progress_bar:
                labels = [str(label).lower() for label in item.labels]  # Get lowercase labels
                plex_dict.append({
                    'title': item.title,
                    'normalized_title': normalize_titles(item.title),
                    'year': item.year,
                    'labels': labels,
                })  # Append item information to plex_dict
            logger.info(str(progress_bar))
    return plex_dict  # Return the constructed Plex data dictionary


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
            root_dir = pathlib.Path(__file__).parents[1]
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

def sort_assets(assets_list, logger, build_index=False):
    """
    Sort assets into movies, series, and collections
    
    Args:
        assets_list (list): The assets to sort
        
    Returns:
        Dict: A dictionary containing the sorted assets
    """
    assets_dict = {
        'movies': [],
        'series': [],
        'collections': []
    }
    progress_bar = tqdm(assets_list, desc="Categorizing assets", total=len(assets_list), disable=None, leave=True)
    for item in progress_bar:
        asset_type = 'movies'
        if not item['year']:
            asset_type = 'collections'
        elif item.get('season_numbers', None):
            asset_type = 'series'
        
        assets_dict[asset_type].append(item)
        debug_sort = (False) # item['normalized_title'] == 'mission impossible' or item['normalized_title'] == 'mission impossible collection':
        if build_index:
            if debug_sort:
                print(f"adding item to index: {item}")
            build_search_index(item['title'], item, asset_type, logger)
    logger.info(str(progress_bar))
    return assets_dict

def compare_strings(string1, string2):
    """
    Compare two strings for equality

    Args:
        string1 (str): The first string to compare
        string2 (str): The second string to compare

    Returns:
        bool: True if the strings are equal, False otherwise
    """
    string1 = re.sub(r'\W+', '', string1)
    string2 = re.sub(r'\W+', '', string2)

    return string1.lower() == string2.lower()

def is_match(asset, media):
    """
    Check if the asset matches the media

    Args:
        asset (dict): The asset to check
        media (dict): The media to check

    Returns:
        bool: True if the asset matches the media, False otherwise
    """
    no_prefix = asset.get('no_prefix', [])
    no_suffix = asset.get('no_suffix', [])
    no_prefix_normalized = asset.get('no_prefix_normalized', [])
    no_suffix_normalized = asset.get('no_suffix_normalized', [])
    alternate_titles = media.get('alternate_titles', [])
    normalized_alternate_titles = media.get('normalized_alternate_titles', [])
    secondary_year = media.get('secondary_year', None)
    original_title = media.get('original_title', None)
    folder = media.get('folder', None)
    folder_title = None
    folder_year = None
    normalized_folder_title = None
    if folder:
        folder_base_name = os.path.basename(folder)
        match = re.search(folder_year_regex, folder_base_name)
        if match:
            folder_title, folder_year = match.groups()
            folder_year = int(folder_year)
            normalized_folder_title = normalize_titles(folder_title)

    # Matching criteria for media and asset
    if (
        asset['title'] == media['title'] or
        asset['normalized_title'] == media['normalized_title'] or
        asset['title'] == original_title or
        asset['title'] == folder_title or
        asset['normalized_title'] == normalized_folder_title or 
        (media['title'] in no_prefix) or
        (media['title'] in no_suffix) or
        (media['normalized_title'] in no_prefix_normalized) or
        (media['normalized_title'] in no_suffix_normalized) or
        compare_strings(asset['title'], media['title']) or
        compare_strings(asset['normalized_title'], media['normalized_title'])
    ) and (
        asset['year'] == media['year'] or
        (asset['year'] == secondary_year and secondary_year is not None) or # None = None is not confirmation of a match
        (asset['year'] == folder_year and folder_year is not None) # None = None is not confirmation of a match
    ):
        return True
    else:
        return False
    
def is_match_alternate(asset, media):
    """
    Check if the asset matches the media using alternate titles

    Args:
        asset (dict): The asset to check
        media (dict): The media to check

    Returns:
        bool: True if the asset matches the media, False otherwise
    """
    alternate_titles = media.get('alternate_titles', [])
    normalized_alternate_titles = media.get('normalized_alternate_titles', [])
    secondary_year = media.get('secondary_year', None)
    folder = media.get('folder', None)
    folder_year = None
    if folder:
        folder_base_name = os.path.basename(folder)
        match = re.search(folder_year_regex, folder_base_name)
        if match:
            folder_title, folder_year = match.groups()
            folder_year = int(folder_year)

    # Matching criteria for media and asset
    if (
        asset['title'] in alternate_titles or
        asset['normalized_title'] in normalized_alternate_titles
    ) and (
        asset['year'] == media['year'] or
        (asset['year'] == secondary_year and secondary_year is not None) or # None = None is not confirmation of a match
        (asset['year'] == folder_year and folder_year is not None) # None = None is not confirmation of a match
    ):
        return True
    else:
        return False
