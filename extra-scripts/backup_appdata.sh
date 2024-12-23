#!/usr/bin/env bash
#                            _       _          ____             _
#      /\                   | |     | |        |  _ \           | |
#     /  \   _ __  _ __   __| | __ _| |_ __ _  | |_) | __ _  ___| | ___   _ _ __
#    / /\ \ | '_ \| '_ \ / _` |/ _` | __/ _` | |  _ < / _` |/ __| |/ / | | | '_ \
#   / ____ \| |_) | |_) | (_| | (_| | || (_| | | |_) | (_| | (__|   <| |_| | |_) |
#  /_/    \_\ .__/| .__/ \__,_|\__,_|\__\__,_| |____/ \__,_|\___|_|\_\\__,_| .__/
#           | |   | |                                                      | |
#           |_|   |_|                                                      |_|
# ====================================================
# Version: 4.4.7
# backup-appdata - A script to backup your Docker appdata
# Author: Drazzilb
# License: MIT License
# ====================================================

# <----- Do not edit below this point ----->

compress=None
dry_run=None
exclusion_list=()
no_stop_list=()
stop_list=()
use_summary=None
add_to_stop=None
add_to_no_stop=None
quiet=None
bar_color=None
unraid_notify=None
keep_backup=None
appdata_dir1=
appdata_dir2=

config_file() {
    script_path=$(dirname "$0")
    config_file="${script_path}/backup_appdata.conf"

    echo "Config File: $config_file"

    # Check if config file exists
    if [ -f "$config_file" ]; then
        # Read config file
        # shellcheck source=/dev/null
        source "$config_file"
        echo "Config file exists and is accessible."
    else
        # Use command line arguments
        # handle_options "$@"
        echo "no config file found"
        exit 0
    fi
}

check_space() {
    # Print message about checking space requirements
    verbose_output "Checking space requirements... Please wait..."
    # Get the available space in the destination directory
    available_space=$(df -P "$destination_dir" | awk 'NR==2 {print $4}')
    if [ "$compress" = "true" ]; then
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

find_new_containers() {
    # Create an empty array to store new containers
    new_containers=()
    secondary_new_containers=()
    # Iterate through all running and stopped containers
    for container in $(docker ps -a -q); do
        # Get the container name
        container_name=$(docker inspect -f '{{.Name}}' "$container" | tr -d "/")
        # Check if container is in exclusion list
        if ! [[ " ${exclusion_list[*]} " == *"$container_name"* ]]; then
            # Check if container is in stop or no_stop list
            if ! [[ " ${stop_list[*]} " == *"$container_name"* || " ${no_stop_list[*]} " == *"$container_name"* ]]; then
                # If not, add to new_containers array
                new_threshold=800
                upcoming_iteration="$container_name"
                # Print the container name and backup size and append to the load_stop_no_stop_file
                if [ ${#new_containers[@]} -gt 0 ]; then
                    total_length=0
                    for new_elements in "${new_containers[@]}"; do
                        total_length=$((total_length + ${#new_elements} + 1))
                    done
                    if [ $((total_length + ${#upcoming_iteration})) -gt $new_threshold ]; then
                        secondary_new_containers+=("$upcoming_iteration")
                    else
                        new_containers+=("$upcoming_iteration")
                    fi
                else
                    new_containers+=("$container_name")
                fi
            fi
        fi
    done
    # Check if new_containers array is not empty
    if [ ${#new_containers[@]} -gt 0 ]; then
        if [ "$add_to_stop" == true ]; then
            # Add new containers to stop_list in config file
            for new_container in "${new_containers[@]}"; do
                awk -v new_container="$new_container" '
                /^stop_list=\(/ {
                    print;
                    printf("    %s\n", new_container);
                    next;
                }
                {
                    print;
                }
                ' "$config_file" > temp && mv temp "$config_file"
            done
            for new_container in "${secondary_new_containers[@]}"; do
                awk -v new_container="$new_container" '
                /^stop_list=\(/ {
                    print;
                    printf("    %s\n", new_container);
                    next;
                }
                {
                    print;
                }
                ' "$config_file" > temp && mv temp "$config_file"
            done
        fi
        if [ "$add_to_no_stop" == true ]; then
            # Add new containers to no_stop_list in config file
            for new_container in "${new_containers[@]}"; do
                awk -v new_container="$new_container" '
                /^no_stop_list=\(/ {
                    print;
                    printf("    %s\n", new_container);
                    next;
                }
                {
                    print;
                }
                ' "$config_file" > temp && mv temp "$config_file"
            done
            for new_container in "${secondary_new_containers[@]}"; do
                awk -v new_container="$new_container" '
                /^no_stop_list=\(/ {
                    print;
                    printf("    %s\n", new_container);
                    next;
                }
                {
                    print;
                }
                ' "$config_file" > temp && mv temp "$config_file"
            done
        fi
    fi
}

create_backup() {
    # Get the container name
    local container_name="$1"
    # Create the backup path
    backup_path="$(realpath -s "$destination_dir")/$(date +%F)@$now/"
    # Create the backup path directory
    mkdir -p "$backup_path"
    # Create the backup file name
    backup_file="$(realpath -s "$destination_dir")/$(date +%F)@$now/$container_name"
    # Go to the source directory
    # Check if source_dir is a directory, if not, strip the filename
    if [ ! -d "$source_dir" ]; then
        source_dir=$(dirname "$source_dir")
    fi
    cd "$source_dir"/.. || return 
    # Get the name of the source directory
    source_dir=$(basename "$source_dir")

    if [ "$compress" == "true" ]; then
        # If compress option is set to true
        verbose_output "Backing up and compressing $container_name..."
        # check if dry_run is set to true
        if [ "$dry_run" == "true" ]; then
            # if yes set extension to tar.7z.dry_run
            extension="tar.7z.dry_run"
            dry_run 
        else
            # if dry_run is set to false
            extension="tar.7z"
            # check if exclude_file is set and exists
            if [ -n "$exclude_file" ] && [ -f "$exclude_file" ]; then
                # if yes use it to exclude files from backup
                tar --ignore-failed-read -cf - --exclude-from="$exclude_file" "$source_dir" | 7z a -si -t7z -m0=lzma2 -mx=1 -md=32m -mfb=64 -mmt=on -ms=off "$backup_file.$extension"
            else
                # if not just backup the source_dir
                tar --ignore-failed-read -cf - "$source_dir" | 7z a -si -t7z -m0=lzma2 -mx=1 -md=32m -mfb=64 -mmt=on -ms=off "$backup_file.$extension"
            fi
        fi
        # print message that compression is complete
        verbose_output "Compression of $container_name complete"
    else
        # if compress option is set to false
        verbose_output "Backing up $container_name"
        # check if dry_run is set to true
        if [ "$dry_run" == "true" ]; then
            # if yes set extension to tar.dry_run
            extension="tar.dry_run"
            dry_run
        else
            # if dry_run is set to false
            extension="tar"
            # check if exclude_file is set
            if [ -n "$exclude_file" ]; then
                # if yes use it to exclude files from backup
                echo "Exclude file $exclude_file"
                echo "backup file: $backup_file.$extension"
                tar c --checkpoint=500 --checkpoint-action=dot -X "$exclude_file" --file="$backup_file.$extension" "$source_dir"
            else
                # if not just backup the source_dir
                tar c --checkpoint=500 --checkpoint-action=dot --file="$backup_file.$extension" "$source_dir" 2>/dev/null
            fi
        fi
        # print message that backup is complete
        verbose_output "\nBackup of $container_name complete"
    fi
}

# Function to print information about the container
info_function() {
    local container_name="$1"
    local container_list_name="$2"
    declare -n container_info="$container_list_name"

    container_size=$(du -sh "$backup_file.$extension" | awk '{print $1}')
    threshold=1000
    upcoming_iteration="Container: $container_name Backup size: $container_size"
    # Print the container name and backup size and append to the load_stop_no_stop_file
    if [ ${#container_info[@]} -gt 0 ]; then
        total_length=0
        for elements in "${container_info[@]}"; do
            total_length=$((total_length + ${#elements} + 1))
        done
        if [ $((total_length + ${#upcoming_iteration})) -gt $threshold ]; then
            container_info+=("$upcoming_iteration")
        else
            container_info+=("$upcoming_iteration")
        fi
    else
        container_info+=("Container: $container_name Backup size: $container_size")
    fi

    verbose_output "Container: $container_name Backup size: $container_size"
    # Get the size of the destination directory
    full_size=$(du -sh "$destination_dir" | awk '{print $1}')
    # Get the size of the backup_path directory
    run_size=$(du -sh "$backup_path" | awk '{print $1}')

}

dry_run() {
    echo "Dry run: Would create $backup_file.$extension"
    touch "$backup_file.$extension"
}
# Function to check if a container exists
check_container_exists() {
    # Get the container ID using the container name
    if [ -z "$(docker ps -a --filter "name=$1" -q)" ]; then
        # If the container ID is empty, the container does not exist
        echo "Error: Container $1 does not exist... Skipping..."
        # Add the container to the non_existent_containers array
        non_existent_containers+=("$1")
        # Set container_exists to false
        container_exists=false
    else
        # If the container ID is not empty, the container exists
        container_exists=true
    fi
}

# Send unraid notificaiton
unraid_notification() {
    # Send a notification to the user with the title "Unraid Server Notice", a subject "Appdata Backup", the message containing the backup status and an icon "normal"
    /usr/local/emhttp/webGui/scripts/notify -e "Unraid Server Notice" -s "Appdata Backup" -d "Appdata backup complete" -i "normal"
}

# Function to stop and start a container
stop_start_container() {
    # Get the container name
    local container_name="$1"
    # Get the status of the container (running or not)
    container_status=$(docker inspect -f '{{.State.Running}}' "$container_name")
    # Check if the container is running
    if [ "$container_status" == "true" ]; then
        if [ "$dry_run" == "false" ]; then
            # check the space
            check_space
        fi
        verbose_output "Stopping container, $container_name before creating backup"
        # Check if dry_run is set to false
        if [ "$dry_run" == "false" ]; then
            # Stop the container
            docker stop "$container_name"
        fi
        # create backup
        create_backup "$container_name"
        # print information about the container
        info_function "$container_name" container_stop_list
        was_running=true
    else
        # if container not running
        verbose_output "Container $container_name is not running"
        # check the space
        if [ "$dry_run" == "false" ]; then
            # check the space
            check_space
        fi
        # create backup
        create_backup "$container_name"
        # print information about the container
        info_function "$container_name" container_stop_list
        was_running=false
    fi
    # check if container was running before stopping
    if [ "$was_running" == "true" ]; then
        verbose_output "Restarting container $container_name..."
        # check if dry_run is set to false
        if [ "$dry_run" == "false" ]; then
            # start the container
            docker start "$container_name"
        fi
    else
        # if container was not running before stopping
        verbose_output "Container: $container_name was not running prior to backup, not restarting"
    fi
}

# Function to get config and appdata paths for a container
get_paths() {
    # Get the container name
    container_name="$1"
    # Get the config path of the container
    output=$(docker inspect -f '{{json .Mounts}}' "$container_name" | jq -r '.[] | select(.Destination | test("^/config")) | .Source')
    if [ -n "$output" ]; then
        config_path_basename=$(echo $output | xargs basename)
    fi
    if [ -n "$DOCKER_ENV" ]; then
        config_paths="${APPDATA_PATH}/${config_path_basename}"
    else
        config_paths=$(docker inspect -f '{{json .Mounts}}' "$container_name" | jq -r '.[] | select(.Destination | test("^/config")) | .Source')
    fi
    # if config paths has more than 1 entry itterate over them
    if [ "$(echo "$config_paths" | wc -w)" -gt 1 ]; then
        for config_path in $config_paths; do
            # if config path is empty skip over it
            if [ -z "$config_path" ]; then
                continue
            fi
            # if config path is $config_path/$container_name save config_path as this path
            if [ -d "$config_path/$container_name" ]; then
                config_path="$config_path/$container_name"
                break
            fi
        done
    else
        # If no config_path_basename
        if [ -z "$config_path_basename" ]; then
            config_path=""
        else
            config_path="$(echo "$config_paths" | tr '\n' ' ' | sed 's/ *$//')"
        fi
    fi
    
    # Check if config path is empty
    if [ -z "$config_path" ]; then
        # Get the appdata path of the container
        appdata_path=$(docker inspect -f '{{json .Mounts}}' "$container_name" | jq -r '.[] | select(.Source | test("^'"$appdata_dir1"'|^'"$appdata_dir2"'")) | .Source' | head -n1)
        # Check if appdata path is empty
        if [ -z "$appdata_path" ]; then
            # Skip over the container if it does not use appdata
            echo "Container $container_name does not use appdata, skipping over."
            # Remove the container's entry from the config file
            sed -i "/^[[:space:]]*$container_name$/d" "$config_file"
            # Add the container's name to the exclusion list
            awk -v new_container="$container_name" '
            /^exclusion_list=\(/ {
                print;
                printf("    %s        # Container automatically added here due to no appdata dir\n", new_container);
                next;
            }
            {
                print;
            }
            ' "$config_file" > temp && mv temp "$config_file"
            verbose_output "-----------------------------------"
            return
        else
            # Set the source directory to the appdata path
            if [ -n "$DOCKER_ENV" ]; then
                # get mount path from appdata_1 or appdata 2
                appdata_path_basename=$(echo $appdata_path | xargs basename)
                source_dir="${APPDATA_PATH}/${appdata_path_basename}"
            else
                source_dir="$(echo "$appdata_path" | tr '\n' ' ' | sed 's/ *$//')"
            fi
        fi
    else
        # Set the source directory to the config path
        source_dir="$config_path"
    fi
    echo "Source Directory: $source_dir"
}

# backup_prep() is a function that takes in two arrays: stop_list and no_stop_list
backup_prep() {
    # Initialize an array to hold valid container names from stop_list
    valid_stop_list=()
    # Initialize an array to hold container names that were removed from the config file
    removed_containers=()
    secondary_removed_containers=()
    # Check if the stop_list array is not empty
    if [ ${#stop_list[@]} -gt 0 ]; then
        verbose_output "-----------------------------------"
    fi
    # Iterate through each container in the stop_list array
    for i in "${!stop_list[@]}"; do
        stop_container="${stop_list[i]}"
        # Check if the container exists
        check_container_exists "$stop_container"
        if $container_exists; then
            # If the container exists, add it to the valid_stop_list array
            valid_stop_list+=("$stop_container")
            # Get the paths of the container
            get_paths "$stop_container"
            if [ -z "$source_dir" ]; then
                continue
            fi
            # Stop the container
            stop_start_container "$stop_container"
        else
            removed_threshold=500
            upcoming_iteration="$stop_container"
            if [ ${#removed_containers[@]} -gt 0 ]; then
                total_length=0
                for removed_elements in "${removed_containers[@]}"; do
                    total_length=$((total_length + ${#removed_elements} + 1))
                done
                if [ $((total_length + ${#upcoming_iteration})) -gt $removed_threshold ]; then
                    secondary_removed_containers+=("$upcoming_iteration")
                else
                    removed_containers+=("$upcoming_iteration")
                fi
            else
                removed_containers+=("$stop_container")
            fi
            # Remove the container from the config file
            sed -i "/^[[:space:]]*$stop_container$/d" "$config_file"
        fi
        # Add a separator between container output
        if [ "$i" -lt $((${#stop_list[@]} - 1)) ]; then
            verbose_output "-----------------------------------"
        fi
    done
    # Update the stop_list array with only valid container names
    stop_list=("${valid_stop_list[@]}")

    # Check if the no_stop_list array is not empty
    if [ ${#no_stop_list[@]} -gt 0 ]; then
        verbose_output "-----------------------------------"
    fi
    # Initialize an array to hold valid container names from no_stop_list
    valid_no_stop_list=()
    # Iterate through each container in the no_stop_list array
    for i in "${!no_stop_list[@]}"; do
        no_stop_container="${no_stop_list[i]}"
        # Check if the container exists
        check_container_exists "$no_stop_container"
        if $container_exists; then
            # If the container exists, add it to the valid_no_stop_list array
            valid_no_stop_list+=("$no_stop_container")
            # Get the paths of the container
            get_paths "$no_stop_container"
            if [ -z "$source_dir" ]; then
                continue
            fi
            # check the space
            if [ "$dry_run" == "false" ]; then
                # check the space
                check_space
            fi
            # Create a backup of the container
            create_backup "$no_stop_container"
            # Print information about the container
            info_function "$no_stop_container" container_no_stop_list
        else
            # If the container does not exist, add it to the removed_containers array
            removed_threshold=500
            upcoming_iteration="$no_stop_container"
            if [ ${#removed_containers[@]} -gt 0 ]; then
                total_length=0
                for no_removed_elements in "${removed_containers[@]}"; do
                    total_length=$((total_length + ${#no_removed_elements} + 1))
                done
                if [ $((total_length + ${#upcoming_iteration})) -gt $removed_threshold ]; then
                    secondary_removed_containers+=("$upcoming_iteration")
                else
                    removed_containers+=("$upcoming_iteration")
                fi
            else
                removed_containers+=("$no_stop_container")
            fi
            # Remove the container from the config file
            sed -i "/^[[:space:]]*$no_stop_container$/d" "$config_file"
        fi
        # Add a separator between container output
        if [ "$i" -lt $((${#no_stop_list[@]} - 1)) ]; then
            verbose_output "-----------------------------------"
        fi
    done
    # Print a separator between container output
    verbose_output "-----------------------------------"
    # Update the no_stop_list array with only valid container names
    no_stop_list=("${valid_no_stop_list[@]}")
}

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
        run_output="Appdata backup completed in $seconds seconds"
    # Check if hours is 0 but minutes isn't
    elif ((hours == 0)); then
        # Set the output string indicating that the backup completed in minutes and seconds
        run_output="Appdata backup completed in $minutes minutes and $seconds seconds"
    # If minutes and hours are not 0
    else
        # Set the output string indicating that the backup completed in hours, minutes and seconds
        run_output="Appdata backup completed in $hours hours $minutes minutes and $seconds seconds"
    fi
}

send_notification() {
    # Get current time in UTC format
    get_ts=$(date -u -Iseconds)
    # Get a random joke from the specified file
    # Check if the webhook is for discord
    if [[ "$webhook" =~ ^https://discord\.com/api/webhooks/ ]]; then
        joke=$(curl -s https://raw.githubusercontent.com/Drazzilb08/daps/master/jokes.txt | shuf -n 1 | sed 's/"/\\"/g')
        discord_common_fields
        bot_name="Notification Bot"
        # Call the discord_payload function to construct the payload
        if [ ${#new_container[@]} -gt 0 ]; then
            joke=$(curl -s https://raw.githubusercontent.com/Drazzilb08/daps/master/jokes.txt | shuf -n 1 | sed 's/"/\\"/g')
            new_container_notification
            new_container_response=$(curl -s -H "Content-Type: application/json" -X POST -d "$payload" "$webhook")
            if [ "$dry_run" == "true" ]; then
                echo "$new_container_response"
            fi
        fi
        if [ ${#removed_containers[@]} -gt 0 ]; then
            joke=$(curl -s https://raw.githubusercontent.com/Drazzilb08/daps/master/jokes.txt | shuf -n 1 | sed 's/"/\\"/g')
            removed_container_notification
            removed_container=$(curl -s -H "Content-Type: application/json" -X POST -d "$payload" "$webhook")
            if [ "$dry_run" == "true" ]; then
                echo "$removed_container"
            fi
        fi
        payload
        if [ "$dry_run" == "true" ]; then
            echo "$payload"
        fi
        # Send the payload to the discord webhook URL
        curl_response=$(curl -s -H "Content-Type: application/json" -X POST -d "$payload" "$webhook")
        if [ "$dry_run" == "true" ]; then
            echo "$curl_response"
        fi
    fi
    # Check if the webhook is for notifiarr
    if [[ $webhook =~ ^https://notifiarr\.com/api/v1/notification/passthrough ]]; then
        joke=$(curl -s https://raw.githubusercontent.com/Drazzilb08/daps/master/jokes.txt | shuf -n 1 | sed 's/"/\\"/g')
        notifiarr_common_fields
        # Call the notifiarr_payload function to construct the payload
        if [ ${#new_container[@]} -gt 0 ]; then
            joke=$(curl -s https://raw.githubusercontent.com/Drazzilb08/daps/master/jokes.txt | shuf -n 1 | sed 's/"/\\"/g')
            new_container_notification
            new_container_response=$(curl -s -H "Content-Type: application/json" -X POST -d "$payload" "$webhook")
            if [ "$dry_run" == "true" ]; then
                echo "$new_container_response"
            fi
        fi
        if [ ${#removed_containers[@]} -gt 0 ]; then
            joke=$(curl -s https://raw.githubusercontent.com/Drazzilb08/daps/master/jokes.txt | shuf -n 1 | sed 's/"/\\"/g')
            removed_container_notification
            removed_container=$(curl -s -H "Content-Type: application/json" -X POST -d "$payload" "$webhook")
            if [ "$dry_run" == "true" ]; then
                echo "$removed_container"
            fi
        fi
        payload
        # Send the payload to the notifiarr webhook URL
        if [ "$dry_run" == "true" ]; then
            echo "$payload"
        fi
        curl_response=$(curl -s -H "Content-Type: application/json" -X POST -d "'$payload'" "$webhook")
        if [ "$dry_run" == "true" ]; then
            echo "$curl_response"
        fi
    fi
}

notifiarr_common_fields() {
    title="title"
    text="text"
    common_fields='
{
    "notification": 
    {
        "update": false,"name": "Appdata Backup","event": ""},
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
                "title": "Appdata Backup",'
        common_fields2='
        ,"footer": "'"Powered by: Drazzilb | $joke"'"
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
    # Extract common fields for the payload
    common_fields='{
                "username": "'"${bot_name}"'",
                "embeds": 
                [
                    {
                        "title": "Appdata Backup",'
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
        "'"$title"'": "'"$title_text"':",
        "'"$text"'": "'"$text_value"'",
        "inline": false
    }'

    # Check if fields is not empty and add a comma if it is not
    if [ -n "$fields" ]; then
        field_builder=","$field_builder
    fi

    fields="$fields""$field_builder"
}

# Function to find the last occurrence of a line break before a specific index
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

payload() {
    json_stop_list=()
    json_no_stop_list=()
    container_stop_list_string=$(printf "%s\n" "${container_stop_list[@]}")
    container_no_stop_list_string=$(printf "%s\n" "${container_no_stop_list[@]}")

    container_stop_list_string_length=${#container_stop_list_string}
    container_no_stop_list_string_length=${#container_no_stop_list_string}

    # Split container_stop_list_string at line breaks
    if [ "$container_stop_list_string_length" -gt 3 ]; then
        while [ "$container_stop_list_string_length" -gt 1000 ]; do
            last_line_break=$(find_last_line_break "$container_stop_list_string" 750)
            json_stop_list+=("${container_stop_list_string:0:last_line_break}")
            container_stop_list_string="${container_stop_list_string:last_line_break+1}"
            container_stop_list_string_length=${#container_stop_list_string}
        done
        json_stop_list+=("$container_stop_list_string")
    fi

    # Split container_no_stop_list_string at line breaks
    if [ "$container_no_stop_list_string_length" -gt 3 ]; then
        while [ "$container_no_stop_list_string_length" -gt 1000 ]; do
            last_line_break=$(find_last_line_break "$container_no_stop_list_string" 750)
            json_no_stop_list+=("${container_no_stop_list_string:0:last_line_break}")
            container_no_stop_list_string="${container_no_stop_list_string:last_line_break+1}"
            container_no_stop_list_string_length=${#container_no_stop_list_string}
        done
        json_no_stop_list+=("$container_no_stop_list_string")
    fi
    
    # convert each string in json_stop_list using jq to a json object and add it to json_stop_list
    for i in "${!json_stop_list[@]}"; do
        json_stop_list[i]="\`\`\`$(jq -Rs '.' <<<"${json_stop_list[i]}" | sed -e 's/^"//' -e 's/"$//')\`\`\`"
    done
    # convert each string in json_no_stop_list using jq to a json object and add it to json_no_stop_list
    for i in "${!json_no_stop_list[@]}"; do
        json_no_stop_list[i]="\`\`\`$(jq -Rs '.' <<<"${json_no_stop_list[i]}" | sed -e 's/^"//' -e 's/"$//')\`\`\`"
    done
    field_builder "Runtime" "$run_output" "true"
    field_builder "Total size of all appdata backups today" "$run_size" "false"
    field_builder "Total size of all appdata backups" "$full_size" "false"
    if [ "$use_summary" ==  "false" ]; then
        #for each item in json_stop_list add it to the fields
        for i in "${!json_stop_list[@]}"; do
            field_builder "Containers that were stopped before backup" "${json_stop_list[i]}" "false"
        done
        #for each item in json_no_stop_list add it to the fields
        for i in "${!json_no_stop_list[@]}"; do
            field_builder "Containers that were not stopped before backup" "${json_no_stop_list[i]}" "false"
        done
    fi
    
    payload=''"$common_fields"'
        "fields":
        [
            '"$fields"'
        ]'"$common_fields2"''
}
removed_container_notification() {
    json_removed_containers_list=()

    removed_containers_string=$(printf "%s\n" "${removed_containers[@]}")
    removed_containers_string_count=$(printf "%s\n" "${removed_containers[@]}" | wc -l)

    # Split removed_containers_string at line breaks
    while [ "$removed_containers_string_count" -gt 1000 ]; do
        last_line_break=$(find_last_line_break "$removed_containers_string" 1000)
        json_removed_containers_list+=("${removed_containers_string:0:last_line_break}")
        removed_containers_string="${removed_containers_string:last_line_break+1}"
        removed_containers_string_count=$(printf "%s\n" "${removed_containers_string[@]}" | wc -l)
    done
    json_removed_containers_list+=("$removed_containers_string")

    # convert each string in json_removed_containers_list using jq to a json object and add it to json_removed_containers_list
    for i in "${!json_removed_containers_list[@]}"; do
        json_removed_containers_list[i]="\`\`\`$(jq -Rs '.' <<<"${json_removed_containers_list[i]}" | sed -e 's/^"//' -e 's/"$//')\`\`\`"
    done
    
    #for each item in json_removed_containers_list add it to the fields
    for i in "${!json_removed_containers_list[@]}"; do
        field_builder "These containers were removed from your config file and were not backed up on this run" "${json_removed_containers_list[i]}" "true"
    done
    payload=''"$common_fields"'
        "description": "Your config file has been edited:",
        "fields":
        [
            '"$fields"'
        ]'"$common_fields2"''
}
new_container_notification() {
    # Container new JSON builder
    json_new_containers_list=()
    new_containers_string=$(printf "%s\n" "${new_containers[@]}")
    new_containers_string_count=$(printf "%s\n" "${new_containers[@]}" | wc -l)

    # Split new_containers_string at line breaks
    while [ "$new_containers_string_count" -gt 1000 ]; do
        last_line_break=$(find_last_line_break "$new_containers_string" 1000)
        json_new_containers_list+=("${new_containers_string:0:last_line_break}")
        new_containers_string="${new_containers_string:last_line_break+1}"
        new_containers_string_count=$(printf "%s\n" "${new_containers_string[@]}" | wc -l)
    done
    json_new_containers_list+=("$new_containers_string")

    # convert each string in json_new_containers_list using jq to a json object and add it to json_new_containers_list
    for i in "${!json_new_containers_list[@]}"; do
        json_new_containers_list[i]="\`\`\`$(jq -Rs '.' <<<"${json_new_containers_list[i]}" | sed -e 's/^"//' -e 's/"$//')\`\`\`"
    done

    if [ "$add_to_stop" == "true" ]; then
        #for each item in json_new_containers_list add it to the fields
        for i in "${!json_new_containers_list[@]}"; do
            field_builder "These containers have been added to your stop list and were stopped before being backed up on this run" "${json_new_containers_list[i]}" "true"
        done
        field_builder "'If you wish to change this you'll need to update your config file manually:'" "" "false"
    fi
    if [ "$add_to_no_stop" == "true" ]; then
        #for each item in json_new_containers_list add it to the fields
        for i in "${!json_new_containers_list[@]}"; do
            field_builder "These containers have been added to your no stop list and were not stopped before being backed up on this run" "${json_new_containers_list[i]}" "true"
        done
        field_builder "'If you wish to change this you'll need to update your config file manually:'" "" "false"
    fi
    payload=''"$common_fields"'
        "description": "Your config file has been edited:",
        "fields":
        [
            '"$fields"'
        ]'"$common_fields2"''
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
        exit 0
    fi
}
verbose_output() {
    # Check if "quiet" variable is false
    if [ "$quiet" == false ]; then
        # Print the argument passed to the function
        echo -e "$1"
    fi
}
check_config() {
    # Check if docker is installed
    if ! command -v docker &>/dev/null; then
        echo "Docker is not installed. Please install docker and rerun."
        exit 0
    fi
    # Check if destination directory exists
    if [ ! -d "$destination_dir" ]; then
        echo "ERROR: Your destination directory ($destination_dir) does not exist please check your configuration"
        exit 0
    fi
    # Check if destination directory is set
    if [ -z "$destination_dir" ]; then
        echo "ERROR: Your source directory ($destination_dir) is not set please check your configuration"
        exit 0
    fi
    # Check if 7zip command is available if compress is set to true
    if [ "$compress" == "true" ]; then
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

cleanup() {
    find "$destination_dir" -mindepth 1 -maxdepth 1 -type d | sort -r | tail -n +"$((keep_backup + 1))" | xargs -I {} rm -rf {}
}

main() {
    # Get the current time
    container_stop_list=()
    container_no_stop_list=()
    now="$(date +"%H.%M")"
    start=$(date +%s)
    config_file
    check_config
    if ! docker --version >/dev/null 2>&1; then
        echo "Docker is not installed. Please install Docker and rerun." >&2
        exit 0
    fi
    hex_to_decimal "$bar_color"
    find_new_containers
    config_file
    backup_prep
    end=$(date +%s)
    calculate_runtime
    if [ -n "$webhook" ]; then
        send_notification
    fi
    if [ "$unraid_notify" == "true" ]; then
        unraid_notification
    fi
    cleanup
    if [ ${#new_containers[@]} -gt 0 ]; then
        printf "New containers found:\n"
        for new_container in "${new_containers[@]}"; do
            printf "    %s\n" "$new_container"
        done
        for new_container in "${secondary_new_containers[@]}"; do
            printf "    %s\n" "$new_container"
        done
        printf "Please update your stop_list or no_stop_list\n"
    fi
    # Check if any containers were removed from the config file
    if [ ${#removed_containers[@]} -gt 0 ]; then
        # Print the names of the removed containers
        printf "Containers removed from your config file:\n"
        for removed_containers in "${removed_containers[@]}"; do
            printf " %s\n" "$removed_containers"
        done
        printf "Secondary Containers removed from your config file:\n"
        for new_container in "${secondary_removed_containers[@]}"; do
            printf "    %s\n" "$removed_containers"
        done
        # Prompt the user to update their config file
        printf "Please update your config file if these were typos\n"
    fi
}

main 
