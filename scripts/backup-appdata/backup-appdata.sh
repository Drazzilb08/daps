#!/bin/bash
#                            _       _          ____             _                   _____           _       _
#      /\                   | |     | |        |  _ \           | |                 / ____|         (_)     | |
#     /  \   _ __  _ __   __| | __ _| |_ __ _  | |_) | __ _  ___| | ___   _ _ __   | (___   ___ _ __ _ _ __ | |_
#    / /\ \ | '_ \| '_ \ / _` |/ _` | __/ _` | |  _ < / _` |/ __| |/ / | | | '_ \   \___ \ / __| '__| | '_ \| __|
#   / ____ \| |_) | |_) | (_| | (_| | || (_| | | |_) | (_| | (__|   <| |_| | |_) |  ____) | (__| |  | | |_) | |_
#  /_/    \_\ .__/| .__/ \__,_|\__,_|\__\__,_| |____/ \__,_|\___|_|\_\\__,_| .__/  |_____/ \___|_|  |_| .__/ \__|
#           | |   | |                                                      | |                        | |
#           |_|   |_|                                                      |_|                        |_|
#
# v2.4.11

# Define where your config file is located
config_file=''

#------------- DO NOT MODIFY BELOW THIS LINE -------------#
debug=no # Testing Only
# shellcheck source=backup-appdata.conf
if [ -z "$config_file" ]; then
    echo -e "Config file location not defined... Looking in root directory..."
    source "backup-appdata.conf"
else
    source "$config_file"
fi

# Functions
user_config_function() {
    if [ "$use_discord" == "yes" ] && [ -z "$webhook" ]; then
        echo "ERROR: You're attempting to use the Discord integration but did not enter the webhook url."
        exit 1
    fi

    command -v pigz >/dev/null 2>&1 || {
        echo -e "pigz is not installed.\nPlease install pigz and rerun.\nIf on unRaid, pigz can be found through the NerdPack which is found in the appstore" >&2
        exit 1
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
}
backup_function() {
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
}

pigz_function() {
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
}

info_function() {
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
        echo "Container: $name Size: $container_size" | tee -a "$1"
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
        echo "Container: $name Size: $container_size" | tee -a "$1"
    fi
}

discord_function() {
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
}

container_error_function() {
    if [ "$(docker ps -a -f name="$name" | wc -l)" -ge 2 ]; then
        if [ ! -d "$path" ]; then
            echo -e "Container $name exists but the directory $path does not exist... Skipping" | tee -a "${appdata_error}"
            return 1
        fi
    else
        if [ ! -d "$path" ]; then
            echo -e "Container $name does not exist and $path does not exist... Skipping" | tee -a "${appdata_error}"
            return 1
        else
            echo -e "Container $name does not exist but the directory $path exists... Skipping" | tee -a "${appdata_error}"
            return 1
        fi
    fi
}

backup_stop_function() {
    echo -e "Stopping and backing up containers..."
    echo -e "----------------------------------------------"
    for ((i = 0; i < ${#list[@]}; i += 2)); do
        name=${list[i]} path=${list[i + 1]}
        container_error_function
        if [ $? == 1 ]; then
            echo -e "----------------------------------------------"
            continue
        fi
        cRunning="$(docker ps -a --format '{{.Names}}' -f status=running)"
        if echo "$cRunning" | grep -iqF "$name"; then
            echo -e "Stopping $name"
            if [ "$debug" != "yes" ]; then
                docker stop -t 60 "$name" >/dev/null 2>&1
            fi
            echo -e "Creating backup of $name"
            backup_function
            echo -e "Starting $name"
            docker start "$name" >/dev/null 2>&1
        else
            echo -e "$name is already stopped"
            echo -e "Creating backup of $name"
            backup_function
            echo -e "$name was stopped before backup, ignoring startup"
        fi
        if [ $use_pigz == yes ]; then
            pigz_function
        fi
        info_function "$appdata_stop"
        stop_counter=$((stop_counter + 1))
        if [ "$debug" == "yes" ]; then
            echo "Backup stop_counter: $stop_counter"
        fi
        echo -e "----------------------------------------------"
    done
}

backup_nostop_function() {
    echo -e "Backing up containers without stopping them..."
    echo -e "----------------------------------------------"
    for ((i = 0; i < ${#list_no_stop[@]}; i += 2)); do
        name=${list_no_stop[i]} path=${list_no_stop[i + 1]}
        container_error_function
        if [ $? == 1 ]; then
            echo -e "----------------------------------------------"
            continue
        fi
        echo -e "Creating backup of $name"
        backup_function
        if [ $use_pigz == yes ]; then
            pigz_function
        fi
        echo "Finished backup for $name"
        info_function "$appdata_nostop"
        nostop_counter=$((nostop_counter + 1))
        if [ "$debug" == "yes" ]; then
            echo "Backup stop_counter: $nostop_counter"
        fi
        echo -e "----------------------------------------------"
    done
}

backup_no_container_function() {
    echo -e "Backing up directories without containers"
    echo -e "----------------------------------------------"
    for i in "${list_no_container[@]}"; do
        path=$i
        name=$(basename "${i}")
        if [ ! -d "$path" ]; then
            echo -e "Path name $path does not exist... Skipping" | tee -a "$appdata_error"
            continue
        fi
        echo -e "Creating backup of $name"
        backup_function
        if [ $use_pigz == yes ]; then
            pigz_function
        fi
        no_container_counter=$((no_container_counter + 1))
        echo "Finished backup for $name"
        # Information Gathering
        info_function "$appdata_no_container"
        echo -e "----------------------------------------------"
    done
}

cleanup_function() {
    #Cleanup Old Backups
    echo -e "\nRemoving backups older than " $delete_after "days...\n"
    find "$destination"* -mtime +"$delete_after" -type d -exec rm -rf {} \;
    echo "Done"
}

runtime_function() {
    end=$(date +%s)
    run_size=$(du -sh "$dest/$dt/" | awk '{print $1}')
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
}
debug_output_function() {
    echo -e "Script has ended with debug set to ${debug}"
    echo -e "Bot name $bot_name"
    echo -e "Runetime: $run_output"
    echo -e "Runsize: $run_size"
    echo -e "Total Size: $total_size"
    echo -e "Barcolor: $bar_color"
    echo -e "get_ts: $get_ts"
    echo -e "Webhook: $webhook"
    echo -e "line count for appdata_error.tmp  = $(wc -l <"$appdata_error")"
    echo -e "stop_counter = $(wc -l <"$appdata_stop")"
    echo -e "nostop_counter = $(wc -l <"$appdata_nostop")"
    echo -e "no_container_counter" = "$(wc -l <"$appdata_no_container")"
}

clean_files_function() {
    rm '/tmp/i.am.running.appdata.tmp'
    rm "$appdata_stop"
    rm "$appdata_nostop"
    rm "$appdata_error"
    rm "$appdata_no_container"
}

global_variables_function() {
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
    stop_counter=0
    nostop_counter=0
    no_container_counter=0
    user_config_function
}

main() {
    global_variables_function
    if [ ! -d "$dest" ]; then
        echo "Making directory at ${dest}"
        mkdir -p "$dest"
    fi
    mkdir -p "$dest/$dt"
    if [ ${#list[@]} -ge 1 ]; then
        backup_stop_function
    else
        echo -e "No containers were stopped and backed up due to list being empty\n"
    fi
    if [ ${#list_no_stop[@]} -ge 1 ]; then
        backup_nostop_function
    else
        echo -e "No containers were backed without stopping up due to list_no_stop being empty\n"
    fi
    if [ ${#list_no_container[@]} -ge 1 ]; then
        backup_no_container_function
    else
        echo -e "No directories without containers were backed up due to list_no_container being empty\n"
    fi
    sleep 2
    chmod -R 777 "$dest"
    cleanup_function
    runtime_function
    if [ "$unraid_notify" == "yes" ]; then
        /usr/local/emhttp/plugins/dynamix/scripts/notify -s "AppData Backup" -d "Backup of ALL Appdata complete."
    fi
    if [ "$use_discord" == "yes" ]; then
        discord_function
    fi
    if [ "$debug" == "yes" ]; then
        debug_output_function
    fi
    clean_files_function
    echo -e '\nAll Done!\n'
}
main
