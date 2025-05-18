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


def preprocess_name(name: str) -> str:
    """
    Simplify a name string by removing special characters, lowercasing, and removing common words.

    Args:
        name (str): The input name string.

    Returns:
        str: A normalized string with common words and special characters removed.
    """
    
    name = re.sub(remove_special_chars, '', name.lower())
    name = ' '.join(name.split())
    name = unidecode(html.unescape(name))
    return ''.join(word for word in name.split() if word not in common_words)


def remove_common_words(text: str) -> str:
    """
    Remove common filler words from a filename component.
    """
    # Remove standalone common words, allowing punctuation boundaries
    pattern = rf'(?:(?<=^)|(?<=\W))(?:{"|".join(re.escape(word) for word in common_words)})(?:(?=$)|(?=\W))'
    cleaned = re.sub(pattern, '', text, flags=re.IGNORECASE)
    # Collapse multiple spaces and trim
    return re.sub(r'\s+', ' ', cleaned).strip()


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

    # 3) Remove curly-brace tags
    cleaned = id_content_regex.sub('', cleaned)

    # 4) Remove specified unwanted substrings
    cleaned = remove_tokens(cleaned)

    # 5) Remove common filler words
    cleaned = remove_common_words(cleaned)

    # 6) Remove illegal filename characters
    cleaned = illegal_chars_regex.sub('', cleaned)

    # 7) Strip remaining special characters
    cleaned = re.sub(remove_special_chars, '', cleaned)

    # 8) Eliminate whitespace and lowercase
    cleaned = cleaned.replace(' ', '').lower()

    return cleaned.strip()


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

    # 4) Remove specified unwanted substrings (tags, encoding notes, etc.)
    normalized_title = remove_tokens(normalized_title)

    # 5) Remove common filler words (from known media/common word lists)
    normalized_title = remove_common_words(normalized_title)

    # 6) Remove illegal filename characters (for cross-platform safety)
    normalized_title = illegal_chars_regex.sub('', normalized_title)

    # 7) Remove miscellaneous special symbols (punctuation, etc.)
    normalized_title = re.sub(remove_special_chars, '', normalized_title)

    # 8) Eliminate all whitespace and lowercase for consistent matching
    normalized_title = normalized_title.replace(' ', '').lower()

    return normalized_title.strip()