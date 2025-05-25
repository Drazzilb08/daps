import os
import re
import html

from unidecode import unidecode

from util.constants import (
    common_words,
    words_to_remove,
    illegal_chars_regex,
    remove_special_chars,
    year_regex,
    id_content_regex
)

def remove_common_words(text: str) -> str:
    """
    Remove any word that matches an entry in common_words (case-insensitive).
    Only removes complete words, does not touch substrings or special characters.
    """
    words = text.split()
    filtered = [word for word in words if word.lower() not in {w.lower() for w in common_words}]
    return " ".join(filtered)


def remove_tokens(text: str) -> str:
    for token in words_to_remove:
        text = text.replace(token, '')
    return text


def normalize_file_names(file_name: str) -> str:
    """
    Normalize a filename for indexing by:
    1. Stripping extension
    2. Removing release tags in curly braces
    3. Removing known unwanted substrings (e.g., encoding tags)
    4. Removing common filler words
    5. Removing illegal filename characters
    6. Converting HTML entities and unicode to ASCII
    7. Removing miscellaneous special symbols
    8. Eliminating whitespace and lowercasing for a uniform key
    """
    # 1) Strip extension
    base, _ = os.path.splitext(file_name)

    # 2) Convert HTML entities & unicode to ASCII
    cleaned = unidecode(html.unescape(base))

    # 3) Remove ID tokens in curly braces (e.g., {tmdb-12345})
    cleaned = id_content_regex.sub('', cleaned)

    # 6) Remove specified unwanted substrings (tags, encoding notes, etc.)
    cleaned = remove_tokens(cleaned)

    # 4) Remove illegal filename characters (for cross-platform safety)
    cleaned = illegal_chars_regex.sub('', cleaned)

    # 5) Remove miscellaneous special symbols (punctuation, etc.)
    cleaned = re.sub(remove_special_chars, '', cleaned)
    
    # 7) Remove common filler words (from known media/common word lists)
    cleaned = remove_common_words(cleaned)

    # 8) Eliminate all whitespace and lowercase for consistent matching
    cleaned = cleaned.replace(' ', '').lower()

    result = cleaned.strip()

    return result


def normalize_titles(title: str) -> str:
    """
    Normalize a media title for robust matching and indexing by:
    1. Converting HTML entities and unicode to ASCII.
    2. Removing ID tokens enclosed in curly braces (e.g., "{tmdb-12345}").
    3. Removing known unwanted substrings (from `words_to_remove`).
    4. Removing common filler words (from `common_words`).
    5. Removing illegal filename characters.
    6. Removing miscellaneous special symbols.
    7. Eliminating all spaces and converting to lowercase for uniformity.

    Args:
        title (str): The media title to normalize.

    Returns:
        str: A normalized, lowercase, symbol-free title string suitable for matching.
    """
    # 1) Strip year tag
    normalized_title = year_regex.sub('', title)
    
    # 2) Convert HTML entities & unicode to ASCII
    normalized_title = unidecode(html.unescape(normalized_title)).strip()

    # 3) Remove ID tokens in curly braces (e.g., {tmdb-12345})
    normalized_title = id_content_regex.sub('', normalized_title)
    
    # 6) Remove specified unwanted substrings (tags, encoding notes, etc.)
    normalized_title = remove_tokens(normalized_title)

    # 4) Remove illegal filename characters (for cross-platform safety)
    normalized_title = illegal_chars_regex.sub('', normalized_title)

    # 5) Remove miscellaneous special symbols (punctuation, etc.)
    normalized_title = re.sub(remove_special_chars, '', normalized_title)

    # 8) Eliminate all whitespace and lowercase for consistent matching
    normalized_title = normalized_title.replace(' ', '').lower()

    return normalized_title.strip()