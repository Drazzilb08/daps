import re
import html
import os
from unidecode import unidecode
from util.constants import common_words, words_to_remove, illegal_chars_regex, remove_special_chars, year_regex, suffixes

def preprocess_name(title: str) -> str:
    title = re.sub(r'[^a-zA-Z0-9\s]', '_', title.lower())
    title = title.replace(' ', '')
    title = unidecode(html.unescape(title))
    return ''.join(word for word in title.split() if word not in common_words)

def normalize_file_names(file_name: str) -> str:
    file_name, _ = os.path.splitext(file_name)
    for word in words_to_remove:
        file_name = file_name.replace(word, '')
    file_name = re.sub(r'\s*[\{\[][^{}\[\]]*[\}\]]', '', file_name, flags=re.IGNORECASE)
    file_name = illegal_chars_regex.sub('', file_name)
    file_name = unidecode(html.unescape(file_name))
    file_name = file_name.replace('&', 'and')
    file_name = re.sub(remove_special_chars, '', file_name)
    file_name = file_name.replace(' ', '').lower()
    return file_name.strip()

def normalize_titles(title: str) -> str:
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