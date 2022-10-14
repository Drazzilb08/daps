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
# v3.4.22

# Define where your config file is located
config_file=''

#------------- DO NOT MODIFY BELOW THIS LINE -------------#
debug=no # Testing Only
# shellcheck source=backup-plex.conf
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
error_handling_function() {
    if [ -z "$config_file" ]; then
        echo -e "Config file location not defined... Looking in root directory..."
        source "$script_dir/backup-plex.conf"
    else
        # shellcheck source=/dev/null
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
    if [ "$compress" == "yes" ]; then
        command -v 7z >/dev/null 2>&1 || {
            echo -e "7Zip is not installed.\nPlease install 7Zip and rerun.\nIf on unRaid, 7Zip can be found through the NerdTools which is found in the appstore" >&2
            exit 1
        }
    fi
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

    if [ $debug == "yes" ]; then
        if [ -f "$script_dir/tmp_last_backup.tmp" ]; then
            while IFS= read -r line; do
                lastbackup=$line
            done <"$script_dir"/tmp_last_backup.tmp
        else
            lastbackup=0
        fi
    else
        if [ -f /boot/config/plugins/user.scripts/scripts/last_plex_backup ]; then
            while IFS= read -r line; do
                lastbackup=$line
            done </boot/config/plugins/user.scripts/scripts/last_plex_backup
        else
            lastbackup=0
        fi
    fi
    # $(realpath -s $source) takes care of the presence or absense of a trailing slash (/) on the source path - error handling\
    parentdir=$(dirname "$source")
    cd "$(realpath -s "$parentdir")" || exit
    source_basename=$(basename "$source")

    # set the destination directory and a date
    dest=$(realpath -s "$destination")/
    if [ "$alternate_format" == "yes" ]; then
        dt=$(date +"%Y-%m-%d"@%H.%M)
    else
        dt=$(date +"%Y-%m-%d")
        now=$(date +"%H.%M")
    fi
    current_date=$(date +"%m/%d/%y")
    # create the backup directory if it doesn't exist - error handling - will not create backup file it path does not exist
    mkdir -p "$dest"
    cf=false
    days=$((($(date --date="$current_date" +%s) - $(date --date="$lastbackup" +%s)) / (60 * 60 * 24)))

}
backup_function() {
    # create tar file of essential databases and preferences -- The Plug-in Support preferences will keep settings of any plug-ins, even though they will need to be reinstalled.
    echo -e "Creating $1 backup... please wait"
    mkdir -p "$dest/$1/$dt"
    if [ "$compress" == "yes" ]; then
        if [ "$debug" != yes ]; then
            if [ "$alternate_format" != "yes" ]; then
                if [ "$cf" == false ]; then
                    # 7z a "$dest/Essential/$dt/Essential_Plex_Data_Backup-$now.7z" "$source_basename/Plug-in Support/Databases" "$source_basename/Plug-in Support/Preferences" "$source_basename/Preferences.xml" -m0=lzma2 -mx=9 -aoa
                    tar cf - "$source_basename/Plug-in Support/Databases" "$source_basename/Plug-in Support/Preferences" "$source_basename/Preferences.xml" | 7z a -si -t7z -m0=lzma -mx=9 -mfb=64 -md=32m -ms=on "$dest/Essential/$dt/Essential_Plex_Data_Backup-$now.tar.7z"
                else
                    # 7z a "$dest/Full/$dt/Full_Plex_Data_Backup-$now.7z" -xr!"$source_basename"/Cache -xr!"$source_basename"/Codecs "$source_basename" -m0=lzma2 -mx=9 -aoa
                    tar cf - --exclude="$source_basename"/Cache --exclude="$source_basename"/Codecs "$source_basename" | 7z a -si -t7z -m0=lzma -mx=9 -mfb=64 -md=32m -ms=on "$dest/Full/$dt/Full_Plex_Data_Backup-$now.tar.7z"
                fi
                echo -e "Backup Complete\n"
                size=$(du -sh "$dest/$1/$dt/$1_Plex_Data_Backup-$now.tar.7z" | awk '{print $1}')
            else
                if [ "$cf" == false ]; then
                    # 7z a "$dest/Essential/$dt/Essential_Plex_Data_Backup.7z" "$source_basename/Plug-in Support/Databases" "$source_basename/Plug-in Support/Preferences" "$source_basename/Preferences.xml" -m0=lzma2 -mx=9 -aoa
                    tar cf - "$source_basename/Plug-in Support/Databases" "$source_basename/Plug-in Support/Preferences" "$source_basename/Preferences.xml" | 7z a -si -t7z -m0=lzma -mx=9 -mfb=64 -md=32m -ms=on "$dest/Essential/$dt/Essential_Plex_Data_Backup.tar.7z"
                else
                    # 7z a "$dest/Full/$dt/Full_Plex_Data_Backup.7z" -xr!"$source_basename"/Cache -xr!"$source_basename"/Codecs "$source_basename" -m0=lzma2 -mx=9 -aoa
                    tar cf - --exclude="$source_basename"/Cache --exclude="$source_basename"/Codecs "$source_basename" | 7z a -si -t7z -m0=lzma -mx=9 -mfb=64 -md=32m -ms=on "$dest/Full/$dt/Full_Plex_Data_Backup.tar.7z"
                fi
                echo -e "Backup Complete\n"
                size=$(du -sh "$dest/$1/$dt/$1_Plex_Data_Backup.tar.7z" | awk '{print $1}')
            fi
        else
            if [ "$alternate_format" != "yes" ]; then
                tar -cf "$source_basename" -T /dev/null | 7z a -si -t7z -m0=lzma -mx=9 -mfb=64 -md=32m -ms=on "$dest/$1/$dt/$1_Plex_Data_Backup-debug0-$now.tar.7z"
                size=$(du -sh "$dest/$1/$dt/$1_Plex_Data_Backup-debug0-$now.tar" | awk '{print $1}')
            else
                tar -cf "$source_basename" -T /dev/null | 7z a -si -t7z -m0=lzma -mx=9 -mfb=64 -md=32m -ms=on "$dest/$1/$dt/$1_Plex_Data_Backup-debug0.tar.7z"
                size=$(du -sh "$dest/$1/$dt/$1_Plex_Data_Backup-debug0.tar" | awk '{print $1}')
            fi
        fi
    else
        if [ "$debug" != yes ]; then
            if [ "$alternate_format" != "yes" ]; then
                if [ "$cf" == false ]; then
                    tar -cf "$dest/Essential/$dt/Essential_Plex_Data_Backup-$now.tar" "$source_basename/Plug-in Support/Databases" "$source_basename/Plug-in Support/Preferences" "$source_basename/Preferences.xml"
                else
                    tar --exclude="$source_basename"/Cache --exclude="$source_basename"/Codecs -cf "$dest/Full/$dt/Full_Plex_Data_Backup-$now.tar" "$source_basename"
                fi
                echo -e "Backup Complete\n"
                size=$(du -sh "$dest/$1/$dt/$1_Plex_Data_Backup-$now.tar" | awk '{print $1}')
            else
                if [ "$cf" == false ]; then
                    tar -cf "$dest/Essential/$dt/Essential_Plex_Data_Backup.tar" "$source_basename/Plug-in Support/Databases" "$source_basename/Plug-in Support/Preferences" "$source_basename/Preferences.xml"
                else
                    tar --exclude="$source_basename"/Cache --exclude="$source_basename"/Codecs -cf "$dest/Full/$dt/Full_Plex_Data_Backup.tar" "$source_basename"
                fi
                echo -e "Backup Complete\n"
                size=$(du -sh "$dest/$1/$dt/$1_Plex_Data_Backup.tar" | awk '{print $1}')
            fi
        else
            if [ "$alternate_format" != "yes" ]; then
                tar -cf "$dest/$1/$dt/$1_Plex_Data_Backup-debug0-$now.tar" -T /dev/null
                size=$(du -sh "$dest/$1/$dt/$1_Plex_Data_Backup-debug0-$now.tar" | awk '{print $1}')
            else
                tar -cf "$dest/$1/$dt/$1_Plex_Data_Backup-debug0.tar" -T /dev/null
                size=$(du -sh "$dest/$1/$dt/$1_Plex_Data_Backup-debug0.tar" | awk '{print $1}')
            fi
        fi
    fi
}
cleanup_function() {
    if [ -d "$destination"/Essential ]; then
        # echo -e "Removing Essential backups older than " $delete_after "days... please wait"
        # find "$destination"/Essential* -mtime +"$delete_after" -type d -exec rm -vrf {} \;
        cd "$destination"/Essential || exit
        echo -e "Removing all but the last" $keep_essential "essential backups... please wait"
        ls -1tr | head -n -"$keep_essential" | xargs -d '\n' rm -Rfd --
        echo -e "Done\n"
    fi
    # old=$((force_full_backup * keep_full))
    if [ -d "$destination/Full" ]; then
        # echo -e "Removing Full backups older than " $old "days... please wait"
        # find "$destination"/Full* -mtime +"$old" -type d -exec rm -vrf {} \;
        cd "$destination"/Full || exit
        echo -e "Removing all but the last " $keep_full "full backups... please wait"
        ls -1tr | head -n -$keep_full | xargs -d '\n' rm -Rfd --
        echo -e "Done\n"
    fi
}
statistics_function() {
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
    echo -e "$run_output\n"
    if [ -d "$dest/Essential/" ]; then
        echo -e "Total size of all Essential backups: $(du -sh "$dest/Essential/" | awk '{print $1}')"
    fi
    if [ -d "$dest/Full/" ]; then
        echo -e "Total size of all Full backups: $(du -sh "$dest/Full/" | awk '{print $1}')"
    fi
}
unraid_notification_function() {
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
}

discord_function() {
    get_ts=$(date -u -Iseconds)
    if [ "$full_backup" == "no" ]; then
        if [ "$cf" = false ]; then
            if [ "$force_full_backup" == 0 ] && [ "$full_backup" == "no" ]; then
                curl -s -H "Content-Type: application/json" -X POST -d '{"username": "'"${bot_name}"'","embeds": [{"title": "Plex Backup","description": "Essential Plex data has been backed up.","fields": [{"name": "Runtime:","value": "'"${run_output}"'"},{"name": "'"This Essential backup size:"'","value": "'"${essential_size}"'"},{"name": "Total size of all Essential backups:","value": "'"$(du -sh "$dest/Essential/" | awk '{print $1}')"'"}],"footer": {"text": "Powered by: Drazzilb | Blunt pencils are really pointless.","icon_url": "https://i.imgur.com/r69iYhr.png"},"color": "'"${bar_color}"'","timestamp": "'"${get_ts}"'"}]}' "$webhook"
                echo -e "Discord notification sent.\n"
            else
                curl -s -H "Content-Type: application/json" -X POST -d '{"username": "'"${bot_name}"'","embeds": [{"title": "Plex Backup","description": "Essential Plex data has been backed up.","fields": [{"name": "Runtime:","value": "'"${run_output}"'"},{"name": "'"This Essential backup size:"'","value": "'"${essential_size}"'"},{"name": "Total size of all Essential backups:","value": "'"$(du -sh "$dest/Essential/" | awk '{print $1}')"'"},{"name": "Days since last Full backup","value": "'"${days}"'"}],"footer": {"text": "Powered by: Drazzilb | Blunt pencils are really pointless.","icon_url": "https://i.imgur.com/r69iYhr.png"},"color": "'"${bar_color}"'","timestamp": "'"${get_ts}"'"}]}' "$webhook"
                echo -e "Discord notification sent.\n"
            fi
        else
            curl -s -H "Content-Type: application/json" -X POST -d '{"username": "'"${bot_name}"'","embeds": [{"title": "Plex Backup","description": "Essential & Full Plex data has been backed up.","fields": [{"name": "Runtime:","value": "'"${run_output}"'"},{"name": "'"This Essential backup size:"'","value": "'"${essential_size}"'"},{"name": "'"This Full Backup:"'","value": "'"${full_size}"'"},{"name": "Total size of all Essential backups:","value": "'"$(du -sh "$dest/Essential/" | awk '{print $1}')"'"},{"name": "'"Total size of all Full backups:"'","value": "'"$(du -sh "$dest/Full/" | awk '{print $1}')"'"},{"name": "Days since last Full backup","value": "'"${days}"'"}],"footer": {"text": "Powered by: Drazzilb | Fighting for peace is like screwing for virginity.","icon_url": "https://i.imgur.com/r69iYhr.png"},"color": "'"${bar_color}"'","timestamp": "'"${get_ts}"'"}]}' "$webhook"
            echo -e "Discord notification sent.\n"
        fi
    else
        curl -s -H "Content-Type: application/json" -X POST -d '{"username": "'"${bot_name}"'","embeds": [{"title": "Plex Backup","description": "Full Plex data has been backed up.","fields": [{"name": "Runtime:","value": "'"${run_output}"'"},{"name": "'"This Full Backup:"'","value": "'"${full_size}"'"},{"name": "'"Total size of all Full backups:"'","value": "'"$(du -sh "$dest/Full/" | awk '{print $1}')"'"},{"name": "Days since last Full backup","value": "'"${days}"'"}],"footer": {"text": "'"Powered by: Drazzilb | I buy all my guns from a guy called T-Rex. He's a small arms dealer."'","icon_url": "https://i.imgur.com/r69iYhr.png"},"color": "'"${bar_color}"'","timestamp": "'"${get_ts}"'"}]}' "$webhook"
        echo -e "Discord notification sent.\n"
    fi
}
debug_output_function() {
    echo -e "Script has ended with debug set to $debug"
    echo -e "Bot name: $bot_name"
    echo -e "Runetime: $run_output"
    echo -e "Essential Size $essential_size"
    echo -e "Full Size: $full_size"
    echo -e "Days $days"
    echo -e "Barcolor: $bar_color"
    echo -e "get_ts: $get_ts"
    echo -e "Webhook: $webhook"
    echo -e "lastbackup: $lastbackup"
    echo -e "basename: $source_basename"
    echo -e "parrent dir: $parentdir"
    echo -e "script dir: $script_dir"
    echo -e "force_full_backup: $force_full_backup"
}
main() {
    start=$(date +%s) # start time of script for statistics
    error_handling_function
    script_setup_function
    if [ "$full_backup" == "no" ]; then
        # Essential Backup
        backup_function "Essential"
        essential_size=$size
        if [ "$force_full_backup" != 0 ]; then
            # If days is greater than force full backup time OR  last backup hasn't happened
            if [[ "$days" -ge $force_full_backup ]] || [[ "$lastbackup" == 0 ]]; then
                cf=true # True == Full && Essential / cf == create full
                backup_function "Full"
                days=0
                full_size=$size
                if [ $debug == yes ]; then
                    echo "$current_date" >"$script_dir"/tmp_last_backup.tmp
                else
                    echo "$current_date" >/boot/config/plugins/user.scripts/scripts/last_plex_backup
                fi
            else
                cf=false # Full backup is within force_full_backup days && last backup != 0
                echo -e "Last Full backup created $days days ago... skipping\n"
            fi
        else
            cf=false
        fi
    else # full_backup == yes, Creates full backup regardless, no essential backup created
        cf=true
        backup_function "Full"
        full_size=$size
        if [ $debug == yes ]; then
            echo "$current_date" >"$script_dir"/tmp_last_backup.tmp
        else
            echo "$current_date" >/boot/config/plugins/user.scripts/scripts/last_plex_backup
        fi
        days=0
    fi
    sleep 2
    chmod -R 777 "$dest"
    cleanup_function
    end=$(date +%s)
    statistics_function
    if [ "$unraid_notify" == yes ]; then
        unraid_notification_function
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
