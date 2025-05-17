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

    Args:
        text (str): The input string to process.

    Returns:
        str: The string with standalone common words removed.
    """
    # Remove standalone common words only at whitespace boundaries
    pattern = rf'(?:(?<=\s)|(?<=^))(?:{"|".join(re.escape(word) for word in common_words)})(?:(?=\s)|(?=$))'
    cleaned = re.sub(pattern, '', text, flags=re.IGNORECASE)
    # Collapse multiple spaces and trim
    return re.sub(r'\s+', ' ', cleaned).strip()


def remove_tokens(text: str) -> str:
    """
    Remove specified tokens (e.g., region or language tags) from the text.

    Args:
        text (str): The input string to process.

    Returns:
        str: The string with tokens removed.
    """
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

    # 2) Remove curly-brace tags
    cleaned = id_content_regex.sub('', base)

    # 3) Remove specified unwanted substrings
    cleaned = remove_tokens(cleaned)

    # 4) Remove common filler words
    cleaned = remove_common_words(cleaned)

    # 5) Remove illegal filename characters
    cleaned = illegal_chars_regex.sub('', cleaned)

    # 6) Convert HTML entities & unicode → ASCII
    cleaned = unidecode(html.unescape(cleaned))

    # 7) Strip remaining special characters
    cleaned = re.sub(remove_special_chars, '', cleaned)

    # 8) Eliminate whitespace and lowercase
    cleaned = cleaned.replace(' ', '').lower()

    return cleaned.strip()


def normalize_titles(title: str) -> str:
    """
    Normalize a media title by stripping common phrases, special characters, years, and formatting.

    Args:
        title (str): The media title to normalize.

    Returns:
        str: A normalized, lowercase, symbol-free title string.
    """
    normalized_title = title
    
    for word in words_to_remove:
        normalized_title = title.replace(word, '')
        if normalized_title != title:
            break
    normalized_title = year_regex.sub('', normalized_title)              
    normalized_title = illegal_chars_regex.sub('', normalized_title)     
    normalized_title = unidecode(html.unescape(normalized_title)).strip()
    normalized_title = normalized_title.replace('&', 'and')              
    normalized_title = re.sub(remove_special_chars, '', normalized_title).lower()  
    return normalized_title.replace(' ', '')                            