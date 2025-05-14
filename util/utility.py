from types import SimpleNamespace
from typing import Any, Dict, List, Optional, Union
import re
import os
import json
from pathlib import Path
import math
import datetime
from util.normalization import normalize_titles
from util.construct import generate_title_variants
import yaml
import copy

try:
    import html
    from unidecode import unidecode
    from tqdm import tqdm
    from plexapi.exceptions import NotFound
except ImportError as e:
    print(f"ImportError: {e}")
    print("Please install the required modules with 'pip install -r requirements.txt'")
    exit(1)

def print_json(data: Any, logger: Any, module_name: str, type: str) -> None:
    debug_dir = Path(__file__).parents[1] / 'logs' / module_name / 'debug'
    debug_dir.mkdir(parents=True, exist_ok=True)

    assets_file = debug_dir / f'{type}.json'
    with open(assets_file, 'w') as f:
        json.dump(data, f, indent=2)
        logger.debug(f"Wrote {type} to {assets_file}")


def print_settings(logger: Any, module_config: SimpleNamespace) -> None:
    """
    Print the settings from the provided module_config in YAML format,
    but:
      - Never mutate the real config object
      - Redact any 'password' fields entirely
      - Redact any 'webhook' fields via redact_sensitive_info
    Handles nested dict/list layouts, including notification configs.
    """
    logger.debug(create_table([["Script Settings"]]))

    # Print all attributes of module_config for debugging

    # Convert SimpleNamespace to dict recursively
    def ns_to_dict(obj):
        if isinstance(obj, SimpleNamespace):
            return {k: ns_to_dict(v) for k, v in vars(obj).items()}
        elif isinstance(obj, dict):
            return {k: ns_to_dict(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [ns_to_dict(i) for i in obj]
        else:
            return obj

    # Exclude internal attrs
    raw = {
        k: v
        for k, v in vars(module_config).items()
        if k not in ("module_name", "instances_config")
    }
    sanitized = copy.deepcopy(ns_to_dict(raw))

    # Recursively walk and redact
    def _redact(obj: Any):
        if isinstance(obj, dict):
            for key, val in obj.items():
                kl = key.lower()
                if val is None:
                    continue
                if "password" in kl:
                    obj[key] = redact_sensitive_info(str(val), password=True)
                elif "webhook" in kl:
                    obj[key] = redact_sensitive_info(str(val), password=False)
                else:
                    _redact(val)
        elif isinstance(obj, list):
            for idx, item in enumerate(obj):
                if isinstance(item, (dict, list)):
                    _redact(item)

    _redact(sanitized)

    # Dump to YAML for display
    try:
        yaml_output = yaml.dump(
            {getattr(module_config, "module_name", "settings"): sanitized},
            sort_keys=False,
            allow_unicode=True,
            default_flow_style=False
        )
        logger.debug("\n" + yaml_output)
    except Exception:
        logger.warning("Failed to render config as YAML; falling back to key:value lines.")
        for key, value in sanitized.items():
            display = value if isinstance(value, str) else str(value)
            logger.debug(f"{key}: {display}")

    logger.debug(create_bar("-"))

def create_table(data: List[List[Any]]) -> str:
    """
    Create a formatted table string from the provided 2D data list.

    Args:
        data (List[List[Any]]): The data to create the table from.

    Returns:
        str: The formatted table string.
    """

    if not data:
        return "No data provided."

    num_rows = len(data)
    num_cols = len(data[0])

    # Calculate column widths with two spaces padding per cell, min width 5
    col_widths = [max(len(str(data[row][col])) for row in range(num_rows)) for col in range(num_cols)]
    col_widths = [max(width + 2, 5) for width in col_widths]

    # Calculate total table width (sum of col_widths plus separators)
    total_width = sum(col_widths) + num_cols - 1

    width = 76  # Target minimum table width

    # If table is narrower than minimum, distribute extra width evenly
    if total_width < width:
        additional_width = width - total_width
        extra_width_per_col = additional_width // num_cols
        remainder = additional_width % num_cols
        for i in range(num_cols):
            col_widths[i] += extra_width_per_col
            if remainder > 0:
                col_widths[i] += 1
                remainder -= 1

    # Recalculate total table width after adjustments
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

def get_plex_data(
    plex: Any,
    library_names: List[str],
    logger: Any,
    include_smart: bool,
    collections_only: bool
) -> List[Dict[str, Any]]:
    """
    Retrieve data from Plex libraries or collections.

    Args:
        plex (Plex): The Plex instance.
        library_names (List[str]): The names of the libraries to get data from.
        logger (Logger): Logger to use for output.
        include_smart (bool): Whether to include smart collections.
        collections_only (bool): If True, only retrieve collection data.

    Returns:
        List[Dict[str, Any]]: A list of dictionaries containing Plex data.
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
        if collections_only:
            # Build a list of (library_name, titles) pairs
            libraries = list(collection_names.items())
            # Outer bar: one step per library
            with progress(
                libraries,
                desc="Libraries",
                total=len(libraries),
                unit="library",
                logger=logger
            ) as outer:
                for library_name, titles in outer:
                    start_time = datetime.datetime.now()

                    # Inner bar: one step per title in this library
                    with progress(
                        titles,
                        desc=f"Processing Plex collections in '{library_name}'",
                        total=len(titles),
                        unit="collection",
                        logger=logger,
                        leave=False
                    ) as inner:
                        for title in inner:
                            title = unidecode(html.unescape(title))
                            normalized_title = normalize_titles(title)
                            alternate_titles = generate_title_variants(title)
                            plex_dict.append({
                                'title': title,
                                'normalized_title': normalized_title,
                                'location': library_name,
                                'year': None,
                                'folder': title,
                                'alternate_titles': alternate_titles['alternate_titles'],
                                'normalized_alternate_titles': alternate_titles['normalized_alternate_titles'],
                            })

                    end_time = datetime.datetime.now()
                    elapsed = (end_time - start_time).total_seconds()
                    rate = len(titles) / elapsed if elapsed > 0 else 0
                    logger.debug(
                        f"Processed {len(titles)} collections in '{library_name}' "
                        f"in {elapsed:.2f}s ({rate:.2f} items/s)"
                    )

    return plex_dict

def create_bar(middle_text: str) -> str:
    """
    Create a separation bar with the provided text in the center.

    Args:
        middle_text (str): The text to place in the center of the separation bar.

    Returns:
        str: The formatted separation bar.
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

def redact_sensitive_info(text: str, password: bool = False) -> str:
    """
    Redact sensitive information from the provided text.

    If `password` is True, the entire text is replaced with '[redacted]'.
    Otherwise, the function uses regular expressions to redact specific
    patterns such as Discord webhooks, OAuth tokens, file IDs, and file paths.

    Redaction rules:
      - Discord webhook URLs are replaced with a generic '[redacted]' path.
      - Google OAuth client IDs, refresh tokens, and access tokens are redacted.
      - Google Drive file IDs (33-char base64url) are replaced.
      - GOCSPX-* tokens are masked.
      - Command-line arguments for client IDs (-i) and file paths/tokens (-f) are redacted.
    """
    if password:
        return "[redacted]"

    # Redact Discord webhook URLs
    text = re.sub(
        r'https://discord\.com/api/webhooks/[^/]+/\S+',
        r'https://discord.com/api/webhooks/[redacted]',
        text
    )

    # Redact Google OAuth client IDs
    text = re.sub(
        r'\b(\w{24})-[a-zA-Z0-9_-]{24}\.apps\.googleusercontent\.com\b',
        r'[redacted].apps.googleusercontent.com',
        text
    )

    # Redact Google OAuth refresh tokens
    text = re.sub(
        r'(?<=refresh_token": ")([^"]+)(?=")',
        r'[redacted]',
        text
    )

    # Redact Google Drive file IDs (33-char base64url)
    text = re.sub(
        r'(\b[A-Za-z0-9_-]{33}\b)',
        r'[redacted]',
        text
    )

    # Redact Discord access tokens
    text = re.sub(
        r'(?<=access_token": ")([^"]+)(?=")',
        r'[redacted]',
        text
    )

    # Redact GOCSPX-* tokens
    text = re.sub(
        r'GOCSPX-\S+',
        r'GOCSPX-[redacted]',
        text
    )

    # Redact Google client IDs passed with -i argument
    # Example: -i <client-id>.apps.googleusercontent.com
    pattern = r'(-i).*?(\.apps\.googleusercontent\.com)'
    text = re.sub(pattern, r'\1 [redacted]\2', text, flags=re.DOTALL | re.IGNORECASE)

    # Redact file paths or tokens passed with -f argument
    # Example: -f /path/to/file or -f <token>
    pattern = r'(-f)\s\S+'
    text = re.sub(pattern, r'\1 [redacted]', text, flags=re.DOTALL | re.IGNORECASE)

    return text

def progress(
    iterable: Any,
    desc: Optional[str] = None,
    total: Optional[int] = None,
    unit: Optional[str] = None,
    logger: Optional[Any] = None,
    leave: bool = True,
    **kwargs: Any
) -> Any:
    """
    Wrap tqdm to toggle progress bars based on LOG_TO_CONSOLE environment variable.
    When console logging is disabled, returns a dummy context manager.

    Args:
        iterable (Any): Iterable to wrap.
        desc (Optional[str]): Description for the progress bar.
        total (Optional[int]): Total number of iterations.
        unit (Optional[str]): Unit of progress.
        logger (Optional[Any]): Logger instance (unused).
        leave (bool): Whether to keep the progress bar after completion.
        **kwargs: Additional keyword arguments for tqdm.

    Returns:
        tqdm or DummyProgress: A progress bar or dummy context manager.
    """
    log_console = os.environ.get('LOG_TO_CONSOLE', '').lower() in ('1', 'true', 'yes')

    class DummyProgress:
        def __init__(self, iterable):
            self.iterable = iterable
        def __enter__(self):
            return self
        def __exit__(self, exc_type, exc_val, exc_tb):
            pass
        def __iter__(self):
            return iter(self.iterable)
        def update(self, n=1):
            pass

    if not log_console:
        return DummyProgress(iterable)
    else:
        return tqdm(iterable, desc=desc, total=total, unit=unit, leave=leave, **kwargs)

def redact_apis(obj: Any) -> None:
    """
    Recursively redact any 'api' keys in dictionaries or nested lists.

    Args:
        obj (Any): The object (dict or list) to redact API keys in-place.
    """
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key.lower() == "api":
                obj[key] = "REDACTED"
            else:
                redact_apis(value)
    elif isinstance(obj, list):
        for item in obj:
            redact_apis(item)
