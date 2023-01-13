#!/bin/bash

#    _____
#  `|  __ \
#   | |__) |___ _ __   __ _ _ __ ___   ___ _ __
#   |  _  // _ \ '_ \ / _` | '_ ` _ \ / _ \ '__|
#   | | \ \  __/ | | | (_| | | | | | |  __/ |
#   |_|  \_\___|_| |_|\__,_|_| |_| |_|\___|_|

# Usage: bash renamer.sh [options]
# Options:
# --dry-run  Perform a dry-run of the renaming process without modifying the files
# --move     Move the files after renaming them to the destination folder
# --no-move  Rename files but don't move them
# --help     Show this help message

# The script is used to rename and potentially move files in a specified directory. The script takes in two optional command line arguments:

# define the source and destination directories
source_dir='/mnt/user/data/posters'
destination_dir='/mnt/user/appdata/plex-meta-manager/assets'
log_dir=/mnt/user/data/posters/logs

# Default dry-run to false
dry_run=false
move=false
no_move=false

# function to remove characters
remove_characters() {
    # Get the current file name passed as an argument
    old_name="$1"
    new_name="$old_name"

    # replace any question mark with the word an exclimation point
    new_name=${new_name///?/!}

    # Using regular expression to check if an underscore is immediately followed by the letter "S"
    if [[ $new_name =~ _(Season) ]]; then
        # Keeping all underscores that are immediately followed by the letter "S"
        true
    else
        # Removing all underscores

        new_name=${new_name//_/}
    fi

    # using regular expression to check if a hyphen space is followed by the word "Season"
    if [[ $new_name =~ \ -\ (Season) ]]; then
        # Keeping all hyphen spaces that are followed by the word "Season"
        echo "ME1"
        true
    else
        # Removing all hyphen spaces
        echo "ME2"
        new_name=${new_name//" - "/" "}
    fi

    echo "$new_name"
}

# function to handle file renaming
rename_files() {
    # Check if log_dir exists, create it if it doesn't
    if [ ! -d "$log_dir" ]; then
        mkdir -p "$log_dir"
    fi
    log_file="$log_dir/$(date +%Y-%m-%d_%H-%M-%S).log"
    touch "$log_file"
    for file in "$source_dir"/*; do
        if [ -f "$file" ]; then
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
        fi
    done
    if $move && ! $no_move; then
        for file in "$source_dir"/*; do
            if [ -f "$file" ]; then
                echo "Moving $file to $destination_dir" >>"$log_file"
                mv "$file" "$destination_dir"/
            fi
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
display_help(){
    echo "Usage: $0 [--dry-run] [--move] [--no-move] [--help]"
    echo " --dry-run   : Dry run mode, shows changes but doesn't make them"
    echo " --move      : Move files to destination directory after being renamed"
    echo " --no-move   : Rename files but don't move them to the destination directory"
    echo " --help      : Shows this help menu"
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
    display_help
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
# v.3.1.4
