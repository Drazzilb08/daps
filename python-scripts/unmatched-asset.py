import os
import requests
import re
from collections import defaultdict
import xml.etree.ElementTree as etree

plex_url = "http://IP_ADDRESS:32400"
token = "PLEX_TOKEN"
# library_names is only used for collections, ideally for Movies
library_names = ['library_name', 'library_name']
assets_path = '/mnt/user/appdata/plex-meta-manager/assets/'
media_paths =   [ 
                '/mnt/user/data/media/anime movies/',
                '/mnt/user/data/media/documentary movies/',
                '/mnt/user/data/media/movies/',
                '/mnt/user/data/media/anime series/',
                '/mnt/user/data/media/animated series',
                '/mnt/user/data/media/documentary series',
                '/mnt/user/data/media/series/'
                ]


def get_assets_files(assets_path):
    return [f for f in os.listdir(assets_path) if os.path.isfile(os.path.join(assets_path, f))]

def get_media_folders(media_paths):
    media_folders = []
    for media_path in media_paths:
        media_folders += [d for d in os.listdir(media_path) if os.path.isdir(os.path.join(media_path, d))]
    return media_folders

def get_unmatched_folders(assets_files, media_folders):
    collection_files = [file.strip(".jpg").strip(".png").strip(".jpeg") for file in os.listdir(assets_path) if file.endswith(".jpg") or file.endswith(".png") or file.endswith(".jpeg")]
    return [folder for folder in media_folders if folder + ".jpg" not in collection_files and folder + ".png" not in collection_files and folder + ".jpeg" not in collection_files]

def save_output_to_file(media_paths, no_match_folders):
    output_file = "logs/output.txt"
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, "w") as f:
        for media_path in media_paths:
            f.write(f"\tChecking {media_path}:\n")
            for folder in sorted(no_match_folders):
                if os.path.join(media_path, folder) in [os.path.join(media_path, d) for d in os.listdir(media_path)]:
                    f.write(f"\t\t{folder}\n")
        total_folders = sum([len(os.listdir(p)) for p in media_paths])
        percentage = 100 * len(no_match_folders) / total_folders
        f.write(f"\n\t{len(no_match_folders)} unmatched folders found: Percent complete: ({100 - percentage:.2f}% of total {total_folders}).\n")

def save_collections_to_file(collections, no_match_collections):
    output_file = "logs/output.txt"
    collections_by_library = group_collections_by_library(no_match_collections)
    with open(output_file, "a") as f:
        for library, library_collections in collections_by_library.items():
            f.write(f"\t{library}:")
            library_collections.sort()
            for collection in library_collections:
                f.write(f"\n\t\t{collection}")
        f.write(f"\n\t{len(no_match_collections)} unmatched collections found: ({100 - 100 * len(no_match_collections) / len(collections):.2f}% of total {len(collections)})\n")

def print_output(media_paths, no_match_folders):
    for media_path in media_paths:
        print(f"\tChecking {media_path}:")
        for folder in sorted(no_match_folders):
            if os.path.join(media_path, folder) in [os.path.join(media_path, d) for d in os.listdir(media_path)]:
                print(f"\t\t{folder}")
    total_folders = sum([len(os.listdir(p)) for p in media_paths])
    percentage = 100 * len(no_match_folders) / total_folders
    print(f"\n\t{len(no_match_folders)} unmatched folders found: Percent complete: ({100 - percentage:.2f}% of total {total_folders}).\n")

def compare_collections(collections, assets_path):
    no_match_collections = []
    collection_files = [file.strip(".jpg").strip(".png").strip(".jpeg") for file in os.listdir(assets_path) if file.endswith(".jpg") or file.endswith(".png") or file.endswith(".jpeg")]
    for collection in collections:
        collection_name = re.sub(r'[:\/\\]', '', collection[1])
        if collection_name not in collection_files:
            no_match_collections.append(collection)
    return no_match_collections

def group_collections_by_library(collections):
    collections_by_library = defaultdict(list)
    for library, collection in collections:
        collections_by_library[library].append(collection)
    return collections_by_library

def print_collections(collections, no_match_collections):
    collections_by_library = group_collections_by_library(no_match_collections)
    for library, library_collections in collections_by_library.items():
        print(f"\t{library}:")
        library_collections.sort()
        for collection in library_collections:
            print(f"\t\t{collection}")
    print(f"\n\t{len(no_match_collections)} unmatched collections found: ({100 - 100 * len(no_match_collections) / len(collections):.2f}% of total {len(collections)})\n")
        

def get_collections(plex_url, token, library_names):
    # Make a GET request to the /library/sections endpoint to retrieve a list of all libraries
    try:
        response = requests.get(f"{plex_url}/library/sections", headers={
            "X-Plex-Token": token
        })
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print("An error occurred while getting the libraries:", e)
        return []
    try:
        xml = etree.fromstring(response.content)
    except etree.ParseError as e:
        print("An error occurred while parsing the response:", e)
        return []
    libraries = xml.findall(".//Directory[@type='movie']")
    collections = set()
    for library_name in library_names:
        target_library = None
        for library in libraries:
            if library.get("title") == library_name:
                target_library = library
                break
        if target_library is None:
            print(f"Library with name {library_name} not found")
            continue
        library_id = target_library.get("key")
        # Make a GET request to the /library/sections/{library_id}/collections endpoint to retrieve a list of all collections in the library
        try:
            response = requests.get(f"{plex_url}/library/sections/{library_id}/collections", headers={
                "X-Plex-Token": token
            })
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            print("An error occurred while getting the collections:", e)
            continue
        try:
            xml = etree.fromstring(response.content)
        except etree.ParseError as e:
            print("An error occurred while parsing the response:", e)
            continue
        library_collections = xml.findall(".//Directory")
        library_collection_names = [collection.get("title") for collection in library_collections if collection.get("smart") != "1"]
        for collection_name in library_collection_names:
            if collection_name not in collections:
                collections.add((library_name, collection_name))
    return collections


def main():
    assets_files = get_assets_files(assets_path)
    media_folders = get_media_folders(media_paths)
    no_match_folders = get_unmatched_folders(assets_files, media_folders)
    save_output_to_file(media_paths, no_match_folders)
    print_output(media_paths, no_match_folders)
    collections = get_collections(plex_url, token, library_names)
    no_match_collections = compare_collections(collections, assets_path)
    save_collections_to_file(collections, no_match_collections)
    print_collections(collections, no_match_collections)

if __name__ == "__main__":
    main()
