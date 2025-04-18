import re
import os
import json
import subprocess
from pathlib import Path
import math
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
season_number_regex = re.compile(r'(?:[-\s_]+)?Season\s*(\d{1,2})', re.IGNORECASE)
# Regex for season patterns
season_pattern = re.compile(r"(?:\s*-\s*Season\s*\d+|_Season\d{1,2}|\s*-\s*Specials|_Specials)", re.IGNORECASE)
# List of common words to remove from titles
common_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to'}


# List of words to remove from titles
words_to_remove = [
    "(US)",
    "(UK)",
    "(AU)",
    "(CA)",
    "(NZ)",
    "(FR)",
    "(NL)",
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
    "Saga",
]

# length to use as a prefix.  anything shorter than this will be used as-is
prefix_length = 3

def create_new_empty_index():
    # dict per asset type to map asset prefixes to the assets, themselves.
    prefix_index = {
        'movies': {},
        'series': {},
        'collections': {},
    }
    return prefix_index

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

    # Convert special characters to ASCII equivalent
    name = unidecode(html.unescape(name))

    # Optionally remove common words
    return ''.join(word for word in name.split() if word not in common_words)

def build_search_index(prefix_index, title, asset, asset_type, logger, debug_items=None):
    asset_type_processed_forms = prefix_index[asset_type]
    processed = preprocess_name(title)
    debug_build_index = debug_items and len(debug_items) > 0 and processed in debug_items

    if debug_build_index:
        logger.info('debug_build_search_index')
        logger.info(processed)
        logger.info(asset_type)
        logger.info(asset)

    words = processed.split()
    if debug_build_index:
        logger.info(words)

    # Decide whether to index all words or just one
    if len(words) == 1 or len(processed) <= prefix_length:
        # Index the full title and all words if short
        for word in words:
            if word not in asset_type_processed_forms:
                asset_type_processed_forms[word] = []
            asset_type_processed_forms[word].append(asset)
    else:
        # Only index the first meaningful word and its prefix
        for word in words:
            if word not in asset_type_processed_forms:
                asset_type_processed_forms[word] = []
            asset_type_processed_forms[word].append(asset)

            if len(word) > prefix_length:
                prefix = word[:prefix_length]
                if prefix not in asset_type_processed_forms:
                    asset_type_processed_forms[prefix] = []
                asset_type_processed_forms[prefix].append(asset)
            break  # Only the first significant word

    return

def search_matches(prefix_index, title, asset_type, logger, debug_search=False):
    """Search for matches in the index."""
    matches = []

    processed_title = preprocess_name(title)
    asset_type_processed_forms = prefix_index[asset_type]
    
    if debug_search:
        logger.info('debug_search_matches')
        logger.info(processed_title)

    words = processed_title.split()
    if debug_search:
        logger.info(words)

    # Try word-level matches
    for word in words:
        # Add prefix matches for words longer than the prefix length
        if len(word) > prefix_length:
            prefix = word[:prefix_length]
            if debug_search:
                logger.info(prefix)
                logger.info(prefix in asset_type_processed_forms)

            if prefix in asset_type_processed_forms:
                matches.extend(asset_type_processed_forms[prefix])
                return matches

        # Add full word matches regardless of length
        if word in asset_type_processed_forms:
            matches.extend(asset_type_processed_forms[word])

        if debug_search:
            logger.info(matches)
        break

    return matches

def normalize_file_names(file_name: str) -> str:
    """
    Normalize file names for comparison.

    Args:
        file_name (str): The file name to normalize.

    Returns:
        str: The normalized file name.
    """

    # Remove extension
    file_name, extension = os.path.splitext(file_name)

    # Remove Year from file name
    # file_name = year_regex.sub('', file_name)

    # Remove specific words from the title
    for word in words_to_remove:
        file_name = file_name.replace(word, '')

    # Remove `{}` and `[]` blocks containing any content
    file_name = re.sub(r'\s*[\{\[][^{}\[\]]*[\}\]]', '', file_name, flags=re.IGNORECASE)

    # Remove illegal characters from the file name using regex
    file_name = illegal_chars_regex.sub('', file_name)

    # Convert special characters to ASCII equivalent
    file_name = unidecode(html.unescape(file_name))

    # Replace '&' with 'and'
    file_name = file_name.replace('&', 'and')

    # Remove special characters using regex
    file_name = re.sub(remove_special_chars, '', file_name)

    # Remove spaces in the file name
    file_name = file_name.replace(' ', '').lower()

    # Final cleanup: Remove leading/trailing spaces
    return file_name.strip()


def normalize_titles(title: str) -> str:
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
    normalized_title = normalized_title.replace(' ', '')

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

def process_files(folder_path, logger):
    """
    Categorize files into movies, collections, and series.
    """
    asset_folders = _is_asset_folders(folder_path)
    start_time = datetime.datetime.now()

    if not asset_folders:
        assets_dict = scan_files_in_flat_folder(folder_path, logger)
    else:
        assets_dict = scan_files_in_nested_folders(folder_path, logger)

    end_time = datetime.datetime.now()
    elapsed_time = (end_time - start_time).total_seconds()
    item_count = len(assets_dict) if assets_dict else 0
    items_per_second = item_count / elapsed_time if elapsed_time > 0 else 0
    logger.info(f"Processed {item_count} files in {elapsed_time:.2f} seconds ({items_per_second:.2f} items/s) in folder '{os.path.basename(folder_path.rstrip('/'))}'")

    return assets_dict

def scan_files_in_flat_folder(folder_path, logger):
    from collections import defaultdict

    files = os.listdir(folder_path)
    groups = defaultdict(list)
    normalized_map = {}
    assets_dict = []

    for file in files:
        if file.startswith('.'):
            continue
        title = file.rsplit('.', 1)[0]
        title = unidecode(html.unescape(title))
        raw_title = season_pattern.split(title)[0].strip()
        normalized_title = re.sub(r'[^a-zA-Z0-9]', '', raw_title).lower()

        if normalized_title in normalized_map:
            match_key = normalized_map[normalized_title]
            groups[match_key].append(file)
        else:
            groups[raw_title].append(file)
            normalized_map[normalized_title] = raw_title

    groups = dict(sorted(groups.items(), key=lambda x: x[0].lower()))

    with tqdm(total=len(groups), desc=f"Processing files in '{os.path.basename(folder_path)}'", leave=True) as pbar:
        for base_name, files in groups.items():
            assets_dict.append(parse_file_group(folder_path, base_name, files))
            pbar.update(1)

    return assets_dict

def scan_files_in_nested_folders(folder_path, logger):
    assets_dict = []
    try:
        entries = list(os.scandir(folder_path))
        progress_bar = tqdm(entries, desc='Processing posters', total=len(entries), disable=None)

        for dir_entry in progress_bar:
            if not dir_entry.is_dir() or dir_entry.name.startswith('.') or dir_entry.name == "tmp":
                continue
            base_name = os.path.basename(dir_entry.path)
            files = [f.name for f in os.scandir(dir_entry.path) if f.is_file()]
            assets_dict.append(parse_folder_group(dir_entry.path, base_name, files))
    except FileNotFoundError:
        logger.warning(f"Folder not found: {folder_path}")
        return []

    return assets_dict

def parse_folder_group(folder_path, base_name, files):
    title = re.sub(year_regex, '', base_name)
    year = extract_year(base_name)
    tmdb_id, tvdb_id, imdb_id = extract_ids(base_name)
    normalize_title = normalize_titles(base_name)
    full_paths = sorted([os.path.join(folder_path, file) for file in files if not file.startswith('.')])

    is_series = any(season_pattern.search(file) for file in files)
    is_collection = not year

    if is_collection:
        return create_collection(title, normalize_title, full_paths)
    elif is_series:
        return create_series(title, year, tvdb_id, imdb_id, normalize_title, full_paths)
    else:
        return create_movie(title, year, tmdb_id, imdb_id, normalize_title, full_paths)

def parse_file_group(folder_path, base_name, files):
    # Shared title/year/ID extraction
    title = re.sub(year_regex, '', base_name)
    year = extract_year(base_name)
    tmdb_id, tvdb_id, imdb_id = extract_ids(base_name)
    normalize_title = normalize_titles(base_name)
    files = sorted([os.path.join(folder_path, file) for file in files if not file.startswith('.')])

    is_series = any(season_pattern.search(file) for file in files)
    is_collection = not year

    if is_collection:
        return create_collection(title, normalize_title, files)
    elif is_series:
        return create_series(title, year, tvdb_id, imdb_id, normalize_title, files)
    else:
        return create_movie(title, year, tmdb_id, imdb_id, normalize_title, files)
    
def extract_year(text: str) -> int | None:
    try:
        return int(year_regex.search(text).group(1))
    except:
        return None

def extract_ids(text: str) -> tuple[int | None, int | None, str | None]:
    tmdb = next((int(m.group(1)) for m in [re.search(r'tmdb[-_\s](\d+)', text)] if m), None)
    tvdb = next((int(m.group(1)) for m in [re.search(r'tvdb[-_\s](\d+)', text)] if m), None)
    imdb = next((m.group(1) for m in [re.search(r'imdb[-_\s](tt\d+)', text)] if m), None)
    return tmdb, tvdb, imdb

def generate_title_variants(title: str) -> dict[str, str]:
    stripped_prefix = next((title[len(p):].strip() for p in prefixes if title.startswith(p + " ")), title)
    stripped_suffix = next((title[:-len(s)].strip() for s in suffixes if title.endswith(" " + s)), title)

    return {
        'no_prefix': stripped_prefix,
        'no_suffix': stripped_suffix,
        'no_prefix_normalized': normalize_titles(stripped_prefix),
        'no_suffix_normalized': normalize_titles(stripped_suffix)
    }

def create_collection(title: str, normalized_title: str, files: list[str]) -> dict:
    variants = generate_title_variants(title)
    return {
        'type': 'collections',
        'title': title,
        'normalized_title': normalized_title,
        'files': files,
        'no_prefix': [variants['no_prefix']],
        'no_suffix': [variants['no_suffix']],
        'no_prefix_normalized': [variants['no_prefix_normalized']],
        'no_suffix_normalized': [variants['no_suffix_normalized']],
    }

def create_series(title: str, year: int | None, tvdb_id: int | None, imdb_id: str | None, normalized_title: str, files: list[str]) -> dict:

    return {
        'type': 'series',
        'title': title,
        'year': year,
        'tvdb_id': tvdb_id,
        'imdb_id': imdb_id,
        'normalized_title': normalized_title,
        'files': files,
        'season_numbers': [],
    }

def create_movie(title: str, year: int | None, tmdb_id: int | None, imdb_id: str | None, normalized_title: str, files: list[str]) -> dict:
    return {
        'type': 'movies',
        'title': title,
        'year': year,
        'tmdb_id': tmdb_id,
        'imdb_id': imdb_id,
        'normalized_title': normalized_title,
        'files': files,
    }

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
            for collection in progress_bar:
                collection = unidecode(html.unescape(collection))
                title = normalize_titles(collection)
                alternate_titles = []
                if title.endswith(" Collection"):
                    alternate_titles.append(title.removesuffix(" Collection"))
                else:
                    alternate_titles.append(normalize_titles(title + " Collection"))
                plex_dict.append({
                    'title': collection,
                    'normalized_title': title,
                    'location': library_name,
                    'year': None,
                    'folder': collection,
                    'alternate_titles': alternate_titles,
                    'normalized_alternate_titles': alternate_titles
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

def get_assets_files(source_dirs, logger):
    """
    Get assets files from source directories.

    Args:
        source_dirs (list): List of paths to source directories.
        logger (logger): Logger for output.

    Returns:
        tuple: (assets_dict, prefix_index)
    """
    source_dirs = [source_dirs] if isinstance(source_dirs, str) else source_dirs
    final_assets = []
    prefix_index = create_new_empty_index()
    start_time = datetime.datetime.now()

    for source_dir in source_dirs:
        new_assets = process_files(source_dir, logger)
        if new_assets:
            merge_assets(new_assets, final_assets, prefix_index, logger)
        else:
            logger.warning(f"No files found in the folder: {os.path.basename(source_dir)}")

    assets_dict = categorize_assets(final_assets)

    if all(not v for v in assets_dict.values()):
        logger.warning(f"No files were found in any of the source directories: {source_dirs}")
        return None, None

    end_time = datetime.datetime.now()
    elapsed_time = (end_time - start_time).total_seconds()
    items_per_second = len(source_dirs) / elapsed_time if elapsed_time > 0 else 0
    logger.debug(f"Processed {len(source_dirs)} source directories in {elapsed_time:.2f} seconds ({items_per_second:.2f} items/s)")

    return assets_dict, prefix_index

def merge_assets(new_assets, final_assets, prefix_index, logger):
    """Merge and deduplicate new assets into the final asset list."""
    with tqdm(total=len(new_assets), desc="Processing assets", leave=False) as progress_bar:
        for new in new_assets:
            search_matched_assets = search_matches(prefix_index, new['title'], new['type'], logger)
            for final in search_matched_assets:
                if is_match(final, new, logger, log=True) and final['type'] == new['type']:
                    for new_file in new['files']:
                        normalized_new_file = normalize_file_names(os.path.basename(new_file))
                        for final_file in final['files']:
                            normalized_final_file = normalize_file_names(os.path.basename(final_file))
                            if normalized_final_file == normalized_new_file:
                                final['files'].remove(final_file)
                                final['files'].append(new_file)
                                break
                        else:
                            final['files'].append(new_file)

                    new_season_numbers = new.get('season_numbers', None)
                    if new_season_numbers:
                        final_season_numbers = final.get('season_numbers', None)
                        if final_season_numbers:
                            final['season_numbers'] = list(set(final_season_numbers + new_season_numbers))
                        else:
                            final['season_numbers'] = new_season_numbers
                    final['files'].sort()
                    break
            else:
                new['files'].sort()
                final_assets.append(new)
                build_search_index(prefix_index, new['title'], new, new['type'], logger)
            progress_bar.update(1)

def categorize_assets(final_assets):
    """Organize final assets into categorized dictionary."""
    assets_dict = {'movies': [], 'series': [], 'collections': []}
    for item in final_assets:
        item['files'].sort(key=lambda x: os.path.basename(x).lower())
        if item['type'] in assets_dict:
            assets_dict[item['type']].append(item)
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

def is_match(asset, media, logger, log=True):
    """
    Check if the asset matches the media

    Args:
        asset (dict): The asset to check
        media (dict): The media to check

    Returns:
        bool: True if the asset matches the media, False otherwise
    """
    if media.get('folder'):
        folder_base_name = os.path.basename(media['folder'])
        match = re.search(folder_year_regex, folder_base_name)
        if match:
            media['folder_title'], media['folder_year'] = match.groups()
            media['folder_year'] = int(media['folder_year']) if media['folder_year'] else None
            media['normalized_folder_title'] = normalize_titles(media['folder_title'])

    def year_matches():
        asset_year = asset.get('year')
        media_years = [media.get(year_key) for year_key in ['year', 'secondary_year', 'folder_year']]

        if asset_year is None and all(year is None for year in media_years):
            return True

        return any(asset_year == year for year in media_years if year is not None)

    # Check if both have any ID (TVDB, TMDB, or IMDB)

    has_asset_ids = any(asset.get(k) for k in ['tvdb_id', 'tmdb_id', 'imdb_id'])
    has_media_ids = any(media.get(k) for k in ['tvdb_id', 'tmdb_id', 'imdb_id'])
    
    if has_asset_ids and has_media_ids:
        id_match_criteria = [
            (media.get('tvdb_id') is not None and asset.get('tvdb_id') is not None and media['tvdb_id'] == asset['tvdb_id'], 
             f"Media ID {media.get('tvdb_id')} matches asset TVDB ID {asset.get('tvdb_id')}"),

            (media.get('tmdb_id') is not None and asset.get('tmdb_id') is not None and media['tmdb_id'] == asset['tmdb_id'], 
             f"Media ID {media.get('tmdb_id')} matches asset TMDB ID {asset.get('tmdb_id')}"),

            (media.get('imdb_id') is not None and asset.get('imdb_id') is not None and media['imdb_id'] == asset['imdb_id'], 
             f"Media ID {media.get('imdb_id')} matches asset IMDB ID {asset.get('imdb_id')}")
        ]

        for condition, message in id_match_criteria:
            if condition:
                if log:
                    logger.debug(f"Match found: {message} -> Asset: {asset.get('title', '')} ({asset.get('year', '')}), Media: {media.get('title', '')} ({media.get('year', '')})")
                return True

        # If both had IDs but none matched, skip further matching
        return False
    else:
        # Fallback to metadata-based matching
        match_criteria = [
            # Title Matching
            (asset.get('title') == media.get('title'), "Title match"),
            (asset.get('title') in media.get('alternate_titles', []), "Title in alternate titles"),
            (asset.get('title') == media.get('folder_title'), "Folder title match"),
            (asset.get('title') == media.get('original_title'), "Original title match"),
            (asset.get('normalized_title') == media.get('normalized_title'), "Normalized title match"),
            (asset.get('normalized_title') == media.get('normalized_folder_title'), "Normalized folder title match"),
            (asset.get('normalized_title') in media.get('normalized_alternate_titles', []), "Normalized title in alternate titles"),

            # Collection Matching
            (media.get('title') in asset.get('no_prefix', []), "Title in asset no_prefix"),
            (media.get('title') in asset.get('no_suffix', []), "Title in asset no_suffix"),
            (media.get('normalized_title') in asset.get('no_prefix_normalized', []), "Normalized title in asset no_prefix_normalized"),
            (media.get('normalized_title') in asset.get('no_suffix_normalized', []), "Normalized title in asset no_suffix_normalized"),

            # String comparison
            (compare_strings(media.get('title', ''), asset.get('title', '')), "String comparison match"),
            (compare_strings(media.get('normalized_title', ''), asset.get('normalized_title', '')), "Normalized string comparison match"),
        ]

        for condition, message in match_criteria:
            if condition and year_matches():
                if log:
                    logger.debug(f"Match found: {message} -> Asset: {asset.get('title', '')} ({asset.get('year', '')}), Media: {media.get('title', '')} ({media.get('year', '')})")
                return True

        return False

