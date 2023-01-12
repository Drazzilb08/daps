#!/bin/bash

#   _______ _          _____
#  |__   __| |        |  __ \
#     | |  | |__   ___| |__) |___ _ __   __ _ _ __ ___   ___ _ __
#     | |  | '_ \ / _ \  _  // _ \ '_ \ / _` | '_ ` _ \ / _ \ '__|
#     | |  | | | |  __/ | \ \  __/ | | | (_| | | | | | |  __/ |
#     |_|  |_| |_|\___|_|  \_\___|_| |_|\__,_|_| |_| |_|\___|_|

# Usage: bash renamer.sh [options]
# Options:
# --dry-run  Perform a dry-run of the renaming process without modifying the files
# --move     Move the files after renaming them to the destination folder
# --no-move  Rename files but don't move them
# --help     Show this help message

# The script is used to rename and potentially move files in a specified directory. The script takes in two optional command line arguments:

# The script performs the following actions:

# It defines the source and destination directories, and a log directory where log files will be stored.
# It defines an array of characters that need to be removed from the file names.
# It defines a function remove_characters that takes the current file name and removes characters from the characters_to_remove array, and also replaces any ampersand with the word "and". It also keeps any underscores that are immediately followed by the letter "S" and removes all other underscores.
# It defines a function rename_files that loops through all files in the source directory, renames them according to the remove_characters function, and then moves them to the destination directory if the --move argument is passed, or renames the files in place if the --no-move argument is passed.
# It defines a function rotate_logs that checks if there are already 6 logs in the log directory, and if so, finds the oldest log and deletes it.
# It handles command line arguments passed to the script, and sets the dry-run, move, and no-move variables accordingly.
# It creates the log directory if it doesn't exist, creates the log file name, and calls the rename_files and rotate_logs functions.

# define the source and destination directories
source_dir="/mnt/user/data/posters"
destination_dir="/mnt/user/appdata/plex-meta-manager/assets/"
log_dir="/mnt/user/data/posters/logs"
characters_to_remove=(">" "<" "," ";" ":" "|" "~" "?" "@" "%" "^" "*" "=" "_")

# Default dry-run to false
dry_run=false
move=false
no_move=false

# function to remove characters
remove_characters() {
    local old_name=$1
    local new_name=$1
    # Replacing all characters in characters_to_remove list with nothing
    for character in "${characters_to_remove[@]}"; do
        new_name=${new_name//"$character"/}
    done
    new_name=${new_name//&/and}
    # Using regular expression to check if an underscore is immediately followed by the letter "S"
    if [[ $new_name =~ _(?=S) ]]; then
        # Keeping all underscores that are immediately followed by the letter "S"
        true
    else
        # Removing all underscores
        new_name=${new_name//_/}
    fi
    echo "$new_name"
}

# function to handle file renaming
rename_files() {
    log_file="$log_dir/$(date +%Y-%m-%d_%H-%M-%S).log"
    touch "$log_file"
    for file in "$source_dir"/*.*; do
        old_name=$(basename "$file")
        new_name=$(remove_characters "$old_name")
        # replace " - Specials" with "_Season00"
        new_name=${new_name//" - Specials"/"_Season00"}

        if [[ $new_name =~ " - Season "([0-9]+)\s* ]]; then
            season_number="${BASH_REMATCH[1]}"
            if [ "$season_number" -le 9 ]; then
                new_name=${new_name//" - Season "$season_number/"_Season0"$season_number}
            else
                new_name=${new_name//" - Season "$season_number/"_Season"$season_number}
            fi
        fi

        if [[ "$new_name" != "$old_name" ]]; then
            echo "$old_name -> $new_name"
            if ! $dry_run; then
                if $move && ! $no_move; then
                    echo "Moving $old_name to $destination_dir/$new_name" >>"$log_file"
                    mv "$file" "$destination_dir/$new_name"
                else
                    echo "Renaming $old_name to $new_name" >>"$log_file"
                    mv "$file" "$source_dir/$new_name"
                fi
            fi
        fi
    done
    if $move && ! $no_move; then
        for file in "$source_dir"/*; do
            echo "Moving $file to $destination_dir" >>"$log_file"
            mv "$file" "$destination_dir"/
        done
    fi
}


# function to handle log rotation
rotate_logs() {
    # check if there are already 6 logs
    if [[ "$(find $log_dir -type f -name "*.log" | wc -l)" -ge 6 ]]; then
        # find the oldest log and delete it
        oldest_log=$(find $log_dir -type f -printf '%T+ %p\n' | sort -r | tail -1 | awk '{print $2}')
        rm "$oldest_log"
    fi
}

# handle command line arguments
if [[ "$#" -eq 0 ]]; then
    echo "No arguments passed"
    echo "Type --help to see a list of commands"
    exit 1
fi

if [[ "$#" -gt 1 ]]; then
    echo "Too many arguments passed. Only one argument is allowed"
    echo "Type --help to see a list of commands"
    exit 1
fi

case $1 in
    --dry-run)
        dry_run=true
        ;;
    --move)
        move=true
        ;;
    --no-move)
        no_move=true
        ;;
    --help)
        echo "Usage: script.sh [--dry-run] [--move] [--no-move] [--help]"
        echo " --dry-run   : dry run mode, shows changes but doesn't make them"
        echo " --move      : move files to destination folder"
        echo " --no-move   : rename files but don't move them"
        echo " --help      : shows this help menu"
        exit 0
        ;;
    *)
        echo "Invalid argument $1"
        exit 1
        ;;
esac

rename_files
rotate_logs

#
# v.3.0.0