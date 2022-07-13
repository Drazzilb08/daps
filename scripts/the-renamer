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

# Rename all movies that contain an underscore and replace with nothing
echo -e "Processing...\n"
if [ ! -z "$movies_source" ]; then
    if [ ! -z "$(ls -A $movies_source)" ]; then
        echo "Processing Movies"
        cd $movies_source
        rename -v "_" "" * 2>/dev/null
        if [ "$move_files" = "yes" ]; then
            echo -e "Moving assets\n"
            mv -v $movies_source/* $movies_destination/ /dev/null 2>&1
        else
            echo "Movies Processed but files were not moved.\n"
        fi
    else
        echo -e "Movies directory empty.\n"
    fi
else
    echo -e "Movies directory not set.\n"
fi
if [ ! -z "$series_source" ]; then
    if [ ! -z "$(ls -A $series_source)" ]; then
        if [ $(find $series_source -regex ".*_Season.*" | wc -l) -eq 0 ]; then
            echo "Processing Series"
            cd $series_source
            echo -e "Removing underscores from files"
            rename -v "_" "" * /dev/null 2>&1
            rename -v " - Specials" "_Season00" * 2>/dev/null
            if [ $(find . -regex ".*[1-9][0-9]\.[^.]+$" | wc -l) -ge 1 ]; then
                rename -v " - Season" "_Season" * 2>/dev/null
            fi
            rename -v " - Season " "_Season0" * 2>/dev/null
            if [ "$move_files" = "yes" ]; then
                echo -e "Moving assets\n"
                mv -v $series_source/* $series_destination/ /dev/null 2>&1
            else
                echo "Series Processed but files were not moved.\n"
            fi
        else
            echo -e "Warning: There are files that have been processed before.\nPlease remove them and rerun."
            echo -e "$(find $series_source -regex ".*_Season.*" -printf "%f\n")\n"
        fi
    else
        echo -e "Series directory empty.\n"
    fi
else
    echo -e "Series directory not set.\n"
fi
if [ ! -z "$anime_movies_source" ]; then
    if [ ! -z "$(ls -A $anime_movies_source)" ]; then
        echo "Processing Anime Movies"
        cd $anime_movies_source
        rename -v "_" "" * 2>/dev/null
        if [ "$anime_move_files" = "yes" ]; then
            echo -e "Moving assets\n"
            mv -v $anime_movies_source/* $anime_movies_destination/ /dev/null 2>&1
        else
            echo "Anime Movies Processed but files were not moved.\n"
        fi
    else
        echo -e "Anime Movies directory empty.\n"
    fi
else
    echo -e "Anime Movies directory not set.\n"
fi
if [ ! -z "$anime_series_source" ]; then
    if [ ! -z "$(ls -A $anime_series_source)" ]; then
        if [ $(find $anime_series_source -regex ".*_Season.*" | wc -l) -eq 0 ]; then
            echo "Processing Anime Series"
            cd $anime_series_source
            echo -e "Removing underscores from files"
            rename -v "_" "" * /dev/null 2>&1
            rename -v " - Specials" "_Season00" * 2>/dev/null
            if [ $(find . -regex ".*[1-9][0-9]\.[^.]+$" | wc -l) -ge 1 ]; then
                rename -v " - Season" "_Season" * 2>/dev/null
            fi
            rename -v " - Season " "_Season0" * 2>/dev/null
            if [ "$anime_series_files" = "yes" ]; then
                echo -e "Moving assets\n"
                mv -v $anime_series_source/* $anime_series_destination/ /dev/null 2>&1
            else
                echo "Anime Series Processed but files were not moved.\n"
            fi
        else
            echo -e "Warning: There are files that have been processed before\nPlease remove them and rerun."
            echo -e "$(find $anime_series_source -regex ".*_Season.*" -printf "%f\n")\n"
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
# v1.0.0
