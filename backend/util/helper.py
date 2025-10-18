# util/helper.py

import copy
import json
import math
import os
import re
from pathlib import Path
from types import SimpleNamespace
from typing import Any, Dict, Iterator, List, Optional, Tuple, Union

import yaml
from tqdm import tqdm

from backend.util.constants import (
    common_words,
    folder_year_regex,
    imdb_id_regex,
    prefixes,
    suffixes,
    tmdb_id_regex,
    tvdb_id_regex,
    year_regex,
)
from backend.util.normalization import (
    normalize_titles,
)


def print_json(data: Any, logger: Any, module_name: str, type_: str) -> None:
    """
    Write data as JSON to a debug file for troubleshooting.

    Args:
        data: The data structure to write as JSON
        logger: Logger instance for debug messages
        module_name: Name of the module (used for directory structure)
        type_: Type/name of the data being written (used for filename)
    """
    log_base = os.getenv("LOG_DIR")
    if log_base:
        debug_dir = Path(log_base) / module_name / "debug"
    else:
        debug_dir = Path(__file__).resolve().parents[2] / "logs" / module_name / "debug"

    debug_dir.mkdir(parents=True, exist_ok=True)

    assets_file = debug_dir / f"{type_}.json"
    with open(assets_file, "w") as f:
        json.dump(data, f, indent=2)
    logger.debug(f"Wrote {type_} to {assets_file}")


def print_settings(logger: Any, module_config: Any) -> None:
    """
    Print module configuration in YAML format with sensitive data redacted.

    Args:
        logger: Logger instance for output
        module_config: Module configuration object to display
    """
    logger.debug(create_table([["Script Settings"]]))

    def ns_to_dict(obj: Any) -> Any:
        """Convert namespaces and Pydantic models to dictionaries recursively."""
        if hasattr(obj, "model_dump"):
            return obj.model_dump(mode="python")
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

    def global_redact(obj: Any, parent_keys: Optional[List[str]] = None) -> Any:
        """Recursively redact sensitive information from config objects."""
        parent_keys = parent_keys or []
        if isinstance(obj, dict):
            out = {}
            for k, v in obj.items():

                if parent_keys[-1:] == ["gdrive_list"] and k == "id":
                    out[k] = v
                else:
                    out[k] = global_redact(v, parent_keys + [k])
            return out
        if isinstance(obj, list):
            return [global_redact(i, parent_keys) for i in obj]
        if isinstance(obj, str):
            if hasattr(logger, "redact_sensitive_info"):
                return logger.redact_sensitive_info(obj)
            try:
                from util.logger import Logger

                return Logger.redact_sensitive_info(obj)
            except Exception:
                return obj
        return obj

    redacted = global_redact(sanitized)

    try:
        yaml_output = yaml.dump(
            {getattr(module_config, "module_name", "settings"): redacted},
            sort_keys=False,
            allow_unicode=True,
            default_flow_style=False,
        )
        logger.debug("\n" + yaml_output)
    except Exception:
        logger.warning(
            "Failed to render config as YAML; falling back to key:value lines."
        )
        for key, value in redacted.items():
            display = value if isinstance(value, str) else str(value)
            logger.debug(f"{key}: {display}")

    logger.debug(create_bar("-"))


def dict_diff(
    old: Union[Dict[str, Any], List[Any], Any],
    new: Union[Dict[str, Any], List[Any], Any],
    path: str = "",
) -> List[Tuple[str, Any, Any]]:
    """
    Compare two data structures and return list of (path, old_value, new_value) differences.

    Args:
        old: Original data structure
        new: Updated data structure
        path: Current path in the data structure (used for recursion)

    Returns:
        List of tuples containing (path, old_value, new_value) for each difference found
    """
    diffs = []
    if isinstance(old, (list, tuple)) and isinstance(new, (list, tuple)):
        minlen = min(len(old), len(new))
        for i in range(minlen):
            diffs += dict_diff(old[i], new[i], f"{path}[{i}]")
        for i in range(minlen, len(new)):
            diffs.append((f"{path}[{i}]", None, new[i]))
        for i in range(minlen, len(old)):
            diffs.append((f"{path}[{i}]", old[i], None))
    elif isinstance(old, dict) and isinstance(new, dict):
        all_keys = set(old) | set(new)
        for k in all_keys:
            old_val = old.get(k, None)
            new_val = new.get(k, None)
            subpath = f"{path}.{k}" if path else k
            if old_val != new_val:
                if isinstance(old_val, (dict, list)) and isinstance(
                    new_val, type(old_val)
                ):
                    diffs += dict_diff(old_val, new_val, subpath)
                else:
                    diffs.append((subpath, old_val, new_val))
    else:
        if old != new:
            diffs.append((path, old, new))
    return diffs


def create_table(data: List[List[Any]]) -> str:
    """Render a simple, fixed-width ASCII table.

    The first row is treated as a header. Column widths are computed from the
    widest cell in each column, then padded by two spaces (min 5 chars/column).
    If the overall table would be narrower than 76 characters, additional width
    is distributed across columns to reach that minimum. Content is centered per
    column. Borders are drawn using `|` with an underscore top border and an
    overline `‾` bottom border.

    Args:
        data: 2D matrix (list of rows). All rows must have the same number of
            columns. The first row is the header.

    Returns:
        A formatted table string suitable for logs.

    Notes:
        * This function does not attempt to wrap long cell values.
        * Assumes a rectangular matrix; irregular rows will yield misaligned
          output.

    Example:
        >>> create_table([["Name", "Age"], ["Ada", 36], ["Linus", 54]])
        "\n__________________________________\n|   Name   |   Age   |\n|----------|---------|\n|   Ada    |    36   |\n|   Linus  |    54   |\n‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾"
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


def create_bar(middle_text: str) -> str:
    """
    Create a horizontal separator bar with centered text (80 chars total).

    Args:
        middle_text: Text to center in the bar

    Returns:
        Formatted horizontal bar string with centered text
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


def progress(
    iterable: Any,
    desc: Optional[str] = None,
    total: Optional[int] = None,
    unit: Optional[str] = None,
    logger: Optional[Any] = None,
    leave: bool = True,
    **kwargs: Any,
) -> Union[tqdm]:
    """Create progress bar that respects LOG_TO_CONSOLE environment variable.

    Returns tqdm progress bar when LOG_TO_CONSOLE is enabled, otherwise returns
    a silent DummyProgress object with the same interface.
    """
    log_console = os.environ.get("LOG_TO_CONSOLE", "").lower() in ("1", "true", "yes")

    class DummyProgress:
        """Silent progress tracker with tqdm-compatible interface."""

        def __init__(self, iterable: Any) -> None:
            self.iterable = iterable

        def __enter__(self) -> "DummyProgress":
            return self

        def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
            pass

        def __iter__(self) -> Iterator[Any]:
            return iter(self.iterable)

        def update(self, n: int = 1) -> None:
            pass

    if not log_console:
        return DummyProgress(iterable)
    return tqdm(iterable, desc=desc, total=total, unit=unit, leave=leave, **kwargs)


def get_log_dir(module_name: str) -> str:
    """
    Get log directory path for module, creating if needed.

    Args:
        module_name: Name of the module

    Returns:
        Absolute path to the module's log directory
    """
    log_base = os.getenv("LOG_DIR")
    if log_base:
        log_dir = Path(log_base) / module_name
    else:
        log_dir = Path(__file__).resolve().parents[2] / "logs" / module_name
    os.makedirs(log_dir, exist_ok=True)
    return str(log_dir)


def get_config_dir() -> str:
    """
    Get config directory path (Docker: /config, Standard: ../config).

    Returns:
        Absolute path to the configuration directory
    """
    if os.environ.get("DOCKER_ENV"):
        config_dir = os.getenv("CONFIG_DIR", "/config")
    else:
        config_dir = Path(__file__).resolve().parents[2] / "config"
        Path(config_dir).mkdir(parents=True, exist_ok=True)
    return str(config_dir)


def extract_year(text: str) -> Optional[int]:
    """Extract first 4-digit year from text, returns None if not found."""
    try:
        match = year_regex.search(text)
        return int(match.group(1)) if match else None
    except (ValueError, AttributeError):
        return None


def extract_ids(text: str) -> Tuple[Optional[int], Optional[int], Optional[str]]:
    """Extract TMDB, TVDB, and IMDB IDs from text.

    Returns: (tmdb_id, tvdb_id, imdb_id) where IMDB is string, others are int.
    """
    tmdb_match = tmdb_id_regex.search(text)
    tmdb = int(tmdb_match.group(1)) if tmdb_match else None

    tvdb_match = tvdb_id_regex.search(text)
    tvdb = int(tvdb_match.group(1)) if tvdb_match else None

    imdb_match = imdb_id_regex.search(text)
    imdb = imdb_match.group(1) if imdb_match else None

    return tmdb, tvdb, imdb


def compare_strings(string1: str, string2: str) -> bool:
    """Compare strings ignoring punctuation and case (useful for title matching)."""
    normalized1 = re.sub(r"\W+", "", string1).lower()
    normalized2 = re.sub(r"\W+", "", string2).lower()
    return normalized1 == normalized2


def is_match(
    asset: Dict[str, Any],
    media: Dict[str, Any],
) -> Tuple[bool, str]:
    """Determine whether a poster *asset* refers to the same media item as *media*.

    The matcher prioritizes **ID equality** (TMDB/TVDB/IMDB). When **both**
    sides provide at least one valid ID, we **only** accept an ID match; title
    similarity is *not* considered in that branch. When IDs are missing on
    either side, we fall back to a set of increasingly permissive title checks
    (exact, normalized, alternate titles, and a loose alphanumeric compare),
    gated by a year check.

    Side effects:
        If ``media['folder']`` is present and matches the configured
        ``folder_year_regex``, the function annotates ``media`` in-place with:

        * ``folder_title``: title parsed from the folder name
        * ``folder_year``: optional year parsed from the folder name
        * ``normalized_folder_title``: normalized folder title

    Year rule:
        If the asset year is present, it must equal at least one of
        ``media['year']``, ``media['secondary_year']``, or ``media['folder_year']``
        when those values exist. If **no** years are provided on either side,
        the year check passes by default.

    Args:
        asset: Dict describing the poster asset. Common keys:
            ``title``, ``normalized_title``, ``alternate_titles``,
            ``normalized_alternate_titles``, ``year``, ``tmdb_id``, ``tvdb_id``,
            ``imdb_id``.
        media: Dict from the media index. Common keys:
            ``title``, ``normalized_title``, ``original_title``,
            ``alternate_titles``, ``normalized_alternate_titles``, ``year``,
            ``secondary_year``, ``tmdb_id``, ``tvdb_id``, ``imdb_id``, and
            optionally ``folder`` (e.g., "Movie (1999)").

    Returns:
        Tuple ``(matched, reason)`` where ``matched`` is a boolean and
        ``reason`` is a short diagnostic string such as ``"ID match: tmdb_id"``
        or ``"Asset normalized title equals media normalized title"``. When no
        rule matches, returns ``(False, "")``.

    Caveats:
        * If **both** sides have at least one valid ID but **none** of those IDs
          match, the function returns ``False`` immediately without trying title
          heuristics. This is intentional to avoid mismatching distinct entities
          that coincidentally share a title.
    """
    if media.get("folder"):
        folder_base_name = os.path.basename(media["folder"])
        match = re.search(folder_year_regex, folder_base_name)
        if match:
            media["folder_title"], media["folder_year"] = match.groups()
            media["folder_year"] = (
                int(media["folder_year"]) if media["folder_year"] else None
            )
            media["normalized_folder_title"] = normalize_titles(media["folder_title"])

    def year_matches() -> bool:
        """Check if asset year matches any media year."""
        asset_year = asset.get("year")
        media_years = [
            media.get(key) for key in ["year", "secondary_year", "folder_year"]
        ]
        if asset_year is None and all(year is None for year in media_years):
            return True
        return any(asset_year == year for year in media_years if year is not None)

    def has_any_valid_id(data: Dict[str, Any]) -> bool:
        """Check if dict has valid media database IDs."""
        for key in ["tmdb_id", "tvdb_id", "imdb_id"]:
            value = data.get(key)
            if key == "imdb_id":
                if value and isinstance(value, str) and value.startswith("tt"):
                    return True
            else:
                if value and str(value).isdigit() and int(value) > 0:
                    return True
        return False

    has_asset_ids = has_any_valid_id(asset)
    has_media_ids = has_any_valid_id(media)

    if has_asset_ids and has_media_ids:
        id_match_criteria = [
            (
                media.get("tvdb_id")
                and asset.get("tvdb_id")
                and media["tvdb_id"] == asset["tvdb_id"],
                "ID match: tvdb_id",
            ),
            (
                media.get("tmdb_id")
                and asset.get("tmdb_id")
                and media["tmdb_id"] == asset["tmdb_id"],
                "ID match: tmdb_id",
            ),
            (
                media.get("imdb_id")
                and asset.get("imdb_id")
                and media["imdb_id"] == asset["imdb_id"],
                "ID match: imdb_id",
            ),
        ]
        for matched, reason in id_match_criteria:
            if matched:
                return True, reason
        return False, ""

    match_criteria = [
        (asset.get("title") == media.get("title"), "Asset title equals media title"),
        (
            asset.get("title") in media.get("alternate_titles", []),
            "Asset title found in media's alternate titles",
        ),
        (asset.get("title") == media.get("folder"), "Asset title equals media folder"),
        (
            asset.get("title") == media.get("original_title"),
            "Asset title equals media original title",
        ),
        (
            asset.get("normalized_title") == media.get("normalized_title"),
            "Asset normalized title equals media normalized title",
        ),
        (
            asset.get("normalized_title") == media.get("normalized_folder"),
            "Asset normalized title equals media folder normalized",
        ),
        (
            asset.get("normalized_title")
            in media.get("normalized_alternate_titles", []),
            "Asset normalized title found in media's normalized alternate titles",
        ),
        (
            any(
                assets == media.get("title")
                for assets in asset.get("alternate_titles", [])
            ),
            "One of asset's alternate_titles matches media title",
        ),
        (
            any(
                assets == media.get("normalized_title")
                for assets in asset.get("normalized_alternate_titles", [])
            ),
            "One of asset's normalized_alternate_titles matches media normalized title",
        ),
        (
            any(
                media_alt == asset.get("title")
                for media_alt in media.get("alternate_titles", [])
            ),
            "One of media's alternate_titles matches asset title",
        ),
        (
            any(
                media_alt == asset.get("normalized_title")
                for media_alt in media.get("normalized_alternate_titles", [])
            ),
            "One of media's normalized_alternate_titles matches asset normalized title",
        ),
        (
            compare_strings(media.get("title", ""), asset.get("title", "")),
            "Titles match under loose string comparison",
        ),
        (
            compare_strings(
                media.get("normalized_title", ""), asset.get("normalized_title", "")
            ),
            "Normalized titles match under loose string comparison",
        ),
    ]

    for condition, reason in match_criteria:
        if condition and year_matches():
            return True, reason
    return False, ""


def generate_title_variants(title: str) -> Dict[str, List[str]]:
    """Produce alternate title candidates plus their normalized forms.

    Variants are formed by removing a single leading article/prefix (e.g.
    "The", "A") and/or a trailing suffix such as "Collection" based on
    project-wide lists (``prefixes``/``suffixes``). The function then appends a
    "<title> Collection" variant **unless** the original title already ends
    with "Collection". Normalized variants are created with
    :func:`util.normalization.normalize_titles`.

    Deduplication preserves the first occurrence of each variant while keeping
    order stable.

    Args:
        title: Original display title.

    Returns:
        Dict with two lists:
            * ``alternate_titles``: human-readable candidates
            * ``normalized_alternate_titles``: normalized versions aligned by
              index to ``alternate_titles``

    Example:
        >>> generate_title_variants("The Matrix Collection")
        {
            'alternate_titles': ['Matrix Collection', 'The Matrix', 'Matrix'],
            'normalized_alternate_titles': ['matrixcollection', 'thematrix', 'matrix']
        }
    """

    stripped_prefix = next(
        (title[len(p) + 1 :].strip() for p in prefixes if title.startswith(p + " ")),
        title,
    )

    stripped_suffix = next(
        (title[: -(len(s) + 1)].strip() for s in suffixes if title.endswith(" " + s)),
        title,
    )

    stripped_both = next(
        (
            stripped_prefix[: -(len(s) + 1)].strip()
            for s in suffixes
            if stripped_prefix.endswith(" " + s)
        ),
        stripped_prefix,
    )

    alternate_titles = [stripped_prefix, stripped_suffix, stripped_both]

    if not title.lower().endswith("collection"):
        alternate_titles.append(f"{title} Collection")

    normalized_alternate_titles = [normalize_titles(alt) for alt in alternate_titles]

    alternate_titles = list(dict.fromkeys(alternate_titles))
    normalized_alternate_titles = list(dict.fromkeys(normalized_alternate_titles))

    return {
        "alternate_titles": alternate_titles,
        "normalized_alternate_titles": normalized_alternate_titles,
    }


def get_prefix(title: str, length: int = 3) -> str:
    """Generate short prefix from title for sorting/categorization.

    Filters out common words ("the", "and", etc.) and takes first N characters.
    Falls back to all words if no meaningful ones remain.
    """

    words = [w for w in title.split() if w.lower() not in common_words]

    if words:
        prefix = "".join(words)[:length]
    else:

        prefix = "".join(title.split())[:length]

    return prefix.lower()
