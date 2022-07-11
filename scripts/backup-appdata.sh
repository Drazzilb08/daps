#!/bin/bash

#       ____             _                                           _       _        
#      |  _ \           | |                    /\                   | |     | |       
#      | |_) | __ _  ___| | ___   _ _ __      /  \   _ __  _ __   __| | __ _| |_ __ _ 
#      |  _ < / _` |/ __| |/ / | | | '_ \    / /\ \ | '_ \| '_ \ / _` |/ _` | __/ _` |
#      | |_) | (_| | (__|   <| |_| | |_) |  / ____ \| |_) | |_) | (_| | (_| | || (_| |
#      |____/ \__,_|\___|_|\_\\__,_| .__/  /_/    \_\ .__/| .__/ \__,_|\__,_|\__\__,_|
#                                  | |              | |   | |                         
#                                  |_|              |_|   |_|                          

# This script creates an invididual tar file for each docker appdata directory that you define (needs both container name and path to it's appdata). Furthermore, it stops and restarts each container before and after backup if the container was running at the time of the backup

#------------- DEFINE VARIABLES -------------#
source='/mnt/user/appdata/'             # Set appdata directory, this is to help with easily adding directories
                                        # Example: $source/radarr 
                                        # This is the same as typing out /mnt/user/appdata/radarr (keeping things simple)
                                        # However, if you want to type out the whole thing, (say if you have config information in seperate locations) you still can enter the information, just don't use $source
destination='/mnt/user/backup/appdata/' # Set backup directory
delete_after=2                          # Number of days to keep backup
usePigz=no                             # Use pigz to further compress your backup (yes) will use pigz to further compress, (no) will not use pigz
                                            # Pigz package must be installed via NerdPack
pigzCompression=9						# Define compression level to use with pigz
                                            # 0 = No compression
                                            # 1 = Least compression/Fastest
                                            # 6 = Default compression/Default Speed
                                            # 9 = Maximum Compression/Slowest
notify=no                              # Use unRAID's built in notification system
#------------- DEFINE DISCORD VARIABLES -------------#
# This section is not required
# This portion requires discord.sh to be downloaded and placed somewhere in a location accessable by this script
# You can find discord.sh ----> https://github.com/ChaoticWeg/discord.sh
# Simply download or clone the repo and extract the discord.sh file to a loaction then define that location in the discordLoc variable

useDiscord=yes                          # Use discord for notifications
                                        # Note, there is a limititation of 20 containers per list and list_no_stop if you're going to use discord

discordLoc=''                           # Full location to discord.sh
                                                                                        # Eg. '/mnt/user/data/scripts/discord.sh'
webhook=''                              # Discord webhook
botName='Notification Bot'              # Name your bot
titleName='Server Notifications'        # Give a title name to your discord messages
barColor='FF33FF'                       # The bar color for discord notifications, must be Hexcode
avatarUrl=''                            # Url for the avatar you want your bot to have

                                        # List containers and assiciated config directory to stop and backup
                                            # Format: <container name> <$source/container_config_dir>
                                            # Eg. tautulli $appdata/tautulli>
list=(
    pmm-anime $source/plex-meta-manager/pmm-anime
    pmm-movies $source/plex-meta-manager/pmm-movies
    pmm-series $source/plex-meta-manager/pmm-series
    wrapperr $source/wrapperr
    tautulli $source/tautulli
    plex-auto-languages $source/plex-auto-languages
    homarr $source/homarr
    heimdall $source/heimdall
    binhex-krusader $source/binhex-krusader
    code-server $source/code-server
    thelounge $source/thelounge
    mariadb $source/mariadb
    mongodb $source/mongodb
    icloudpd1 $source/icloudpd/jonathon/
    icloudpd2 $source/icloudpd/ashli/
    speedtesttracker $source/speedtesttracker
    cloudflared-2 $source/cloudflared-2
    cloudflared $source/cloudflared
    radarr $source/radarr
    sonarr $source/sonarr
    sonarr-anime $source/sonarr-anime
    lidarr $source/lidarr
    readarr $source/readarr
    calibre $source/calibre
    filebrowser $source/filebrowser
    xbackbone $source/xbackbone
    petio $source/petio
    ghost $source/ghost
    ghost-2 $source/ghost-2
    organizrv2 $source/organizrv2
    calibre-web $source/calibre-web
)
                                        # List containers and associated config directory to back up without stopping
                                            # Format: <container name> <$source/container_config_dir>
                                            # Eg. tautulli $appdata/tautulli>
list_no_stop=(
    qbittorrent-vpn-movies $source/qbittorrent-vpn-movies
    qbittorrent-vpn-series $source/qbittorrent-vpn-series
    qbittorrent-vpn-music $source/qbittorrent-vpn-music
    qbittorrent-vpn-books $source/qbittorrent-vpn-books
    qbittorrent-vpn-games $source/qbittorrent-vpn-games
    prowlarr $source/prowlarr
    notifiarr $source/notifiarr
    cross-seed-movies $source/cross-seed-movies
    cross-seed-series $source/cross-seed-series
    autobrr $source/autobrr
    qbit-manage-movies $source/qbit-manage
    nginxproxymanager $source/nginxproxymanager
)


#<-----------TO DO------------->#
# SQUASH BUGS
    # Discord will only take 20 lines per field, Require splitting
#<-----------TO DO------------->#

#------------- DO NOT MODIFY BELOW THIS LINE -------------#
# Will not run again if currently running.
if [ -e "/tmp/i.am.running.appdata" ]; then
    echo "Another instance of the script is running. Aborting."
    exit
else
    touch "/tmp/i.am.running.appdata"
fi
touch "/tmp/appdata.tmp"
touch "/tmp/appdata_error.tmp"
touch "/tmp/appdata_nostop.tmp"
#Set variables
start=$(date +%s)                   #Sets start time for runtime information
cd "$(realpath -s $source)"
dest=$(realpath -s $destination)
dt=$(date +"%m-%d-%Y")
now=$(date +"%I_%M_%p")

# create the backup directory if it doesn't exist - error handling - will not create backup file if path does not exist
mkdir -p "$dest"
# Creating backup of directory
mkdir -p "$dest/$dt"
debug=yes           # Add additional log information
                    # Also does not remove tmp files
delete_files=yes    #option to save or remove files during debug
# Data Backup
if [ "$debug" == "yes" ]; then
    echo -e "Starting stop container loop"
    echo -e "-----------------------"
fi
for (( i = 0; i < ${#list[@]}; i += 2 ))
do
    name=${list[i]} path=${list[i+1]}
    # Error handling container || path exists or does not exists
    if [ $( docker ps -a -f name=$name | wc -l ) -ge 2 ]; then
        error=1
        if [ ! -d "$path" ]; then
            echo -e "\nERROR: $name exists but the directory $path does not exist\n"
            errorlog="Container \`$name\` exists but the directory $path does not exist"
            echo $errorlog >> /tmp/appdata_error.tmp
            continue
        fi
    else
        error=1
        if [ ! -d "$path" ]; then
            echo -e "\nERROR: Container $name does not exit and $path does not exist\n"
            errorlog="Container \`$name\` does not exit and $path does not exist"
            echo $errorlog >> /tmp/appdata_error.tmp
            continue
        else
            echo -e "\nERROR: Container $name does not exist but the directory $path exists\n"
            errorlog="Container \`$name\` does not exists but the directory $path exists"
            echo $errorlog >> /tmp/appdata_error.tmp
            continue
        fi
    fi
    cRunning="$(docker ps -a --format '{{.Names}}' -f status=running)"
    # If container is running
    if echo $cRunning | grep -iqF $name; then
        echo -e "Stopping $name"
        docker stop -t 60 "$name" > /dev/null 2>&1 # Stops container without output 
        echo -e "Creating backup of $name"
        tar cWfC "$dest/$dt/$name-"$now".tar" "$(dirname "$path")" "$(basename "$path")"    
        echo -e "Starting $name"
        docker start "$name" > /dev/null 2>&1
        if [ $usePigz == yes ]; then
            echo -e "Compressing $name..."
            pigz -$pigzCompression "$dest/$dt/$name-"$now".tar"
        fi
    # If container is stopped
    else
        echo -e "$name is already stopped"
        echo -e "Creating backup of $name"
        tar cWfC "$dest/$dt/$name-"$now".tar" "$(dirname "$path")" "$(basename "$path")"
        if [ $usePigz == yes ]; then
            echo -e "Compressing $name..."
            pigz -$pigzCompression "$dest/$dt/$name-"$now".tar"
        fi
        echo -e "$name was stopped before backup, ignoring startup"
    fi
    # Information Gathering
    if [ $usePigz == yes ]; then
        containersize=$(du -sh $dest/$dt/$name-"$now".tar.gz | awk '{print $1}')
        echo "Container: $name has been backed up & compressed: $containersize"
        containerinfo="Container: \`$name\` has been backed up & compressed: $containersize"
    else
        containersize=$(du -sh $dest/$dt/$name-"$now".tar | awk '{print $1}')
        echo "Container: $name has been backed up: $containersize"
        containerinfo="Container: \`$name\` has been backed up: $containersize"
    fi
    echo $containerinfo >> /tmp/appdata.tmp
    stopped=1
    echo -e "-----------------------"
done
# Backup containers without stopping them
if [ "$debug" == "yes" ]; then
    echo -e "Starting stop container loop"
    echo -e "-----------------------"
fi  
for (( i = 0; i < ${#list_no_stop[@]}; i += 2 ))
do
    name=${list_no_stop[i]} path=${list_no_stop[i+1]}

    echo -e "Creating backup of $name"
    tar cWfC "$dest/$dt/$name-"$now".tar" "$(dirname "$path")" "$(basename "$path")"
    if [ $usePigz == yes ]; then
            echo -e "Compressing $name..."
            pigz -$pigzCompression "$dest/$dt/$name-"$now".tar"
        fi
    echo "Finished backup for $name"
    # Information Gathering
    if [ $usePigz == yes ]; then
        containersize=$(du -sh $dest/$dt/$name-"$now".tar.gz | awk '{print $1}')
        echo "Container: $name has been backed up & compressed: $containersize"
        containerinfo="Container: \`$name\` has been backed up & compressed: $containersize"
    else
        containersize=$(du -sh $dest/$dt/$name-"$now".tar | awk '{print $1}')
        echo "Container: $name has been backed up: $containersize"
        containerinfo="Container: \`$name\` has been backed up: $containersize"
    fi
    echo $containerinfo >> /tmp/appdata_nostop.tmp
    nostop=1
    echo -e "-----------------------"
done

sleep 2
chmod -R 777 "$dest"

#Cleanup Old Backups
echo -e "\nRemoving backups older than " $delete_after "days...\n"
find $destination* -mtime +$delete_after -exec rm -rfd {} \;
#find $destination* -type f -size 1k --include "*.tar.gz" -exec rm -rfld '{}' \;

end=$(date +%s)
runsize=$(du -sh $dest/$dt/ | awk '{print $1}') #Set runsize information
# Runtime
totalTime=$((end - start))
seconds=$((totalTime % 60))
minutes=$((totalTime % 3600 / 60))
hours=$((totalTime / 3600))

if (("$minutes" == "0" && "$hours" == "0")); then
    echo -e "\nScript completed in $seconds seconds"
    runOutput="\nScript completed in $seconds seconds"
elif (("$hours" == "0")); then
    echo -e "\nScript completed in $minutes minutes and $seconds seconds"
    runOutput="\nScript completed in $minutes minutes and $seconds seconds"
else
    echo -e "\nScript completed in $hours hours $minutes minutes and $seconds seconds"
    runOutput="\nScript completed in $hours hours $minutes minutes and $seconds seconds"
fi
echo -e "\nThis backup's size: $runsize"
if [ -d $dest/ ]; then
    totalsize=$(du -sh $dest | awk '{print $1}')
    echo -e "Total size of all backups: $totalsize"
fi
# Notifications
if [ "$notify" == "yes" ]; then
    /usr/local/emhttp/plugins/dynamix/scripts/notify -s "AppData Backup" -d "Backup of ALL Appdata complete."
fi
# Discord notifications
if [ "$useDiscord" == "yes" ]; then
    if [ "$error" == 1 ]; then
        ${discordLoc} --webhook-url="$webhook" --username "${botName}" \
            --title "${titleName}" \
            --avatar "$avatarUrl" \
            --description "Error Log" \
            --field "Errors; $(cat /tmp/appdata_error.tmp | jq -Rs . | cut -c 2- | rev | cut -c 2- | rev);false" \
            --field "Please check your config" \
            --color "0xFF0000" \
            --footer "Powered by: Drazzilb" \
            --footer-icon "https://i.imgur.com/r69iYhr.png" \
            --timestamp
        echo -e "\nDiscord error notification sent."
    fi
    #Appdata OR Appdata_nostop are greater than 20 lines
    if [ $(< "/tmp/appdata_nostop.tmp" wc -l) -gt 20 ] || [ $(< "/tmp/appdata.tmp" wc -l) -gt 20 ]; then
        # If appdata_nostop is greater than 20 lines AND appdata is less than or equal to 20 lines
        if [ $(< "/tmp/appdata_nostop.tmp" wc -l) -gt 20 ] && [ $(< "/tmp/appdata.tmp" wc -l) -le 20 ]; then
            echo "appdata_nostop.tmp is greater than 20"
            if [ $(< "/tmp/appdata.tmp" wc -l) -eq 0 ]; then
                echo "appdata_nostop.tmp is greater than 20 but appdata.tmp is equal to 0"
                ${discordLoc} --webhook-url="$webhook" --username "${botName}" \
                    --title "${titleName}" \
                    --avatar "$avatarUrl" \
                    --description "Appdata Backup Complete." \
                    --field "Runtime; $runOutput.;false" \
                    --field "Containers not stopped but backed up; $(cat /tmp/appdata_nostop.tmp | sed -n "1,20p" | jq -Rs . | cut -c 2- | rev | cut -c 2- | rev);false" \
                    --field "Containers not stopped but backed up; $(cat /tmp/appdata_nostop.tmp | sed -n "21,40p" | jq -Rs . | cut -c 2- | rev | cut -c 2- | rev);false" \
                    --field "This backup's size:; $runsize;false" \
                    --field "Total size of all backups:; ${totalsize};false" \
                    --color "0x$barColor" \
                    --footer "Powered by: Drazzilb" \
                    --footer-icon "https://i.imgur.com/r69iYhr.png" \
                    --timestamp
            else
                echo "appdata_nostop.tmp is greater than 20 but appdata.tmp is greater than 0 but less than 20"
                ${discordLoc} --webhook-url="$webhook" --username "${botName}" \
                    --title "${titleName}" \
                    --avatar "$avatarUrl" \
                    --description "Appdata Backup Complete." \
                    --field "Runtime; $runOutput.;false" \
                    --field "Containers stopped & backed up; $(cat /tmp/appdata.tmp | sed -n "1,20p" | jq -Rs . | cut -c 2- | rev | cut -c 2- | rev);false" \
                    --field "Containers not stopped but backed up; $(cat /tmp/appdata_nostop.tmp | sed -n "1,20p" | jq -Rs . | cut -c 2- | rev | cut -c 2- | rev);false" \
                    --field "Containers not stopped but backed up; $(cat /tmp/appdata_nostop.tmp | sed -n "21,40p" | jq -Rs . | cut -c 2- | rev | cut -c 2- | rev);false" \
                    --field "This backup's size:; $runsize;false" \
                    --field "Total size of all backups:; ${totalsize};false" \
                    --color "0x$barColor" \
                    --footer "Powered by: Drazzilb" \
                    --footer-icon "https://i.imgur.com/r69iYhr.png" \
                    --timestamp
            fi
        fi
        # If appdata is greater than 20 lines AND appdata_nostop is less than or equal to 20 lines
        if [ $(< "/tmp/appdata.tmp" wc -l) -gt 20 ] && [ $(< "/tmp/appdata_nostop.tmp" wc -l) -le 20 ]; then
            echo "appdata.tmp is greater than 20"
            if [ $(< "/tmp/appdata_nostop.tmp" wc -l) -eq 0 ]; then
                echo "appdata.tmp is greater than 20 but appdata_nostop.tmp is equal to 0"
                ${discordLoc} --webhook-url="$webhook" --username "${botName}" \
                    --title "${titleName}" \
                    --avatar "$avatarUrl" \
                    --description "Appdata Backup Complete." \
                    --field "Runtime; $runOutput.;false" \
                    --field "Containers stopped & backed up; $(cat /tmp/appdata.tmp | sed -n "1,20p" | jq -Rs . | cut -c 2- | rev | cut -c 2- | rev);false" \
                    --field "Containers stopped & backed up; $(cat /tmp/appdata.tmp | sed -n "21,40p" | jq -Rs . | cut -c 2- | rev | cut -c 2- | rev);false" \
                    --field "This backup's size:; $runsize;false" \
                    --field "Total size of all backups:; ${totalsize};false" \
                    --color "0x$barColor" \
                    --footer "Powered by: Drazzilb" \
                    --footer-icon "https://i.imgur.com/r69iYhr.png" \
                    --timestamp
            else
                echo "appdata.tmp is greater than 20 but appdata_nostop.tmp is greater than 0 but less than 20"
                ${discordLoc} --webhook-url="$webhook" --username "${botName}" \
                    --title "${titleName}" \
                    --avatar "$avatarUrl" \
                    --description "Appdata Backup Complete." \
                    --field "Runtime; $runOutput.;false" \
                    --field "Containers stopped & backed up; $(cat /tmp/appdata.tmp | sed -n "1,20p" | jq -Rs . | cut -c 2- | rev | cut -c 2- | rev);false" \
                    --field "Containers stopped & backed up; $(cat /tmp/appdata.tmp | sed -n "21,40p" | jq -Rs . | cut -c 2- | rev | cut -c 2- | rev);false" \
                    --field "Containers not stopped but backed up; $(cat /tmp/appdata_nostop.tmp | sed -n "1,20p" | jq -Rs . | cut -c 2- | rev | cut -c 2- | rev);false" \
                    --field "This backup's size:; $runsize;false" \
                    --field "Total size of all backups:; ${totalsize};false" \
                    --color "0x$barColor" \
                    --footer "Powered by: Drazzilb" \
                    --footer-icon "https://i.imgur.com/r69iYhr.png" \
                    --timestamp
            fi
        fi
        # If appdata_nostop AND appdata are both greater than 20 lines
        if [ $(< "/tmp/appdata_nostop.tmp" wc -l) -gt 20 ] && [ $(< "/tmp/appdata.tmp" wc -l) -gt 20 ]; then
            echo "appdata_nostop.tmp is greater than 20 && appdata.tmp is greater than 20"
            ${discordLoc} --webhook-url="$webhook" --username "${botName}" \
                --title "${titleName}" \
                --avatar "$avatarUrl" \
                --description "Appdata Backup Complete." \
                --field "Runtime; $runOutput.;false" \
                --field "Containers stopped & backed up; $(cat /tmp/appdata.tmp | sed -n "1,20p" | jq -Rs . | cut -c 2- | rev | cut -c 2- | rev);false" \
                --field "Containers stopped & backed up; $(cat /tmp/appdata.tmp | sed -n "21,40p" | jq -Rs . | cut -c 2- | rev | cut -c 2- | rev);false" \
                --field "Containers not stopped but backed up; $(cat /tmp/appdata_nostop.tmp | sed -n "1,20p" | jq -Rs . | cut -c 2- | rev | cut -c 2- | rev);false" \
                --field "Containers not stopped but backed up; $(cat /tmp/appdata_nostop.tmp | sed -n "21,40p" | jq -Rs . | cut -c 2- | rev | cut -c 2- | rev);false" \
                --field "This backup's size:; $runsize;false" \
                --field "Total size of all backups:; ${totalsize};false" \
                --color "0x$barColor" \
                --footer "Powered by: Drazzilb" \
                --footer-icon "https://i.imgur.com/r69iYhr.png" \
                --timestamp
        fi
    else 
        #If both are below 20 lines
        if [ "$nostop" == 1 ] && [ "$stopped" == 1 ];then
            ${discordLoc} --webhook-url="$webhook" --username "${botName}" \
                --title "${titleName}" \
                --avatar "$avatarUrl" \
                --description "Appdata Backup Complete." \
                --field "Runtime; $runOutput.;false" \
                --field "Containers stopped & backed up; $(cat /tmp/appdata.tmp | jq -Rs . | cut -c 2- | rev | cut -c 2- | rev);false" \
                --field "Containers not stopped but backed up; $(cat /tmp/appdata_nostop.tmp | jq -Rs . | cut -c 2- | rev | cut -c 2- | rev);false" \
                --field "This backup's size:; $runsize;false" \
                --field "Total size of all backups:; ${totalsize};false" \
                --color "0x$barColor" \
                --footer "Powered by: Drazzilb" \
                --footer-icon "https://i.imgur.com/r69iYhr.png" \
                --timestamp
        elif [ "$nostop" == 1 ]; then
            ${discordLoc} --webhook-url="$webhook" --username "${botName}" \
                --title "${titleName}" \
                --avatar "$avatarUrl" \
                --description "Appdata Backup Complete." \
                --field "Runtime; $runOutput.;false" \
                --field "Containers not stopped but backed up; $(cat /tmp/appdata_nostop.tmp | jq -Rs . | cut -c 2- | rev | cut -c 2- | rev);false" \
                --field "This backup's size:; $runsize;false" \
                --field "Total size of all backups:; ${totalsize};false" \
                --color "0x$barColor" \
                --footer "Powered by: Drazzilb" \
                --footer-icon "https://i.imgur.com/r69iYhr.png" \
                --timestamp
        elif [ "$stopped" == 1 ]; then
            ${discordLoc} --webhook-url="$webhook" --username "${botName}" \
                --title "${titleName}" \
                --avatar "$avatarUrl" \
                --description "Appdata Backup Complete." \
                --field "Runtime; $runOutput.;false" \
                --field "Containers stopped & backed up; $(cat /tmp/appdata.tmp | jq -Rs . | cut -c 2- | rev | cut -c 2- | rev);false" \
                --field "This backup's size:; $runsize;false" \
                --field "Total size of all backups:; ${totalsize};false" \
                --color "0x$barColor" \
                --footer "Powered by: Drazzilb" \
                --footer-icon "https://i.imgur.com/r69iYhr.png" \
                --timestamp
        fi
    fi
    echo -e "\nDiscord notification sent."
fi
echo -e '\nAll Done!\n'
# Remove temp files
if [ "$debug" == "yes" ]; then
    echo -e "Script has ended with debug set to ${debug}"
    echo -e "\nnostop = $nostop\nstopped = $stopped"
    echo -e "Errors = $errors."
    echo -e "Line count for appdata.tmp:" wc -l /tmp/appdata.tmp
    echo -e "Line count for appdata_nostop.tmp\:" wc -l /tmp/appdata_nostop.tmp
    if [ "$delete_files" == "yes"]; then
        echo -e "Files are being removed"
        rm "/tmp/appdata_error.tmp"
        rm "/tmp/appdata_nostop.tmp"
        rm "/tmp/appdata.tmp"
    else
        echo -e "Files need to removed located at:\n/tmp/i.am.running.appdata\n/tmp/appdata_error.tmp\n/tmp/appdata_nostop.tmp\n/tmp/appdata.tmp"
        # Copy the next line minus the pound/hashtag sign and paste it into your terminal
        # rm /tmp/appdata_error.tmp /tmp/appdata_nostop.tmp /tmp/appdata.tmp
    fi
    rm "/tmp/i.am.running.appdata"
    exit
fi
rm "/tmp/i.am.running.appdata"
rm "/tmp/appdata_error.tmp"
rm "/tmp/appdata_nostop.tmp"
rm "/tmp/appdata.tmp"
exit 