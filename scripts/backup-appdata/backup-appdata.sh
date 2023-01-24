#!/bin/bash
#                            _       _          ____             _
#      /\                   | |     | |        |  _ \           | |
#     /  \   _ __  _ __   __| | __ _| |_ __ _  | |_) | __ _  ___| | ___   _ _ __
#    / /\ \ | '_ \| '_ \ / _` |/ _` | __/ _` | |  _ < / _` |/ __| |/ / | | | '_ \
#   / ____ \| |_) | |_) | (_| | (_| | || (_| | | |_) | (_| | (__|   <| |_| | |_) |
#  /_/    \_\ .__/| .__/ \__,_|\__,_|\__\__,_| |____/ \__,_|\___|_|\_\\__,_| .__/
#           | |   | |                                                      | |
#           |_|   |_|                                                      |_|
#
# v4.0.0

config_file=""

# <----- Do not edit below this point ----->

config_file() {
    if [ -z "$config_file" ]; then
        script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
        config_file="$script_dir/backup-appdata.conf"
    fi

    # Check if config file exists
    if [ -f "$config_file" ]; then
        # Read config file
        # shellcheck source=backup-appdata.conf
        . "$config_file"
    else
        # Use command line arguments
        # handle_options "$@"
        verbose_output "no config file found"
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
            exit 1
        fi
    else
        # Calculate backup size in bytes
        backup_size=$(du -s "$source_dir" | awk '{print $1}')
        if [ "$backup_size" -gt "$available_space" ]; then
            # Print error message and exit if not enough space available
            echo "Error: Not enough disk space on $destination_dir."
            exit 1
        fi
    fi
    # Print message that space check is complete
    verbose_output "Checking space requirements complete..."
}

find_new_containers() {
    # Create an empty array to store new containers
    new_containers=()
    # Iterate through all running and stopped containers
    for container in $(docker ps -a -q); do
        # Get the container name
        container_name=$(docker inspect -f '{{.Name}}' "$container" | tr -d "/")
        # Check if container is in exclusion list
        if ! [[ " ${exclusion_list[*]} " == *"$container_name"* ]]; then
            # Check if container is in stop or no_stop list
            if ! [[ " ${stop_list[*]} " == *"$container_name"* || " ${no_stop_list[*]} " == *"$container_name"* ]]; then
                # If not, add to new_containers array
                new_containers+=("$container_name")
            fi
        fi
    done
    # Check if new_containers array is not empty
    if [ ${#new_containers[@]} -gt 0 ]; then
        if [ "$add_to_stop" == true ]; then
            # Add new containers to stop_list in config file
            for new_container in "${new_containers[@]}"; do
                awk -i inplace -v new_container="$new_container" '
  /^stop_list=\(/ {
    print;
    printf("  %s\n", new_container);
    next;
  }
  {
    print;
  }
' "$config_file"
            done
        fi
        if [ "$add_to_no_stop" == true ]; then
            # Add new containers to no_stop_list in config file
            for new_container in "${new_containers[@]}"; do
                awk -i inplace -v new_container="$new_container" '
  /^no_stop_list=\(/ {
    print;
    printf("  %s\n", new_container);
    next;
  }
  {
    print;
  }
' "$config_file"
            done
        fi
        # Send notification to discord
        printf "New containers found:\n"
        for new_container in "${new_containers[@]}"; do
            printf "  %s\n" "$new_container" | tee -a "$new_container_error"
        done
        printf "Please update your stop_list or no_stop_list\n"
    fi
}

create_backup() {
    # Get the container name
    local container_name="$1"
    # Get the current time
    now="$(date +"%H.%M")"
    # Create the backup path
    backup_path="$(realpath -s "$destination_dir")/$(date +%F)/"
    # Create the backup path directory
    mkdir -p "$backup_path"
    # Create the backup file name
    backup_file="$(realpath -s "$destination_dir")/$(date +%F)/$container_name-$now"
    # Go to the source directory
    cd "$source_dir"/.. || exit
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
            # check if exclude_file is set
            if [ -n "$exclude_file" ]; then
                # if yes use it to exclude files from backup
                tar cf - --exclude-from="$exclude_file" "$source_dir" | 7z a -bsp1 -si -t7z -m0=lzma -mx=9 -mfb=64 -md=32m -ms=on "$backup_file.$extension"
            else
                # if not just backup the source_dir
                tar cf - "$source_dir" | 7z a -bsp1 -si -t7z -m0=lzma -mx=9 -mfb=64 -md=32m -ms=on "$backup_file.$extension"
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
                tar --checkpoint=500 --checkpoint-action=dot -cf "$backup_file.$extension" "$source_dir" -X "$exclude_file" 2>/dev/null
            else
                # if not just backup the source_dir
                tar --checkpoint=500 --checkpoint-action=dot -cf "$backup_file.$extension" "$source_dir" 2>/dev/null
            fi
        fi
        # print message that backup is complete
        verbose_output "Backup of $container_name complete"
    fi
}

# Function to print information about the container
info_function() {
    # Get the container name
    local container_name="$1"
    # Get the file name to save the information
    local load_stop_no_stop_file="$2"
    # Get the size of the backup file
    container_size=$(du -sh "$backup_file.$extension" | awk '{print $1}')
    # Print the container name and backup size and append to the load_stop_no_stop_file
    echo "Container: $container_name Backup size: $container_size" | tee -a "$load_stop_no_stop_file"
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
    # Initialize a message variable as an empty string
    # Send a notification to the user with the title "Unraid Server Notice", a subject "Plex Backup", the message containing the backup status and an icon "normal"
    /usr/local/emhttp/webGui/scripts/notify -e "Unraid Server Notice" -s "Plex Backup" -d "Appdata backup complete" -i "normal"
}

# Function to stop and start a container
stop_start_container() {
    # Get the container name
    local container_name="$1"
    # Get the status of the container (running or not)
    container_status=$(docker inspect -f '{{.State.Running}}' "$container_name")
    # Check if the container is running
    if [ "$container_status" == "true" ]; then
        verbose_output "Stopping container, $container_name before creating backup"
        # Check if dry_run is set to false
        if [ "$dry_run" == "false" ]; then
            # Stop the container
            docker stop "$container_name"
        fi
        # check the space
        check_space
        # create backup
        create_backup "$container_name"
        # print information about the container
        info_function "$container_name" "$container_stop_list"
        was_running=true
    else
        # if container not running
        verbose_output "Container $container_name is not running"
        # check the space
        check_space
        # create backup
        create_backup "$container_name"
        # print information about the container
        info_function "$container_name" "$container_stop_list"
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
    # Get the container ID using the container name
    container_id=$(docker ps -aqf "name=$1")
    # Get the config path of the container
    config_path=$(docker inspect -f '{{json .Mounts}}' "$container_id" | jq -r '.[] | select(.Destination | test("^/config")) | .Source' | head -n1)
    # Check if config path is empty
    if [ -z "$config_path" ]; then
        # Get the appdata path of the container
        appdata_path=$(docker inspect -f '{{json .Mounts}}' "$container_id" | jq -r '.[] | select(.Source | test("^'"$appdata_dir1"'|^'"$appdata_dir2"'")) | .Source' | grep -o -e "^$appdata_dir1/[^/]*" -e "^$appdata_dir2/[^/]*" | head -n1)
        # Set the source directory to the appdata path
        source_dir="$appdata_path"
    else
        # Set the source directory to the config path
        source_dir="$config_path"
    fi
}

# backup_prep() is a function that takes in two arrays: stop_list and no_stop_list
backup_prep() {
    # Initialize an array to hold valid container names from stop_list
    valid_stop_list=()
    # Initialize an array to hold container names that were removed from the config file
    removed_containers=()
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
            # Stop the container
            stop_start_container "$stop_container"
        else
            # If the container does not exist, add it to the removed_containers array
            removed_containers+=("$stop_container")
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
            # Create a backup of the container
            create_backup "$no_stop_container"
            # Print information about the container
            info_function "$no_stop_container" "$container_no_stop_list"
        else
            # If the container does not exist, add it to the removed_containers array
            removed_containers+=("$no_stop_container")
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
    # Check if any containers were removed from the config file
    if [ ${#removed_containers[@]} -gt 0 ]; then
        # Print the names of the removed containers
        printf "Containers removed from your config file:\n"
        for removed_container in "${removed_containers[@]}"; do
            printf " %s\n" "$removed_container" | tee -a "$container_no_exist_error"
        done
        # Prompt the user to update their config file
        printf "Please update your config file if these were typos\n"
    fi
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
    joke=$(curl -s https://raw.githubusercontent.com/Drazzilb08/userScripts/dev/jokes.txt | shuf -n 1)
    # Check if the webhook is for discord
    if [[ "$webhook" =~ ^https://discord\.com/api/webhooks/ ]]; then
        discord_common_fields
        bot_name="Notification Bot"
        # Call the discord_payload function to construct the payload
        if [ "$(wc <"$container_stop_list" -l)" -ge 1 ] || [ "$(wc <"$container_no_stop_list" -l)" -eq 1 ]; then
            new_container_notification
            curl -s -H "Content-Type: application/json" -X POST -d "$payload" "$webhook"
        fi
        if [ "$(wc <"$container_no_exist_error" -l)" -ge 1 ]; then
            removed_container_notification
            curl -s -H "Content-Type: application/json" -X POST -d "$payload" "$webhook"
        fi
        payload
        # Send the payload to the discord webhook URL
        curl -s -H "Content-Type: application/json" -X POST -d "$payload" "$webhook"
    fi
    # Check if the webhook is for notifiarr
    if [[ $webhook =~ ^https://notifiarr\.com/api/v1/notification/passthrough ]]; then
        notifiarr_common_fields
        # Call the notifarr_payload function to construct the payload
        if [ "$(wc <"$container_stop_list" -l)" -ge 1 ] || [ "$(wc <"$container_no_stop_list" -l)" -eq 1 ]; then
            new_container_notification
            curl -s -H "Content-Type: application/json" -X POST -d "$payload" "$webhook"
        fi
        if [ "$(wc <"$container_no_exist_error" -l)" -ge 1 ]; then
            removed_container_notification
            curl -s -H "Content-Type: application/json" -X POST -d "$payload" "$webhook"
        fi
        notifarr_payload
        # Send the payload to the notifiarr webhook URL
        curl -s -H "Content-Type: application/json" -X POST -d "'$payload'" "$webhook" >/dev/null
    fi
}
notifiarr_common_fields() {
    title="title"
    text="text"
    common_fields='
    {"notification": 
    {"update": false,"name": "Appdata Backup","event": ""},
    "discord": 
    {"color": "'"$hex_bar_color"'",
        "ping": {"pingUser": 0,"pingRole": 0},
        "images": {"thumbnail": "","image": ""},
        "text": {"title": "Appdata Backup",'
    common_fields2='
            "footer": "'"Powered by: Drazzilb | $joke"'"},
            "ids": {"channel": "'"$channel"'"}}}'
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
payload() {
    # Check the type of backup that was created
    if [ "$use_summary" == "true" ]; then
        payload=''"$common_fields"'
                          "fields": 
                          [
                              {
                                  "'"$title"'": "Runtime:",
                                  "'"$text"'": "'"${run_output}"'"
                              },
                              {
                                  "'"$title"'": "Total size of all appdata backups today:",
                                  "'"$text"'": "'"$run_size"'"
                              },
                              {
                                  "'"$title"'": "Total size of all appdata backups:",
                                  "'"$text"'": "'"$full_size"'"
                              }
                          ]'"$common_fields2"''
    else
        if [ "$(wc <"$container_stop_list" -l)" -ge 1 ] && [ "$(wc <"$container_no_stop_list" -l)" -eq 0 ]; then
            payload=''"$common_fields"'
                          "fields": 
                          [
                              {
                                  "'"$title"'": "Runtime:",
                                  "'"$text"'": "'"${run_output}"'"
                              },
                              {
                                  "'"$title"'": "Containers stopped and backed up:",
                                  "'"$text"'": "'"\`\`\`$(jq -Rs '.' "${container_stop_list}" | sed -e 's/^"//' -e 's/"$//')\`\`\`"'"
                              },
                              {
                                  "'"$title"'": "Total size of all appdata backups today:",
                                  "'"$text"'": "'"$run_size"'"
                              },
                              {
                                  "'"$title"'": "Total size of all appdata backups:",
                                  "'"$text"'": "'"$full_size"'"
                              }
                          ]'"$common_fields2"''
        elif [ "$(wc <"$container_stop_list" -l)" -eq 0 ] && [ "$(wc <"$container_no_stop_list" -l)" -ge 1 ]; then
            payload=''"$common_fields"'
                          "fields": 
                          [
                              {
                                  "'"$title"'": "Runtime:",
                                  "'"$text"'": "'"${run_output}"'"
                              },
                              {
                                  "'"$title"'": "Containers backed up without stopping them:",
                                  "'"$text"'": "'"\`\`\`$(jq -Rs '.' "${container_no_stop_list}" | sed -e 's/^"//' -e 's/"$//')\`\`\`"'"
                              },
                              {
                                  "'"$title"'": "Total size of all appdata backups today:",
                                  "'"$text"'": "'"$run_size"'"
                              },
                              {
                                  "'"$title"'": "Total size of all appdata backups:",
                                  "'"$text"'": "'"$full_size"'"
                              }
                          ]'"$common_fields2"''
        else
            payload=''"$common_fields"'
                          "fields": 
                          [
                              {
                                  "'"$title"'": "Runtime:",
                                  "'"$text"'": "'"${run_output}"'"
                              },
                              {
                                  "'"$title"'": "Containers backed up without stopping them:",
                                  "'"$text"'": "'"\`\`\`$(jq -Rs '.' "${container_no_stop_list}" | sed -e 's/^"//' -e 's/"$//')\`\`\`"'"
                              },
                              {
                                  "'"$title"'": "Containers stopped and backed up:",
                                  "'"$text"'": "'"\`\`\`$(jq -Rs '.' "${container_stop_list}" | sed -e 's/^"//' -e 's/"$//')\`\`\`"'"
                              },
                              {
                                  "'"$title"'": "Total size of all appdata backups today:",
                                  "'"$text"'": "'"$run_size"'"
                              },
                              {
                                  "'"$title"'": "Total size of all appdata backups:",
                                  "'"$text"'": "'"$full_size"'"
                              }
                          ]'"$common_fields2"''
        fi
    fi
}
removed_container_notification() {
    payload=''"$common_fields"'
                        "description": "Your config file has been edited:",
                        "fields": 
                        [
                            {
                                "'"$title"'": "This is a list of containers that have been removed from your config file:",
                                "'"$text"'": "'"\`\`\`$(jq -Rs '.' "${container_no_exist_error}" | sed -e 's/^"//' -e 's/"$//')\`\`\`"'"
                            },
                            {
                                "'"$title"'": "These entries were either a typo or the container was removed from your system",
                                "'"$text"'": ""
                            }
                        ]'"$common_fields2"''
}
new_container_notification() {
    if [ "$(wc <"$new_container_error" -l)" -ge 1 ] && [ "$add_to_stop" == "true" ]; then
        payload=''"$common_fields"'
                        "description": "Your config file has been edited:",
                        "fields": 
                        [
                            {
                                "'"$title"'": "These containers have been added to your stop list and were stopped before being backed up on this run",
                                "'"$text"'": "'"\`\`\`$(jq -Rs '.' "${new_container_error}" | sed -e 's/^"//' -e 's/"$//')\`\`\`"'"
                            },
                            {
                                "'"$title"'": "If you wish to change this you'\''ll need to update your config file manually",
                                "'"$text"'": "If you wish to omit any container from being automatically added add it to the exclusion_list"
                            }
                        ]'"$common_fields2"''
    fi
    if [ "$(wc <"$new_container_error" -l)" -ge 1 ] && [ "$add_to_no_stop" == "true" ]; then
        payload=''"$common_fields"'
                        "description": "Your config file has been edited:",
                        "fields": 
                        [
                            {
                                "'"$title"'": "These containers have been added to your no_stop list and were not stopped before being backed up on this run",
                                "'"$text"'": "'"\`\`\`$(jq -Rs '.' "${new_container_error}" | sed -e 's/^"//' -e 's/"$//')\`\`\`"'"
                            },
                            {
                                "'"$title"'": "If you wish to change this you'\''ll need to update your config file manually",
                                "'"$text"'": "If you wish to omit any container from being automatically added add it to the exclusion_list"
                            }
                        ]'"$common_fields2"''
    fi
    if [ "$(wc <"$new_container_error" -l)" -ge 1 ] && [ "$add_to_no_stop" == "false" ] && [ "$add_to_stop" == "false" ]; then
        payload=''"$common_fields"'
                        "description": "Your config file needs to be edited:",
                        "fields": 
                        [
                            {
                                "'"$title"'": "These containers are not found in either of your lists in the config file:",
                                "'"$text"'": "'"\`\`\`$(jq -Rs '.' "${new_container_error}" | sed -e 's/^"//' -e 's/"$//')\`\`\`"'"
                            },
                            {
                                "'"$title"'": "If you wish to change this you'\''ll need to update your config file manually\nYou can have the script automatically add containers to your config file by setting either add_to_stop or add_to_no_stop to true",
                                "'"$text"'": "If you wish to omit any container showing up on this list you'\''ll need to add it to the exclusion_list"
                            }
                        ]'"$common_fields2"''
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
verbose_output() {
    # Check if "quiet" variable is false
    if [ "$quiet" == false ]; then
        # Print the argument passed to the function
        echo -e "$1"
    fi
}
check_config() {
    # Check if destination directory exists
    if [ ! -d "$destination_dir" ]; then
        echo "ERROR: Your destination directory ($destination_dir) does not exist please check your configuration"
        exit 2
    fi
    # Check if destination directory is set
    if [ -z "$destination_dir" ]; then
        echo "ERROR: Your source directory ($destination_dir) is not set please check your configuration"
        exit 2
    fi
    # Check if 7zip command is available if compress is set to true
    if [ "$compress" == "true" ]; then
        command -v 7z >/dev/null 2>&1 || {
            echo -e "7Zip is not installed.\nPlease install 7Zip and rerun.\nIf on unRaid 7Zip can be found through the appstore" >&2
            exit 1
        }
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
        fi
        #check if botname is set and using notifiarr
        if [[ $webhook =~ ^https://notifiarr\.com/api/v1/notification/passthrough ]] && [ -n "$bot_name" ]; then
            echo "ERROR: It appears you're using the Notifarr webhook and setting the bot name to $bot_name. Notifiarr does not support this"
            echo "Please do not set the bot name while using Notifiarr"
        fi
        # Check if channel is not set if using discord webhook
        if [[ ! $webhook =~ ^https://discord\.com/api/webhooks/ ]] && [ -z "$channel" ]; then
            echo "ERROR: It appears you're using the discord webhook and using the channel argument"
            echo "The channel argument is only used with Notifiarr's webhook"
        fi
        # Check if webhook returns valid response code
        response_code=$(curl --write-out "%{response_code}" --silent --output /dev/null "$webhook")
        if [ "$response_code" -ge 200 ] && [ "$response_code" -le 400 ]; then
            verbose_output "Webhook is valid"
        else
            echo "Webhook is not valid"
            echo "Backup will be created withoutt a notification being sent"
        fi
    fi
}

cleanup() {
    # find all folders in the destination folder that are older than the specified number of days
    find "$destination_dir" -type d -mtime +"$keep_backup" -exec rm -r {} \;
}

create_tmp_files() {
    # Create temporary files
    container_stop_list=$(mktemp)
    container_no_stop_list=$(mktemp)
    container_no_exist_error=$(mktemp)
    new_container_error=$(mktemp)
}

main() {
    create_tmp_files
    start=$(date +%s)
    config_file
    echo "Config file: $config_file"
    check_config
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
}

main
