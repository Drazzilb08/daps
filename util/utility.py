from types import SimpleNamespace
from typing import Any, Dict, List, Optional, Union
import re
import os
import json
from pathlib import Path
import math
import datetime
import copy
import yaml

try:
    import html
    from unidecode import unidecode
    from tqdm import tqdm
    from plexapi.exceptions import NotFound
except ImportError as e:
    print(f"ImportError: {e}")
    print("Please install the required modules with 'pip install -r requirements.txt'")
    exit(1)

from util.normalization import normalize_titles
from util.construct import generate_title_variants
from util.constants import illegal_chars_regex


def print_json(data: Any, logger: Any, module_name: str, type_: str) -> None:
    """Write data as JSON to a debug file and log the action.

    Args:
        data (Any): Data to write as JSON.
        logger (Any): Logger instance.
        module_name (str): Module name for directory path.
        type_ (str): Type used for filename.
    """
    log_base = os.getenv("LOG_DIR")
    if log_base:
        debug_dir = Path(log_base) / module_name / "debug"
    else:
        debug_dir = Path(__file__).resolve().parents[1] / "logs" / module_name / "debug"

    debug_dir.mkdir(parents=True, exist_ok=True)

    assets_file = debug_dir / f"{type_}.json"
    with open(assets_file, "w") as f:
        json.dump(data, f, indent=2)
    logger.debug(f"Wrote {type_} to {assets_file}")


def print_settings(logger: Any, module_config: SimpleNamespace) -> None:
    """Print sanitized settings from module_config in YAML format.

    Args:
        logger (Any): Logger instance.
        module_config (SimpleNamespace): Configuration object.
    """
    logger.debug(create_table([["Script Settings"]]))

    def ns_to_dict(obj: Any) -> Any:
        if isinstance(obj, SimpleNamespace):
            return {k: ns_to_dict(v) for k, v in vars(obj).items()}
        if isinstance(obj, dict):
            return {k: ns_to_dict(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [ns_to_dict(i) for i in obj]
        return obj

    raw = {
        k: v
        for k, v in vars(module_config).items()
        if k not in ("module_name", "instances_config")
    }
    sanitized = copy.deepcopy(ns_to_dict(raw))

    def _redact(obj: Any) -> None:
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
            for item in obj:
                if isinstance(item, (dict, list)):
                    _redact(item)

    _redact(sanitized)

    try:
        yaml_output = yaml.dump(
            {getattr(module_config, "module_name", "settings"): sanitized},
            sort_keys=False,
            allow_unicode=True,
            default_flow_style=False,
        )
        logger.debug("\n" + yaml_output)
    except Exception:
        logger.warning(
            "Failed to render config as YAML; falling back to key:value lines."
        )
        for key, value in sanitized.items():
            display = value if isinstance(value, str) else str(value)
            logger.debug(f"{key}: {display}")

    logger.debug(create_bar("-"))


def create_table(data: List[List[Any]]) -> str:
    """Create a formatted table string from 2D data list.

    Args:
        data (List[List[Any]]): Data to create the table from.

    Returns:
        str: Formatted table string.
    """
    if not data:
        return "No data provided."

    num_rows = len(data)
    num_cols = len(data[0])

    col_widths = [
        max(len(str(data[row][col])) for row in range(num_rows))
        for col in range(num_cols)
    ]
    col_widths = [max(width + 2, 5) for width in col_widths]

    total_width = sum(col_widths) + num_cols - 1
    min_width = 76

    if total_width < min_width:
        additional_width = min_width - total_width
        extra_width_per_col = additional_width // num_cols
        remainder = additional_width % num_cols
        for i in range(num_cols):
            col_widths[i] += extra_width_per_col
            if remainder > 0:
                col_widths[i] += 1
                remainder -= 1

    total_width = sum(col_widths) + num_cols - 1

    table = "\n"
    table += "_" * (total_width + 2) + "\n"

    for row in range(num_rows):
        table += "|"
        for col in range(num_cols):
            cell_content = str(data[row][col])
            padding = col_widths[col] - len(cell_content)
            left_padding = padding // 2
            right_padding = padding - left_padding
            separator = "|" if col < num_cols - 1 else "|"
            table += (
                f"{' ' * left_padding}{cell_content}{' ' * right_padding}{separator}"
            )
        table += "\n"
        if row < num_rows - 1:
            table += "|" + "-" * total_width + "|\n"

    table += "‾" * (total_width + 2)
    return table


def get_plex_data(
    plex: Any,
    library_names: List[str],
    logger: Any,
    include_smart: bool,
    collections_only: bool,
) -> List[Dict[str, Any]]:
    """Retrieve data from Plex libraries or collections.

    Args:
        plex (Any): Plex instance.
        library_names (List[str]): Names of libraries to get data from.
        logger (Any): Logger instance.
        include_smart (bool): Whether to include smart collections.
        collections_only (bool): If True, only retrieve collection data.

    Returns:
        List[Dict[str, Any]]: List of dictionaries containing Plex data.
    """
    plex_list: List[Dict[str, Any]] = []
    collection_names: Dict[str, List[str]] = {}
    library_data: Dict[str, Any] = {}

    for library_name in library_names:
        try:
            library = plex.library.section(library_name)
        except NotFound:
            logger.error(
                f"Error: Library '{library_name}' not found, check your settings and try again."
            )
            continue

        if collections_only:
            if include_smart:
                collection_names[library_name] = [
                    c.title for c in library.search(libtype="collection")
                ]
            else:
                collection_names[library_name] = [
                    c.title for c in library.search(libtype="collection") if not c.smart
                ]
        else:
            library_data[library_name] = library.all()

    if collections_only:
        libraries = list(collection_names.items())
        with progress(
            libraries,
            desc="Libraries",
            total=len(libraries),
            unit="library",
            logger=logger,
        ) as outer:
            for library_name, titles in outer:
                start_time = datetime.datetime.now()
                with progress(
                    titles,
                    desc=f"Processing Plex collections in '{library_name}'",
                    total=len(titles),
                    unit="collection",
                    logger=logger,
                    leave=False,
                ) as inner:
                    for title in inner:
                        title_unescaped = unidecode(html.unescape(title))
                        normalized_title = normalize_titles(title_unescaped)
                        alternate_titles = generate_title_variants(title_unescaped)
                        folder = illegal_chars_regex.sub("", title_unescaped)
                        plex_list.append(
                            {
                                "title": title_unescaped,
                                "normalized_title": normalized_title,
                                "location": library_name,
                                "year": None,
                                "folder": folder,
                                "alternate_titles": alternate_titles[
                                    "alternate_titles"
                                ],
                                "normalized_alternate_titles": alternate_titles[
                                    "normalized_alternate_titles"
                                ],
                            }
                        )
                end_time = datetime.datetime.now()
                elapsed = (end_time - start_time).total_seconds()
                rate = len(titles) / elapsed if elapsed > 0 else 0
                logger.debug(
                    f"Processed {len(titles)} collections in '{library_name}' in {elapsed:.2f}s ({rate:.2f} items/s)"
                )

    return plex_list


def create_bar(middle_text: str) -> str:
    """Create a separation bar with text centered.

    Args:
        middle_text (str): Text to place in center of bar.

    Returns:
        str: Formatted separation bar.
    """
    total_length = 80
    if len(middle_text) == 1:
        remaining_length = total_length - len(middle_text) - 2
        left_side_length = 0
        right_side_length = remaining_length
        return f"\n{middle_text * left_side_length}{middle_text}{middle_text * right_side_length}\n"
    remaining_length = total_length - len(middle_text) - 4
    left_side_length = math.floor(remaining_length / 2)
    right_side_length = remaining_length - left_side_length
    return f"\n{'*' * left_side_length} {middle_text} {'*' * right_side_length}\n"


def redact_sensitive_info(text: str, password: bool = False) -> str:
    """Redact sensitive info from text.

    Args:
        text (str): Text to redact.
        password (bool): If True, redact entire text.

    Returns:
        str: Redacted text.
    """
    if password:
        return "[redacted]"

    text = re.sub(
        r"https://discord\.com/api/webhooks/[^/]+/\S+",
        r"https://discord.com/api/webhooks/[redacted]",
        text,
    )
    text = re.sub(
        r"\b(\w{24})-[a-zA-Z0-9_-]{24}\.apps\.googleusercontent\.com\b",
        r"[redacted].apps.googleusercontent.com",
        text,
    )
    text = re.sub(r'(?<=refresh_token": ")([^"]+)(?=")', r"[redacted]", text)
    text = re.sub(r"(\b[A-Za-z0-9_-]{33}\b)", r"[redacted]", text)
    text = re.sub(r'(?<=access_token": ")([^"]+)(?=")', r"[redacted]", text)
    text = re.sub(r"GOCSPX-\S+", r"GOCSPX-[redacted]", text)
    pattern_client_id = r"(-i).*?(\.apps\.googleusercontent\.com)"
    text = re.sub(
        pattern_client_id, r"\1 [redacted]\2", text, flags=re.DOTALL | re.IGNORECASE
    )
    pattern_file_arg = r"(-f)\s\S+"
    text = re.sub(
        pattern_file_arg, r"\1 [redacted]", text, flags=re.DOTALL | re.IGNORECASE
    )

    return text


def progress(
    iterable: Any,
    desc: Optional[str] = None,
    total: Optional[int] = None,
    unit: Optional[str] = None,
    logger: Optional[Any] = None,
    leave: bool = True,
    **kwargs: Any,
) -> Any:
    """Wrap tqdm to toggle progress bars based on LOG_TO_CONSOLE env var.

    Args:
        iterable (Any): Iterable to wrap.
        desc (Optional[str]): Description for progress bar.
        total (Optional[int]): Total iterations.
        unit (Optional[str]): Unit of progress.
        logger (Optional[Any]): Logger instance.
        leave (bool): Keep progress bar after completion.
        **kwargs: Additional tqdm args.

    Returns:
        tqdm or DummyProgress: Progress bar or dummy context manager.
    """
    log_console = os.environ.get("LOG_TO_CONSOLE", "").lower() in ("1", "true", "yes")

    class DummyProgress:
        def __init__(self, iterable: Any) -> None:
            self.iterable = iterable

        def __enter__(self) -> "DummyProgress":
            return self

        def __exit__(self, exc_type, exc_val, exc_tb) -> None:
            pass

        def __iter__(self):
            return iter(self.iterable)

        def update(self, n: int = 1) -> None:
            pass

    if not log_console:
        return DummyProgress(iterable)
    return tqdm(iterable, desc=desc, total=total, unit=unit, leave=leave, **kwargs)


def redact_apis(obj: Any) -> None:
    """Recursively redact any 'api' keys in dicts or nested lists.

    Args:
        obj (Any): Object to redact API keys in-place.
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


def get_log_dir(module_name: str) -> str:
    """Return the log directory for a given module."""
    log_base = os.getenv("LOG_DIR")
    if log_base:
        log_dir = Path(log_base) / module_name
    else:
        log_dir = Path(__file__).resolve().parents[1] / "logs" / module_name
    os.makedirs(log_dir, exist_ok=True)
    return str(log_dir)
