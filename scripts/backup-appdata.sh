#!/bin/bash
#                                 _       _          ____             _
#           /\                   | |     | |        |  _ \           | |
#          /  \   _ __  _ __   __| | __ _| |_ __ _  | |_) | __ _  ___| | ___   _ _ __
#         / /\ \ | '_ \| '_ \ / _` |/ _` | __/ _` | |  _ < / _` |/ __| |/ / | | | '_ \
#        / ____ \| |_) | |_) | (_| | (_| | || (_| | | |_) | (_| | (__|   <| |_| | |_) |
#       /_/    \_\ .__/| .__/ \__,_|\__,_|\__\__,_| |____/ \__,_|\___|_|\_\\__,_| .__/
#                | |   | |                                                      | |
#                |_|   |_|                                                      |_|

# This script creates an invididual tar file for each docker appdata directory that you define (needs both container name and path to it's appdata).
# Features:
    # Stops containers if not stopped
    # Does not start containers that were previously started
    # Can define list of containers to not stop during backup
    # Can define list of directories not associated with a container to backup within your appdata directory

#------------- DEFINE VARIABLES -------------#
appdata='' # Set appdata directory, this is to help with easily adding directories
# Example: $appdata/radarr
# This is the same as typing out /mnt/user/appdata/radarr (keeping things simple)
# However, if you want to type out the whole thing, (say if you have config information in seperate locations) you still can enter the information, just don't use $appdata
destination=''                           # Set backup directory
delete_after=2                          # Number of days to keep backup
use_pigz=yes                             # Use pigz to further compress your backup (yes) will use pigz to further compress, (no) will not use pigz
# Pigz package must be installed via NerdPack
pigz_compression=9 # Define compression level to use with pigz
# 0 = No compression
# 1 = Least compression/Fastest
# 6 = Default compression/Default Speed
# 9 = Maximum Compression/Slowest
unraid_notify=no # Use unRAID's built in notification system
alternate_format=no   
                        # This option will remove the time from the file and move it over to the directory structure.
                            # Yes = /path/to/source/yyyy-mm-dd@00.01_AM/<container_name>.tar.gz
                            # No = /path/to/source/yyyy-mm-dd/<container_name>-12_01_AM.tar.gz
exclude_file=''       
                        # Location of an exclude file, this file is to exclude certain files/folders from being backed up.
                            # Example of files that would be excluded: zip files, log files/directories just to name a few
                            # Please not that these excludes can be global depending on how you have it all set up
                            # This must be full path to the file: Eg '/mnt/user/data/exclude-file.txt'
#------------- DEFINE DISCORD VARIABLES -------------#
# This section is not required
use_discord=no                                                                                                                    # Use discord for notifications
use_summary=no                                                                                                                 # Summarize the run (no = full output)
webhook=''                                                                                                                         # Discord webhook
bot_name='Notification Bot'                                                                                                        # Name your bot
bar_color='16724991'                                                                                                               # The bar color for discord notifications, must be decimal code -> https://www.mathsisfun.com/hexadecimal-decimal-colors.html

# List containers and associated config directory to stop and backup
    # Backups will go in order listed
# To get a list of containers and it's names you need to enter in  simply use
    # docker ps --format "{{.Names}}" in your terminal
# Format: <container name> <"$appdata"/container_config_dir>
# Eg. tautulli "$appdata"/tautulli>
list=(

)
# List containers and associated config directory to back up without stopping
# Format: <container name> <"$appdata"/container_config_dir>
# Eg. tautulli "$appdata"/tautulli>
list_no_stop=(

)
# You can backup directories in your appdata directory that do not have a container associated to it.
list_no_container=(
    
)

#------------- DO NOT MODIFY BELOW THIS LINE -------------#
debug=no # Testing Only

if [ "$use_discord" == "yes" ] && [ -z "$webhook" ]; then
    echo "ERROR: You're attempting to use the Discord integration but did not enter the webhook url."
    exit 1
fi

command -v pigz >/dev/null 2>&1 || { 
    echo -e >&2 "pigz is not installed.\nPlease install pigz and rerun.\nIf on unRaid, pigz can be found through the NerdPack which is found in the appstore"; 
    exit 1; 
    }

if ! [ -f "$exclude_file" ] && [ -n "$exclude_file" ]; then
    echo "You have set the exclude file but it does not exist."
    exit 1
fi

if [ -e "/tmp/i.am.running.appdata.tmp" ]; then
    echo "Another instance of the script is running. Aborting."
    echo "Please use rm /tmp/i.am.running.appdata.tmp in your terminal to remove the locking file"
    exit 1
else
    touch "/tmp/i.am.running.appdata.tmp"
fi

#Non-User variables
start=$(date +%s) #Sets start time for runtime information
cd "$(realpath -s "$appdata")" || exit
if [ "$alternate_format" == "yes" ]; then
    dt=$(date +"%Y-%m-%d"@%H.%M)
    now=""
else
    dt=$(date +"%Y-%m-%d")
    now=$(date +"%H.%M")
fi
dest=$(realpath -s "$destination")
appdata_error=$(mktemp)
appdata_stop=$(mktemp)
appdata_nostop=$(mktemp)
appdata_no_container=$(mktemp)

# create the backup directory if it doesn't exist - error handling - will not create backup file if path does not exist
if [ ! -d "$dest" ]; then
    echo "Making directory at ${dest}"
    mkdir -p "$dest"
fi
# Creating backup of directory
mkdir -p "$dest/$dt"
# Also does not remove tmp files
stop_counter=0
nostop_counter=0
no_container_counter=0
# Data Backup
echo -e "Backing up containers with stopping them."
echo -e "-----------------------"
if [ ${#list[@]} -ge 1 ]; then
    for ((i = 0; i < ${#list[@]}; i += 2)); do
        name=${list[i]} path=${list[i + 1]}
        # Error handling container || path exists or does not exists
        if [ "$(docker ps -a -f name="$name" | wc -l)" -ge 2 ]; then
            if [ ! -d "$path" ]; then
                echo -e "Container $name exists but the directory $path does not exist... Skipping" | tee -a "${appdata_error}"
                continue
            fi
        else
            if [ ! -d "$path" ]; then
                echo -e "Container $name does not exist and $path does not exist... Skipping" | tee -a "${appdata_error}"
                continue
            else
                echo -e "Container $name does not exist but the directory $path exists... Skipping" | tee -a "${appdata_error}"
                continue
            fi
        fi
        cRunning="$(docker ps -a --format '{{.Names}}' -f status=running)"
        # If container is running
        if echo "$cRunning" | grep -iqF "$name"; then
            echo -e "Stopping $name"
            if [ "$debug" != "yes" ]; then
                docker stop -t 60 "$name" >/dev/null 2>&1 # Stops container without output
            fi
            echo -e "Creating backup of $name"
            if [ "$debug" == "yes" ]; then
                if [ "$alternate_format" != "yes" ]; then
                    tar -cf "$dest/$dt/$name-$now-debug.tar" -T /dev/null
                else
                    tar -cf "$dest/$dt/$name-debug.tar" -T /dev/null
                fi
            else
                if [ "$alternate_format" != "yes" ]; then
                    if [ -n "$exclude_file" ]; then
                        tar cWfC "$dest/$dt/$name-$now.tar" "$(dirname "$path")" -X "$exclude_file" "$(basename "$path")" 
                    else
                        tar cWfC "$dest/$dt/$name-$now.tar" "$(dirname "$path")" "$(basename "$path")"
                    fi
                else
                    if [ -n "$exclude_file" ]; then
                        tar cWfC "$dest/$dt/$name.tar" "$(dirname "$path")" -X "$exclude_file" "$(basename "$path")" 
                    else
                        tar cWfC "$dest/$dt/$name.tar" "$(dirname "$path")" "$(basename "$path")"
                    fi
                fi
            fi
            echo -e "Starting $name"
            docker start "$name" >/dev/null 2>&1
        # If container is stopped
        else
            echo -e "$name is already stopped"
            echo -e "Creating backup of $name"
            if [ "$debug" == "yes" ]; then
                if [ "$alternate_format" != "yes" ]; then
                    tar -cf "$dest/$dt/$name-$now-debug.tar" -T /dev/null
                else
                    tar -cf "$dest/$dt/$name-debug.tar" -T /dev/null
                fi
            else
                if [ "$alternate_format" != "yes" ]; then
                    if [ -n "$exclude_file" ]; then
                        tar cWfC "$dest/$dt/$name-$now.tar" "$(dirname "$path")" -X "$exclude_file" "$(basename "$path")"
                    else
                        tar cWfC "$dest/$dt/$name-$now.tar" "$(dirname "$path")" "$(basename "$path")"
                    fi
                else
                    if [ -n "$exclude_file" ]; then
                        tar cWfC "$dest/$dt/$name.tar" "$(dirname "$path")" -X "$exclude_file" "$(basename "$path")"
                    else
                        tar cWfC "$dest/$dt/$name.tar" "$(dirname "$path")" "$(basename "$path")"
                    fi
                fi
            fi
            echo -e "$name was stopped before backup, ignoring startup"
        fi
        # Compressing backup
        if [ $use_pigz == yes ]; then
            echo -e "Compressing $name..."
            if [ "$debug" == "yes" ]; then
                if [ "$alternate_format" != "yes" ]; then
                    pigz -$pigz_compression "$dest/$dt/$name-$now-debug.tar"
                else
                    pigz -$pigz_compression "$dest/$dt/$name-debug.tar"
                fi
            else
                if [ "$alternate_format" != "yes" ]; then
                    pigz -$pigz_compression "$dest/$dt/$name-$now.tar"
                else
                    pigz -$pigz_compression "$dest/$dt/$name.tar"
                fi
            fi
        fi
        # Information Gathering
        if [ $use_pigz == yes ]; then
            if [ "$debug" == "yes" ]; then
                if [ "$alternate_format" != "yes" ]; then
                    container_size=$(du -sh "$dest/$dt/$name-$now-debug.tar.gz" | awk '{print $1}')
                else
                    container_size=$(du -sh "$dest/$dt/$name-debug.tar.gz" | awk '{print $1}')
                fi
            else
                if [ "$alternate_format" != "yes" ]; then
                    container_size=$(du -sh "$dest/$dt/$name-$now.tar.gz" | awk '{print $1}')
                else
                    container_size=$(du -sh "$dest/$dt/$name.tar.gz" | awk '{print $1}')
                fi
            fi
            echo "Container: $name Size: $container_size" | tee -a "$appdata_stop"
        else
            if [ "$debug" == "yes" ]; then
                if [ "$alternate_format" != "yes" ]; then
                    container_size=$(du -sh "$dest/$dt/$name-$now-debug.tar" | awk '{print $1}')
                else
                    container_size=$(du -sh "$dest/$dt/$name-debug.tar" | awk '{print $1}')
                fi
            else
                if [ "$alternate_format" != "yes" ]; then
                    container_size=$(du -sh "$dest/$dt/$name-$now.tar" | awk '{print $1}')
                else
                    container_size=$(du -sh "$dest/$dt/$name.tar" | awk '{print $1}')
                fi
            fi
            echo "Container: $name Size: $container_size" | tee -a "$appdata_stop"
        fi
        stop_counter=$((stop_counter + 1))
        if [ "$debug" == "yes" ]; then
            echo "Backup stop_counter: $stop_counter"
        fi
        echo -e "-----------------------"
    done
else
    echo -e "No containers were stopped and backed up due to list being empty\n" 
fi
echo -e "Backing up containers without stopping them."
echo -e "-----------------------"
# Backup containers without stopping them
if [ ${#list_no_stop[@]} -ge 1 ]; then
    for ((i = 0; i < ${#list_no_stop[@]}; i += 2)); do
        name=${list_no_stop[i]} path=${list_no_stop[i + 1]}
        # Error handling container || path exists or does not exists
        if [ "$(docker ps -a -f name="$name" | wc -l)" -ge 2 ]; then
            if [ ! -d "$path" ]; then
                echo -e "Container $name exists but the directory $path does not exist... Skipping" | tee -a "${appdata_error}"
                continue
            fi
        else
            if [ ! -d "$path" ]; then
                echo -e "Container $name does not exist and $path does not exist... Skipping" | tee -a "${appdata_error}"
                continue
            else
                echo -e "Container $name does not exist but the directory $path exists... Skipping" | tee -a "${appdata_error}"
                continue
            fi
        fi

        echo -e "Creating backup of $name"
        if [ "$debug" == "yes" ]; then
            if [ "$alternate_format" != "yes" ]; then
                tar -cf "$dest/$dt/$name-$now-debug.tar" -T /dev/null
            else
                tar -cf "$dest/$dt/$name-debug.tar" -T /dev/null
            fi
        else
            if [ "$alternate_format" != "yes" ]; then
                if [ -n "$exclude_file" ]; then
                    tar cWfC "$dest/$dt/$name-$now.tar" "$(dirname "$path")" -X "$exclude_file" "$(basename "$path")"
                else
                    tar cWfC "$dest/$dt/$name-$now.tar" "$(dirname "$path")" "$(basename "$path")"
                fi
            else
                if [ -n "$exclude_file" ]; then
                    tar cWfC "$dest/$dt/$name.tar" "$(dirname "$path")" -X "$exclude_file" "$(basename "$path")"
                else
                    tar cWfC "$dest/$dt/$name.tar" "$(dirname "$path")" "$(basename "$path")"
                fi
            fi
        fi
        if [ $use_pigz == yes ]; then
            echo -e "Compressing $name..."
            if [ "$debug" == "yes" ]; then
                if [ "$alternate_format" != "yes" ]; then
                    pigz -$pigz_compression "$dest/$dt/$name-$now-debug.tar"
                else
                    pigz -$pigz_compression "$dest/$dt/$name-debug.tar"
                fi
            else
                if [ "$alternate_format" != "yes" ]; then
                    pigz -$pigz_compression "$dest/$dt/$name-$now.tar"
                else
                    pigz -$pigz_compression "$dest/$dt/$name.tar"
                fi
            fi
        fi
        echo "Finished backup for $name"
        # Information Gathering
        if [ $use_pigz == yes ]; then
            if [ "$debug" == "yes" ]; then
                if [ "$alternate_format" != "yes" ]; then
                    container_size=$(du -sh "$dest/$dt/$name-$now-debug.tar.gz" | awk '{print $1}')
                else
                    container_size=$(du -sh "$dest/$dt/$name-debug.tar.gz" | awk '{print $1}')
                fi
            else
                if [ "$alternate_format" != "yes" ]; then
                    container_size=$(du -sh "$dest/$dt/$name-$now.tar.gz" | awk '{print $1}')
                else
                    container_size=$(du -sh "$dest/$dt/$name.tar.gz" | awk '{print $1}')
                fi
            fi
            echo "Container: $name Size: $container_size" | tee -a "${appdata_nostop}"
        else
            if [ "$debug" == "yes" ]; then
                if [ "$alternate_format" != "yes" ]; then
                    container_size=$(du -sh $"$dest/$dt/$name-$now-debug.tar" | awk '{print $1}')
                else
                    container_size=$(du -sh $"$dest/$dt/$name-debug.tar" | awk '{print $1}')
                fi
            else
                if [ "$alternate_format" != "yes" ]; then
                    container_size=$(du -sh "$dest/$dt/$name-$now.tar" | awk '{print $1}')
                else
                    container_size=$(du -sh "$dest/$dt/$name.tar" | awk '{print $1}')
                fi
            fi
            echo "Container: $name Size: $container_size" | tee -a "${appdata_stop}"
        fi
        nostop_counter=$((nostop_counter + 1))
        if [ "$debug" == "yes" ]; then
            echo "Backup stop_counter: $nostop_counter"
        fi
        echo -e "-----------------------"
    done
else
    echo -e "No containers were backed without stopping up due to list_no_stop being empty\n"
fi
# Backing up appdata folder w/o a container
echo -e "Backing up directories without containers"
echo -e "-----------------------"
if [ ${#list_no_container[@]} -ge 1 ]; then
    for i in "${list_no_container[@]}"; do
        path=$i
        name=$(basename "${i}")
        echo -e "Creating backup of $name"
        if [ ! -d "$path" ]; then
                echo -e "Path name $path does not exist... Skipping" | tee -a "${appdata_error}"
                continue
        fi
        if [ "$debug" == "yes" ]; then
            if [ "$alternate_format" != "yes" ]; then
                tar -cf "$dest/$dt/$name-$now-debug.tar" -T /dev/null
            else
                tar -cf "$dest/$dt/$name-debug.tar" -T /dev/null
            fi
        else
            if [ "$alternate_format" != "yes" ]; then
                if [ -n "$exclude_file" ]; then
                    tar cWfC "$dest/$dt/$name-$now.tar" "$(dirname "$path")" -X "$exclude_file" "$(basename "$path")" 
                else
                    tar cWfC "$dest/$dt/$name-$now.tar" "$(dirname "$path")" "$(basename "$path")"
                fi
            else
                if [ -n "$exclude_file" ]; then
                    tar cWfC "$dest/$dt/$name.tar" "$(dirname "$path")" -X "$exclude_file" "$(basename "$path")" 
                else
                    tar cWfC "$dest/$dt/$name.tar" "$(dirname "$path")" "$(basename "$path")"
                fi
            fi
        fi
        if [ $use_pigz == yes ]; then
            echo -e "Compressing $name..."
            if [ "$debug" == "yes" ]; then
                if [ "$alternate_format" != "yes" ]; then
                    pigz -$pigz_compression "$dest/$dt/$name-$now-debug.tar"
                else
                    pigz -$pigz_compression "$dest/$dt/$name-debug.tar"
                fi
            else
                if [ "$alternate_format" != "yes" ]; then
                    pigz -$pigz_compression "$dest/$dt/$name-$now.tar"
                else
                    pigz -$pigz_compression "$dest/$dt/$name.tar"
                fi
            fi
        fi
        no_container_counter=$((no_container_counter + 1))
        echo "Finished backup for $name"
        # Information Gathering
        if [ $use_pigz == "yes" ]; then
            if [ "$debug" == "yes" ]; then
                if [ "$alternate_format" != "yes" ]; then
                    container_size=$(du -sh "$dest/$dt/$name-$now-debug.tar.gz" | awk '{print $1}')
                else
                    container_size=$(du -sh "$dest/$dt/$name-debug.tar.gz" | awk '{print $1}')
                fi
            else
                if [ "$alternate_format" != "yes" ]; then
                    container_size=$(du -sh "$dest/$dt/$name-$now.tar.gz" | awk '{print $1}')
                else
                    container_size=$(du -sh "$dest/$dt/$name.tar.gz" | awk '{print $1}')
                fi
            fi
            echo "Directory name: $name Size: $container_size" | tee -a "${appdata_no_container}"
        else
            if [ "$debug" == "yes" ]; then
                if [ "$alternate_format" != "yes" ]; then
                    container_size=$(du -sh $"$dest/$dt/$name-$now-debug.tar" | awk '{print $1}')
                else
                    container_size=$(du -sh $"$dest/$dt/$name-debug.tar" | awk '{print $1}')
                fi
            else
                if [ "$alternate_format" != "yes" ]; then
                    container_size=$(du -sh "$dest/$dt/$name-$now.tar" | awk '{print $1}')
                else
                    container_size=$(du -sh "$dest/$dt/$name.tar" | awk '{print $1}')
                fi
            fi
            echo "Directory name: $name Size: $container_size" | tee -a "${appdata_no_container}"
        fi
        if [ "$debug" == "yes" ]; then
            echo "Backup no_container_counter: $no_container_counter"
        fi
        echo -e "-----------------------"
    done
else
    echo -e "No directories without containers were backed up due to list_no_container being empty\n"
fi
sleep 2
chmod -R 777 "$dest"

#Cleanup Old Backups
echo -e "\nRemoving backups older than " $delete_after "days...\n"
find "$destination"* -mtime +$delete_after -exec rm -rfd {} \;

end=$(date +%s)
run_size=$(du -sh "$dest/$dt/" | awk '{print $1}') #Set run_size information
# Runtime
total_time=$((end - start))
seconds=$((total_time % 60))
minutes=$((total_time % 3600 / 60))
hours=$((total_time / 3600))

if ((minutes == 0 && hours == 0)); then
    run_output="Appdata completed in $seconds seconds"
elif ((hours == 0)); then
    run_output="Appdata completed in $minutes minutes and $seconds seconds"
else
    run_output="Appdata completed in $hours hours $minutes minutes and $seconds seconds"
fi
echo "$run_output"
echo -e "\nThis backup's size: $run_size"
if [ -d "$dest"/ ]; then
    total_size=$(du -sh "$dest" | awk '{print $1}')
    echo -e "Total size of all backups: $total_size"
fi
# Notifications
if [ "$unraid_notify" == "yes" ]; then
    /usr/local/emhttp/plugins/dynamix/scripts/notify -s "AppData Backup" -d "Backup of ALL Appdata complete."
fi
# Discord notifications
if [ "$use_discord" == "yes" ]; then
    get_ts=$(date -u -Iseconds)
    if [ "$(wc <"$appdata_error" -l)" -ge 1 ]; then
        curl -s -H "Content-Type: application/json" -X POST -d '{"username": "'"${bot_name}"'","avatar_url": "https://cdn0.iconfinder.com/data/icons/shift-free/32/Error-128.png", "embeds": [{"thumbnail": {"url": "https://cdn0.iconfinder.com/data/icons/shift-free/32/Error-1024.png"}, "title": "Error notificaitons", "fields": [{"name": "Errors:","value": "'"$(jq -Rs '.' "${appdata_error}" | cut -c 2- | rev | cut -c 2- | rev)"'"}],"footer": {"text": "Powered by: Drazzilb | Adam & Eve were the first ones to ignore the Apple terms and conditions.","icon_url": "https://i.imgur.com/r69iYhr.png"},"color": "16711680","timestamp": "'"${get_ts}"'"}]}' "$webhook"
        echo -e "\nDiscord error notification sent."
    fi
    if [ "$use_summary" == "yes" ]; then
        curl -s -H "Content-Type: application/json" -X POST -d '{"username": "'"${bot_name}"'","embeds": [{"title": "Appdata Backup Complete", "fields": [{"name": "Runtime:","value": "'"${run_output}"'"},{"name": "'"This Backup's size:"'","value": "'"${run_size}"'"},{"name": "Total size of all backups:","value": "'"${total_size}"'"}],"footer": {"text": "Powered by: Drazzilb | Could he be more heartless?","icon_url": "https://i.imgur.com/r69iYhr.png"},"color": "'"${bar_color}"'","timestamp": "'"${get_ts}"'"}]}' "$webhook"
    else
        if [ "$(wc <"$appdata_no_container" -l)" -ge 1 ]; then
            if [ "$(wc <"$appdata_stop" -l)" -ge 1 ] && [ "$(wc <"$appdata_nostop" -l)" -eq 0 ]; then
                curl -s -H "Content-Type: application/json" -X POST -d '{"username": "'"${bot_name}"'","embeds": [{"title": "Appdata Backup Complete", "fields": [{"name": "Runtime:","value": "'"${run_output}"'"},{"name": "'"This Backup's size:"'","value": "'"${run_size}"'"},{"name": "Total size of all backups:","value": "'"${total_size}"'"},{"name": "'"Containers stopped & backed up: ${stop_counter}"'","value": "'"$(jq -Rs '.' "${appdata_stop}" | cut -c 2- | rev | cut -c 2- | rev)"'"},{"name": "'"Folders without containers backed up: ${no_container_counter}"'","value": "'"$(jq -Rs '.' "${appdata_no_container}" | cut -c 2- | rev | cut -c 2- | rev)"'"}],"footer": {"text": "Powered by: Drazzilb | Could he be more heartless?","icon_url": "https://i.imgur.com/r69iYhr.png"},"color": "'"${bar_color}"'","timestamp": "'"${get_ts}"'"}]}' "$webhook"
            fi
            if [ "$(wc <"$appdata_stop" -l)" -eq 0 ] && [ "$(wc <"$appdata_nostop" -l)" -ge 1 ]; then
                curl -s -H "Content-Type: application/json" -X POST -d '{"username": "'"${bot_name}"'","embeds": [{"title": "Appdata Backup Complete", "fields": [{"name": "Runtime:","value": "'"${run_output}"'"},{"name": "'"This Backup's size:"'","value": "'"${run_size}"'"},{"name": "Total size of all backups:","value": "'"${total_size}"'"},{"name": "'"Containers not stopped but backed up: ${nostop_counter}"'","value": "'"$(jq -Rs '.' "${appdata_nostop}" | cut -c 2- | rev | cut -c 2- | rev)"'"},{"name": "'"Folders without containers backed up: ${no_container_counter}"'","value": "'"$(jq -Rs '.' "${appdata_no_container}" | cut -c 2- | rev | cut -c 2- | rev)"'"}],"footer": {"text": "Powered by: Drazzilb | I threw a boomerang a couple years ago; I know live in constant fear.","icon_url": "https://i.imgur.com/r69iYhr.png"},"color": "'"${bar_color}"'","timestamp": "'"${get_ts}"'"}]}' "$webhook"
            fi
            if [ "$(wc <"$appdata_stop" -l)" -ge 1 ] && [ "$(wc <"$appdata_nostop" -l)" -ge 1 ]; then
                curl -s -H "Content-Type: application/json" -X POST -d '{"username": "'"${bot_name}"'","embeds": [{"title": "Appdata Backup Complete", "fields": [{"name": "Runtime:","value": "'"${run_output}"'"},{"name": "'"This Backup's size:"'","value": "'"${run_size}"'"},{"name": "Total size of all backups:","value": "'"${total_size}"'"},{"name": "'"Containers stopped & backed up: ${stop_counter}"'","value": "'"$(jq -Rs '.' "${appdata_stop}" | cut -c 2- | rev | cut -c 2- | rev)"'"},{"name": "'"Containers not stopped but backed up: ${nostop_counter}"'","value": "'"$(jq -Rs '.' "${appdata_nostop}" | cut -c 2- | rev | cut -c 2- | rev)"'"},{"name": "'"Folders without containers backed up: ${no_container_counter}"'","value": "'"$(jq -Rs '.' "${appdata_no_container}" | cut -c 2- | rev | cut -c 2- | rev)"'"}],"footer": {"text": "Powered by: Drazzilb | The man who invented knock-knock jokes should get a no bell prize.","icon_url": "https://i.imgur.com/r69iYhr.png"},"color": "'"${bar_color}"'","timestamp": "'"${get_ts}"'"}]}' "$webhook"
            fi
        else
            if [ "$(wc <"$appdata_stop" -l)" -ge 1 ] && [ "$(wc <"$appdata_nostop" -l)" -eq 0 ]; then
                curl -s -H "Content-Type: application/json" -X POST -d '{"username": "'"${bot_name}"'","embeds": [{"title": "Appdata Backup Complete", "fields": [{"name": "Runtime:","value": "'"${run_output}"'"},{"name": "'"This Backup's size:"'","value": "'"${run_size}"'"},{"name": "Total size of all backups:","value": "'"${total_size}"'"},{"name": "'"Containers stopped & backed up: ${stop_counter}"'","value": "'"$(jq -Rs '.' "${appdata_stop}" | cut -c 2- | rev | cut -c 2- | rev)"'"}],"footer": {"text": "Powered by: Drazzilb | Could he be more heartless?","icon_url": "https://i.imgur.com/r69iYhr.png"},"color": "'"${bar_color}"'","timestamp": "'"${get_ts}"'"}]}' "$webhook"
            fi
            if [ "$(wc <"$appdata_stop" -l)" -eq 0 ] && [ "$(wc <"$appdata_nostop" -l)" -ge 1 ]; then
                curl -s -H "Content-Type: application/json" -X POST -d '{"username": "'"${bot_name}"'","embeds": [{"title": "Appdata Backup Complete", "fields": [{"name": "Runtime:","value": "'"${run_output}"'"},{"name": "'"This Backup's size:"'","value": "'"${run_size}"'"},{"name": "Total size of all backups:","value": "'"${total_size}"'"},{"name": "'"Containers not stopped but backed up: ${nostop_counter}"'","value": "'"$(jq -Rs '.' "${appdata_nostop}" | cut -c 2- | rev | cut -c 2- | rev)"'"}],"footer": {"text": "Powered by: Drazzilb | I threw a boomerang a couple years ago; I know live in constant fear.","icon_url": "https://i.imgur.com/r69iYhr.png"},"color": "'"${bar_color}"'","timestamp": "'"${get_ts}"'"}]}' "$webhook"
            fi
            if [ "$(wc <"$appdata_stop" -l)" -ge 1 ] && [ "$(wc <"$appdata_nostop" -l)" -ge 1 ]; then
                curl -s -H "Content-Type: application/json" -X POST -d '{"username": "'"${bot_name}"'","embeds": [{"title": "Appdata Backup Complete", "fields": [{"name": "Runtime:","value": "'"${run_output}"'"},{"name": "'"This Backup's size:"'","value": "'"${run_size}"'"},{"name": "Total size of all backups:","value": "'"${total_size}"'"},{"name": "'"Containers stopped & backed up: ${stop_counter}"'","value": "'"$(jq -Rs '.' "${appdata_stop}" | cut -c 2- | rev | cut -c 2- | rev)"'"},{"name": "'"Containers not stopped but backed up: ${nostop_counter}"'","value": "'"$(jq -Rs '.' "${appdata_nostop}" | cut -c 2- | rev | cut -c 2- | rev)"'"}],"footer": {"text": "Powered by: Drazzilb | The man who invented knock-knock jokes should get a no bell prize.","icon_url": "https://i.imgur.com/r69iYhr.png"},"color": "'"${bar_color}"'","timestamp": "'"${get_ts}"'"}]}' "$webhook"
            fi
        fi
    fi
    # fi
    echo -e "\nDiscord notification sent."
fi
echo -e '\nAll Done!\n'
# Debug output
if [ "$debug" == "yes" ]; then
    echo -e "Script has ended with debug set to ${debug}"
    echo -e "line count for appdata_error.tmp  = $(wc -l <"$appdata_error")"
    echo -e "stop_counter = $(wc -l <"$appdata_stop")"
    echo -e "nostop_counter = $(wc -l <"$appdata_nostop")"
    echo -e "no_container_counter" = "$(wc -l <"$appdata_no_container")" 
fi
# Remove temp files
rm '/tmp/i.am.running.appdata.tmp'
rm "$appdata_stop"
rm "$appdata_nostop"
rm "$appdata_error"
rm "$appdata_no_container"
exit 0
#
# v1.3.7
