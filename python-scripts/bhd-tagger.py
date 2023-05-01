# Author: Drazzilb
# Date: 2023-04-27
# Description: This script will tag all movies in your Radarr library that have the release group "BHDStudio" with the tag "bhdstudio".
#              This is useful for sorting your movies and seeing what hasn't been released by BHDStudio.
# Usage: python3 bhd-tagger.py
# Requirements: Python 3, requests
# Version: 1.0
# License: MIT License

import requests
import json

# Set these variables to match your setup.
RADARR_URL = "http://localhost:7878"
RADARR_API_KEY = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Set dry_run to True to see what would happen without actually tagging anything.
dry_run = False

def get_tag_id(tag_name):
    """Retrieve the tag ID for a given tag name."""
    response = requests.get(RADARR_URL + "/api/v3/tag", headers={"X-Api-Key": RADARR_API_KEY})
    response.raise_for_status()
    for tag in response.json():
        if tag["label"] == tag_name:
            return tag["id"]
    return None

def add_tag(tag_name):
    """Create a new tag with the given name."""
    response = requests.post(
        RADARR_URL + "/api/v3/tag",
        headers={"X-Api-Key": RADARR_API_KEY},
        json={"label": tag_name}
    )
    response.raise_for_status()

def tag_movie(movie_id, tag_id, dry_run):
    """Add a tag to a movie."""
    if dry_run:
        print(f"Would tag movie {movie_id} with tag {tag_id}")
    else:
        response = requests.put(
            RADARR_URL + f"/api/v3/movie/editor",
            headers={"X-Api-Key": RADARR_API_KEY},
            json={
            "movieIds": [movie_id],
            "tags": [tag_id],
            "applyTags": "add"
        }
        )
        response.raise_for_status()

def untag_movie(movie_id, tag_id, dry_run):
    """Remove a tag from a movie."""
    if dry_run:
        print(f"Would remove tag {tag_id} from movie {movie_id}")
    else:
        response = requests.put(
            RADARR_URL + f"/api/v3/movie/editor",
            headers={"X-Api-Key": RADARR_API_KEY},
            json={
            "movieIds": [movie_id],
            "tags": [tag_id],
            "applyTags": "remove"
        }
        )
        response.raise_for_status()

def main(dry_run):
    """Main function."""
    if dry_run:
        print(f"Dry Run = {dry_run}")
    # Retrieve the tag ID for "bhdstudio" or create it if it does not exist.
    tag_name = "bhdstudio"
    print(f"Retrieving tag ID for {tag_name}")
    tag_id = get_tag_id(tag_name)
    if not tag_id:
        print(f"Creating new tag {tag_name}")
        add_tag(tag_name)
        tag_id = get_tag_id(tag_name)

    if not tag_id:
        add_tag(tag_name)
        tag_id = get_tag_id(tag_name)

    # Retrieve all movies and check their release groups.
    movies = requests.get(RADARR_URL + "/api/v3/movie", headers={"X-Api-Key": RADARR_API_KEY}).json()
    print(f"Searching your library, this could take a moment...")
    for movie in movies:
        try:
            if movie['hasFile'] == True:
                release_group = movie['movieFile']['releaseGroup']
                if release_group == "BHDStudio":
                    # Add the "bhdstudio" tag if it is not already present.
                    if tag_id not in movie['tags']:
                        print(f"Adding tag {tag_name} to movie {movie['title']} (ID: {movie['id']})")
                        tag_movie(movie["id"], tag_id, dry_run)
                else:
                    # Remove the "bhdstudio" tag if it is present.
                    if tag_id in movie['tags']:
                        print(f"Removing tag {tag_name} from movie {movie['title']} (ID: {movie['id']})")
                        untag_movie(movie["id"], tag_id, dry_run)
        except KeyError:
            print(f"Skipping movie {movie['title']} (ID: {movie['id']}) because it has no release group")

if __name__ == "__main__":
    main(dry_run)
