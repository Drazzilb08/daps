import html
import os
import re

from unidecode import unidecode

from util.constants import (
    common_words,
    id_content_regex,
    illegal_chars_regex,
    remove_special_chars,
    words_to_remove,
    year_regex,
)


def remove_common_words(text: str) -> str:
    """Remove complete words found in common_words (case-insensitive).

    Args:
        text (str): Input text.

    Returns:
        str: Text with common words removed.
    """
    words = text.split()
    filtered = [
        word for word in words if word.lower() not in {w.lower() for w in common_words}
    ]
    return " ".join(filtered)


def remove_tokens(text: str) -> str:
    """Remove specified unwanted substrings from text.

    Args:
        text (str): Input text.

    Returns:
        str: Text with tokens removed.
    """
    for token in words_to_remove:
        text = text.replace(token, "")
    return text


def normalize_file_names(file_name: str) -> str:
    """Normalize filename for indexing.

    Steps:
      1. Strip extension.
      2. Convert HTML entities and unicode to ASCII.
      3. Remove ID tokens in curly braces.
      4. Remove specified unwanted substrings.
      5. Remove illegal filename characters.
      6. Remove miscellaneous special symbols.
      7. Remove common filler words.
      8. Remove whitespace and lowercase.

    Args:
        file_name (str): Filename to normalize.

    Returns:
        str: Normalized filename.
    """
    base, _ = os.path.splitext(file_name)
    cleaned = unidecode(html.unescape(base))
    cleaned = id_content_regex.sub("", cleaned)
    cleaned = remove_tokens(cleaned)
    cleaned = illegal_chars_regex.sub("", cleaned)
    cleaned = re.sub(remove_special_chars, "", cleaned)
    cleaned = remove_common_words(cleaned)
    cleaned = cleaned.replace(" ", "").lower()
    return cleaned.strip()


def normalize_titles(title: str) -> str:
    """Normalize media title for matching and indexing.

    Steps:
      1. Strip year tag.
      2. Convert HTML entities and unicode to ASCII.
      3. Remove ID tokens in curly braces.
      4. Remove specified unwanted substrings.
      5. Remove illegal filename characters.
      6. Remove miscellaneous special symbols.
      7. Remove whitespace and lowercase.

    Args:
        title (str): Media title to normalize.

    Returns:
        str: Normalized title.
    """
    normalized_title = year_regex.sub("", title)
    normalized_title = unidecode(html.unescape(normalized_title)).strip()
    normalized_title = id_content_regex.sub("", normalized_title)
    normalized_title = remove_tokens(normalized_title)
    normalized_title = illegal_chars_regex.sub("", normalized_title)
    normalized_title = re.sub(remove_special_chars, "", normalized_title)
    normalized_title = normalized_title.replace(" ", "").lower()
    return normalized_title.strip()
