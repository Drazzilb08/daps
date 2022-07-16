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
# Furthermore, it stops and restarts each container before and after backup if the container was running at the time of the backup

#------------- DEFINE VARIABLES -------------#
source='' # Set appdata directory, this is to help with easily adding directories
# Example: $source/radarr
# This is the same as typing out /mnt/user/appdata/radarr (keeping things simple)
# However, if you want to type out the whole thing, (say if you have config information in seperate locations) you still can enter the information, just don't use $source
destination='' # Set backup directory
delete_after=2                          # Number of days to keep backup
use_pigz=yes                             # Use pigz to further compress your backup (yes) will use pigz to further compress, (no) will not use pigz
# Pigz package must be installed via NerdPack
pigz_compression=9 # Define compression level to use with pigz
# 0 = No compression
# 1 = Least compression/Fastest
# 6 = Default compression/Default Speed
# 9 = Maximum Compression/Slowest
notify=no # Use unRAID's built in notification system
#------------- DEFINE DISCORD VARIABLES -------------#
# This section is not required
use_discord=yes                                                                                                                    # Use discord for notifications
webhook=''                                                                                                                         # Discord webhook
bot_name='Notification Bot'                                                                                                        # Name your bot
bar_color='16724991'                                                                                                               # The bar color for discord notifications, must be decimal code -> https://www.mathsisfun.com/hexadecimal-decimal-colors.html

# List containers and assiciated config directory to stop and backup
# Format: <container name> <"$source"/container_config_dir>
# Eg. tautulli $appdata/tautulli>
list=(

)
# List containers and associated config directory to back up without stopping
# Format: <container name> <"$source"/container_config_dir>
# Eg. tautulli $appdata/tautulli>
list_no_stop=(

)

#------------- DO NOT MODIFY BELOW THIS LINE -------------#
# Will not run again if currently running.
if [ ! -d "$source" ]; then
    echo "ERROR: Your source directory does not exist, please check your configuration"
    exit 1
fi
if [ -z "$source" ]; then
    echo "ERROR: Your source directory is not set, please check your configuration."
    exit 1
fi
if [ "$use_discord" == "yes" ] && [ -z "$webhook" ]; then
    echo "ERROR: You're attempting to use the Discord integration but did not enter the webhook url."
    exit 1
fi
command -v pigz >/dev/null 2>&1 || { echo -e >&2 "pigz is not installed.\nPlease install pigz and rerun.\nIf on unRaid, pigz can be found through the NerdPack which is found in the appstore"; exit 1; }

if [ -e "/tmp/i.am.running.appdata.tmp" ]; then
    echo "Another instance of the script is running. Aborting."
    echo "Please use rm /tmp/i.am.running.appdata.tmp in your terminal to remove the locking file"
    exit 1
else
    touch "/tmp/i.am.running.appdata.tmp"
fi

#Set variables
start=$(date +%s) #Sets start time for runtime information
cd "$(realpath -s "$source")" || exit
dest=$(realpath -s "$destination")
dt=$(date +"%m-%d-%Y")
now=$(date +"%I_%M_%p")
get_ts=$(date -u -Iseconds)
appdata_error=$(mktemp)
appdata_stop=$(mktemp)
appdata_nostop=$(mktemp)

# create the backup directory if it doesn't exist - error handling - will not create backup file if path does not exist
if [ ! -d "$dest" ]; then
    echo "Making directory at ${dest}"
    mkdir -p "$dest"
fi
# Creating backup of directory
mkdir -p "$dest/$dt"
debug=no # Add additional log information
# Also does not remove tmp files
stop_counter=0
nostop_counter=0
# Data Backup
if [ "$debug" == "yes" ]; then
    echo -e "Starting stop container loop"
    echo -e "-----------------------"
fi
for ((i = 0; i < ${#list[@]}; i += 2)); do
    name=${list[i]} path=${list[i + 1]}
    # Error handling container || path exists or does not exists
    if [ "$(docker ps -a -f name="$name" | wc -l)" -ge 2 ]; then
        if [ ! -d "$path" ]; then
            echo -e "Container $name exists but the directory $path does not exist" >> "${appdata_error}"
            continue
        fi
    else
        if [ ! -d "$path" ]; then
            echo -e "Container $name does not exit and $path does not exist" >> "${appdata_error}"
            continue
        else
            echo -e "Container $name does not exist but the directory $path exists" >> "${appdata_error}"
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
            tar -cf "$dest/$dt/$name-$now-debug.tar" -T /dev/null
        else
            tar cWfC "$dest/$dt/$name-$now.tar" "$(dirname "$path")" "$(basename "$path")"
        fi
        echo -e "Starting $name"
        docker start "$name" >/dev/null 2>&1
        if [ $use_pigz == yes ]; then
            echo -e "Compressing $name..."
            if [ "$debug" == "yes" ]; then
                pigz -$pigz_compression "$dest/$dt/$name-$now-debug.tar"
            else
                pigz -$pigz_compression "$dest/$dt/$name-$now.tar"
            fi
        fi
    # If container is stopped
    else
        echo -e "$name is already stopped"
        echo -e "Creating backup of $name"
        if [ "$debug" == "yes" ]; then
            tar -cf "$dest/$dt/$name-$now-debug.tar" -T /dev/null
        else
            tar cWfC "$dest/$dt/$name-$now.tar" "$(dirname "$path")" "$(basename "$path")"
        fi
        if [ $use_pigz == yes ]; then
            echo -e "Compressing $name..."
            if [ "$debug" == "yes" ]; then
                pigz -$pigz_compression "$dest/$dt/$name-$now-debug.tar"
            else
                pigz -$pigz_compression "$dest/$dt/$name-$now.tar"
            fi
        fi
        echo -e "$name was stopped before backup, ignoring startup"
    fi
    # Information Gathering
    if [ $use_pigz == yes ]; then
        if [ "$debug" == "yes" ]; then
            container_size=$(du -sh "$dest/$dt/$name-$now-debug.tar.gz" | awk '{print $1}')
        else
            container_size=$(du -sh "$dest/$dt/$name-$now.tar.gz" | awk '{print $1}')
        fi
        echo "Container: $name Size: $container_size" >> "$appdata_stop"
    else
        if [ "$debug" == "yes" ]; then
            container_size=$(du -sh "$dest/$dt/$name-$now-debug.ta"r | awk '{print $1}')
        else
            container_size=$(du -sh "$dest/$dt/$name-$now.tar" | awk '{print $1}')
        fi
        echo "Container: $name Size: $container_size" >> "$appdata_stop"
    fi
    stop_counter=$((stop_counter + 1))
    if [ "$debug" == "yes" ]; then
        echo "Backup stop_counter: $stop_counter"
    fi
    echo -e "-----------------------"
done
# Backup containers without stopping them
if [ "$debug" == "yes" ]; then
    echo -e "Starting stop container loop"
    echo -e "-----------------------"
fi
for ((i = 0; i < ${#list_no_stop[@]}; i += 2)); do
    name=${list_no_stop[i]} path=${list_no_stop[i + 1]}

    echo -e "Creating backup of $name"
    if [ "$debug" == "yes" ]; then
        tar -cf "$dest/$dt/$name-$now-debug.tar" -T /dev/null
    else
        tar cWfC "$dest/$dt/$name-$now.tar" "$(dirname "$path")" "$(basename "$path")"
    fi
    if [ $use_pigz == yes ]; then
        echo -e "Compressing $name..."
        if [ "$debug" == "yes" ]; then
            pigz -$pigz_compression "$dest/$dt/$name-$now-debug.tar"
        else
            pigz -$pigz_compression "$dest/$dt/$name-$now.tar"
        fi
    fi
    echo "Finished backup for $name"
    # Information Gathering
    if [ $use_pigz == yes ]; then
        if [ "$debug" == "yes" ]; then
            container_size=$(du -sh "$dest/$dt/$name-$now-debug.tar.gz" | awk '{print $1}')
        else
            container_size=$(du -sh "$dest/$dt/$name-$now.tar.gz" | awk '{print $1}')
        fi
        echo "Container: $name Size: $container_size" >> "${appdata_nostop}"
    else
        if [ "$debug" == "yes" ]; then
            container_size=$(du -sh $"dest/$dt/$name-$now-debug.tar" | awk '{print $1}')
        else
            container_size=$(du -sh "$dest/$dt/$name-$now.tar" | awk '{print $1}')
        fi
        echo "Container: $name Size: $container_size" >> "${appdata_stop}"
    fi
    echo -e "-----------------------"
    nostop_counter=$((nostop_counter + 1))
done

sleep 2
chmod -R 777 "$dest"

#Cleanup Old Backups
echo -e "\nRemoving backups older than " $delete_after "days...\n"
find "$destination"* -mtime +$delete_after -exec rm -rfd {} \;
#find $destination* -type f -size 1k --include "*.tar.gz" -exec rm -rfld '{}' \;

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
if [ "$notify" == "yes" ]; then
    /usr/local/emhttp/plugins/dynamix/scripts/notify -s "AppData Backup" -d "Backup of ALL Appdata complete."
fi
# Discord notifications
if [ "$use_discord" == "yes" ]; then
    if [ "$(wc <"$appdata_error" -l)" -ge 1 ]; then
        curl -s -H "Content-Type: application/json" -X POST -d '{"username": "'"${bot_name}"'","avatar_url": "https://cdn0.iconfinder.com/data/icons/shift-free/32/Error-128.png", "embeds": [{"thumbnail": {"url": "https://cdn0.iconfinder.com/data/icons/shift-free/32/Error-1024.png"}, "title": "Error notificaitons", "fields": [{"name": "Errors:","value": "'"$(jq -Rs '.' "${appdata_error}" | cut -c 2- | rev | cut -c 2- | rev)"'"}],"footer": {"text": "Powered by: Drazzilb | Adam & Eve were the first ones to ignore the Apple terms and conditions.","icon_url": "https://i.imgur.com/r69iYhr.png"},"color": "16711680","timestamp": "'"${get_ts}"'"}]}' "$webhook"
        echo -e "\nDiscord error notification sent."
    fi
    if [ "$(wc <"$appdata_stop" -l) " -ge 1 ] && [ "$(wc <"$appdata_nostop" -l)" -eq 0 ]; then
        curl -s -H "Content-Type: application/json" -X POST -d '{"username": "'"${bot_name}"'","embeds": [{"title": "Appdata Backup Complete", "fields": [{"name": "Runtime:","value": "'"${run_output}"'"},{"name": "'"This Backup's size:"'","value": "'"${run_size}"'"},{"name": "Total size of all backups:","value": "'"${total_size}"'"},{"name": "'"Containers stopped & backed up: ${stop_counter}"'","value": "'"$(jq -Rs '.' "${appdata_stop}" | cut -c 2- | rev | cut -c 2- | rev)"'"}],"footer": {"text": "Powered by: Drazzilb | Could he be more heartless?","icon_url": "https://i.imgur.com/r69iYhr.png"},"color": "'"${bar_color}"'","timestamp": "'"${get_ts}"'"}]}' "$webhook"
    fi
    if [ "$(wc <"$appdata_stop" -l) " -eq 0 ] && [ "$(wc <"$appdata_nostop" -l)" -ge 1 ]; then
        curl -s -H "Content-Type: application/json" -X POST -d '{"username": "'"${bot_name}"'","embeds": [{"title": "Appdata Backup Complete", "fields": [{"name": "Runtime:","value": "'"${run_output}"'"},{"name": "'"This Backup's size:"'","value": "'"${run_size}"'"},{"name": "Total size of all backups:","value": "'"${total_size}"'"},{"name": "'"Containers not stopped but backed up: ${nostop_counter}"'","value": "'"$(jq -Rs '.' "${appdata_nostop}" | cut -c 2- | rev | cut -c 2- | rev)"'"}],"footer": {"text": "Powered by: Drazzilb | I threw a boomerang a couple years ago; I know live in constant fear.","icon_url": "https://i.imgur.com/r69iYhr.png"},"color": "'"${bar_color}"'","timestamp": "'"${get_ts}"'"}]}' "$webhook"
    fi
    if [ "$(wc <"$appdata_stop" -l) " -ge 1 ] && [ "$(wc <"$appdata_nostop" -l)" -ge 1 ]; then
        curl -s -H "Content-Type: application/json" -X POST -d '{"username": "'"${bot_name}"'","embeds": [{"title": "Appdata Backup Complete", "fields": [{"name": "Runtime:","value": "'"${run_output}"'"},{"name": "'"This Backup's size:"'","value": "'"${run_size}"'"},{"name": "Total size of all backups:","value": "'"${total_size}"'"},{"name": "'"Containers stopped & backed up: ${stop_counter}"'","value": "'"$(jq -Rs '.' "${appdata_stop}" | cut -c 2- | rev | cut -c 2- | rev)"'"},{"name": "'"Containers not stopped but backed up: ${nostop_counter}"'","value": "'"$(jq -Rs '.' "${appdata_nostop}" | cut -c 2- | rev | cut -c 2- | rev)"'"}],"footer": {"text": "Powered by: Drazzilb | The man who invented knock-knock jokes should get a no bell prize.","icon_url": "https://i.imgur.com/r69iYhr.png"},"color": "'"${bar_color}"'","timestamp": "'"${get_ts}"'"}]}' "$webhook"
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
fi
# Remove temp files
rm '/tmp/i.am.running.appdata.tmp'
rm "$appdata_stop"
rm "$appdata_nostop"
rm "$appdata_error"
exit 0
#
# v1.1.4
