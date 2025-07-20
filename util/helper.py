import copy
import json
import math
import os
import re
from pathlib import Path
from types import SimpleNamespace
from typing import Any, Dict, List, Optional, Tuple

import yaml
from tqdm import tqdm

from util.constants import (
    folder_year_regex,
    imdb_id_regex,
    prefixes,
    suffixes,
    tmdb_id_regex,
    tvdb_id_regex,
    year_regex,
)
from util.normalization import (
    normalize_titles,
)


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


def get_config_dir() -> str:
    """
    Return the path to the DAPS config directory, using DOCKER_ENV/CONFIG_DIR if set,
    otherwise using the standard project layout.
    """

    if os.environ.get("DOCKER_ENV"):
        config_dir = os.getenv("CONFIG_DIR", "/config")
    else:
        config_dir = Path(__file__).resolve().parents[1] / "config"
        # Ensure directory exists
        Path(config_dir).mkdir(parents=True, exist_ok=True)
    return str(config_dir)


def extract_year(text: str) -> Optional[int]:
    """Extract the first 4-digit year from text.

    Args:
        text: Input string to search for a year.

    Returns:
        The extracted year as an integer, or None if not found.
    """
    try:
        return int(year_regex.search(text).group(1))
    except Exception:
        return None


def extract_ids(text: str) -> Tuple[Optional[int], Optional[int], Optional[str]]:
    """Extract TMDB, TVDB, and IMDB IDs from text.

    Args:
        text: Input string containing IDs.

    Returns:
        Tuple of TMDB ID (int or None), TVDB ID (int or None), IMDB ID (str or None).
    """
    tmdb_match = tmdb_id_regex.search(text)
    tmdb = int(tmdb_match.group(1)) if tmdb_match else None
    tvdb_match = tvdb_id_regex.search(text)
    tvdb = int(tvdb_match.group(1)) if tvdb_match else None
    imdb_match = imdb_id_regex.search(text)
    imdb = imdb_match.group(1) if imdb_match else None
    return tmdb, tvdb, imdb


def compare_strings(string1: str, string2: str) -> bool:
    """Loosely compare two strings by removing non-alphanumeric characters and comparing lowercase."""
    string1 = re.sub(r"\W+", "", string1)
    string2 = re.sub(r"\W+", "", string2)
    return string1.lower() == string2.lower()


def is_match(
    asset: Dict[str, Any],
    media: Dict[str, Any],
) -> Tuple[bool, str]:
    """Determine if a media entry and an asset match based on ID, title, and year heuristics.

    Args:
      asset: Asset dictionary.
      media: Media dictionary.
      strict_folder_match: Only consider match if asset's folder matches media's folder.

    Returns:
      Tuple of (True, reason) if matched, else (False, "").
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
        asset_year = asset.get("year")
        media_years = [
            media.get(key) for key in ["year", "secondary_year", "folder_year"]
        ]
        if asset_year is None and all(year is None for year in media_years):
            return True
        return any(asset_year == year for year in media_years if year is not None)

    def has_any_valid_id(d: Dict[str, Any]) -> bool:
        for k in ["tmdb_id", "tvdb_id", "imdb_id"]:
            v = d.get(k)
            if k == "imdb_id":
                if v and isinstance(v, str) and v.startswith("tt"):
                    return True
            else:
                if v and str(v).isdigit() and int(v) > 0:
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
    """
    Generate alternate and normalized title variants for a given media title.
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


def match_assets_to_media(
    db: Any,
    logger: Optional[Any] = None,
    config: SimpleNamespace = None,
) -> None:
    """
    Match all media and collections from the database to physical asset files using DB lookups only.
    Uses get_poster_cache_by_id and get_poster_cache_by_normalized_title.
    """
    logger.info("Matching assets to media and collections, please wait...")
    all_media = []

    # --- Gather regular media ---
    for inst in config.instances:
        if isinstance(inst, str):
            # Radarr/Sonarr etc.
            instance_name = inst
            media = db.media.get_by_instance(instance_name)
            if media:
                all_media.extend(media)
        elif isinstance(inst, dict):
            for instance_name, params in inst.items():
                library_names = params.get("library_names", [])
                if library_names:
                    for library_name in library_names:
                        collections = db.collection. get_by_instance_and_library(
                            instance_name, library_name
                        )
                        if collections:
                            all_media.extend(collections)

    total_items = len(all_media)
    if not all_media:
        logger.warning("No media or collections found in database for matching.")
        return

    matches = 0
    non_matches = 0

    with progress(
        all_media,
        desc="Matching assets to media & collections",
        total=total_items,
        unit="media",
        logger=logger,
    ) as bar:
        for media in bar:
            asset_type = media.get("asset_type")
            title = media.get("title")
            year = media.get("year")
            library_name = media.get("library_name")
            instance_name = media.get("instance_name")
            normalized_title = media.get("normalized_title")

            alt_titles = []
            try:
                alt_titles = json.loads(media.get("alternate_titles") or "[]")
            except Exception:
                pass

            def find_match(media, season_number=None):
                # 1. Try by IDs
                for id_field in ["imdb_id", "tmdb_id", "tvdb_id"]:
                    id_val = media.get(id_field)
                    if id_val:
                        candidate = db.poster.get_by_id(
                            id_field, id_val, season_number
                        )
                        if candidate:
                            return candidate
                # 2. Try by normalized_title/year/season_number
                candidate = db.poster.get_by_normalized_title(
                    normalized_title, year, season_number
                )
                if candidate:
                    return candidate
                # 3. Try by alternate normalized titles
                for alt in alt_titles:
                    alt_norm = normalize_titles(alt)
                    candidate = db.poster.get_by_normalized_title(
                        alt_norm, year, season_number
                    )
                    if candidate:
                        return candidate
                return None

            if asset_type == "show":
                # Main poster match (no season)
                candidate = find_match(media, season_number=None)
                if candidate and is_match(candidate, media)[0]:
                    db.media.update(
                        asset_type=asset_type,
                        title=title,
                        year=year,
                        instance_name=instance_name,
                        matched_value=True,
                        season_number=None,
                        original_file=candidate.get("file"),
                    )
                    logger.debug(
                        f"✓ Matched: show main: {title} ({year}) <-> {candidate.get('title')} ({candidate.get('year')})"
                    )
                    matches += 1
                else:
                    db.media.update(
                        asset_type=asset_type,
                        title=title,
                        year=year,
                        instance_name=instance_name,
                        matched_value=False,
                        season_number=None,
                        original_file=None,
                    )
                    logger.debug(f"✗ No match: show main: {title} ({year})")
                    non_matches += 1

                # Per-season posters
                seasons = []
                if media.get("season_number") is not None:
                    seasons = [media.get("season_number")]
                elif "seasons" in media and isinstance(media["seasons"], list):
                    seasons = [
                        s.get("season_number")
                        for s in media["seasons"]
                        if s.get("season_number") is not None
                    ]
                for season in seasons:
                    candidate = find_match(media, season_number=season)
                    if candidate and is_match(candidate, media)[0]:
                        db.media.update(
                            asset_type=asset_type,
                            title=title,
                            year=year,
                            instance_name=instance_name,
                            matched_value=True,
                            season_number=season,
                            original_file=candidate.get("file"),
                        )
                        logger.debug(
                            f"✓ Matched: show S{season}: {title} ({year}) <-> {candidate.get('title')} ({candidate.get('year')})"
                        )
                        matches += 1
                    else:
                        db.media.update(
                            asset_type=asset_type,
                            title=title,
                            year=year,
                            instance_name=instance_name,
                            matched_value=False,
                            season_number=season,
                            original_file=None,
                        )
                        logger.debug(f"✗ No match: show S{season}: {title} ({year})")
                        non_matches += 1

            elif asset_type == "collection":
                candidate = find_match(media)
                print(f"candidate: {candidate}")
                if candidate and is_match(candidate, media)[0]:
                    db.collection.update(
                        title=title,
                        year=year,
                        library_name=library_name,
                        instance_name=instance_name,
                        matched_value=True,
                        original_file=candidate.get("file"),
                    )
                    logger.debug(
                        f"✓ Matched: [collection] {title} ({year}) <-> {candidate.get('title')} ({candidate.get('year')})"
                    )
                    matches += 1
                else:
                    db.collection.update(
                        title=title,
                        year=year,
                        library_name=library_name,
                        instance_name=instance_name,
                        matched_value=False,
                        original_file=None,
                    )
                    logger.debug(f"✗ No match: [collection] {title} ({year})")
                    non_matches += 1

            else:
                # Movies and all other asset types
                candidate = find_match(media, season_number=None)
                if candidate and is_match(candidate, media)[0]:
                    db.media.update(
                        asset_type=asset_type,
                        title=title,
                        year=year,
                        instance_name=instance_name,
                        matched_value=True,
                        season_number=None,
                        original_file=candidate.get("file"),
                    )
                    logger.debug(
                        f"✓ Matched: {title} ({year}) <-> {candidate.get('title')} ({candidate.get('year')})"
                    )
                    matches += 1
                else:
                    db.media.update(
                        asset_type=asset_type,
                        title=title,
                        year=year,
                        instance_name=instance_name,
                        matched_value=False,
                        season_number=None,
                        original_file=None,
                    )
                    logger.debug(f"✗ No match: {title} ({year})")
                    non_matches += 1

    logger.debug(f"Completed matching for all assets: {total_items} items")
    logger.debug(f"{matches} total_matches")
    logger.debug(f"{non_matches} non_matches")
