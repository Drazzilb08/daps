#!/bin/bash

#               _    _ _      
#              | |  | | |     
#   _ __   ___ | |__| | |     
#  | '_ \ / _ \|  __  | |     
#  | | | | (_) | |  | | |____ 
#  |_| |_|\___/|_|  |_|______|

# Usage: nohl.sh [--bot-name] [--bar-color] [--use-discord] [--help]
# This script monitors your media directory for media that isn't hardlinked
# Options:
# --bot-name      : Set the bot name for discord notifications (default: Notification Bot)
# --bar-color     : Set the bar color for discord notifications supports Hex or Decimal colors (default: 16776960)
# --use-discord   : Set to true to use discord notifications, false to not use (default: false)
# --help          : Show this help message

# Define variables
source='/mnt/user/data/media'
log_file='/mnt/user/data/scripts/logs/'
include=(
    "anime series"
    "anime movies"
    "animated series"
    "daily series"
    "documentary movies"
    "documentary series"
    "french movies"
    "french series"
    "reality series"
    "series"
    "movies"
    "childrens series"
)
use_discord=false
webhook='https://discord.com/api/webhooks/994818363169722418/e_Zd3ViJpuHMpbq7Chm5MJE585T_rr0Iue04xksI1Glb28d1UlU-7aqG6-3wXGMVXbci'
bar_color=16776960
bot_name='Notification Bot'

# Function to display help
display_help() {
    echo "Usage: $0 [--bot-name] [--bar-color] [--use-discord] [--help]"
    echo "This script monitors your media directory for media that isn't hardlinked"
    echo "Options:"
    echo "--bot-name      : Set the bot name for discord notifications (default: Notification Bot)"
    echo "--bar-color     : Set the bar color for discord notifications supports Hex or Decimal colors (default: 16776960)"
    echo "--use-discord   : Set to true to use discord notifications, false to not use (default: false)"
    echo "--help          : Show this help message"
}

# Function to convert hex to decimal
hex_to_decimal() {
    if [[ $1 =~ ^\#[0-9A-Fa-f]{6}$ ]]; then
        bar_color=$((0x${1:1}))
    elif [[ $1 =~ ^[0-9A-Fa-f]{6}$ ]]; then
        bar_color=$((0x$1))
    elif [[ $1 =~ ^[0-9]+$ ]]; then
        bar_color=$1
    else
        echo -e "Invalid color format, please provide a valid hex or decimal color.\nIf you provided hex with the # symbol remove or escape it with a backslash and re retry"
        exit 1
    fi
}

# Parse command line arguments
while [ "$1" != "" ]; do
    case $1 in
    --use-discord)
        use_discord=true
        ;;
    --bot-name)
        shift
        bot_name=$1
        ;;
    --bar-color)
        shift
        hex_to_decimal "$1"
        ;;
    --help)
        display_help
        exit 0
        ;;
    *)
        echo "Invalid argument $1"
        echo "Type --help to see a list of commands"
        exit 1
        ;;
    esac
    shift
done

# Define functions

# Function to check for proper configuration
check_config() {
    if [[ ${#include[@]} -eq 0 ]]; then
        echo -e "ERROR: Your list of directories is empty, please add at least one folder under the source folder to search for.\nSuch as movies or tv shows."
        exit 1
    fi
    if [ ! -d "$source" ]; then
        echo "ERROR: Your source directory does not exist, please check your configuration"
        exit
    fi
    if [ -z "$source" ]; then
        echo "ERROR: Your source directory is not set, please check your configuration"
        exit
    fi
    if [ -n "${log_file}" ] && [ ! -d "$log_file" ]; then
        echo "ERROR: log_file set but the directory does not exist, please check your configuration"
        exit
    fi
    if [ -n "${log_file}" ] && [ -f "$log_file/nohl.log" ]; then
        rm -f "$log_file/nohl.log" # remove log file before each run
    fi
    if [ -z "$webhook" ]; then
        read -p "Please enter your Discord webhook url: " webhook
        if [ -z "$webhook" ]; then
            echo "ERROR: No webhook provided, please enter a valid webhook url"
            exit 1
        else
            sed -i "s|webhook='https://discord.com/api/webhooks/994818363169722418/e_Zd3ViJpuHMpbq7Chm5MJE585T_rr0Iue04xksI1Glb28d1UlU-7aqG6-3wXGMVXbci'|webhook='$webhook'|" "$0"
        fi
    fi
}

# Function to check for hardlinks

check_hardlinks() {
    echo "Starting Search..."
    for ((i = 0; i < ${#include[@]}; i++)); do
        echo "****** Searching ${include[$i]}... ******" | tee -a ${log_file}/nohl.log
        find "${source}/${include[$i]}" -type f -links 1 -iname '*' -printf "%f\n" | tee -a ${log_file}/nohl.log
        find "${source}/${include[$i]}" -type f -links 1 -iname '*' -printf "%f\n" | awk -F"[" '{print $1}' | sed $'s/[^[:print:]\t]//g' | tee -a /tmp/nohl.tmp >/dev/null
    done
}

# Function to send discord notification

send_discord_notification() {
    joke=$(curl -s https://raw.githubusercontent.com/Drazzilb08/userScripts/dev/jokes.txt | shuf -n 1)
    get_ts=$(date -u -Iseconds)
    if [ "$use_discord" == true ]; then
        number_of_issues=0
        if [ -f "/tmp/nohl.tmp" ]; then
            number_of_issues=$(sed -e'/^\s*$/d' /tmp/nohl.tmp | wc -l)
            list_of_issues=$(sed -e '/^\s*$/d' -e 's/\(.*\) - S\([0-9][0-9]\)E\([0-9][0-9]\) - [0-9]* -.*/\1 - S\2E\3/' -e 's/\(.*\) {\(.*\)}/\1/' /tmp/nohl.tmp | jq -Rs . | cut -c 2- | rev | cut -c 2- | rev)
        fi
        generate_payload
        curl -s -H "Content-Type: application/json" -X POST -d "$payload" "$webhook"

    fi
    rm -f /tmp/nohl.tmp
}
generate_payload() {
    if [ "$number_of_issues" -lt 50 ]; then
        if [ "$bar_color" == 16776960 ]; then
            bar_color=16776960
        fi
        payload='{
            "username": "'"${bot_name}"'",
            "embeds":
            [
                {
                    "title": "Some media files not hardlinked",
                    "description": "'"**List of media files that are not hardlinked:**\n\`\`\`$list_of_issues\`\`\`"'",
                    "fields":
                    [
                        {
                            "name": "Number of Issues:",
                            "value": "'"$number_of_issues"'"
                        }
                    ],
                    "footer":
                    {
                        "text": "'"Powered by: Drazzilb | ${joke}"'",
                        "icon_url": "https://i.imgur.com/r69iYhr.png"},
                        "color": "'"${bar_color}"'",
                        "timestamp": "'"${get_ts}"'"
                }
            ]
        }'

    fi
    if [ "$number_of_issues" -gt 50 ]; then
        if [ "$bar_color" == 16776960 ]; then
            bar_color=16711680
        fi
        payload='{
            "username": "'"${bot_name}"'",
            "embeds":
            [
                {
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
                            "value": "'"You have $number_of_issues.\n\nSince you have so many and Discord only allows so many lines to be sent at once, the normal list has been removed.\n\nPlease refer to your logfile to determine what files nolonger have hardlinks."'"
                        }
                    ],
                    "footer":
                    {
                        "text": "'"Powered by: Drazzilb | ${joke}"'",
                        "icon_url": "https://i.imgur.com/r69iYhr.png"},
                        "color": "'"${bar_color}"'",
                        "timestamp": "'"${get_ts}"'"
                }
            ]
        }'
    fi
    if [ "$number_of_issues" -eq 0 ]; then
        if [ "$bar_color" == 16776960 ]; then
            bar_color=65280
        fi
        payload='{
            "username": "'"${bot_name}"'",
            "embeds": 
            [
                {
                    "title": "All media files are hardlinked",
                    "description": "'"List of media files that are not hardlinked:\n\`\`\`No results found...\`\`\`\nGreat job everything is hardlinked.\n"'",
                    "fields": 
                    [
                        {
                            "name": "Number of issues:","value": "'"$number_of_issues"'"
                        }
                    ],
                    "footer": 
                    {
                        "text": "'"Powered by: Drazzilb | ${joke}"'",
                        "icon_url": "https://i.imgur.com/r69iYhr.png"},
                        "color": "'"${bar_color}"'",
                        "timestamp": "'"${get_ts}"'"}]}'
        echo -e "No results found...\nGreat job everything is hardlinked and seeding"
    fi
}
# Main function

main() {
    check_config
    check_hardlinks
    send_discord_notification
}

# Call main function

main

#
# v 2.0.0
