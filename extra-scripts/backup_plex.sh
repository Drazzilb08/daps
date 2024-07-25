#!/usr/bin/env bash
#
#   _____  _             ____             _                   _____           _       _
#  |  __ \| |           |  _ \           | |                 / ____|         (_)     | |
#  | |__) | | _____  __ | |_) | __ _  ___| | ___   _ _ __   | (___   ___ _ __ _ _ __ | |_
#  |  ___/| |/ _ \ \/ / |  _ < / _` |/ __| |/ / | | | '_ \   \___ \ / __| '__| | '_ \| __|
#  | |    | |  __/>  <  | |_) | (_| | (__|   <| |_| | |_) |  ____) | (__| |  | | |_) | |_
#  |_|    |_|\___/_/\_\ |____/ \__,_|\___|_|\_\\__,_| .__/  |_____/ \___|_|  |_| .__/ \__|
#                                                   | |                        | |
#                                                   |_|                        |_|
# ====================================================
# Version: 5.0.2
# backup-plex - A script to backup your plex database and media
# Author: Drazzilb
# License: MIT License

# <----- Do not edit below this point ----->

quiet="False"
unraid_notify="False"

config_dir_setup() {
    config_dir=$(dirname "$(readlink -f "$0")")

    script_path=$(dirname "$0")

    config_file="$script_path/backup-plex.conf"
}

config_file() {
    # Check if config file exists
    if [ -f "$config_file" ]; then
        # Read config file
        # shellcheck source=/dev/null
        source "$config_file"
        echo "Config file exists and is accessible."
    else
        # Use command line arguments
        # handle_options "$@"
        verbose_output "no config file found"
    fi
}

check_config() {
    # If config file is not defined in command line arguments, look for it in the same directory as the script
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
        exit 0
    fi
    # Check if destination directory is set
    if [ -z "$destination_dir" ]; then
        echo "ERROR: Your source directory ($destination_dir) is not set please check your configuration"
        exit 0
    fi
    # Check if 7zip command is available if compress is set to True
    if [[ "${compress,,}" == "true" ]]; then
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
            if [[ "${full_backup,,}" == "true" ]]; then
                echo "Checking webhook validity: $webhook"
                echo "API Key: $apikey"
            fi
            response_code=$(curl --write-out "%{response_code}" --silent --output /dev/null -H "x-api-key: $apikey" "https://notifiarr.com/api/v1/user/validate")
        else
            if [[ "${full_backup,,}" == "true" ]]; then
                echo "Checking webhook validity: $webhook"
            fi
            response_code=$(curl --write-out "%{response_code}" --silent --output /dev/null "$webhook")
        fi

        if [[ "${full_backup,,}" == "true" ]]; then
            echo "Response: $response_code"
        fi

        if [ "$response_code" -eq 200 ]; then
            echo "Webhook is valid"
        else
            echo "Webhook is not valid"
            echo "Backup will be created without a notification being sent"
        fi
    fi
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
    if [[ "${quiet,,}" == "false" ]]; then
        # Print the argument passed to the function
        echo -e "$1"
    fi
}

cleanup_function() {
    destination_dir=$(realpath -s "$destination_dir")
    if [ -d "$destination_dir/Essential" ]; then
        echo -e "Removing all but the last" "$keep_essential" "essential backups... please wait"
        find "$destination_dir/Essential" -mindepth 1 -maxdepth 1 -type d | sort -r | tail -n +$(( keep_essential + 1 )) | xargs -I {} rm -rf {}
        echo -e "Done\n"
    fi
    if [ -d "$destination_dir"/Full ]; then
        echo -e "Removing all but the last " "$keep_full" "full backups... please wait"
        find "$destination_dir/Full" -mindepth 1 -maxdepth 1 -type d | sort -r | tail -n +$(( keep_full + 1 )) | xargs -I {} rm -rf {}
        echo -e "Done\n"
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
        run_output="Plex backup completed in $seconds seconds"
    # Check if hours is 0 but minutes isn't
    elif ((hours == 0)); then
        # Set the output string indicating that the backup completed in minutes and seconds
        run_output="Plex backup completed in $minutes minutes and $seconds seconds"
    # If minutes and hours are not 0
    else
        # Set the output string indicating that the backup completed in hours, minutes and seconds
        run_output="Plex backup completed in $hours hours $minutes minutes and $seconds seconds"
    fi
}

unraid_notification() {
    # Check the value of the "full_backup" variable
    if [ "$backup_type" == "essential" ]; then
        /usr/local/emhttp/webGui/scripts/notify -e "Unraid Server Notice" -s "Plex Backup" -d "Essential Plex data has been backed up" -i "normal"
    fi
    if [ "$backup_type" == "full" ]; then
        /usr/local/emhttp/webGui/scripts/notify -e "Unraid Server Notice" -s "Plex Backup" -d "Full Plex data has been backed up" -i "normal"
    fi
    if [ "$backup_type" == "both" ]; then
        /usr/local/emhttp/webGui/scripts/notify -e "Unraid Server Notice" -s "Plex Backup" -d "Essential & Full Plex data has been backed up" -i "normal"
    fi
}

send_notification() {
    if [[ -n "$webhook" ]]; then
        if [[ "${full_backup,,}" == "true" ]]; then
            echo -e "\ncurl -s -H \"Content-Type: application/json\" -X POST -d \'$payload\' \"$webhook\""
            curl -s -H "Content-Type: application/json" -X POST -d "$payload" "$webhook"
        else
            curl -s -H "Content-Type: application/json" -X POST -d "$payload" "$webhook" --output /dev/null
        fi
    fi
}

field_builder() {
    local field_builder
    local title_text="$1"
    local text_value="$2"
    local reset="$3"
    if [ "$reset" == "True" ]; then
        fields=""
    fi
    field_builder='{
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

build_payload(){
    get_ts=$(date -u -Iseconds)
    # Get a random joke from the specified file
    joke=$(curl -s https://raw.githubusercontent.com/Drazzilb08/daps/master/jokes.txt | shuf -n 1 | sed 's/"/\\"/g')
    if [[ $webhook =~ ^https://discord\.com/api/webhooks/ ]]; then
        bot_name="Notification Bot"
        title="name"
        text="value"
        common_fields='{
    "username": "'"${bot_name}"'",
    "embeds": 
    [
        {
            "title": "Plex Backup",'
    common_fields2='"footer": 
            {
                    "text": "'"Powered by: Drazzilb | $joke"'"
                },
            "color": "'"${decimal_bar_color}"'",
            "timestamp": "'"${get_ts}"'"
        }
    ]
}'
    elif [[ $webhook =~ ^https://notifiarr\.com/api/v1/notification/passthrough ]]; then
        # Call the notifiarr_payload function to construct the payload
        title="title"
        text="text"
        common_fields='{
    "notification": 
    {
        "update": false,
        "name": "Plex Backup",
        "event": ""
    },
        "discord": 
        {
            "color": "'"$hex_bar_color"'",
            "text": {
                "title": "Plex Backup",'
    common_fields2='
        "footer": "'"Powered by: Drazzilb | $joke"'"
    },
        "ids": {
            "channel": "'"$channel"'"
        }
    }
}'
    fi
}

payload (){
    local description="$1"
    payload=''"$common_fields"'
            "description": "'"$description"'",
            "fields": 
            [
                '"$fields"'
            ],
            '"$common_fields2"''
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

create_backup() {
    # Get the type of backup (Essential or Full) from the first argument
    local folder_type=$1
    verbose_output "Creating $folder_type backup... please wait"
    # remove leading slash from source_dir
    source_dir=${source_dir%/}
    # Set start time
    start=$(date +%s)
    # Get absolute path of the destination directory
    dest=$(realpath -s "$destination_dir")
    # Change to the parent directory of the source directory
    now="$(date +"%H.%M")"
    # Create directory with backup type and current date in the destination directory
    backup_path="$dest/$folder_type/$(date +%F)@$now"
    mkdir -p "$backup_path"
    # Set the backup source and exclude directories based on the type of backup
    if [ "$folder_type" == "Essential" ]; then
        backup_source=(
            "$source_dir/Plug-in Support/Databases"
            "$source_dir/Plug-in Support/Preferences"
            "$source_dir/Preferences.xml"
        )
        exclude=(
            "--exclude=$source_dir/*.db-*-*-*"
        )
    else
        backup_source=("$source_dir")
        exclude=(
            "--exclude=$source_dir/Cache"
            "--exclude=$source_dir/Codecs"
            "--exclude=$source_dir/*.db-*-*-*"
        )
    fi
    if [[ "${full_backup,,}" == "true" ]]; then
        echo "Source: $source_dir"
        echo "Destination: $destination_dir"
        echo "Dest: $dest"
        echo "Backup Type: $folder_type"
        echo "Backup Path: $backup_path"
        for element in "${backup_source[@]}"; do
            echo "Backup Source: $element"
        done
        for element in "${exclude[@]}"; do
            echo "Exclude: $element"
        done
    fi
    # Check if the compress flag is set, and create the archive accordingly
    if [ "$compress" == "True" ]; then
        if [ "$dry_run" == "True" ]; then
            extension="tar.7z.dry_run"
            echo "Dry run: Would create $backup_path/$folder_type-plex_backup.tar.7z"
            touch "$backup_path/$folder_type-plex_backup.tar.7z.dry_run"
        else
            extension="tar.7z"
            # Compress the backup using 7z
            tar --ignore-failed-read -cf - "${exclude[@]}" "${backup_source[@]}" | 7z a -si -t7z -m0=lzma2 -mx=1 -md=32m -mfb=64 -mmt=on -ms=off "$backup_path/$folder_type-plex_backup.tar.7z" 
        fi
    else
        if [ "$dry_run" == "True" ]; then
            extension="tar.dry_run"
            echo "Dry run: Would create $backup_path/$folder_type-plex_backup.tar"
            touch "$backup_path/$folder_type-plex_backup.tar.dry_run"
        else
            extension="tar"
            tar --ignore-failed-read -cf "$backup_path/$folder_type-plex_backup.tar" --checkpoint=500 --checkpoint-action=dot "${exclude[@]}" "${backup_source[@]}"

        fi
    fi
    # Store the size of the backup in a variable
    if [ "$folder_type" == "Essential" ]; then
        essential_backup_size=$(du -sh "$backup_path/$folder_type-plex_backup.$extension" | awk '{print $1}')
    # If backup is not of "Essential" type, assign the size to the "full" key
    else
        full_backup_size=$(du -sh "$backup_path/$folder_type-plex_backup.$extension" | awk '{print $1}')
    fi
    full_backup_total_size=$(du -sh "$dest/Full/" | awk '{print $1}')
    essential_backup_total_size=$( du -sh "$dest/Essential/" | awk '{print $1}')
    # Set the end time
    end=$(date +%s)
    # Set permissions of the destination directory to 777
    verbose_output "\nBackup complete"
    calculate_runtime
    if [ "$dry_run" == "True" ]; then
        # create made up sizes for dry run
        essential_backup_size="1.0G"
        full_backup_size="1.0G"
        full_backup_total_size="2.0G"
        essential_backup_total_size="2.0G"
        run_output="Dry Run: Fake runtime"
    fi
}

stop_plex(){
    if [ "$shutdown_plex" == "True" ]; then
        if [ "$backup_type" == "essential" ]; then
            backup_notification="Essential Backup"
        elif [ "$backup_type" == "full" ]; then
            backup_notification="Full Backup"
        elif [ "$backup_type" == "both" ]; then
            backup_notification="Essential & Full Backup"
        elif [ "$backup_type" == "essential_no_full" ]; then
            backup_notification="Essential Backup"
        fi
        # shellcheck disable=SC2143
        if [[ $(docker ps --format '{{.Names}}' 2>/dev/null | grep -w '^plex$') ]]; then
            plex_type="docker"
        # check if plex is running in systemctl
        elif [[ $(systemctl is-active plexmediaserver 2>/dev/null) == "active" ]]; then
            plex_type="systemctl"
        fi
        current_state="running"
        if [[ "${full_backup,,}" == "true" ]]; then
            echo "Current state: $current_state"
            echo "Plex type: $plex_type"
        fi
        if [ "$plex_type" == "docker" ]; then
            verbose_output "Plex is running in a docker container, using docker stop command"
            docker stop plex
        # If plex is not being ran in a docker container, use the systemctl stop command
        elif [ "$plex_type" == "systemctl" ]; then
            verbose_output "Plex is running using systemctl, using systemctl stop command"
            systemctl stop plexmediaserver.service
        # none of the above stop commands work throw error
        else
            echo "ERROR: Plex is not running in a docker container and systemctl is not installed."
            exit 0
        fi
        build_payload 
        field_builder "Plex is being shut down for a backup" "True"
        payload "Plex Status"
        send_notification
        current_state="stopped"
        if [[ "${full_backup,,}" == "true" ]]; then
            echo "Current state: $current_state"
            echo "Plex type: $plex_type"
        fi
    fi
}

start_plex() {
    if [ "$shutdown_plex" == "True" ]; then
        if [ "$backup_type" == "essential" ]; then
            backup_notification="Essential Backup"
        elif [ "$backup_type" == "full" ]; then
            backup_notification="Full Backup"
        elif [ "$backup_type" == "both" ]; then
            backup_notification="Essential & Full Backup"
        elif [ "$backup_type" == "essential_no_full" ]; then
            backup_notification="Essential Backup"
        fi
        if [[ "${full_backup,,}" == "true" ]]; then
            echo "Current state: $current_state"
            echo "Plex type: $plex_type"
        fi
        if [ "$plex_type" == "docker" ]; then
            verbose_output "Plex is running in a docker container, using docker stop command"
            docker start plex
        # If plex is not being ran in a docker container, use the systemctl stop command
        elif [ "$plex_type" == "systemctl" ]; then
            verbose_output "Plex is running using systemctl, using systemctl stop command"
            systemctl start plexmediaserver.service
        # none of the above stop commands work throw error
        else
            echo "ERROR: Plex is not running in a docker container and systemctl is not installed."
            exit 0
        fi
        build_payload 
        field_builder "Plex is being started started after a/an" "$backup_notification backup" "True"
        payload "Plex Status"
        send_notification
        current_state="stopped"
        if [[ "${full_backup,,}" == "true" ]]; then
            echo "Current state: $current_state"
            echo "Plex type: $plex_type"
        fi
    fi
}

main() {
    # Check if config file is defined in command line arguments
    handle_options "$@"
    config_dir_setup
    if [ "$use_config_file" == "True" ]; then
        config_file
    fi
    hex_to_decimal "$bar_color"
    check_config "$@"
    last_plex_backup="$config_dir/.last_plex_backup.tmp"
    
    # check for .last_plex_backup.tmp file and if it exists, read the file to get the last backup date 
    if [ -f "$last_plex_backup" ]; then
        lastbackup=$(cat "$last_plex_backup")
    else
        lastbackup=0
    fi

    if [[ "${full_backup,,}" == "true" ]]; then
        echo "Config Dir: $config_dir"
        echo "Last Plex Backup: $last_plex_backup"
        echo "Last backup: $lastbackup"
    fi
    # get current date
    current_date=$(date +"%m/%d/%y")
    # calculate the number of days since last backup
    days=$((($(date --date="$current_date" +%s) - $(date --date="$lastbackup" +%s)) / (60 * 60 * 24)))
    if [[ "${full_backup,,}" == "true" ]]; then
        echo "Current Date: $current_date"
        echo "Days since last backup: $days"
    fi
    start=$(date +%s)
    # check if full_backup is set to False
    stop_plex
    if [[ "${full_backup,,}" == "false" ]]; then
        # create essential backup
        backup_type="essential"
        create_backup "Essential"
        build_payload
        field_builder "Runtime" "$run_output" "True"
        field_builder "This Essential backup size" "$essential_backup_size" "False"
        field_builder "Total size of all Essential backups" "$essential_backup_total_size" "False"
        payload "Essential Backup"
        send_notification
        verbose_output ""
        verbose_output "Total size of this Essential backup: ${essential_backup_size}"
        # check if force_full_backup is not 0
        if [ "$force_full_backup" != 0 ]; then
            # check if number of days since last full backup is greater than or equal to force_full_backup or lastbackup is 0
            if [[ "$days" -ge $force_full_backup ]] || [[ "$lastbackup" == 0 ]]; then
                #create full backup
                backup_type="both"
                create_backup "Full"
                build_payload
                field_builder "Runtime" "$run_output" "True"
                field_builder "This Full backup size" "$full_backup_size" "False"
                field_builder "Total size of all Full backups" "$full_backup_total_size" "False"
                payload "Full Backup"
                send_notification
                days="0"
                echo "$current_date" > "$last_plex_backup"
                verbose_output "Total size of this Essential backup: ${essential_backup_size}"
                verbose_output "Total size of this Full backup: ${full_backup_size}"
            else
                backup_type="essential_no_full"
                verbose_output "Last Full backup created $days days ago... skipping"
            fi
        fi
    else
        #create full backup
        backup_type="full"
        create_backup "Full"
        build_payload
        field_builder "Runtime" "$run_output" "True"
        field_builder "This Essential backup size" "$essential_backup_size" "False"
        field_builder "This Full backup size" "$full_backup_size" "False"
        field_builder "Total size of all Essential backups" "$essential_backup_total_size" "False"
        field_builder "Total size of all Full backups" "$full_backup_total_size" "False"
        field_builder "Days since last Full backup" "$days" "False"
        payload "Full and Essential Backup"
        send_notification
        
        echo "$current_date" > "$last_plex_backup"
        days="0"
        verbose_output "Total size of this Full backup: ${full_backup_size}"
    fi
    start_plex
    # call cleanup function
    cleanup_function
    # calculate runtime
    verbose_output "$run_output"
    # check if Essential and Full directories exist and output total size
    if [ -d "$destination_dir/Essential/" ]; then
        verbose_output "Total size of all Essential backups: $essential_backup_total_size"
    fi
    if [ -d "$destination_dir/Full/" ]; then
        verbose_output "Total size of all Full backups: $full_backup_total_size"
    fi
    # check if unraid_notify is set to True and call unraid_notification function
    if [[ "${unraid_notify,,}" == "true" ]]; then
        unraid_notification
    fi
    # check if debug is set to True and call debug_output_function
    if [[ "${full_backup,,}" == "true" ]]; then
        debug_output_function
    fi
    verbose_output 'All Done!'
}

debug_output_function() {
    echo -e "\n**********************DEBUG**********************"
    echo -e "* Script has ended with debug set to $debug"
    echo -e "* Destination: $destination_dir"
    echo -e "* Source: $source_dir"
    echo -e "* Keep essential: $keep_essential"
    echo -e "* Keep full: $keep_full"
    echo -e "* Full backup: $full_backup"
    echo -e "* Force full backup: $force_full_backup"
    echo -e "* Unraid notify: $unraid_notify"
    echo -e "* Compress: $compress"
    echo -e "* Dry run: $dry_run"
    echo -e "* Quiet: $quiet"
    echo -e "* Webhook: $webhook"
    echo -e "* Bot name: $bot_name"
    echo -e "* Runetime: $run_output"
    echo -e "* Channel: $channel"
    echo -e "* Essential Size: ${essential_backup_size}"
    echo -e "* Essential Total Size: ${essential_backup_total_size}"
    echo -e "* Full Size: ${full_backup_size}"
    echo -e "* Full Total Size: ${full_backup_total_size}"
    echo -e "* Days: $days"
    echo -e "* Hex bar color: $hex_bar_color"
    echo -e "* Decimal bar color: $decimal_bar_color"
    echo -e "* get_ts: $get_ts"
    echo -e "* lastbackup: $lastbackup"
    echo -e "* Folder Type: $folder_type"
    echo -e "* Backup Type: $backup_type"
    echo -e "* Shutdown Plex: $shutdown_plex"
    echo -e "**********************DEBUG**********************\n"
}

# Function to display help
display_help() {
    echo "Usage: $0 [ -s <dir> ] [ -d <dir> ] [ -F <days> ] [ -f ] [ -k <num> ] [ -K <num> ] [ -c ] [ -u ] [ -q ] [ -w <url> ] [ -C <channel ID> ] [ -b <hex> ] [ -n <name> ] [ -r ] [ -x <config-file> ] [ -h ]"
    echo "This script is for backing up and compressing Plex Media Server data"
    echo "Options:"
    echo "  -s <dir>       : Source directory to backup"
    echo "  -d <dir>       : Destination directory to store backups"
    echo "  -F <days>      : Number of days to wait before forcing a full backup"
    echo "  -f             : Perform full backup"
    echo "  -k <num>       : Number of essential backups to keep"
    echo "  -K <num>       : Number of full backups to keep"
    echo "  -c             : Compress backups using 7zip"
    echo "  -u             : Send notification to Unraid webGui"
    echo "  -q             : Quiet mode"
    echo "  -w <url>       : Webhook url (Notifarr and Discord Supported)"
    echo "  -C <channel ID>: Channel ID for discord noticiations (used with Notifiarr)"
    echo "  -b <hex>       : Discord bar color"
    echo "  -n <name>      : Discord bot name"
    echo "  -r             : Run script without backing up any files (for testing)"
    echo "  -h             : Display this help and exit"
    exit 0
}

handle_options() {
    bar_color='e5a00d' # default bar color
    # Set default values for variables
    use_config_file="True"
    shutdown_plex="False"
    dry_run="False"

    # Function to handle options
    while getopts ":s:d:k:c:w:C:K:F:f:r:S:D:x:" opt; do
        case $opt in
            s) source_dir=$OPTARG ;;
            d) destination_dir=$OPTARG ;;
            k) keep_essential=$OPTARG ;;
            c) compress=$OPTARG ;;
            w) webhook=$OPTARG ;;
            C) channel=$OPTARG ;;
            K) keep_full=$OPTARG ;;
            F) force_full_backup=$OPTARG ;;
            f) full_backup=$OPTARG ;;
            r) dry_run=$OPTARG ;;
            S) shutdown_plex=$OPTARG ;;
            D) debug=$OPTARG ;;
            x) use_config_file=$OPTARG ;;
            \?) echo "Invalid option: -$OPTARG" >&2 ;;
            :) echo "Option -$OPTARG requires an argument." >&2 ;;
        esac
    done
}
# Call main function
main "$@"
