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
# v2.2.10

# Define where your config file is located
config_file=''

#------------- DO NOT MODIFY BELOW THIS LINE -------------#
debug=no # Testing Only
# shellcheck source=backup-plex.conf
user_config_function() {
    if [ -z "$config_file" ]; then
        echo -e "Config file location not defined... Looking in root directory..."
        source "backup-plex.conf"
    else
        source "$config_file"
    fi
    if [ ! -d "$source" ]; then
        echo "ERROR: Your source directory does not exist, please check your configuration"
        exit
    fi
    if [ -z "$source" ]; then
        echo "ERROR: Your source directory is not set, please check your configuration."
        exit
    fi
    if [ "$use_discord" == "yes" ] && [ -z "$webhook" ]; then
        echo "ERROR: You're attempting to use the Discord integration but did not enter the webhook url."
        exit
    fi
    command -v pigz >/dev/null 2>&1 || {
        echo -e "pigz is not installed.\nPlease install pigz and rerun.\nIf on unRaid, pigz can be found through the NerdPack which is found in the appstore" >&2
        exit 1
    }
    if [ -e "/tmp/i.am.running.plex.tmp" ]; then
        echo "Another instance of the script is running. Aborting."
        echo "Please use rm /tmp/i.am.running.plex.tmp in your terminal to remove the locking file"
        exit
    else
        touch "/tmp/i.am.running.plex.tmp"
    fi
}

script_setup_function() {
    # Read timestamp of the last full backup, if any
    if [ -f /boot/config/plugins/user.scripts/scripts/last_plex_backup ]; then
        while IFS= read -r line; do
            lastbackup=$line
        done </boot/config/plugins/user.scripts/scripts/last_plex_backup
    else
        lastbackup=0
    fi
    # $(realpath -s $source) takes care of the presence or absense of a trailing slash (/) on the source path - error handling
    cd "$(realpath -s "$source")" || exit
    # set the destination directory and a date
    dest=$(realpath -s "$destination")/
    if [ "$alternate_format" == "yes" ]; then
        dt=$(date +"%Y-%m-%d"@%H.%M)
    else
        dt=$(date +"%Y-%m-%d")
        now=$(date +"%H.%M")
    fi
    date=$(date)
    # create the backup directory if it doesn't exist - error handling - will not create backup file it path does not exist
    mkdir -p "$dest"
}
backup_function() {
    # create tar file of essential databases and preferences -- The Plug-in Support preferences will keep settings of any plug-ins, even though they will need to be reinstalled.
    if [ "$full_backup" == "no" ]; then
        echo -e "\nCreating Essential backup... please wait"
        mkdir -p "$dest/Essential/$dt"
        if [ "$debug" != yes ]; then
            if [ "$alternate_format" != "yes" ]; then
                tar -cf "$dest/Essential/$dt/Essential_Plex_Data_Backup-$now.tar" "Plug-in Support/Databases" "Plug-in Support/Preferences" Preferences.xml
                essential_size=$(du -sh "$dest/Essential/$dt/Essential_Plex_Data_Backup-$now.tar" | awk '{print $1}')
                if [ "$use_pigz" == yes ]; then
                    pigz -$pigz_compression "$dest/Essential/$dt/Essential_Plex_Data_Backup-$now.tar"
                    full_size=$(du -sh "$dest/Essential/$dt/Essential_Plex_Data_Backup-$now.tar.gz" | awk '{print $1}')
                fi
            else
                tar -cf "$dest/Essential/$dt/Essential_Plex_Data_Backup.tar" "Plug-in Support/Databases" "Plug-in Support/Preferences" Preferences.xml
                essential_size=$(du -sh "$dest/Essential/$dt/Essential_Plex_Data_Backup.tar" | awk '{print $1}')
                if [ "$use_pigz" == yes ]; then
                    pigz -$pigz_compression "$dest/Essential/$dt/Essential_Plex_Data_Backup.tar"
                    full_size=$(du -sh "$dest/Essential/$dt/Essential_Plex_Data_Backup.tar.gz" | awk '{print $1}')
                fi
            fi
        else
            if [ "$alternate_format" != "yes" ]; then
                tar -cf "$dest/Essential/$dt/Essential_Plex_Data_Backup-debug0-$now.tar" -T /dev/null
                essential_size=$(du -sh "$dest/Essential/$dt/Essential_Plex_Data_Backup-debug0-$now.tar" | awk '{print $1}')
                if [ "$use_pigz" == yes ]; then
                    pigz -$pigz_compression "$dest/Essential/$dt/Essential_Plex_Data_Backup-debug0-$now.tar"
                    full_size=$(du -sh "$dest/Essential/$dt/Essential_Plex_Data_Backup-debug0-$now.tar.gz" | awk '{print $1}')
                fi
            else
                tar -cf "$dest/Essential/$dt/Essential_Plex_Data_Backup-debug0.tar" -T /dev/null
                essential_size=$(du -sh "$dest/Essential/$dt/Essential_Plex_Data_Backup-debug0.tar" | awk '{print $1}')
                if [ "$use_pigz" == yes ]; then
                    pigz -$pigz_compression "$dest/Essential/$dt/Essential_Plex_Data_Backup-debug0.tar"
                    full_size=$(du -sh "$dest/Essential/$dt/Essential_Plex_Data_Backup-debug0.tar.gz" | awk '{print $1}')
                fi
            fi
        fi
        if [ "$force_full_backup" != 0 ]; then
            days=$((($(date --date="$date" +%s) - $(date --date="$lastbackup" +%s)) / (60 * 60 * 24)))
            if [[ "$days" -gt $force_full_backup ]] || [[ "$lastbackup" == 0 ]]; then
                cf=true
                echo -e "\nCreating Full backup now... please wait"
                mkdir -p "$dest/Full/$dt"
                if [ "$debug" != yes ]; then
                    if [ "$alternate_format" != "yes" ]; then
                        tar --exclude="$source/Cache" --exclude"$source/Codecs" -cf "$dest/Full/$dt/Full_Plex_Data_Backup-$now.tar" "$source"
                        full_size=$(du -sh "$dest/Full/$dt/Full_Plex_Data_Backup-$now.tar" | awk '{print $1}')
                        if [ "$use_pigz" == yes ]; then
                            pigz -$pigz_compression "$dest/Full/$dt/Full_Plex_Data_Backup-$now.tar"
                            full_size=$(du -sh "$dest/Full/$dt/Full_Plex_Data_Backup-$now.tar.gz" | awk '{print $1}')
                        fi
                    else
                        tar --exclude="$source/Cache/Transcode" --exclude="$source/Cache/PhotoTranscoder" -cf "$dest/Full/$dt/Full_Plex_Data_Backup.tar" "$source"
                        full_size=$(du -sh "$dest/Full/$dt/Full_Plex_Data_Backup.tar" | awk '{print $1}')
                        if [ "$use_pigz" == yes ]; then
                            pigz -$pigz_compression "$dest/Full/$dt/Full_Plex_Data_Backup.tar"
                            full_size=$(du -sh "$dest/Full/$dt/Full_Plex_Data_Backup.tar.gz" | awk '{print $1}')
                        fi
                    fi
                else
                    if [ "$alternate_format" != "yes" ]; then
                        tar -cf "$dest/Full/$dt/Full_Plex_Data_Backup-debug1-$now.tar" -T /dev/null
                        full_size=$(du -sh "$dest/Full/$dt/Full_Plex_Data_Backup-debug1-$now.tar" | awk '{print $1}')

                        if [ "$use_pigz" == yes ]; then
                            pigz -$pigz_compression "$dest/Full/$dt/Full_Plex_Data_Backup-debug1-$now.tar"
                            full_size=$(du -sh "$dest/Full/$dt/Full_Plex_Data_Backup-debug1-$now.tar.gz" | awk '{print $1}')
                        fi
                    else
                        tar -cf "$dest/Full/$dt/Full_Plex_Data_Backup-debug1.tar" -T /dev/null
                        full_size=$(du -sh "$dest/Full/$dt/Full_Plex_Data_Backup-debug1.tar" | awk '{print $1}')

                        if [ "$use_pigz" == yes ]; then
                            pigz -$pigz_compression "$dest/Full/$dt/Full_Plex_Data_Backup-debug1.tar"
                            full_size=$(du -sh "$dest/Full/$dt/Full_Plex_Data_Backup-debug1.tar.gz" | awk '{print $1}')
                        fi
                    fi
                fi
                # save the date of the full backup
                date >/boot/config/plugins/user.scripts/scripts/last_plex_backup
            else
                cf=false
                echo -e "\nLast Full backup created " $days " ago... skipping"
            fi
        fi
    else
        echo -e "\nCreating Full backup... please wait"
        mkdir -p "$dest/Full/$dt"
        if [ "$debug" != yes ]; then
            if [ "$alternate_format" != "yes" ]; then
                tar --exclude="$source/Cache" --exclude"$source/Codecs" -cf "$dest/Full/$dt/Full_Plex_Data_Backup-$now.tar" "$source"
                full_size=$(du -sh "$dest/Full/$dt/Full_Plex_Data_Backup-$now.tar" | awk '{print $1}')
                if [ "$use_pigz" == "yes" ]; then
                    pigz -$pigz_compression "$dest/Full/$dt/Full_Plex_Data_Backup-$now.tar"
                    full_size=$(du -sh "$dest/Full/$dt/Full_Plex_Data_Backup-$now.tar.gz" | awk '{print $1}')
                fi
            else
                tar --exclude="$source/Cache/Transcode" --exclude="$source/Cache/PhotoTranscoder" -cf "$dest/Full/$dt/Full_Plex_Data_Backup.tar" "$source"
                full_size=$(du -sh "$dest/Full/$dt/Full_Plex_Data_Backup.tar" | awk '{print $1}')
                if [ "$use_pigz" == "yes" ]; then
                    pigz -$pigz_compression "$dest/Full/$dt/Full_Plex_Data_Backup.tar"
                    full_size=$(du -sh "$dest/Full/$dt/Full_Plex_Data_Backup.tar.gz" | awk '{print $1}')
                fi
            fi
        else
            if [ "$alternate_format" != "yes" ]; then
                tar -cf "$dest/Full/$dt/Full_Plex_Data_Backup-debug2-$now.tar" -T /dev/null
                full_size=$(du -sh "$dest/Full/$dt/Full_Plex_Data_Backup-debug2-$now.tar" | awk '{print $1}')
                if [ "$use_pigz" == yes ]; then
                    pigz -$pigz_compression "$dest/Full/$dt/Full_Plex_Data_Backup-debug2-$now.tar"
                    full_size=$(du -sh "$dest/Full/$dt/Full_Plex_Data_Backup-debug2-$now.tar.gz" | awk '{print $1}')
                fi
            else
                tar -cf "$dest/Full/$dt/Full_Plex_Data_Backup-debug2.tar" -T /dev/null
                full_size=$(du -sh "$dest/Full/$dt/Full_Plex_Data_Backup-debug2.tar" | awk '{print $1}')
                if [ "$use_pigz" == yes ]; then
                    pigz -$pigz_compression "$dest/Full/$dt/Full_Plex_Data_Backup-debug2.tar"
                    full_size=$(du -sh "$dest/Full/$dt/Full_Plex_Data_Backup-debug2.tar.gz" | awk '{print $1}')
                fi
            fi
        fi
        date >/boot/config/plugins/user.scripts/scripts/last_plex_backup
        days=0
    fi
}
cleanup_function() {
    if [ -d "$destination"/Essential ]; then
        echo -e "\nRemoving Essential backups older than " $delete_after "days... please wait"
        find "$destination"/Essential* -mtime +"$delete_after" -type d -exec rm -rf {} \;
        echo "Done"
    fi
    old=$((force_full_backup * keep_full))
    if [ -d "$destination/Full" ]; then
        echo -e "\nRemoving Full backups older than " $old "days... please wait"
        find "$destination"/Full* -mtime +"$old" -type d -exec rm -rf {} \;
        echo "Done"
    fi
}
runtime_function() {
    total_time=$((end - start))
    seconds=$((total_time % 60))
    minutes=$((total_time % 3600 / 60))
    hours=$((total_time / 3600))
    if ((minutes == 0 && hours == 0)); then
        run_output="Plex backup completed in $seconds seconds"
    elif ((hours == 0)); then
        run_output="Plex backup completed in $minutes minutes and $seconds seconds"
    else
        run_output="Plex backup completed in $hours hours $minutes minutes and $seconds seconds"
    fi
    echo "$run_output"
}
unraid_noitification_function() {
    #unRaid notificaitons
    if [ "$full_backup" == "no" ]; then
        if [ "$cf" = false ]; then
            /usr/local/emhttp/webGui/scripts/notify -e "Unraid Server Notice" -s "Plex Backup" -d "Essential Plex data has been backed up." -i "normal"
            echo -e "Essential backup: $essential_size"
        else
            /usr/local/emhttp/webGui/scripts/notify -e "Unraid Server Notice" -s "Plex Backup" -d "Essential & Full Plex data has been backed up." -i "normal"
            echo -e "Essential backup: $essential_size"
            echo -e "Full Backup: $full_size"
        fi
    else
        /usr/local/emhttp/webGui/scripts/notify -e "Unraid Server Notice" -s "Plex Backup" -d "Complete Plex data has been backed up." -i "normal"
        echo -e "Full Backup: $full_size"
    fi
    if [ -d "$dest/Essential/" ]; then
        echo -e "Total size of all Essential backups: $(du -sh "$dest/Essential/" | awk '{print $1}')"
    fi
    if [ -d "$dest/Full/" ]; then
        echo -e "Total size of all Full backups: $(du -sh "$dest/Full/" | awk '{print $1}')"
    fi
}
discord_function() {
    get_ts=$(date -u -Iseconds)
    if [ "$full_backup" == "no" ]; then
        if [ "$cf" = false ]; then
            curl -s -H "Content-Type: application/json" -X POST -d '{"username": "'"${bot_name}"'","embeds": [{"title": "Plex Backup","description": "Essential Plex data has been backed up.","fields": [{"name": "Runtime:","value": "'"${run_output}"'"},{"name": "'"This Essential backup size:"'","value": "'"${essential_size}"'"},{"name": "Total size of all Essential backups:","value": "'"$(du -sh "$dest/Essential/" | awk '{print $1}')"'"},{"name": "Days since last Full backup","value": "'"${days}"'"}],"footer": {"text": "Powered by: Drazzilb | Blunt pencils are really pointless.","icon_url": "https://i.imgur.com/r69iYhr.png"},"color": "'"${bar_color}"'","timestamp": "'"${get_ts}"'"}]}' "$webhook"
            echo -e "\nDiscord notification sent."
        else
            curl -s -H "Content-Type: application/json" -X POST -d '{"username": "'"${bot_name}"'","embeds": [{"title": "Plex Backup","description": "Essential & Full Plex data has been backed up.","fields": [{"name": "Runtime:","value": "'"${run_output}"'"},{"name": "'"This Essential backup size:"'","value": "'"${essential_size}"'"},{"name": "'"This Full Backup:"'","value": "'"${full_size}"'"},{"name": "Total size of all Essential backups:","value": "'"$(du -sh "$dest/Essential/" | awk '{print $1}')"'"},{"name": "'"Total size of all Full backups:"'","value": "'"$(du -sh "$dest/Full/" | awk '{print $1}')"'"},{"name": "Days since last Full backup","value": "'"${days}"'"}],"footer": {"text": "Powered by: Drazzilb | Fighting for peace is like screwing for virginity.","icon_url": "https://i.imgur.com/r69iYhr.png"},"color": "'"${bar_color}"'","timestamp": "'"${get_ts}"'"}]}' "$webhook"
            echo -e "\nDiscord notification sent."
        fi
    else
        curl -s -H "Content-Type: application/json" -X POST -d '{"username": "'"${bot_name}"'","embeds": [{"title": "Plex Backup","description": "Full Plex data has been backed up.","fields": [{"name": "Runtime:","value": "'"${run_output}"'"},{"name": "'"This Full Backup:"'","value": "'"${full_size}"'"},{"name": "'"Total size of all Full backups:"'","value": "'"$(du -sh "$dest/Full/" | awk '{print $1}')"'"},{"name": "Days since last Full backup","value": "'"${days}"'"}],"footer": {"text": "'"Powered by: Drazzilb | I buy all my guns from a guy called T-Rex. He's a small arms dealer."'","icon_url": "https://i.imgur.com/r69iYhr.png"},"color": "'"${bar_color}"'","timestamp": "'"${get_ts}"'"}]}' "$webhook"
        echo -e "\nDiscord notification sent."
    fi
}
debug_output_function() {
    echo -e "Script has ended with debug set to ${debug}"
    echo -e "Bot name $bot_name"
    echo -e "Runetime: $run_output"
    echo -e "Full Size: $full_size"
    echo -e "Essential Size $essential_size"
    echo -e "Days $days"
    echo -e "Barcolor: $bar_color"
    echo -e "get_ts: $get_ts"
    echo -e "Webhook: $webhook"
}
main() {
    start=$(date +%s) # start time of script for statistics
    user_config_function
    script_setup_function
    backup_function
    sleep 2
    chmod -R 777 "$dest"
    cleanup_function
    end=$(date +%s)
    runtime_function
    if [ "$unraid_notify" == yes ]; then
        unraid_noitification_function
    fi
    if [ "$use_discord" == "yes" ]; then
        discord_function
    fi
    if [ $debug == yes ]; then
        debug_output_function
    fi
    echo -e '\nAll Done!\n'
    rm "/tmp/i.am.running.plex.tmp"
}
main
exit
