# Author: Drazzilb
# Date: 2023-04-30
# Description: Script to check Radarr for movies that are below a certain custom format cutoff score
# Usage: python3 cutoff.py
# Requirements: Python 3, requests
# Version: 1.0
# License: MIT License

import requests
import json
import os

radarr_url = 'http://localhost:7878'
radarr_api = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'

quality_profile = 'Bluray|WEB-1080p'
cutoff_score = 1850
ignore_tags = ['web-only', 'requested']

debug = False

RED = '\033[31m'
RESET = '\033[0m'

# Get list of movies from Radarr
def getMovies():
    movies = requests.get(radarr_url + "/api/v3/movie", headers={"X-Api-Key": radarr_api}).json()
    return movies

# Get moviefile info from Radarr
def getMovieFile(movie_id):
    moviefile = requests.get(radarr_url + f"/api/v3/moviefile?movieId={movie_id}", headers={"X-Api-Key": radarr_api}).json()
    return moviefile

# Get quality profiles
def getQualityProfiles():
    quality_profiles = requests.get(radarr_url + "/api/v3/qualityprofile", headers={"X-Api-Key": radarr_api}).json()
    return quality_profiles

# Get list of tags from Radarr
def getTags():
    tags = requests.get(radarr_url + "/api/v3/tag", headers={"X-Api-Key": radarr_api}).json()
    return tags

def main():
    # Get list of movies
    movies = getMovies()
    # Get list of tags
    tags = getTags()
    # Create list of movies without the ignore tags
    movies_without_tags = [movie for movie in movies if not any(tag['label'] in ignore_tags for tag in tags if tag['id'] in movie['tags'])]
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
                for movie in movies_without_tags:
                    if movie['hasFile'] == True:
                        movie_id = movie['id']
                        if debug:
                            print(f"Calculating score for movie: {movie['title']}")
                        moviefile = getMovieFile(movie_id)
                        movie_score = 0
                        for format in moviefile:
                            for custom_format in format['customFormats']:
                                format_name = custom_format['name']
                                if format_name in name_score_dict:
                                    if debug:
                                        print(f"\tFormat: {format_name} Score: {name_score_dict[format_name]}")
                                    movie_score += name_score_dict[format_name]
                        if movie_score <= cutoff_score:
                            # Add movie to the list of movies to print
                            movies_to_print.append(movie)
                            below_cutoff_count += 1
                # Sort the movies alphabetically ignoring prefix words
                movies_to_print = sorted(movies_to_print, key=lambda x: ' '.join([word for word in x['title'].split() if word.lower() not in ['the', 'an', 'a']]))
                # Print the movies to the output file
                print(f"Total movies below cutoff score: {below_cutoff_count}")
                for movie in movies_to_print:
                    movie_title = movie['title']
                    print(f"\tMovie: {movie_title} has a total score of " + RED + f"{movie_score}" + RESET)
                    print(f"{movie_title} has a total score of {movie_score}", file=f)
        print(f"Total movies below cutoff score: {below_cutoff_count}")

if __name__ == '__main__':
    main()
