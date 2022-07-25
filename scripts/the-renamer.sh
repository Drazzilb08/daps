#!/bin/bash

#   _______ _          _____
#  |__   __| |        |  __ \
#     | |  | |__   ___| |__) |___ _ __   __ _ _ __ ___   ___ _ __
#     | |  | '_ \ / _ \  _  // _ \ '_ \ / _` | '_ ` _ \ / _ \ '__|
#     | |  | | | |  __/ | \ \  __/ | | | (_| | | | | | |  __/ |
#     |_|  |_| |_|\___|_|  \_\___|_| |_|\__,_|_| |_| |_|\___|_|

# Purpose
# I'm writing a script to rename and move files from one directory to another
# (useful for me as I download all my posters from TPDB and they don't follow TMDB naming (close though) )
# I'm having it rename the files to what I've noticed to be the naming differences between the two..

# Eg.
# TPDB uses _ instead of : where Radarr removes the : and replaces with nothing
# TPDB uses Specials for their Season 00 but more importantly PMM needs the file to be name TV SERIES_Season01 where TPDB does TV SERIES - Season 01

#------------- DEFINE VARIABLES -------------#
movies_source='/mnt/user/data/posters/input-movies'
movies_destination='/mnt/user/appdata/plex-meta-manager/pmm-movies/assets'
series_source='/mnt/user/data/posters/input-series'
series_destination='/mnt/user/appdata/plex-meta-manager/pmm-series/assets'
anime_movies_source='/mnt/user/data/posters/input-anime-movies'
anime_movies_destination='/mnt/user/appdata/plex-meta-manager/pmm-anime/assets/anime-movies'
anime_series_source='/mnt/user/data/posters/input-anime-movies'
anime_series_destination='/mnt/user/appdata/plex-meta-manager/pmm-anime/assets/anime-series'
move_files=yes #Move files manually or use the destination folders

#------------- DO NOT MODIFY BELOW THIS LINE -------------#

if [ -n "$movies_source" ]; then
    if [ -n "$(ls -A $movies_source)" ]; then
        echo "Processing Movies"
        find "$movies_source" -regex ".*_ .*" -exec bash -c 'mv -v "$0" "${0//_/}"' {} \;
        if [ "$move_files" = "yes" ]; then
            echo -e "Moving assets\n"
            mv "$movies_source"/* "$movies_destination" 2>/dev/null
            echo -e "Assets moved\n"
        else
            echo -e "Movies Processed but files were not moved.\n"
        fi
    else
        echo -e "Movies directory empty.\n"
    fi
else
    echo -e "Movies directory not set.\n"
fi
if [ -n "$series_source" ]; then
    if [ -n "$(ls -A $series_source)" ]; then
        if [ "$(find $series_source -regex ".*_Season.*" | wc -l)" -eq 0 ]; then
            echo "Processing Series"
            find "$series_source" -regex ".*_ .*" -exec bash -c 'mv -v "$0" "${0//_/}"' {} \; #Removing all underscores from string
            find "$series_source" -regex ".* - Specials.*" -exec rename -v " - Specials" "_Season00" {} \; #Replace " - Speicials" to "_Season00"
            find "$series_source" -regex ".* [1-9]\.[^.]+$" -exec rename -v " - Season " "_Season0" {} \; | sort -d #Replace " - Season " to "_Season0" for Seasons 1 through 9

            if [ "$(find "$series_source" -regex ".*[1-9][0-9]\.[^.]+$" | wc -l)" -ge 1 ]; then 
                find "$series_source" -regex ".*[1-9][0-9]\.[^.]+$" -exec rename -v ' - Season ' '_Season' {} \; | sort -d #Find season that are 10 and greater and rename them 
            fi
            if [ "$move_files" = "yes" ]; then
                echo -e "Moving assets\n"
                mv "$series_source"/* "$series_destination" 2>/dev/null
            else
                echo -e "Series Processed but files were not moved.\n"
            fi
        else
            echo -e "Found files previously processed\nMoving those files....\n"\
            find $series_source -regex ".*_Season.*" -exec mv -v -t "$series_destination" {} +
        fi
    else
        echo -e "Series directory empty.\n"
    fi
else
    echo -e "Series directory not set.\n"
fi
if [ -n "$anime_movies_source" ]; then
    if [ -n "$(ls -A $anime_movies_source)" ]; then
        echo "Processing Movies"
        find "$anime_movies_source" -regex ".*_ .*" -exec bash -c 'mv -v "$0" "${0//_/}"' {} \;
        if [ "$move_files" = "yes" ]; then
            echo -e "Moving assets\n"
            mv "$anime_movies_source"/* "$anime_movies_destination" 2>/dev/null
            echo -e "Assets moved\n"
        else
            echo -e "Movies Processed but files were not moved.\n"
        fi
    else
        echo -e "Anime Movies directory empty.\n"
    fi
else
    echo -e "Anime Movies directory not set.\n"
fi
if [ -n "$anime_series_source" ]; then
    if [ -n "$(ls -A $anime_series_source)" ]; then
        if [ "$(find $anime_series_source -regex ".*_Season.*" | wc -l)" -eq 0 ]; then
            echo "Processing Series"
            find "$anime_series_source" -regex ".*_ .*" -exec bash -c 'mv -v "$0" "${0//_/}"' {} \;
            find "$anime_series_source" -regex ".* - Specials.*" -exec rename -v " - Specials" "_Season00" {} \;
            find "$anime_series_source" -regex ".* [1-9]\.[^.]+$" -exec rename -v " - Season " "_Season0" {} \; | sort -d

            if [ "$(find "$anime_series_source" -regex ".*[1-9][0-9]\.[^.]+$" | wc -l)" -ge 1 ]; then
                find "$anime_series_source" -regex ".*[1-9][0-9]\.[^.]+$" -exec rename -v ' - Season ' '_Season' {} \; | sort -d
            fi
            if [ "$move_files" = "yes" ]; then
                echo -e "Moving assets\n"
                mv "$anime_series_source"/* "$anime_series_destination" 2>/dev/null
            else
                echo -e "Series Processed but files were not moved.\n"
            fi
        else
            echo -e "Found files previously processed\nMoving those files....\n"
            find $anime_series_source -regex ".*_Season.*" -exec mv -v -t "$anime_series_destination" {} +
        fi
    else
        echo -e "Anime Series directory empty.\n"
    fi
else
    echo -e "Anime Series directory not set.\n"
fi
echo -e "\nAll Done\n"
exit
#
# v1.1.1