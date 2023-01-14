#!/bin/bash

#     _ _____  _    _ _____        _____  _____  
#    (_)  __ \| |  | |  __ \ /\   |  __ \|  __ \ 
#     _| |  | | |  | | |__) /  \  | |__) | |__) |
#    | | |  | | |  | |  ___/ /\ \ |  _  /|  _  / 
#    | | |__| | |__| | |  / ____ \| | \ \| | \ \ 
#    | |_____/ \____/|_| /_/    \_\_|  \_\_|  \_\
#   _/ |                                         
#  |__/                                          
#

downloads_dir='/path/to/downloads'
media_dir='/path/to/media'

include=(
    # "Add a folder that is further down in your media dir"
)

use_discord=false
webhook=''
bot_name='Notification Bot'
bar_color='16776960'

check_duplicate_script() {
    LOCKFILE="/tmp/jdupes.lock"

    if [ -e "${LOCKFILE}" ] && kill -0 "$(cat "${LOCKFILE}")"; then
        echo "Another instance of the script is already running"
        exit
    fi

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

display_help() {
    echo "Usage: $0 [--bot-name] [--bar-color] [--use-discord] [--help]"
    echo "This script monitors your media directory for media that isn't hardlinked"
    echo "Options:"
    echo "--bot-name      : Set the bot name for discord notifications (default: Notification Bot)"
    echo "--bar-color     : Set the bar color for discord notifications supports Hex or Decimal colors (default: 16776960)"
    echo "--use-discord   : Set to true to use discord notifications, false to not use (default: false)"
    echo "--help          : Show this help message"
}

check_config() {
    if [ -z "$downloads_dir" ]; then
        echo "ERROR: Your download directory is not set, please check your configuration"
        exit
    fi
    if [ ! -d "$downloads_dir" ]; then
            echo "ERROR: Your download directory does not exist, please check your configuration"
            exit
        fi
    if [ -z "$media_dir" ]; then
        echo "ERROR: Your media directory is not set, please check your configuration"
        exit
    fi
    if [ ! -d "$media_dir" ]; then
            echo "ERROR: Your media directory does not exist, please check your configuration"
            exit
        fi
    if [ -z "$webhook" ]; then
        read -p "Please enter your Discord webhook url: " webhook
        if [ -z "$webhook" ]; then
            echo "ERROR: No webhook provided, please enter a valid webhook url"
            exit 1
        else
            sed "s|webhook=''|webhook='$webhook'|" "$0" >/tmp/tempfile
            mv /tmp/tempfile "$0"
        fi
    fi
}

find_duplicates() {
    start=$(date +%s)
    if [ ${#include[@]} -eq 0 ]; then
        jdupes -r -L -A -X onlyext:mp4,mkv,avi "${downloads_dir}" "${media_dir}"
    else
        for ((i = 0; i < ${#include[@]}; i++)); do
            jdupes -r -L -A -X onlyext:mp4,mkv,avi "${downloads_dir}" "${media_dir}/${include[$i]}"
        done
    fi
    end=$(date +%s)
}

calculate_runtime() {
    total_time=$((end - start))
    seconds=$((total_time % 60))
    minutes=$((total_time % 3600 / 60))
    hours=$((total_time / 3600))

    if ((minutes == 0 && hours == 0)); then
        run_output="jDupes completed in $seconds seconds"
    elif ((hours == 0)); then
        run_output="jDupes completed in $minutes minutes and $seconds seconds"
    else
        run_output="jDupes completed in $hours hours $minutes minutes and $seconds seconds"
    fi
}

send_notification() {
    get_ts=$(date -u -Iseconds)
    joke=$(curl -s https://raw.githubusercontent.com/Drazzilb08/userScripts/dev/jokes.txt | shuf -n 1)
    echo "$run_output"
    if [ "$use_discord" == "true" ]; then
        generate_payload
        echo -e "Discord notification sent.\n"
        curl -s -H "Content-Type: application/json" -X POST -d "$payload" "$webhook"
    else
        echo "$run_output"
    fi
}
generate_payload() {
    payload='{
        "username": "'"${bot_name}"'",
        "embeds": 
        [
            {
                "title": "jDupes",
                "description": "'"jDupes has finished it's run."'",
                "fields": 
                [
                    {
                        "name": "Runtime:",
                        "value": "'"${run_output}"'"
                    }
                ],
                "footer": 
                {
                    "text": "'"Powered by: Drazzilb | ${joke}"'",
                    "icon_url": "https://i.imgur.com/r69iYhr.png"
                },
                "color": "'"${bar_color}"'",
                "timestamp": "'"${get_ts}"'"
            }
        ]
    }'
}

cleanup() {
    rm -f ${LOCKFILE}
    exit
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

main() {

    check_duplicate_script

    trap 'rm -f ${LOCKFILE}; exit' INT TERM EXIT
    echo $$ >${LOCKFILE}

    check_config
    find_duplicates
    calculate_runtime
    send_notification
    cleanup
}

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

main

#
# v2.0.0