#!/bin/bash
#
#   _____  _             ____             _                   _____           _       _
#  |  __ \| |           |  _ \           | |                 / ____|         (_)     | |
#  | |__) | | _____  __ | |_) | __ _  ___| | ___   _ _ __   | (___   ___ _ __ _ _ __ | |_
#  |  ___/| |/ _ \ \/ / |  _ < / _` |/ __| |/ / | | | '_ \   \___ \ / __| '__| | '_ \| __|
#  | |    | |  __/>  <  | |_) | (_| | (__|   <| |_| | |_) |  ____) | (__| |  | | |_) | |_
#  |_|    |_|\___/_/\_\ |____/ \__,_|\___|_|\_\\__,_| .__/  |_____/ \___|_|  |_| .__/ \__|
#                                                   | |                        | |
#                                                   |_|                        |_|
# v4.0.0

# Please see the config file for more information

# <----- Do not edit below this point ----->
debug=true # Only use if you want to see the final output of every variable.

config_file() {
    if [ -z "$config_file" ]; then
        config_file="$(dirname "$0")/-backup-plex
        .conf"
    fi
    # Check if config file exists
    if [ -f "$config_file" ]; then
        # Read config file
        # shellcheck source=backup-plex.conf
        . "$config_file"
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
        exit 2
    fi
    # Check if source directory is set
    if [ -z "$source_dir" ]; then
        echo "ERROR: Your source directory ($source_dir) is not set please check your configuration"
        exit 2
    fi
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
    if [ -z "$webhook" ]; then
        if [[ ! $webhook =~ ^https://discord\.com/api/webhooks/ ]] && [[ ! $webhook =~ ^https://notifiarr\.com/api/v1/notification/passthrough ]]; then
            echo "ERROR: Invalid webhook provided please enter a valid webhook url in the format https://discord.com/api/webhooks/ or https://notifiarr.com/api/v1/notification/passthrough"
            exit 1
        fi
        # Check if channel is set if using Notifiarr
        if [[ $webhook =~ ^https://notifiarr\.com/api/v1/notification/passthrough ]] && [ -z "$channel" ]; then
            echo "ERROR: It appears you're trying to use Notifiarr as your notification agent but haven't set a channel. How will the bot know where to send the notification?"
            echo "Please use the -C or --channel argument to set the channel ID used for this notification"
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

cleanup_function() {
    # Set a flag to indicate if no files were found
    local no_files_found=true
    # Function to clean up old backups in a specific directory
    cleanup_directory() {
        # Get the directory path and number of days to keep backups from the arguments
        local directory="$1"
        local keep_days="$2"
        local files_to_remove
        local find_command
        # Check if the directory exists
        if [ -d "$directory" ]; then
            # Create a find command to find files with specific extension and older than the specified number of days
            find_command="find $directory -type f \( -name '*.tar' -o -name '*.tar.7z' -o -name '*.tar.7z.dry_run' -o -name '*.tar.dry_run' \) -mtime +$keep_days -delete"
            # If dry_run is true, change the find command to print the files instead of deleting them
            if [ "$dry_run" == true ]; then
                find_command="$find_command -print"
            fi
            files_to_remove=$(eval "$find_command")
            if [ -n "$files_to_remove" ]; then
                verbose_output "Removing backups older than $keep_days days... please wait"
                verbose_output "Done"
                # Update the flag indicating if files were found
                no_files_found=false
            fi
        fi
    }
    # If dry_run is true, call the cleanup_directory function with the "Essential" and "Full" directories
    if [ "$dry_run" == true ]; then
        cleanup_directory "$destination_dir/Essential" "$keep_essential"
        cleanup_directory "$destination_dir/Full" "$keep_full"
    # If dry_run is false, call the cleanup_directory function with the "Essential" and "Full" directories
    else
        cleanup_directory "$destination_dir/Essential" "$keep_essential"
        cleanup_directory "$destination_dir/Full" "$keep_full"
    fi
    # If no files were found, print a message
    if [ $no_files_found == true ]; then
        verbose_output "No files found to remove"
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
    # Initialize a message variable as an empty string
    local message=''
    # Check the value of the "full_backup" variable
    if [ "$backup_type" == "essential" ]; then
        message="Essential Plex data has been backed up"
    elif [ "$backup_type" == "full" ]; then
        message="Full Plex data has been backed up"
    else
        message="Essential & Full Plex data has been backed up"
    fi
    # Send a notification to the user with the title "Unraid Server Notice", a subject "Plex Backup", the message containing the backup status and an icon "normal"
    /usr/local/emhttp/webGui/scripts/notify -e "Unraid Server Notice" -s "Plex Backup" -d "$message" -i "normal"
}

send_notification() {
    # Get current time in UTC format
    get_ts=$(date -u -Iseconds)
    # Get a random joke from the specified file
    joke=$(curl -s https://raw.githubusercontent.com/Drazzilb08/userScripts/dev/jokes.txt | shuf -n 1)
    # Check if the webhook is for discord
    if [[ $webhook =~ ^https://discord\.com/api/webhooks/ ]]; then
        bot_name="Notification Bot"
        # Call the discord_payload function to construct the payload
        discord_common_fields
        discord_payload
        # Send the payload to the discord webhook URL
        curl -s -H "Content-Type: application/json" -X POST -d "$payload" "$webhook"
    fi
    # Check if the webhook is for notifiarr
    if [[ $webhook =~ ^https://notifiarr\.com/api/v1/notification/passthrough ]]; then
        # Call the notifarr_payload function to construct the payload
        notifiarr_common_fields
        notifarr_payload
        # Send the payload to the notifiarr webhook URL
        curl -s -H "Content-Type: application/json" -X POST -d "'$payload'" "$webhook" >/dev/null
    fi
}

notifiarr_common_fields(){
    title="title"
    text="text"
    # Extract common fields for the payload
    common_fields='
    {"notification": 
    {"update": false,"name": "Plex Backup","event": ""},
    "discord": 
    {"color": "'"$hex_bar_color"'",
        "ping": {"pingUser": 0,"pingRole": 0},
        "images": {"thumbnail": "","image": ""},
        "text": {"title": "Plex Backup",'
    common_fields2='
            "footer": "'"Powered by: Drazzilb | $joke"'"},
            "ids": {"channel": "'"$channel"'"}}}'
}
discord_common_fields(){
    title="name"
    text="value"
    # Extract common fields for the payload
    common_fields='{
                "username": "'"${bot_name}"'",
                "embeds": 
                [
                    {
                        "title": "Plex Backup",'
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
    if [ "$backup_type" == "essential" ]; then
        payload=''"$common_fields"'
    "description": "Essential Plex data has been backed up",
    "fields": 
    [
        {
            "'"$title"'": "Runtime",
            "'"$text"'": "'"${run_output}"'",
            "inline": false
        }, 
        {
            "'"$title"'": "This Essential backup size:",
            "'"$text"'": "'"${essential_backup_size}"'",
            "inline": false
        },
        {
            "'"$title"'": "Total size of all Essential backups:",
            "'"$text"'": "'"$(du -sh "$dest/Essential/" | awk '{print $1}')"'",
            "inline": false
        }
    ],'"$common_fields2"''
    elif [ "$backup_type" == "full" ]; then
        payload=''"$common_fields"'
                "description": "Essential Plex data has been backed up",
                "fields": 
                [
                    {
                        "'"$title"'": "Runtime",
                        "'"$text"'": "'"${run_output}"'",
                        "inline": false
                    }, 
                    {
                        "'"$title"'": "This Full backup size:",
                        "'"$text"'": "'"${full_backup_size}"'",
                        "inline": false
                    },
                    {
                        "'"$title"'": "Total size of all Full backups:",
                        "'"$text"'": "'"$(du -sh "$dest/Full/" | awk '{print $1}')"'",
                        "inline": false
                    }
                ],'"$common_fields2"''
    elif [ "$backup_type" == "essential_no_full" ]; then
        payload=''"$common_fields"'
                "description": "Essential Plex data has been backed up",
                "fields": 
                [
                    {
                        "'"$title"'": "Runtime",
                        "'"$text"'": "'"${run_output}"'",
                        "inline": false
                    }, 
                    {
                        "'"$title"'": "This Essential backup size:",
                        "'"$text"'": "'"${essential_backup_size}"'",
                        "inline": false
                    },
                    {
                        "'"$title"'": "Total size of all Essential backups:",
                        "'"$text"'": "'"$(du -sh "$dest/Essential/" | awk '{print $1}')"'",
                        "inline": false
                    },
                    {
                        "'"$title"'": "Days since last Full backup",
                        "'"$text"'": "'"${days}"'",
                        "inline": false
                    }
                ],'"$common_fields2"''
    else
        payload=''"$common_fields"'
                "description": "Both Full & Essential Plex data has been backed up",
                "fields": 
                [
                    {
                        "'"$title"'": "Runtime",
                        "'"$text"'": "'"${run_output}"'",
                        "inline": false
                    }, 
                    {
                        "'"$title"'": "This Essential backup size:",
                        "'"$text"'": "'"${full_backup_size}"'",
                        "inline": false
                    }, 
                    {
                        "'"$title"'": "This Full backup size:",
                        "'"$text"'": "'"${full_backup_size}"'",
                        "inline": false
                    },
                    {
                        "'"$title"'": "Total size of all Essential backups:",
                        "'"$text"'": "'"$(du -sh "$dest/Essential/" | awk '{print $1}')"'",
                        "inline": false
                    },
                    {
                        "'"$title"'": "Total size of all Full backups:",
                        "'"$text"'": "'"$(du -sh "$dest/Full/" | awk '{print $1}')"'",
                        "inline": false
                    }
                ],'"$common_fields2"''
    fi
}

check_space() {
    available_space=$(df -P "$destination_dir" | awk 'NR==2 {print $4}')
    if [ "$compress" = "true" ]; then
        # Calculate backup size in bytes
        backup_size=$(du -s "$source_dir" | awk '{print $1}')
        # Convert byte values to MB or GB
        available_space_mb=$(echo "$available_space"/1024/1024 | awk '{printf "%.2f", $0}')
        backup_size_mb=$(echo "$backup_size"/1024/1024 | awk '{printf "%.2f", $0}')

        if [ "$backup_size" -gt "$available_space" ]; then
            echo "Error: Not enough disk space on $destination_dir. Available: $available_space_mb MB, Required: $backup_size_mb MB"
            exit 1
        fi
    else
        backup_size=$(du -s "$source_dir" | awk '{print $1}')
        if [ "$backup_size" -gt "$available_space" ]; then
            echo "Error: Not enough disk space on $destination_dir."
            exit 1
        fi
    fi
}
create_backup() {
    # Get the type of backup (Essential or Full) from the first argument
    local folder_type=$1
    verbose_output "Creating $folder_type backup... please wait"
    # Set start time
    start=$(date +%s)
    # Get absolute path of the destination directory
    dest=$(realpath -s "$destination_dir")
    # Create directory with backup type and current date in the destination directory

    backup_path="$dest/$folder_type/$(date +%F)"
    mkdir -p "$backup_path"
    cd "$source_dir"/.. || exit
    folder_name=$(basename "$source_dir")
    now="$(date +"%H.%M")"
    if [ "$folder_type" == "Essential" ]; then
        backup_source=(
            "$folder_name/Plug-in Support/Databases"
            "$folder_name/Plug-in Support/Preferences"
            "$folder_name/Preferences.xml"
        )
        exclude=()
    else
        backup_source=("$folder_name")
        exclude=(
            "--exclude=$source_dir/Cache"
            "--exclude=$source_dir/Codecs"
        )
    fi
    if [ "$compress" == "true" ]; then
        if [ "$dry_run" == true ]; then
            extension="tar.7z.dry_run"
            echo "Dry run: Would create $backup_path/plex_backup-$now.tar.7z"
            touch "$backup_path/plex_backup-$now.tar.7z.dry_run"
        else
            extension="tar.7z"
            tar --checkpoint=500 --checkpoint-action=dot -cf "$backup_path/plex_backup-$now.tar" "${backup_source[@]}" "${exclude[@]}" | 7z a -bsp1 -si -t7z -m0=lzma -mx=9 -mfb=64 -md=32m -ms=on "$backup_path/plex_backup-$now.tar.7z" 2>/dev/null
        fi
    else
        if [ "$dry_run" == true ]; then
            extension="tar.dry_run"
            echo "Dry run: Would create $backup_path/plex_backup-$now.tar"
            touch "$backup_path/plex_backup-$now.tar.dry_run"
        else
            extension="tar"
            tar --checkpoint=500 --checkpoint-action=dot -cf "$backup_path/plex_backup-$now.tar" "${backup_source[@]}" "${exclude[@]}" 2>/dev/null
        fi
    fi
    if [ "$folder_type" == "Essential" ]; then
        essential_backup_size=$(du -sh "$backup_path/plex_backup-$now.$extension" | awk '{print $1}')
    # If backup is not of "Essential" type, assign the size to the "full" key
    else
        full_backup_size=$(du -sh "$backup_path/plex_backup-$now.$extension" | awk '{print $1}')
    fi
    # Set the end time
    end=$(date +%s)
    # Set permissions of the destination directory to 777
    chmod -R 777 "$dest"
    verbose_output "\nBackup complete"
}

main() {
    # Check if config file is defined in command line arguments
    config_file
    handle_options "$@"
    # Check for --config= argument in command line options and assign the value to config_file variable
    for arg in "$@"; do
        if [[ $arg == --config=* ]]; then
            config_file="${arg#*=}"
            break
        fi
    done
    hex_to_decimal "$bar_color"
    check_config "$@"
    # check for last_plex_backup.tmp file and if it exists, read the file to get the last backup date
    if [ -f "$(dirname "$0")/last_plex_backup.tmp" ]; then
        while IFS= read -r line; do
            lastbackup=$line
        done <"$(dirname "$0")/last_plex_backup.tmp"
    else
        lastbackup=0
    fi
    # get current date
    current_date=$(date +"%m/%d/%y")
    # calculate the number of days since last backup
    days=$((($(date --date="$current_date" +%s) - $(date --date="$lastbackup" +%s)) / (60 * 60 * 24)))
    start=$(date +%s)
    # check if full_backup is set to false
    if [ "$full_backup" == "false" ]; then
        check_space
        create_backup "Essential"
        backup_type="essential"
        verbose_output ""
        verbose_output "Total size of this Essential backup: ${essential_backup_size}"
        # check if force_full_backup is not 0
        if [ "$force_full_backup" != 0 ]; then
            # check if number of days since last full backup is greater than or equal to force_full_backup or lastbackup is 0
            if [[ "$days" -ge $force_full_backup ]] || [[ "$lastbackup" == 0 ]]; then
                check_space
                create_backup "Full"
                backup_type="both"
                days="0"
                echo "$current_date" >"$(dirname "$0")"/last_plex_backup.tmp
                verbose_output "Total size of this Essential backup: ${essential_backup_size}"
                verbose_output "Total size of this Full backup: ${full_backup_size}"
            else
                backup_type="essential_no_full"
                verbose_output "Last Full backup created $days days ago... skipping"
            fi
        fi
    else
        check_space
        create_backup "Full"
        backup_type="full"
        echo "$current_date" >"$(dirname "$0")"/last_plex_backup.tmp
        days="0"
        verbose_output "Total size of this Full backup: ${full_backup_size}"
    fi
    # call cleanup function
    cleanup_function
    # calculate runtime
    calculate_runtime
    verbose_output "$run_output"
    # check if Essential and Full directories exist and output total size
    if [ -d "$destination_dir/Essential/" ]; then
        verbose_output "Total size of all Essential backups: $(du -sh "$destination_dir/Essential/" | awk '{print $1}')"
    fi
    if [ -d "$destination_dir/Full/" ]; then
        verbose_output "Total size of all Full backups: $(du -sh "$destination_dir/Full/" | awk '{print $1}')"
    fi
    # check if unraid_notify is set to true and call unraid_notification function
    if [ "$unraid_notify" == "true" ]; then
        unraid_notification
    fi
    # check if webhook is set to true and call send_notification function
    if [ -z "$webhook" ]; then
        send_notification
    fi
    # check if debug is set to true and call debug_output_function
    if [ $debug == "true" ]; then
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
    echo -e "* Full Size: ${full_backup_size}"
    echo -e "* Days: $days"
    echo -e "* Hex bar color: $hex_bar_color"
    echo -e "* Decimal bar color: $decimal_bar_color"
    echo -e "* get_ts: $get_ts"
    echo -e "* lastbackup: $lastbackup"
    echo -e "* Folder Type: $folder_type"
    echo -e "* Backup Type: $backup_type"
    echo -e "* Payload:\n$payload\n"
    echo -e "**********************DEBUG**********************\n"
}

# Function to display help
display_help() {
    echo "Usage: $0 [ -s | --source ] [ -d | --destination ] [ -F | --force-full ] [ -f | full-backup] [ -k | --keep-essential ] [ -K | --keep-full ] [ -c | --compress ] [ -u | --unraid-notify ] [ -q | --quiet ] [ -w | --webhook ] [ -n | --bot-name [ -b | --bar-color ] [ -h | --help ]"
    echo "This script is for backing up and compressing Plex Media Server data"
    echo "Options:"
    echo "  -s    --source <dir>               : Source directory to backup"
    echo "  -d    --destination <dir>          : Destination directory to store backups"
    echo "  -F    --force-full <days>          : Number of days to wait before forcing a full backup"
    echo "  -f    --full-backup                : Perform full backup"
    echo "  -k    --keep-essential <num>       : Number of essential backups to keep"
    echo "  -K    --keep-full <num>            : Number of full backups to keep"
    echo "  -c    --compress                   : Compress backups using 7zip"
    echo "  -u    --unraid-notify              : Send notification to Unraid webGui"
    echo "  -q    --quiet                      : Quiet mode"
    echo "  -w    --webhook <url>              : Webhook url (Notifarr and Discord Supported)"
    echo "  -C    --channel <channel ID>       : Channel ID for discord noticiations (used with Notifiarr)"
    echo "  -b    --bar-color <hex|decimal>    : Discord bar color"
    echo "  -n    --bot-name <name>            : Discord bot name"
    echo "  -r    --dry-run                    : Run script without backing up any fils (for testing)"
    echo "  -x    --config-file                : Set config file location, with config file if command arguments are used they will take precedence"
    echo "  -h    --help                       : Display this help and exit"
    exit 0
}

handle_options() {

    # Define valid options
    valid_long_options=("source:" "destination:" "force-full:" "full-backup" "keep-essential:" "keep-full:" "compress" "unraid-notify" "quiet" "webhook:" "channel:" "bar-color:" "bot-name:" "dry-run" "config-file:" "help")
    valid_short_options=("s:" "d:" "F:" "f" "k:" "K:" "c" "u" "q" "w:" "C:" "b:" "n:" "r" "x:" "h")

    # Handle command-line options
    TEMP=$(getopt -o "${valid_short_options[*]}" --long "${valid_long_options[*]}" -n "$0" -- "$@")
    eval set -- "$TEMP"
    while true; do
        case "$1" in
        --source | -s)
            source_dir="$2"
            shift 2
            ;;
        --destination | -d)
            destination_dir="$2"
            shift 2
            ;;
        --force-full | -F)
            force_full_backup="$2"
            shift 2
            ;;
        --full-backup | -f)
            full_backup=true
            shift
            ;;
        --keep-essential | -k)
            keep_essential="$2"
            shift 2
            ;;
        --keep-full | -K)
            keep_full="$2"
            shift 2
            ;;
        --compress | -c)
            compress=true
            shift
            ;;
        --unraid-notify | -u)
            unraid_notify=true
            shift
            ;;
        --quiet | -q)
            quiet=true
            shift
            ;;
        --webhook | -w)
            webhook="$2"
            shift 2
            ;;
        --channel | -C)
            channel="$2"
            shift 2
            ;;
        --bar-color | -b)
            bar_color="$2"
            shift 2
            ;;
        --bot-name | -n)
            bot_name="$2"
            shift 2
            ;;
        --dry-run | -r)
            dry_run=true
            shift
            ;;
        --config-file | -x)
            config_file="$2"
            shift 2
            ;;
        --help | -h)
            shift
            display_help
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
    done
}
# Call main function
main "$@"