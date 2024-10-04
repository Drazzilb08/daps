#!/usr/bin/env bash
#  ____             _                  ______    _     _
# |  _ \           | |                |  ____|  | |   | |
# | |_) | __ _  ___| | ___   _ _ __   | |__ ___ | | __| | ___ _ __
# |  _ < / _` |/ __| |/ / | | | '_ \  |  __/ _ \| |/ _` |/ _ \ '__|
# | |_) | (_| | (__|   <| |_| | |_) | | | | (_) | | (_| |  __/ |
# |____/ \__,_|\___|_|\_\\__,_| .__/  |_|  \___/|_|\__,_|\___|_|
#                             | |
#                             |_|
# ====================================================
# Version: 3.0.6
# Backup Folder - A script to backup a folder to another folder
# Author: Drazzilb
# License: MIT License
# ====================================================

source_dir=''
destination_dir=''
webhook=''
keep_backups=2
compress=False
unraid_notify=False
quiet=False
bot_name='Notification Bot'
bar_color='FF00FF'
channel="0"

# <----- Do not edit below this point ----->

# Error Handling
check_config() {
    # Check if source directory exists
    if [ ! -d "$source_dir" ]; then
        echo "ERROR: Your source directory ($source_dir) does not exist please check your configuration"
        exit 0
    fi
    # Check if source directory is set
    if [ -z "$source_dir" ]; then
        echo "ERROR: Your source directory ($source_dir) is not set please check your configuration"
        exit 0
    fi
    # Check if destination directory exists
    if [ ! -d "$destination_dir" ]; then
        echo "ERROR: Your destination directory ($destination_dir) does not exist please check your configuration"
        mkdir -p "$destination_dir"
        echo "Destination directory created"
    fi
    # Check if destination directory is set
    if [ -z "$destination_dir" ]; then
        echo "ERROR: Your source directory ($destination_dir) is not set please check your configuration"
        exit 0
    fi
    # Check if 7zip command is available if compress is set to True
    if [ "$compress" == "True" ]; then
        command -v 7z >/dev/null 2>&1 || {
            echo -e "7Zip is not installed.\nPlease install 7Zip and rerun.\nIf on unRaid 7Zip can be found through NerdPack/NerdTools in the UnRaid appstore" >&2
            exit 0
        }
    fi
    # Check if webhook is set and in the correct format
    if [ -n "$webhook" ]; then
        if [[ ! $webhook =~ ^https://discord\.com/api/webhooks/ ]] && [[ ! $webhook =~ ^https://notifiarr\.com/api/v1/notification/passthrough ]]; then
            echo "ERROR: Invalid webhook provided please enter a valid webhook url in the format https://discord.com/api/webhooks/ or https://notifiarr.com/api/v1/notification/passthrough"
            exit 0
        fi
        # Check if channel is set if using Notifiarr
        if [[ $webhook =~ ^https://notifiarr\.com/api/v1/notification/passthrough ]] && [ -z "$channel" ]; then
            echo "ERROR: It appears you're trying to use Notifiarr as your notification agent but haven't set a channel. How will the bot know where to send the notification?"
            echo "Please use the -C or --channel argument to set the channel ID used for this notification"
            echo "You can find the channel ID by going to the channel you want to use and clicking the settings icon and selecting 'Copy ID'"
            exit 0
        fi
        # Check if webhook returns valid response code
        if [[ $webhook =~ ^https://notifiarr\.com/api/v1/notification/passthrough ]]; then
            apikey="${webhook##*/}"
            response_code=$(curl --write-out "%{response_code}" --silent --output /dev/null -H "x-api-key: $apikey" "https://notifiarr.com/api/v1/user/validate")
        else
            response_code=$(curl --write-out "%{response_code}" --silent --output /dev/null "$webhook")
        fi
        if [ "$response_code" -eq 200 ]; then
            echo "Webhook is valid"
        else
            echo "Webhook is not valid"
            echo "Backup will be created without a notification being sent"
        fi
    fi
}

check_space() {
    # Print message about checking space requirements
    verbose_output "Checking space requirements... Please wait..."
    # Get the available space in the destination directory
    available_space=$(df -P "$destination_dir" | awk 'NR==2 {print $4}')
    if [ "$compress" = "True" ]; then
        # Calculate backup size in bytes
        backup_size=$(du -s "$source_dir" | awk '{print $1}')
        # Convert byte values to MB or GB
        available_space_mb=$(echo "$available_space"/1024/1024 | awk '{printf "%.2f", $0}')
        backup_size_mb=$(echo "$backup_size"/1024/1024 | awk '{printf "%.2f", $0}')

        if [ "$backup_size" -gt "$available_space" ]; then
            # Print error message and exit if not enough space available
            echo "Error: Not enough disk space on $destination_dir. Available: $available_space_mb MB, Required: $backup_size_mb MB"
            exit 0
        fi
    else
        # Calculate backup size in bytes
        backup_size=$(du -s "$source_dir" | awk '{print $1}')
        if [ "$backup_size" -gt "$available_space" ]; then
            # Print error message and exit if not enough space available
            echo "Error: Not enough disk space on $destination_dir."
            exit 0
        fi
    fi
    # Print message that space check is complete
    verbose_output "Checking space requirements complete..."
}

# Function to display help
display_help() {
    echo "This script will backup defined folders to a defined destination, you can either archive your files (using tar) or compress them (using 7Zip)"
    echo "Options:"
    echo " -s    : Set the source directory to backup"
    echo " -d    : Set the destination directory to save the backup"
    echo " -c    : Use compression on the backup file (default: False)"
    echo " -k    : Number of daily backups to keep (default: 2)"
    echo " -u    : Use unRAID notifications for backup status (default: False)"
    echo " -q    : Run script without displaying output"
    echo " -w    : Use webhook notifications for backup status (default: False)"
    echo " -n    : Set the bot name for notifications (default: Notification Bot)"
    echo " -b    : Set the bar color for notifications supports Hex colors (default: ff00ff)"
    echo " -h    : Show this help message"
    exit 0
}

# Function to create backups of desired directory
create_backup() {
    # Print starting message
    if [ "$quiet" == False ]; then
        echo -e "Creating backup..."
    fi
    # Get the current timestamp
    start=$(date +%s)
    # Create the backup directory in the destination directory with the name of the source directory and the current date
    cd "$source_dir"/.. || exit
    folder_name=$(basename "$source_dir")
    backup_path="$destination_dir/$(date +%F)"
    backup_name="$(basename "$source_dir")"
    mkdir -p "$backup_path"
    now="$(date +"%H.%M")"

    # Check if the compress variable is True
    if [ "$compress" == "True" ]; then
        # Use tar and 7z to create a compressed archive of the source directory and save it to the backup directory
        tar -cf - "$folder_name" | 7z a -si -t7z -m0=lzma2 -mx=1 -md=32m -mfb=64 -mmt=on -ms=off "$backup_path/$backup_name-$now.tar.7z"
        backup_size=$(du -sh "$backup_path/$backup_name-$now.tar.7z" | awk '{print $1}')
    else
        # Use tar to create an archive of the source directory and save it to the backup directory
        tar -cf "$backup_path/$backup_name-$now.tar" "$folder_name"
        backup_size=$(du -sh "$backup_path/$backup_name-$now.tar" | awk '{print $1}')
    fi
    # Get the total size of the backup folder
    total_size=$(du -sh "$backup_path" | awk '{print $1}')
    # Get the end timestamp
    end=$(date +%s)
    # Calculate the runtime of the backup process
    calculate_runtime
    # Print backup complete message, backup size and runtime if verbose is True
    verbose_output "Backup complete"
    verbose_output "Backup size $total_size"
    verbose_output "$run_output"
    # Change permissions of the backup directory to 777
}

# Function to calculate script runtime
calculate_runtime() {
    # Calculate total time taken for the backup process
    total_time=$((end - start))
    # Calculate the number of seconds
    seconds=$((total_time % 60))
    # Calculate the number of minutes
    minutes=$((total_time % 3600 / 60))
    # Calculate the number of hours
    hours=$((total_time / 3600))
    # Check if minutes and hours are 0
    if ((minutes == 0 && hours == 0)); then
        # Set the output string indicating that the backup completed in seconds
        run_output="$backup_name backup completed in $seconds seconds"
    # Check if hours is 0 but minutes isn't
    elif ((hours == 0)); then
        # Set the output string indicating that the backup completed in minutes and seconds
        run_output="$backup_name backup completed in $minutes minutes and $seconds seconds"
    # If minutes and hours are not 0
    else
        # Set the output string indicating that the backup completed in hours, minutes and seconds
        run_output="$backup_name backup completed in $hours hours $minutes minutes and $seconds seconds"
    fi
}

# Function to send notification
send_notification() {
    # Get current time in UTC format
    get_ts=$(date -u -Iseconds)
    # Get a random joke from the specified file
    joke=$(curl -s https://raw.githubusercontent.com/Drazzilb08/daps/master/jokes.txt | shuf -n 1 | sed 's/"/\\"/g')
    # Check if the webhook is for discord
    if [[ $webhook =~ ^https://discord\.com/api/webhooks/ ]]; then
        # Call the discord_payload function to construct the payload
        discord_payload
        # Send the payload to the discord webhook URL
        curl -s -H "Content-Type: application/json" -X POST -d "$payload" "$webhook"
    fi
    # Check if the webhook is for notifiarr
    if [[ $webhook =~ ^https://notifiarr\.com/api/v1/notification/passthrough ]]; then
        # Call the notifiarr_payload function to construct the payload
        notifiarr_payload
        # Send the payload to the notifiarr webhook URL
        curl -s -H "Content-Type: application/json" -X POST -d "'$payload'" "$webhook" >/dev/null
    fi
}
unraid_notify() {
    /usr/local/emhttp/webGui/scripts/notify -e "Unraid Server Notice" -s "$backup_name Backup has completed" -i "normal"
}

# Function to generate Notifiarr JSON payload
notifiarr_payload() {
    payload='{
    "notification": 
    {
        "update": False,
        "name": "'"$(basename "$source_dir") Backup"'",
        "event": ""
    },
    "discord": 
    {
        "color": "'"$hex_bar_color"'",
        "ping": 
        {
            "pingUser": 0,
            "pingRole": 0
        },
        "images": 
        {
            "thumbnail": "",
            "image": ""
        },
        "text": 
        {
            "title": "'"$(basename "$source_dir") Backup"'",
            "description": "'"$(basename "$source_dir") data has been backed up"'",
            "fields": 
            [
                {
                        "name": "Runtime:",
                        "value": "'"${run_output}"'"
                    },
                    {
                        "name": "This Backup'\''s size:",
                        "value": "'"${backup_size}"'"
                    },
                    {
                        "name": "Total size of all backups:",
                        "value": "'"${total_size}"'"
                    }
            ],
            "footer": "'"Powered by: Drazzilb | $joke"'"
        },
        "ids": 
        {
            "channel": "'"$channel"'"
        }
    }
}'
}

# Function to generate Discord JSON payload
discord_payload() {
    payload='{
        "username": "'"${bot_name}"'",
        "embeds": 
        [
            {
                "title": "'"$(basename "$source_dir") Backup"'",
                "description": "'"Your backup of $(basename "$source_dir") has completed"'",
                "fields": 
                [
                    {
                        "name": "Runtime:",
                        "value": "'"${run_output}"'"
                    },
                    {
                        "name": "This Backup'\''s size:",
                        "value": "'"${backup_size}"'"
                    },
                    {
                        "name": "Total size of all backups:",
                        "value": "'"${total_size}"'"
                    }
                ],
                "footer": 
                {
                    "text": "'"Powered by: Drazzilb | ${joke}"'",
                    "icon_url": "https://i.imgur.com/r69iYhr.png"
                },
                "color": "'"${decimal_bar_color}"'",
                "timestamp": "'"${get_ts}"'"
            }
        ]
    }'
}

# Function to convert hex to decimal
hex_to_decimal() {
    # Check if input is a valid 6-digit hex color code with or without '#'
    if [[ $bar_color =~ ^\#[0-9A-Fa-f]{6}$ ]]; then
        # Strip off '#' if present
        hex_bar_color=${bar_color:1}
        # Convert hex to decimal
        decimal_bar_color=$((0x${bar_color:1}))
    elif [[ $bar_color =~ ^[0-9A-Fa-f]{6}$ ]]; then
        hex_bar_color=$bar_color
        decimal_bar_color=$((0x$bar_color))
    else
        echo "Bar color: $bar_color"
        echo -e "Invalid color format. Please provide a valid 6-digit hex color code (e.g. ff0000 for red)"
        exit 0
    fi
}

verbose_output() {
    # Check if "quiet" variable is False
    if [ "$quiet" == False ]; then
        # Print the argument passed to the function
        echo "$1"
    fi
}

cleanup() {
    # Remove oldest backups
    verbose_output "Keeping $keep_backups daily backups, removing the rest"
    find "$destination_dir" -mindepth 1 -maxdepth 1 -type d | sort -r | tail -n +"$(( $keep_backups + 1 ))" | xargs -I {} rm -rf {}
}

# Main function
main() {
    handle_options "$@"
    check_config
    hex_to_decimal "$bar_color"
    check_space
    create_backup
    if [ -n "$webhook" ]; then
        send_notification
    fi
    if [ "$unraid_notify" == True ]; then
        unraid_notify
    fi
    cleanup
}
# Define function to handle options
handle_options() {
    while getopts ":s:d:c:k:u:q:w:n:b:h:C:" opt; do
        case $opt in
            s) source_dir="$OPTARG";;
            d) destination_dir="$OPTARG";;
            c) compress="$OPTARG";;
            k) keep_backups="$OPTARG";;
            u) unraid_notify="$OPTARG";;
            q) quiet="$OPTARG";;
            w) webhook="$OPTARG";;
            n) bot_name="$OPTARG";;
            b) bar_color="$OPTARG";;
            C) channel="$OPTARG";;
            h) display_help;;
            \?) echo "Invalid option: -$OPTARG" >&2; display_help; exit 0;;
            :) echo "Option -$OPTARG requires an argument." >&2; display_help; exit 0;;
        esac
    done

}

# Call main function
main "$@"
