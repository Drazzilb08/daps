# Author: Drazzilb
# Date: 2023-04-30
# Description: Script to check Radarr for movies that are below a certain cutoff score and tag them as such
# Description: The script also allows you to print out a list of movies that are below the cutoff score
# Usage: python3 cutoff.py
# Requirements: Python 3, requests
# Version: 2.0
# License: MIT License

import requests
import json
import os
import sys
from tqdm import tqdm


radarr_url = 'http://localhost:7878'
radarr_api = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'

quality_profile = 'quality_profile_name'
cutoff_score = 1850
ignore_tags = ['tag1', 'tag2']
tagging = 'Yes'
requesting = 'Yes'
tracker_indexer = 'tracker/indexer_name'
release_group = 'release_group_name'

debug = False
dry_run = True

RED = '\033[31m'
RESET = '\033[0m'

def getMovies():
    movies = requests.get(radarr_url + "/api/v3/movie",
                          headers={"X-Api-Key": radarr_api}).json()
    return movies

def getMovieFile(movie_id):
    moviefile = requests.get(
        radarr_url + f"/api/v3/moviefile?movieId={movie_id}", headers={"X-Api-Key": radarr_api}).json()
    return moviefile

def getQualityProfiles():
    quality_profiles = requests.get(
        radarr_url + "/api/v3/qualityprofile", headers={"X-Api-Key": radarr_api}).json()
    return quality_profiles

def getTags():
    tags = requests.get(radarr_url + "/api/v3/tag",
                        headers={"X-Api-Key": radarr_api}).json()
    return tags

def get_tag_id(tag_name):
    response = requests.get(radarr_url + "/api/v3/tag",
                            headers={"X-Api-Key": radarr_api})
    response.raise_for_status()
    for tag in response.json():
        if tag["label"] == tag_name:
            return tag["id"]
    return None


def add_tag(tag_name):
    response = requests.post(radarr_url + "/api/v3/tag",
                             headers={"X-Api-Key": radarr_api}, json={"label": tag_name})
    response.raise_for_status()


def tag_movie(movie_id, tag_id):
    response = requests.put(radarr_url + f"/api/v3/movie/editor", headers={
                            "X-Api-Key": radarr_api}, json={"movieIds": [movie_id], "tags": [tag_id], "applyTags": "add"})
    response.raise_for_status()


def untag_movie(movie_id, tag_id):
    response = requests.put(radarr_url + f"/api/v3/movie/editor", headers={"X-Api-Key": radarr_api}, json={
                            "movieIds": [movie_id], "tags": [tag_id], "applyTags": "remove"})
    response.raise_for_status()


def main():
    movies_printed = 0
    untagged_movies = 0
    tagged_movies = 0
    total_movies = 0
    cutoff_unmet = 0
    cutoff_met = 0
    if tagging == 'Yes':
        if dry_run:
            print(f"Dry Run = {dry_run}")
        tag_name = "cutoff-unmet"
        print(f"Retrieving tag ID for {tag_name}")
        tag_id = get_tag_id(tag_name)
        if not tag_id:
            print(f"Creating new tag {tag_name}")
            add_tag(tag_name)
            tag_id = get_tag_id(tag_name)
        if tag_id:
            print(f"Tag ID for {tag_name} is {tag_id}")

    # Get list of movies
    movies = getMovies()
    # Get list of tags
    tags = getTags()
    # Create list of movies without the ignore tags
    movies_without_tags = [movie for movie in movies if not any(
        tag['label'] in ignore_tags for tag in tags if tag['id'] in movie['tags'])]
    # Create directory if not exists
    quality_profiles = getQualityProfiles()
    script_dir = os.path.dirname(os.path.abspath(__file__))
    logs_dir = os.path.join(script_dir, 'logs')
    os.makedirs(logs_dir, exist_ok=True)
    with open(os.path.join(logs_dir, 'scored_movies.txt'), 'w') as f:
        below_cutoff_count = 0
        for profile in quality_profiles:
            if profile['name'] == quality_profile:
                name_score_dict = {}
                for format in profile['formatItems']:
                    name_score_dict[format['name']] = format['score']
                # iterate over movies and calculate total score
                movies_to_print = []
                if requesting == 'Yes':
                    for movie in tqdm(movies_without_tags, desc="Processing Movies to print..."):
                        if movie['hasFile'] == True:
                            movie_id = movie['id']
                            if debug:
                                print(
                                    f"Calculating score for movie: {movie['title']}")
                            moviefile = getMovieFile(movie_id)
                            movie_score = 0
                            for format in moviefile:
                                for custom_format in format['customFormats']:
                                    format_name = custom_format['name']
                                    if format_name in name_score_dict:
                                        if debug:
                                            print(
                                                f"\tFormat: {format_name} Score: {name_score_dict[format_name]}")
                                        movie_score += name_score_dict[format_name]
                            if movie_score <= cutoff_score:
                                # Add movie to the list of movies to print
                                movies_to_print.append(
                                    (
                                        movie['title'],
                                        movie['year'],
                                        movie_score,
                                        movie.get('tmdbId'),
                                        movie.get('imdbId')
                                    )
                                )
                                movies_printed += 1
                dry_run_print = []
                if tagging == 'Yes':
                    for movie in tqdm(movies, desc="Processing Movies to tag..."):
                        movie_id = movie['id']
                        if movie['hasFile'] == True:
                            moviefile = getMovieFile(movie_id)
                            movie_score = 0
                            for format in moviefile:
                                for custom_format in format['customFormats']:
                                    format_name = custom_format['name']
                                    if format_name in name_score_dict:
                                        movie_score += name_score_dict[format_name]
                            if movie_score <= cutoff_score and tag_id not in movie['tags']:
                                if dry_run:
                                    dry_run_print.append(
                                        f"Would tag movie: {movie['title']} with: {tag_name}")
                                else:
                                    tag_movie(movie_id, tag_id)
                                tagged_movies += 1
                            elif movie_score > cutoff_score and tag_id in movie['tags']:
                                if dry_run:
                                    dry_run_print.append(
                                        f"Would untag movie: {movie['title']} with: {tag_name}")
                                else:
                                    untag_movie(movie_id, tag_id)
                                untagged_movies += 1
                            if movie_score <= cutoff_score:
                                cutoff_unmet += 1
                            else:
                                cutoff_met += 1
                        total_movies += 1
                if dry_run:
                    for dry_run_line in dry_run_print:
                        print(dry_run_line)
                movies_to_print = sorted(movies_to_print, key=lambda x: ' '.join(
                    [word for word in x[0].split() if word.lower() not in ['the', 'an', 'a']]))
                print(f'{" Statsistics ":*^40}', file=f)
                print(f"Total movies printed: {movies_printed}", file=f)
                print(f"Total movies tagged: {tagged_movies}", file=f)
                print(f"Total movies untagged: {untagged_movies}", file=f)
                print(f"Total movies: {total_movies}", file=f)
                print(
                    f"Total movies below cutoff score: {cutoff_unmet}", file=f)
                print(f"Total movies above cutoff score: {cutoff_met}", file=f)
                print(
                    f"Percentage of movies below cutoff score: {round(cutoff_unmet / total_movies * 100, 2)}%", file=f)
                print(f'*' * 40, file=f)
                print('', file=f)
                if requesting == 'Yes':
                    print(
                        f"Below is a list of movies below the cutoff score of {cutoff_score}\nThese are formatted to help make requests on {tracker_indexer}", file=f)
                for movie in movies_to_print:
                    movie_title = movie[0]
                    movie_year = movie[1]
                    movie_score = movie[2]
                    tmdb_id = movie[3]
                    imdb_id = movie[4]
                    print(
                        f"\tMovie: {movie_title} ({movie_year}) has a total score of " + RED + f"{movie_score}" + RESET)
                    print(f'*' * 40, file=f)
                    if requesting == 'Yes':
                        print(
                            f"{movie_title} has a total score of {movie_score}\n", file=f)
                        print(f"Movie IMDb ID: {imdb_id}", file=f)
                        print(f"Movie TMDB ID: {tmdb_id}", file=f)
                        print(f"{movie_title} ({movie_year})", file=f)
                        print(
                            f"{movie_title} ({movie_year}) - {release_group}", file=f)
                        print(
                            f"Requesting {movie_title} ({movie_year}) from {release_group}.\nThank you.", file=f)
        print('')
        print(f'{" Statsistics ":*^40}')
        print(f'Total movies: {total_movies}')
        print(f"Total movies printed: {movies_printed}")
        print(f"Total movies tagged: {tagged_movies}")
        print(f"Total movies untagged: {untagged_movies}")
        print(f"Total movies below cutoff score: {cutoff_unmet}")
        print(f"Total movies above cutoff score: {cutoff_met}")
        print(
            f"Percentage of movies below cutoff score: {round(cutoff_unmet / total_movies * 100, 2)}%")
        print(f'*' * 40)


if __name__ == '__main__':
    main()
