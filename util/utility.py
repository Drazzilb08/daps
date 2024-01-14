import re
import os
import sys
import json

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
year_regex = re.compile(r"\s?\((\d{4})\).*")
# Regex to remove special characters from the title
remove_special_chars = re.compile(r'[^a-zA-Z0-9\s]+')

# List of season name info to match against
season_name_info = [
    "_Season",
    " - Season ",
    " - Specials"
]

# List of words to remove from titles
words_to_remove = [
    "(US)",
]

# List of prefixes and suffixes to remove from titlesfor comparison
prefixes = [
    "The",
    "A",
    "An"
]

# List of prefixes and suffixes to remove from titlesfor comparison
suffixes = [
    "Collection",
]

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
    
    # Extract the year from parentheses in the title
    normalized_title = year_regex.sub('', normalized_title)
    
    # Remove illegal characters from the title using regex
    normalized_title = illegal_chars_regex.sub('', normalized_title)
    
    # Convert special characters to ASCII equivalent
    normalized_title = unidecode(html.unescape(normalized_title))
    
    # Remove trailing whitespaces
    normalized_title = normalized_title.rstrip()
    
    # Replace '&' with 'and'
    normalized_title = normalized_title.replace('&', 'and')
    
    # Remove special characters using regex
    normalized_title = re.sub(remove_special_chars, '', normalized_title).lower()
    
    # Remove spaces in the title
    normalized_title = normalized_title.replace(' ', '')
    
    return normalized_title

def categorize_files(folder_path, asset_folders):
    """
    Categorize files into movies, collections, and series
    
    Args:
        folder_path (str): The path to the folder to sort
        asset_folders (bool): Whether or not to sort by folders
        
    Returns:
        dict: A dictionary containing the sorted files
    """

    # Define asset types to categorize
    asset_types = ['movies', 'collections', 'series']
    assets = {asset_type: [] for asset_type in asset_types}  # Initialize an empty dictionary to hold categorized assets
    folder_path = folder_path.rstrip('/')  # Remove trailing slash from folder path
    base_name = os.path.basename(folder_path)  # Get the base folder name

    # If asset_folders is False, categorize files within the folder
    if not asset_folders:
        # Get list of files in the folder
        files = [f.name for f in os.scandir(folder_path) if f.is_file()]
        files = sorted(files, key=lambda x: x.lower())  # Sort files alphabetically

        # Loop through each file in the folder
        for file in tqdm(files, desc=f"Sorting '{base_name}' folder", total=len(files), disable=None, leave=False):
            if file.startswith('.'):
                continue  # Skip hidden files

            # Extract information from the file name
            base_name, extension = os.path.splitext(file)
            title = re.sub(year_regex, '', base_name)
            normalize_title = normalize_titles(base_name)

            try:
                year = int(year_regex.search(base_name).group(1))
            except:
                year = None

            # Create a dictionary for the asset
            asset_dict = {
                'title': title,
                'year': year,
                'normalized_title': normalize_title,
                'path': None,
                'files': [],
            }

            file_path = f"{folder_path}/{file}"  # Full file path

            if not year:  # If year is not found in the file name
                # Categorize as a collection
                assets['collections'].append(asset_dict)
                # Additional processing for collection items
                no_prefix = [re.sub(r'\b{}\b'.format(prefix), '', title).strip() for prefix in prefixes if title.startswith(prefix) and re.sub(r'\b{}\b'.format(prefix), '', title).strip() != title]
                no_suffix = [re.sub(r'\b{}\b'.format(suffix), '', title).strip() for suffix in suffixes if title.endswith(suffix) and re.sub(r'\b{}\b'.format(suffix), '', title).strip() != title]
                no_prefix_normalized = [normalize_titles(re.sub(r'\b{}\b'.format(prefix), '', title).strip()) for prefix in prefixes if title.startswith(prefix) and normalize_titles(re.sub(r'\b{}\b'.format(prefix), '', title).strip()) != normalize_title]
                no_suffix_normalized = [normalize_titles(re.sub(r'\b{}\b'.format(suffix), '', title).strip()) for suffix in suffixes if title.endswith(suffix) and normalize_titles(re.sub(r'\b{}\b'.format(suffix), '', title).strip()) != normalize_title]
                assets['collections'][-1]['no_prefix'] = no_prefix if no_prefix else None
                assets['collections'][-1]['no_suffix'] = no_suffix if no_suffix else None
                assets['collections'][-1]['no_prefix_normalized'] = no_prefix_normalized if no_prefix_normalized else None
                assets['collections'][-1]['no_suffix_normalized'] = no_suffix_normalized if no_suffix_normalized else None
                assets['collections'][-1]['files'].append(file_path)
            else:  # If year is found in the file name
                # Categorize as either a series or a movie based on certain criteria
                if any(file.startswith(base_name) and any(base_name + season_name in file for season_name in season_name_info) for file in files):
                    if not any(d['normalized_title'] == normalize_title and d['year'] == year for d in assets['series']):
                        assets['series'].append(asset_dict)
                    assets['series'][-1]['files'].append(file_path)
                elif any(word in file for word in season_name_info):
                    if not any(d['normalized_title'] == normalize_title and d['year'] == year for d in assets['series']):
                        assets['series'].append(asset_dict)
                    assets['series'][-1]['files'].append(file_path)
                    if not assets['series'][-1].get('season_numbers'):
                        assets['series'][-1]['season_numbers'] = []
                    if " - Specials" in file:
                        assets['series'][-1]['season_numbers'].append('00')
                    elif re.search(r'[-_]\s*Season\s*(\d+)', file):
                        match = re.search(r'[-_]\s*Season\s*(\d+)', file)
                        if match:
                            assets['series'][-1]['season_numbers'].append(f"{int(match.group(1)):02}")
                    assets['series'][-1]['season_numbers'].sort()
                    assets['series'][-1]['files'].sort()
                else:
                    assets['movies'].append(asset_dict)
                    assets['movies'][-1]['files'].append(file_path)
    else:  # If asset_folders is True, sort assets based on folders
        total_folders = len(os.listdir(folder_path))
        for dir, _, files in tqdm(os.walk(folder_path), desc='Sorting posters', total=total_folders, disable=None, leave=False):
            if dir == folder_path or dir.endswith("tmp"):
                continue  # Skip root folder and temporary folders

            base_name = os.path.basename(dir)
            title = re.sub(year_regex, '', base_name)
            normalize_title = normalize_titles(base_name)

            try:
                year = int(year_regex.search(base_name).group(1))
            except:
                year = None

            # Create a dictionary for the asset
            asset_dict = {
                'title': title,
                'year': year,
                'normalized_title': normalize_title,
                'no_prefix': [title.replace(prefix, '').strip() for prefix in prefixes if title.startswith(prefix)],
                'no_suffix': [title.replace(suffix, '').strip() for suffix in suffixes if title.endswith(suffix)],
                'no_prefix_normalized': [normalize_titles(title.replace(prefix, '').strip()) for prefix in prefixes if title.startswith(prefix)],
                'no_suffix_normalized': [normalize_titles(title.replace(suffix, '').strip()) for suffix in suffixes if title.endswith(suffix)],
                'path': dir,
                'files': [],
            }

            if not year:  # If year is not found in the folder name
                # Categorize as a collection
                # Process files within the folder and add to the collection
                assets['collections'].append(asset_dict)
                for file in files:
                    if file.startswith('.'):
                        continue
                    assets['collections'][-1]['files'].append(f"{dir}/{file}")
            else:
                # If year is found in the folder name
                # Check if the folder contains series or movies based on certain criteria
                # (presence of Season information for series, etc. - specific to the context)
                if any("Season" in file for file in files):
                    asset_dict['season_numbers'] = []
                    assets['series'].append(asset_dict)
                    for file in files:
                        if file.startswith('.'):
                            continue
                        if "season" in file.lower():
                            season_numbers = re.search(r'Season\s*(\d+)', file).group(1)
                            asset_dict['season_numbers'].append(f"{int(season_numbers):02}")
                            assets['series'][-1]['files'].append(f"{dir}/{file}")
                        if "poster" in file.lower():
                            assets['series'][-1]['files'].append(f"{dir}/{file}")
                    assets['series'][-1]['season_numbers'].sort()
                    assets['series'][-1]['files'].sort()
                else:
                    assets['movies'].append(asset_dict)
                    for file in files:
                        if file.startswith('.'):
                            continue
                        assets['movies'][-1]['files'].append(f"{dir}/{file}")
    return assets

def create_table(data, log_level, logger):
    """
    Create a table from the provided data
    
    Args:
        data (list): The data to create the table from
        log_level (str): The log level to use for logging output
        logger (logger): The logger to use for logging output
        
    Returns:
        None
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

    # Ensure minimum width of 40
    if total_width < 40:
        additional_width = 40 - total_width
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
    table = ""

    # Top border
    table += "*" * (total_width + 2) + "\n"

    for row in range(num_rows):
        table += "*"
        for col in range(num_cols):
            cell_content = str(data[row][col])
            padding = col_widths[col] - len(cell_content)
            left_padding = padding // 2
            right_padding = padding - left_padding

            # Determine the separator for the cell
            separator = '|' if col < num_cols - 1 else '*'

            table += f"{' ' * left_padding}{cell_content}{' ' * right_padding}{separator}"
        table += "\n"
        if row < num_rows - 1:
            table += "*" + "-" * (total_width) + "*\n"

    # Bottom border
    table += "*" * (total_width + 2) + "\n"

    log_functions = {
        "info": logger.info,
        "debug": logger.debug,
        "warning": logger.warning,
        "error": logger.error,
        "critical": logger.critical
    }
    lines = table.split('\n')
    log_function = log_functions.get(log_level)

    if log_function:
        for line in lines:
            if line.strip():
                log_function(line)

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
        for item in tqdm(os.listdir(path), desc=f"Getting media folders for '{base_name}'", disable=None):
            if item.startswith('.'):
                continue  # Skip hidden files/folders
            
            try:
                # Extract title and year information from item name using regex
                title = str(re.sub(year_regex, '', item))
                year = int(year_regex.search(item).group(1))
            except Exception as e:
                logger.error(f"Error: {e}")  # Log any exceptions that occur
                logger.error(f"Item: {item}")  # Log the problematic item
                continue  # Continue to the next item
            
            normalized_title = normalize_titles(item)  # Normalize the item's title
            
            if os.path.isdir(os.path.join(path, item)) and any(os.path.isdir(os.path.join(path, item, sub_folder)) for sub_folder in os.listdir(os.path.join(path, item))):
                # If the item is a directory and contains subfolders
                sub_folders = [sub_folder for sub_folder in os.listdir(os.path.join(path, item)) if os.path.isdir(os.path.join(path, item, sub_folder)) and not sub_folder.startswith('.')]
                sub_folders.sort()  # Sort the subfolders
                
                season_numbers = []
                for folder in sub_folders:
                    if folder == "Specials":
                        season_numbers = '00'
                        media_dict['series'].append({
                            'title': title,
                            'year': year,
                            'normalized_title': normalized_title,
                            'season_numbers': season_numbers,
                            'path': os.path.join(path, item),
                        })
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
                })
            else:
                # Add movie data to the media dictionary
                media_dict['movies'].append({
                    'title': title,
                    'year': year,
                    'normalized_title': normalized_title,
                    'path': os.path.join(path, item),
                })
    
    return media_dict

def handle_starr_data(app, instance_type):
    """
    Get data from Radarr or Sonarr
    
    Args:
        app (Radarr or Sonarr): The Radarr or Sonarr instance
        instance_type (str): The type of instance (Radarr or Sonarr)
        
    Returns:
        dict: A dictionary containing the data from Radarr or Sonarr
    """

    media_dict = []  # Initialize an empty list to hold media data
    media = app.get_media()  # Fetch media data from the Radarr or Sonarr instance
    if media:
        for item in tqdm(media, desc=f"Getting {instance_type.capitalize()} data", total=len(media), disable=None, leave=False):
            # Fetch relevant data based on the instance type (Radarr or Sonarr)
            if instance_type == "radarr":
                file_id = item.get('movieFile', {}).get('id', None)  # Fetch file ID for Radarr
            elif instance_type == "sonarr":
                season_data = item.get('seasons', [])  # Fetch season data for Sonarr
                season_dict = []  # Initialize a list to hold season data
                for season in season_data:
                    episode_data = app.get_episode_data_by_season(item['id'], season['seasonNumber'])  # Fetch episode data for each season
                    episode_dict = []  # Initialize a list to hold episode data
                    for episode in episode_data:
                        episode_dict.append({
                            'episode_number': episode['episodeNumber'],
                            'monitored': episode['monitored'],
                            'episode_file_id': episode['episodeFileId'],
                            'episode_id': episode['id'],
                            'has_file': episode['hasFile'],
                        })  # Append episode data to the episode dictionary
                    if episode_dict:
                        season_dict.append({
                            'season_number': season['seasonNumber'],
                            'monitored': season['monitored'],
                            'season_pack': season['statistics']['episodeCount'] == season['statistics']['totalEpisodeCount'],
                            'episode_data': episode_dict,
                        })  # Append season data to the season dictionary
            
            alternate_titles = []
            normalized_alternate_titles = []
            if item['alternateTitles']:
                for alternate_title in item['alternateTitles']:
                    alternate_titles.append(alternate_title['title'])  # Collect alternate titles
                    normalized_alternate_titles.append(normalize_titles(alternate_title['title']))  # Normalize alternate titles
            
            # Construct a dictionary for each item and append it to media_dict
            media_dict.append({
                'title': item['title'],
                'year': item['year'],
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
                'folder': os.path.basename(os.path.normpath(item['path'])),
                'has_file': item['hasFile'] if instance_type == "radarr" else None,
                'tags': item['tags'],
                'seasons': season_dict if instance_type == "sonarr" else None,  # Add season_dict for Sonarr items
            })  # Append the constructed dictionary to media_dict
    else:
        print(f"No {instance_type.capitalize()} data found.")
    
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
        dict: A dictionary containing the data from Plex
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
                collection_names[library_name] = [collection.title for collection in library.search(libtype="collection") if not collection.smart]
            else:
                collection_names[library_name] = [collection.title for collection in library.search(libtype="collection")]
        else:
            library_data[library_name] = library.all()  # Get all items from the library
        
    if collections_only:
        # Process collection data
        for library_name, collection_names in collection_names.items():
            for collection in tqdm(collection_names, desc=f"Getting Plex collection for '{library_name}'", total=len(collection_names), disable=None, leave=False):
                plex_dict.append({
                    'title': collection,
                    'normalized_title': normalize_titles(collection),
                    'year': None,
                    'folder': collection,
                })  # Append collection information to plex_dict
    else:
        # Process library item data
        for library_name, library_data in library_data.items():
            for item in tqdm(library_data, desc=f"Getting {library_name} data", total=len(library_data), disable=None, leave=False):
                labels = [str(label).lower() for label in item.labels]  # Get lowercase labels
                plex_dict.append({
                    'title': item.title,
                    'normalized_title': normalize_titles(item.title),
                    'year': item.year,
                    'labels': labels,
                })  # Append item information to plex_dict
    
    return plex_dict  # Return the constructed Plex data dictionary

