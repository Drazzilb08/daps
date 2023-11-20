#!/bin/bash
#              _    _ _
#             | |  | | |
#  _ __   ___ | |__| | |
# | '_ \ / _ \|  __  | |
# | | | | (_) | |  | | |____
# |_| |_|\___/|_|  |_|______|
# ====================================================
# Version: 2.0.2
# noHL - A script to find media that isn't hardlinked
# Author: Drazzilb
# License: MIT License
# ====================================================

# Define variables
source_dir='/path/to/media/'
log_dir='/path/to/log/files'
include=(
    #"Media directories"
    #"Movies"
    #"TV Shows"
    #"Anime"
)
webhook=false
webhook=''
bar_color=16776960
bot_name='Notification Bot'

# <----- Do not edit below this point ----->

# Function to display help
display_help() {
    echo "Usage: $0 [ -n | --bot-name ] [ -w | --webhook ] [ -h | --help ]"
    echo "This script monitors your media directory for media that isn't hardlinked"
    echo "Options:"
    echo " -w    --webhook         : Use webhook notifications for notifications status (Accepts Notifiarr passthrough and Discord webhooks: default: false)"
    echo " -b    --bot-name        : Set the bot name for notifications (Only works with discord webhook: default: Notification Bot)"
    echo " -h    --help            : Show this help message"
}

# Function to check for proper configuration
check_config() {
    # Check if source_dir directory exists
    if [ ! -d "$source_dir" ]; then
        echo "ERROR: Your source directory ($source_dir) does not exist please check your configuration"
        exit 2
    fi
    # Check if source_dir directory is set
    if [ -z "$source_dir" ]; then
        echo "ERROR: Your source directory ($source_dir) is not set please check your configuration"
        exit 2
    fi
    # Check if webhook is set and in the correct format
    if [ -n "$webhook" ]; then
        if [[ ! $webhook =~ ^https://discord\.com/api/webhooks/ ]] && [[ ! $webhook =~ ^https://notifiarr\.com/api/v1/notification/passthrough ]]; then
            echo "ERROR: Invalid webhook provided please enter a valid webhook url in the format https://discord.com/api/webhooks/ or https://notifiarr.com/api/v1/notification/passthrough"
            exit 1
        fi
        # Check if channel is set if using Notifiarr
        if [[ $webhook =~ ^https://notifiarr\.com/api/v1/notification/passthrough ]] && [ -z "$channel" ]; then
            echo "ERROR: It appears you're trying to use Notifiarr as your notification agent but haven't set a channel. How will the bot know where to send the notification?"
            echo "Please use the -C or --channel argument to set the channel ID used for this notification"
        fi
        # Check if channel is not set if using discord webhook
        if [[ ! $webhook =~ ^https://discord\.com/api/webhooks/ ]] && [ -z "$channel" ]; then
            echo "ERROR: It appears you're using the discord webhook and using the channel argument"
            echo "Please not the channel argument is only for Notifiarr"
        fi
        # Check if webhook returns valid response code
        response_code=$(curl --write-out "%{response_code}" --silent --output /dev/null "$webhook")
        if [ "$response_code" -ge 200 ] && [ "$response_code" -le 400 ]; then
            # Print message if quiet option is not set
            echo "Webhook is valid"
        else
            echo "Webhook is not valid"
            echo "Backup will be created without a notification being sent"
        fi
    fi
}

# Function to check for hardlinks
check_hardlinks() {
    # Print starting message
    echo "Starting Search..."
    # remove trailing slash from log_dir if it exists
    log_dir=${log_dir%%/}
    echo "log_dir: $log_dir"
    # check if the log_dir directory exists, if not create it
    if [ ! -d "$log_dir" ]; then
        echo "Directory doesn't exist, creating it"
        mkdir -p "$log_dir"
    else
        echo "Directory exists"
    fi
    # remove trailing slash from source_dir if it exists
    source_dir=${source_dir%%/}

    log_file=$log_dir/nohl.log
    # check if log file exists, if it does delete it
    if [ -f "$log_file" ]; then
        rm "$log_file"
    fi
    # Iterate through the include array
    for ((i = 0; i < ${#include[@]}; i++)); do
        # Print search message with the current include element
        echo "****** Searching ${include[$i]}... ******" | tee -a "$log_file"
        # Use find command to search for files with hard link count of 1 and the current include element directory
        find "${source_dir}/${include[$i]}" -type f -links 1 -iname '*' -printf "%f\n" | tee -a "$log_file"
        # Use awk and sed to remove unwanted characters from the file name and print it to /tmp/nohl.tmp
        find "${source_dir}/${include[$i]}" -type f -links 1 -iname '*' -printf "%f\n" | awk -F"[" '{print $1}' | sed $'s/[^[:print:]\t]//g' | tee -a /tmp/nohl.tmp >/dev/null
    done
}

# Function to send notification
send_notification() {
    # Get a random joke from a file hosted on Github
    joke=$(curl -s https://raw.githubusercontent.com/Drazzilb08/userScripts/master/jokes.txt | shuf -n 1)
    # Get the current timestamp
    get_ts=$(date -u -Iseconds)
    number_of_issues=0
    # Check if the file /tmp/nohl.tmp exists
    if [ -f "/tmp/nohl.tmp" ]; then
        # Get the number of issues in the file
        number_of_issues=$(sed -e'/^\s*$/d' /tmp/nohl.tmp | wc -l)
        # Get the list of issues in the file
        list_of_issues=$(sed -e '/^\s*$/d' -e 's/\(.*\) - S\([0-9][0-9]\)E\([0-9][0-9]\) - [0-9]* -.*/\1 - S\2E\3/' -e 's/\(.*\) {\(.*\)}/\1/' /tmp/nohl.tmp | jq -Rs . | cut -c 2- | rev | cut -c 2- | rev)
    fi
    # Check if the webhook is for discord
    if [[ $webhook =~ ^https://discord\.com/api/webhooks/ ]]; then
        # Call the discord_payload function to construct the payload
        discord_common_fields
        payload
        # Send the payload to the discord webhook URL
        curl -s -H "Content-Type: application/json" -X POST -d "$payload" "$webhook"
    fi
    # Check if the webhook is for notifiarr
    if [[ $webhook =~ ^https://notifiarr\.com/api/v1/notification/passthrough ]]; then
        # Call the notifarr_payload function to construct the payload
        notifiarr_common_fields
        payload
        # Send the payload to the notifiarr webhook URL
        curl -s -H "Content-Type: application/json" -X POST -d "'$payload'" "$webhook" >/dev/null
    fi
    # Delete the /tmp/nohl.tmp file
    rm -f /tmp/nohl.tmp
}
discord_common_fields(){
    title="name"
    text="value"
    if [ "$number_of_issues" -ge 50 ]; then
        bar_color=16711680
    elif [ "$number_of_issues" -gt 0 ] && [ "$number_of_issues" -lt 50 ]; then
        bar_color=16776960
    else
        bar_color=65280
    fi
    common_fields='{
            "username": "'"${bot_name}"'",
            "embeds":[{'
    common_fields2=',"footer":{
                        "text": "'"Powered by: Drazzilb | ${joke}"'",
                        "icon_url": "https://i.imgur.com/r69iYhr.png"},
                        "color": "'"${bar_color}"'",
                        "timestamp": "'"${get_ts}"'"}]}'
    if [ "$number_of_issues" -ge 50 ]; then
        payload=''"$common_fields"'
                    "title": "A lot of Media files not hardlinked",
                    "description": "'"Your media files has been scanned to determine what media files do not have hardlinks"'",
                    "fields":
                    [
                        {
                            "name": "Number of Issues:",
                            "value": "'"$number_of_issues"'"
                            },
                        {
                            "name": "Warning:",
                            "value": "'"You have $number_of_issues.\n\nSince you have so many and Discord only allows so many lines to be sent at once, the normal list has been removed.\n\nPlease refer to your logfile to determine what files nolonger have hardlinks"'"
                        }
                    ]'"$common_fields2"''
    fi
}
notifiarr_common_fields(){
    title="title"
    text="text"
    if [ "$number_of_issues" -ge 50 ]; then
        bar_color=FFFF00
    elif [ "$number_of_issues" -gt 0 ] && [ "$number_of_issues" -lt 50 ]; then
        bar_color=FF0000
    else
        bar_color=ff0000
    fi
    common_fields='{
    "notification": 
    {
        "update": false,
        "name": "noHL Lister",
        "event": ""
    },
    "discord": 
    {
        "color": "'"$bar_color"'",
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
        {'
    common_fields2=',
            "footer": "'"Powered by: Drazzilb | $joke"'"
        },
        "ids": 
        {
            "channel": "'"$channel"'"
        }
    }
}'
}

# Generate Notifiarr JSON payload
payload() {
    if [ "$number_of_issues" -ge 50 ]; then
        payload=''"$common_fields"'
                    "title": "A lot of Media files not hardlinked",
                    "description": "'"Your media files has been scanned to determine what media files do not have hardlinks"'",
                    "fields":
                    [
                        {
                            "'"$title"'": "Number of Issues:",
                            "'"$text"'": "'"$number_of_issues"'"
                            },
                        {
                            "'"$title"'": "Warning:",
                            "'"$text"'": "'"You have $number_of_issues.\n\nSince you have so many and Discord only allows so many lines to be sent at once, the normal list has been removed.\n\nPlease refer to your logfile to determine what files nolonger have hardlinks"'"
                        }
                    ]'"$common_fields2"''
    elif [ "$number_of_issues" -gt 0 ] && [ "$number_of_issues" -lt 50 ]; then
        payload=''"$common_fields"'
                    "title": "Some media files not hardlinked",
                    "description": "'"**List of media files that are not hardlinked:**\n\`\`\`$list_of_issues\`\`\`"'",
                    "fields":
                    [
                        {
                            "'"$title"'": "Number of Issues:",
                            "'"$text"'": "'"$number_of_issues"'"
                        }
                    ]'"$common_fields2"''
    else
        payload=''"$common_fields"'
                    "title": "All media files are hardlinked",
                    "description": "'"List of media files that are not hardlinked:\n\`\`\`No results found...\`\`\`\nGreat job everything is hardlinked.\n"'",
                    "fields": 
                    [
                        {
                            "'"$title"'": "Number of issues:","'"$text"'": "'"$number_of_issues"'"
                        }
                    ]'"$common_fields2"''
        echo -e "No results found...\nGreat job everything is hardlinked and seeding"
    fi
}

# Main function
main() {
    handle_options "$@"
    check_config
    check_hardlinks
    if [ -n "$webhook" ]; then
        send_notification
    fi
}

# Define function to handle options
handle_options() {

    # Define valid options
    valid_long_options=("webhook:" "bot-name:" "help")
    valid_short_options=("w:" "n:" "h")

    # Handle command-line options
    TEMP=$(getopt -o "${valid_short_options[*]}" --long "${valid_long_options[*]}" -n "$0" -- "$@")
    eval set -- "$TEMP"
    while true; do
        case "$1" in
        --webhook | -w)
            webhook="$2"
            shift 2
            ;;
        --bot-name | -n)
            bot_name=$2
            shift 2
            ;;
        -help | -h)
            display_help
            exit 0
            ;;
        --)
            shift
            break
            ;;
        *)
            echo "Internal error!"
            exit 1
            ;;
        esac
    done

    # Check for any remaining arguments
    for arg in "$@"; do
        echo "Invalid argument: $arg" >&2
        display_help
        exit 1
    done
}

# Call the function
main "$@"
