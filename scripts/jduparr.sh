#!/usr/bin/env bash

#     _ _____  _    _ _____        _____  _____  
#    (_)  __ \| |  | |  __ \ /\   |  __ \|  __ \ 
#     _| |  | | |  | | |__) /  \  | |__) | |__) |
#    | | |  | | |  | |  ___/ /\ \ |  _  /|  _  / 
#    | | |__| | |__| | |  / ____ \| | \ \| | \ \ 
#    | |_____/ \____/|_| /_/    \_\_|  \_\_|  \_\
#   _/ |                                         
#  |__/                                          
# ====================================================
# Version: 3.0.1
# jDuparr - A script to find duplicate files in your media library
# Author: Drazzilb
# License: MIT License
# ====================================================


data_dir='/path/to/data/dir'            # This is the root directory for your media you want to check for duplicates
log_dir=''                              # This is the directory the logs gets written in if not set will use script's directory
                                        

# Optional for notifications on Discord through Discord webhook or Notifiarr API.
webhook=''                         # Not required if you don't want to use notifications // Leave as is if not using notifications
bot_name='Notification Bot'        # Not required if you don't want to use notifications // Leave as is if not using notifications
bar_color='FF00FF'                 # Not required if you don't want to use notifications // Leave as is if not using notifications
channel=''                         # Not required if you don't want to use notifications // Leave as is if not using notifications
debug='false'                      # Set to true to enable debug logging
unraid_notification='false'        # Set to true to enable unraid notifications

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
    # If data_dir not set
    if [ -z "$data_dir" ]; then
        echo "ERROR: data_dir not set"
        exit 1
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
            echo "You can find the channel ID by going to the channel you want to use and clicking the settings icon and selecting 'Copy ID'"
            exit 1
        fi
        # Check if webhook returns valid response code
        if [[ $webhook =~ ^https://notifiarr\.com/api/v1/notification/passthrough ]]; then
            apikey="${webhook##*/}"
            if [ "$debug" == "true" ]; then
                echo "Checking webhook validity: $webhook"
                echo "API Key: $apikey"
            fi
            response_code=$(curl --write-out "%{response_code}" --silent --output /dev/null -H "x-api-key: $apikey" "https://notifiarr.com/api/v1/user/validate")
        else
            if [ "$debug" == "true" ]; then
                echo "Checking webhook validity: $webhook" | tee -a "$log_dir/.jduparr_bash.log"
            fi
            response_code=$(curl --write-out "%{response_code}" --silent --output /dev/null "$webhook")
        fi

        if [ "$debug" == "true" ]; then
            echo "Response: $response_code" | tee -a "$log_dir/.jduparr_bash.log"
        fi
        if [ "$response_code" -eq 200 ]; then
            echo "Webhook is valid"
        else
            echo "Webhook is not valid"
            echo "Please check your webhook and try again"
        fi
    fi
}

find_duplicates() {
    start=$(date +%s)
    echo "Running jdupes pre-run" | tee "$log_dir/.jduparr_bash.log"
    if [ $debug == "true" ]; then
        echo "Running jdupes for all directories" | tee -a "$log_dir/.jduparr_bash.log"
        echo -e "Media directory: ${data_dir}" | tee -a "$log_dir/.jduparr_bash.log"
        echo -e "jdupes -r -L -X onlyext:mp4,mkv,avi ${data_dir}" | tee -a "$log_dir/.jduparr_bash.log"
    fi
    mkdir -p "$(dirname "$0")/../logs"
    echo "Start re-linking files" | tee -a "$log_dir/.jduparr_bash.log"
    results=$(jdupes -r -M -X onlyext:mp4,mkv,avi "${data_dir}")
    if [[ $results != *"No duplicates found."* ]]; then
        jdupes -r -L -X onlyext:mp4,mkv,avi "${data_dir}"
    fi
    echo "jDupes completed" | tee -a "$log_dir/.jduparr_bash.log"

    # Call the function to parse the .jduparr_bash.log file
    parse_jdupes_output
    if [ $debug == "true" ]; then
        echo -e "jdupes output: ${results}" | tee -a "$log_dir/.jduparr_bash.log"
    fi
    end=$(date +%s)
}

parse_jdupes_output(){
    if [[ $results != *"No duplicates found."* ]]; then
        field_message="❌ Unlinked files discovered..."
        parsed_log=$(echo "$results" | awk -F/ '{print $NF}' | sort -u)
    else
        field_message="✅ No unlinked files discovered..."
        parsed_log="No hardlinks created"
    fi
    if [ $debug == "true" ]; then
        echo -e "Parsed log: ${parsed_log}" | tee -a "$log_dir/.jduparr_bash.log"
    fi
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
    joke=$(curl -s https://raw.githubusercontent.com/Drazzilb08/userScripts/master/jokes.txt | shuf -n 1)
    if [ -n "$webhook" ]; then
        if [[ "$webhook" =~ ^https://discord\.com/api/webhooks/ ]]; then
            discord_common_fields
            payload
            if [ "$debug" == "true" ]; then
                echo "$webhook" | tee -a "$log_dir/.jduparr_bash.log"
                echo "$payload" | tee -a "$log_dir/.jduparr_bash.log"
            fi
            curl -s -H "Content-Type: application/json" -X POST -d "$payload" "$webhook"
        fi
        if [[ $webhook =~ ^https://notifiarr\.com/api/v1/notification/passthrough ]]; then
            notifiarr_common_fields
            payload
            if [ "$debug" == "true" ]; then
                echo "$webhook" | tee -a "$log_dir/.jduparr_bash.log"
                echo "$payload" | tee -a "$log_dir/.jduparr_bash.log"
            fi
            curl -s -H "Content-Type: application/json" -X POST -d "$payload" "$webhook"
        fi
    fi
}

find_last_line_break() {
    local input_string="$1"
    local index=$2
    for ((i = index; i >= 0; i--)); do
        if [ "${input_string:i:1}" == $'\n' ]; then
            echo "$i"
            return
        fi
    done
    echo "-1"
}

field_builder() {
    local field_builder
    local title_text="$1"
    local text_value="$2"
    local reset="$3"
    if [ "$reset" == "true" ]; then
        fields=""
    fi
    field_builder='
                    {
                        "'"$title"'": "'"$title_text"'",
                        "'"$text"'": "'"$text_value"'",
                        "inline": false
                    }'

    # Check if fields is not empty and add a comma if it is not
    if [ -n "$fields" ]; then
        field_builder=","$field_builder
    fi

    fields="$fields""$field_builder"
}

payload() {
    json_parsed_list=()
    parsed_log_length=${#parsed_log}
    # Runtime field added
    field_builder "Runtime:" "$run_output" "true"
    # if parsed_log_length is greater than 5500
    if [ "$parsed_log_length" -gt 5500 ]; then
        parsed_log="\`\`\`Whoah buddy, that's a lot of files.\nDiscord only allows 6000 characters per message.\`\`\`"
        field_builder "Files Relinked:" "$parsed_log" "true"
    else
        parsed_list_string=$(printf "%s\n" "${parsed_log[@]}")
        if [ "$parsed_log_length" -gt 3 ]; then
            while [ "$parsed_log_length" -gt 1000 ]; do
                last_line_break=$(find_last_line_break "$parsed_list_string" 1024)
                json_parsed_list+=("${parsed_list_string:0:$last_line_break}")
                parsed_list_string="${parsed_list_string:$last_line_break+1}"
                parsed_log_length=${#parsed_list_string}
            done
            json_parsed_list+=("$parsed_list_string")
        fi
        for i in "${!json_parsed_list[@]}"; do
            json_parsed_list[i]="\`\`\`$(jq -Rs '.' <<<"${json_parsed_list[i]}" | sed -e 's/^"//' -e 's/"$//')\`\`\`"
        done
        # for each item in json_parsed_list, add it to the fields
        first_run=true
        for i in "${!json_parsed_list[@]}"; do
            if [ "$first_run" == "true" ]; then
                field_builder "$field_message Files Relinked:" "${json_parsed_list[i]}" "false"
                first_run=false
            else
                field_builder "Files Relinked:" "${json_parsed_list[i]}" "false"
            fi
        done
    fi
    payload=''"$common_fields"'
                "description": "'"jDupes has finished its run."'",
                "fields": 
                [
                    '"$fields"'
                ],
        '"$common_fields2"''
}

notifiarr_common_fields() {
    title="title"
    text="text"
    common_fields='
{
    "notification": 
    {
        "update": false,
        "name": "'"${bot_name}"'",
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
        "text": {
            "title": "jDuparr",'
    common_fields2='
        "footer": "'"Powered by: Drazzilb | $joke"'"
        },
        "ids": 
        {
            "channel": "'"$channel"'"
        }
    }
}'
}
discord_common_fields() {
    title="name"
    text="value"
    common_fields='
    {
        "username": "'"${bot_name}"'",
        "embeds": 
        [
            {
                "title": "jDuparr",'
    common_fields2='
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

unraid_notify(){
    if [ "$results" == "No duplicates found." ]; then
        message="✅ Folder: $data_dir - Checked and validated\n➡️ No duplicates found.\n\n"
    else
        message="❌ Folder: $data_dir - Checked and validated\n➡️ Hardlinks recreated:\n$parsed_log\n\n"
    fi
    if [ "$debug" == "true" ]; then
        echo "$message" | tee -a "$log_dir/.jduparr_bash.log"
    fi
    /usr/local/emhttp/plugins/dynamix/scripts/notify -s "Script Execution Summary" -d "$message"

}

main() {

    data_dir=${data_dir%/}
    log_dir=${log_dir%/}
    # If no log dir set use script's dir
    if [ -z "$log_dir" ]; then
        log_dir="$(dirname "$0")/../logs/jduparr"
        
    fi
    handle_options "$@"
    check_duplicate_script
    check_config
    hex_to_decimal
    find_duplicates
    calculate_runtime
    if [ "$unraid_notification" == "true" ]; then
        unraid_notify
    fi
    if [ -n "$webhook" ]; then
        send_notification
    fi
    echo "$run_output" | tee -a "$log_dir/.jduparr_bash.log"
    cleanup
}

handle_options() {
    while getopts ":w:D:b:n:h:L:C:" opt; do
        case $opt in
        w) webhook="$OPTARG" ;;
        D) data_dir="$OPTARG" ;;
        b) bar_color="$OPTARG" ;;
        n) bot_name="$OPTARG" ;;
        C) channel="$OPTARG" ;;
        h) display_help ;;
        L) log_dir="$OPTARG" ;;
        \?) echo "Invalid option -$OPTARG" >&2 ;;
        esac
    done
}

main "$@"