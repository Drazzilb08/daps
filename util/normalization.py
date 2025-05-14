import re
import html
import os
from unidecode import unidecode
from util.constants import (
    common_words, 
    words_to_remove, 
    illegal_chars_regex, 
    remove_special_chars, 
    year_regex,
    bracketed_content_regex
    )


def preprocess_name(name: str) -> str:
    """
    Simplify a name string by removing special characters, lowercasing, and removing common words.

    Args:
        name (str): The input name string.

    Returns:
        str: A normalized string with common words and special characters removed.
    """
    # Normalize and remove special characters and common filler words
    name = re.sub(remove_special_chars, '', name.lower())
    name = ' '.join(name.split())
    name = unidecode(html.unescape(name))
    return ''.join(word for word in name.split() if word not in common_words)

def normalize_file_names(file_name: str) -> str:
    """
    Normalize a filename by removing file extensions, brackets, illegal characters, and common patterns.

    Args:
        file_name (str): The original file name.

    Returns:
        str: A cleaned, normalized filename string.
    """
    file_name, _ = os.path.splitext(file_name)
    # Remove specified unwanted words once (first match only)
    for word in words_to_remove:
        file_name = file_name.replace(word, '')
    # Remove bracketed content like [group] or {release}
    file_name = bracketed_content_regex.sub('', file_name)
    file_name = illegal_chars_regex.sub('', file_name)  # Remove illegal characters
    file_name = unidecode(html.unescape(file_name))     # Normalize unicode and HTML entities
    file_name = file_name.replace('&', 'and')           # Replace ampersand with 'and'
    file_name = re.sub(remove_special_chars, '', file_name)  # Remove miscellaneous special chars
    file_name = file_name.replace(' ', '').lower()      # Remove spaces and lowercase
    return file_name.strip()

def normalize_titles(title: str) -> str:
    """
    Normalize a media title by stripping common phrases, special characters, years, and formatting.

    Args:
        title (str): The media title to normalize.

    Returns:
        str: A normalized, lowercase, symbol-free title string.
    """
    normalized_title = title
    # Remove specified unwanted words once (first match only)
    for word in words_to_remove:
        normalized_title = title.replace(word, '')
        if normalized_title != title:
            break
    normalized_title = year_regex.sub('', normalized_title)              # Remove year patterns
    normalized_title = illegal_chars_regex.sub('', normalized_title)     # Remove illegal characters
    normalized_title = unidecode(html.unescape(normalized_title)).strip()# Normalize unicode and HTML entities
    normalized_title = normalized_title.replace('&', 'and')              # Replace ampersand with 'and'
    normalized_title = re.sub(remove_special_chars, '', normalized_title).lower()  # Remove special chars, lowercase
    return normalized_title.replace(' ', '')                             # Remove spaces