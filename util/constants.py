import re

# Regex to extract the year from title or folder name
year_regex = re.compile(r"\s?\((\d{4})\)(?!.*Collection).*")

# Regex to match common season patterns
season_pattern = re.compile(r"(?:\s*-\s*Season\s*\d+|_Season\d{1,2}|\s*-\s*Specials|_Specials)", re.IGNORECASE)

# Regex to extract the year from parentheses in the folder name
folder_year_regex = re.compile(r"(.*)\s\((\d{4})\)")

illegal_chars_regex = re.compile(r'[<>:"/\\|?*\x00-\x1f]+')
remove_special_chars = re.compile(r'[^a-zA-Z0-9\s]+')
year_regex = re.compile(r"\s?\((\d{4})\)(?!.*Collection).*")
words_to_remove = [
    "(US)", "(UK)", "(AU)", "(CA)", "(NZ)", "(FR)", "(NL)"
]

common_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to'}

# List of prefixes and suffixes to remove from titles for comparison
prefixes = [
    "The",
    "A",
    "An",
]

# List of prefixes and suffixes to remove from titles for comparison
suffixes = [
    "Collection",
    "Saga",
]