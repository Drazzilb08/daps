#!/bin/bash

#       ____             _                  _____  _
#      |  _ \           | |                |  __ \| |
#      | |_) | __ _  ___| | ___   _ _ __   | |__) | | _____  __
#      |  _ < / _` |/ __| |/ / | | | '_ \  |  ___/| |/ _ \ \/ /
#      | |_) | (_| | (__|   <| |_| | |_) | | |    | |  __/>  <
#      |____/ \__,_|\___|_|\_\\__,_| .__/  |_|    |_|\___/_/\_\
#                                  | |
#                                  |_|

#------------- DEFINE VARIABLES -------------#
source=''                          # path to your plex appdata location
destination=''                     # path to your backup folder
unraid_notify=no                          # (yes/no) Unraid notification that the backup was performed
delete_after=7                      # number of days to keep backups
full_backup=no                      # (yes/no) creation of entire Plex backup (yes) or essential data only (no)
                                        # Yes will significantly increase the amount of time and size to create a backup
                                        # as all metadata (potentially hundreds of thousands of files) is included in the backup.
force_full_backup=7                 # create a full backup every (#) number of days, in addition to regular essential data (0 to disable)
                                        # this will create an essential backup and then a full backup separately
                                        # this setting is ignored if full_backup = yes
keep_full=2                         # number of full backups to keep - these can be very large
use_pigz=yes                         # Due to the size of full backups if you're using a full backup and would like to really compress your backups down as much as possible use pigz
                                        # Pigz package must be installed via NerdPack
pigz_compression=9                  # Define compression level to use with pigz. Numbers are 0-9 only!
                                        # 0 = No compression
                                        # 1 = Least compression/Fastest
                                        # 6 = Default compression/Default Speed
                                        # 9 = Maximum Compression/Slowest
alternate_format=no   # This option will remove the time from the file and move it over to the directory structure.
                        # Yes = /path/to/source/yyyy-mm-dd@18.00_AM/<Essential/Full>_Plex_Data_Backup.tar.gz
                        # No = /path/to/source/yyyy-mm-dd/<Essential/Full>_Plex_Data_Backup-18_00_AM.tar.gz
                        # Times are in 24 hour clock
#------------- DEFINE DISCORD VARIABLES -------------#
# This section is not required

use_discord=yes                      # Use discord for notifications
webhook=''                          # Discord webhook
bot_name='Notification Bot'         # Name your bot
bar_color='15048717'                  # The bar color for discord notifications, must be Hexcode

#------------- DO NOT MODIFY BELOW THIS LINE -------------#
debug=false #testing only
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
    echo -e >&2 "pigz is not installed.\nPlease install pigz and rerun.\nIf on unRaid, pigz can be found through the NerdPack which is found in the appstore"; 
    exit 1; 
    }

if [ -e "/tmp/i.am.running.plex.tmp" ]; then
    echo "Another instance of the script is running. Aborting."
    echo "Please use rm /tmp/i.am.running.plex.tmp in your terminal to remove the locking file"
    exit
else
    touch "/tmp/i.am.running.plex.tmp"
fi

start=$(date +%s) # start time of script for statistics

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

# create tar file of essential databases and preferences -- The Plug-in Support preferences will keep settings of any plug-ins, even though they will need to be reinstalled.
if [ "$full_backup" == "no" ]; then
    echo -e "\nCreating Essential backup... please wait"
    mkdir -p "$dest/Essential/$dt"

    if [ "$debug" != true ]; then
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
            cf=true # created full backup
            echo -e "\nCreating Full backup now... please wait"
            mkdir -p "$dest/Full/$dt"

            if [ "$debug" != true ]; then
                if [ "$alternate_format" != "yes" ]; then
                    tar --exclude="$source/Cache/Transcode" --exclude="$source/Cache/PhotoTranscoder" -cf "$dest/Full/$dt/Full_Plex_Data_Backup-$now.tar" "$source"
                    full_size=$(du -sh "$dest/Full/$dt/Full_Plex_Data_Backup-$now.tar" | awk '{print $1}')
                    # Compress tar into tar.gz file greatly reducing the size of the backup.
                    if [ "$use_pigz" == yes ]; then
                        pigz -$pigz_compression "$dest/Full/$dt/Full_Plex_Data_Backup-$now.tar" 
                        full_size=$(du -sh "$dest/Full/$dt/Full_Plex_Data_Backup-$now.tar.gz" | awk '{print $1}')
                    fi
                else
                    tar --exclude="$source/Cache/Transcode" --exclude="$source/Cache/PhotoTranscoder" -cf "$dest/Full/$dt/Full_Plex_Data_Backup.tar" "$source"
                    full_size=$(du -sh "$dest/Full/$dt/Full_Plex_Data_Backup.tar" | awk '{print $1}')
                    # Compress tar into tar.gz file greatly reducing the size of the backup.
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

    if [ "$debug" != true ]; then
        if [ "$alternate_format" != "yes" ]; then
            tar --exclude="$source/Cache/Transcode" --exclude="$source/Cache/PhotoTranscoder" -cf "$dest/Full/$dt/Full_Plex_Data_Backup-$now.tar" "$source"
            full_size=$(du -sh "$dest/Full/$dt/Full_Plex_Data_Backup-$now.tar" | awk '{print $1}')
            # Compress tar into tar.gz file greatly reducing the size of the backup.
            if [ "$use_pigz" == "yes" ]; then
                pigz -$pigz_compression "$dest/Full/$dt/Full_Plex_Data_Backup-$now.tar"
                full_size=$(du -sh "$dest/Full/$dt/Full_Plex_Data_Backup-$now.tar.gz" | awk '{print $1}')
            fi
        else
            tar --exclude="$source/Cache/Transcode" --exclude="$source/Cache/PhotoTranscoder" -cf "$dest/Full/$dt/Full_Plex_Data_Backup.tar" "$source"
            full_size=$(du -sh "$dest/Full/$dt/Full_Plex_Data_Backup.tar" | awk '{print $1}')
            # Compress tar into tar.gz file greatly reducing the size of the backup.
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

    # save the date of the full backup
    date >/boot/config/plugins/user.scripts/scripts/last_plex_backup
    days=0
fi

sleep 2
chmod -R 777 "$dest"
if [ -d "$destination"/Essential ]; then
    echo -e "\nRemoving Essential backups older than " $delete_after "days... please wait"
    find "$destination"/Essential* -mtime +$delete_after -delete -print
    echo "Done"
fi

old=$((force_full_backup * keep_full))
if [ -d "$destination/Full" ]; then
    echo -e "\nRemoving Full backups older than " $old "days... please wait"
    find "$destination"/Full* -mtime +$old -delete -print
    echo "Done"
fi
end=$(date +%s)
# Runtime
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
#unRaid notificaitons
if [ "$unraid_notify" == yes ]; then
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
fi
if [ -d "$dest/Essential/" ]; then
    echo -e "Total size of all Essential backups: $(du -sh "$dest/Essential/" | awk '{print $1}')"
fi
if [ -d "$dest/Full/" ]; then
    echo -e "Total size of all Full backups: $(du -sh "$dest/Full/" | awk '{print $1}')"
fi
# Discord Notifications
if [ "$use_discord" == "yes" ]; then
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
fi

echo -e '\nAll Done!\n'
# Remove lock file
rm "/tmp/i.am.running.plex.tmp"

exit
#
# v1.2.7
