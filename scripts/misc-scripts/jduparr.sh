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
webhook=''
bot_name='Notification Bot'
bar_color='FF00FF'
channel=''

include=(
    # "Add a folder that is further down in your media dir"
    # "Use this if you have your downlaods inside the same parrent directory as your media"
    # "Such as ../media/downloads"
    # "Such as ../media/movies"
    # "Such as ../media/shows"
    # "This should account for that"
)

# <----- Do not edit below this point ----->

check_duplicate_script() {
    script_name=${0##*/}
    lockfile="/tmp/${script_name}.lock"

    # Check if lockfile exists
    if [ -e "$lockfile" ]; then
        # Check if process listed in lockfile is still running
        pid=$(cat "$lockfile")
        if [ -d "/proc/$pid" ]; then
            # If process is still running, exit script
            echo "Another instance of the script is already running"
            exit
        else
            # If process is not running, remove stale lockfile
            rm -f "$lockfile"
        fi
    fi

    # Create lockfile with current process ID
    echo $$ >"$lockfile"
}

# Function to display help
display_help() {
    echo "Usage: $0 [ -n | --bot-name ] [ -b | --bar-color ] [ -w | --webhook ] [ -h | --help ]"
    echo "This script monitors your media directory for media that isn't hardlinked"
    echo "Options:"
    echo " -w    --webhook         : Use webhook notifications for backup status (default: false)"
    echo " -b    --bot-name        : Set the bot name for notifications (default: Notification Bot)"
    echo " -b    --bar-color       : Set the bar color for notifications supports Hex or Decimal colors (default: 16776960)"
    echo " -h    --help            : Show this help message"
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
        if [ "$response_code" -ge 200 ] && [ "$response_code" -lt 400 ]; then
            # Print message if quiet option is not set
            echo "Webhook is valid"
        else
            echo "Webhook is not valid"
            echo "Backup will be created without a notification being sent"
        fi
    fi
}

find_duplicates() {
    start=$(date +%s)
    if [ ${#include[@]} -eq 0 ]; then
        jdupes -r -L -A -X onlyext:mp4,mkv,avi "${downloads_dir}" "${media_dir}"
        true
    else
        for ((i = 0; i < ${#include[@]}; i++)); do
            jdupes -r -L -A -X onlyext:mp4,mkv,avi "${downloads_dir}" "${media_dir}/${include[$i]}"
            true
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

hex_to_decimal() {
    # Check if input is a valid 6-digit hex color code with or withoutt '#'
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
        exit 1
    fi
}

send_notification() {
    get_ts=$(date -u -Iseconds)
    joke=$(curl -s https://raw.githubusercontent.com/Drazzilb08/userScripts/dev/jokes.txt | shuf -n 1)
    if [ -n "$webhook" ]; then
        if [[ "$webhook" =~ ^https://discord\.com/api/webhooks/ ]]; then
            discord_common_fields
            payload
            curl -s -H "Content-Type: application/json" -X POST -d "$payload" "$webhook"
        fi
        if [[ $webhook =~ ^https://notifiarr\.com/api/v1/notification/passthrough ]]; then
            notifiarr_common_fields
            payload
            curl -s -H "Content-Type: application/json" -X POST -d "$payload" "$webhook"
        fi
    else
        echo "$run_output"
    fi
}

payload() {
    payload=''"$common_fields"'
                "description": "'"jDupes has finished it's run."'",
                "fields": 
                [
                    {
                        "'"$title"'": "Runtime:",
                        "'"$text"'": "'"${run_output}"'"
                    }
                ]'"$common_fields2"''
}

notifiarr_common_fields() {
    title="title"
    text="text"
    common_fields='
    {"notification": 
    {"update": false,"name": "jDuparr","event": ""},
    "discord": 
    {"color": "'"$hex_bar_color"'",
        "ping": {"pingUser": 0,"pingRole": 0},
        "images": {"thumbnail": "","image": ""},
        "text": {"title": "jDuparr",'
    common_fields2='
            "footer": "'"Powered by: Drazzilb | $joke"'"},
            "ids": {"channel": "'"$channel"'"}}}'
}
discord_common_fields() {
    title="name"
    text="value"
    common_fields='{
                "username": "'"${bot_name}"'",
                "embeds": 
                [
                    {
                        "title": "jDuparr",'
    common_fields2=',
                        "footer": 
                        {
                            "text": "'"Powered by: Drazzilb | $joke"'"
                        },
                        "color": "'"${decimal_bar_color}"'",
                        "timestamp": "'"${get_ts}"'"
                    }
                ]
            }'
}

cleanup() {
    rm -f "${lockfile}"
    exit
}

main() {

    check_duplicate_script
    check_config
    hex_to_decimal
    find_duplicates
    calculate_runtime
    if [ -n "$webhook" ]; then
        send_notification
    fi
    cleanup
}

# Parse command line arguments
TEMP=$(getopt -o w:b:n:h --long webhook:,bar-color:,bot-name:,help -n "$0" -- "$@")
eval set -- "$TEMP"

while true; do
    case "$1" in
    -w | --webhook)
        webhook="$2"
        shift 2
        ;;
    -b | --bar-color)
        hex_to_decimal "$2"
        shift 2
        ;;
    -n | --bot-name)
        bot_name=$2
        shift 2
        ;;
    -h | --help)
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
if [ -n "$1" ]; then
    echo "Invalid argument: $1" >&2
    display_help
    exit 1
fi

# Check for any remaining arguments
if [ -n "$1" ]; then
    echo "Invalid argument: $1" >&2
    display_help
    exit 1
fi

main