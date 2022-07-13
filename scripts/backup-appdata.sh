#!/bin/bash
#                                 _       _          ____             _                
#           /\                   | |     | |        |  _ \           | |               
#          /  \   _ __  _ __   __| | __ _| |_ __ _  | |_) | __ _  ___| | ___   _ _ __  
#         / /\ \ | '_ \| '_ \ / _` |/ _` | __/ _` | |  _ < / _` |/ __| |/ / | | | '_ \ 
#        / ____ \| |_) | |_) | (_| | (_| | || (_| | | |_) | (_| | (__|   <| |_| | |_) |
#       /_/    \_\ .__/| .__/ \__,_|\__,_|\__\__,_| |____/ \__,_|\___|_|\_\\__,_| .__/ 
#                | |   | |                                                      | |    
#                |_|   |_|                                                      |_|    
# v1.0.1

# This script creates an invididual tar file for each docker appdata directory that you define (needs both container name and path to it's appdata). 
# Furthermore, it stops and restarts each container before and after backup if the container was running at the time of the backup

#------------- DEFINE VARIABLES -------------#
source='/mnt/user/appdata/'             # Set appdata directory, this is to help with easily adding directories
                                        # Example: $source/radarr 
                                        # This is the same as typing out /mnt/user/appdata/radarr (keeping things simple)
                                        # However, if you want to type out the whole thing, (say if you have config information in seperate locations) you still can enter the information, just don't use $source
destination='/mnt/user/backup/appdata/' # Set backup directory
delete_after=2                          # Number of days to keep backup
usePigz=yes                             # Use pigz to further compress your backup (yes) will use pigz to further compress, (no) will not use pigz
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
                                            # Eg. tautulli $source/tautulli
list=(

)
                                        # List containers and associated config directory to back up without stopping
                                            # Format: <container name> <$source/container_config_dir>
                                            # Eg. tautulli $source/tautulli
list_no_stop=(

)

#------------- DO NOT MODIFY BELOW THIS LINE -------------#
# Will not run again if currently running.
if [ ! -d "$source" ]; then
	echo "ERROR: Your source directory does not exist, please check your configuration"
	exit
fi
if [ -z "$source" ]; then
    echo "ERROR: Your source directory is not set , please check your configuration"
	exit
fi
if [ "$useDiscord" == "yes" ] && [ ! -f "$discordLoc" ] || [ -z "$discordLoc" ]; then
	echo "ERROR: You're attempting to use the Discord integration but discord.sh is not found at ${discordLoc} or not set"
	exit
fi
if [ command -v pigz &> /dev/null ] && [ "$usePigz" == "yes"]; then 
    echo "pigz could not be found."
    echo "Please install pigz and rerun."
    echo "If on unRaid, pigz can be found through the NerdPack which is found in the appstore"
    exit
fi
if [ -e "/tmp/i.am.running.appdata" ]; then
    echo "Another instance of the script is running. Aborting."
    echo "Please use rm /tmp/i.am.running.appdata in your terminal to remove the locking file"
    exit
else
    touch "/tmp/i.am.running.appdata"
fi

touch "/tmp/appdata_error.tmp"
#Set variables
start=$(date +%s)                   #Sets start time for runtime information
cd "$(realpath -s $source)"
dest=$(realpath -s $destination)
dt=$(date +"%m-%d-%Y")
now=$(date +"%I_%M_%p")

# create the backup directory if it doesn't exist - error handling - will not create backup file if path does not exist
if [ ! -d "$dest" ]; then
    echo "Making directory at ${dest}"
    mkdir -p "$dest"
fi
# Creating backup of directory
mkdir -p "$dest/$dt"
debug=no           # Add additional log information
                    # Also does not remove tmp files
delete_files=yes    #option to save or remove files during debug
counter=0
nostop_counter=0
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
        if [ ! -d "$path" ]; then
            echo -e "\nERROR: $name exists but the directory $path does not exist\n"
            errorlog="Container \`$name\` exists but the directory $path does not exist"
            echo $errorlog >> /tmp/appdata_error.tmp
            continue
        fi
    else
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
        if [ "$debug" != "yes" ]; then
            docker stop -t 60 "$name" > /dev/null 2>&1 # Stops container without output 
        fi
        echo -e "Creating backup of $name"
        if [ "$debug" == "yes" ]; then
            tar -cf "$dest/$dt/$name-"$now"-debug.tar" -T /dev/null
        else
            tar cWfC "$dest/$dt/$name-"$now".tar" "$(dirname "$path")" "$(basename "$path")"    
        fi
        echo -e "Starting $name"
        docker start "$name" > /dev/null 2>&1
        if [ $usePigz == yes ]; then
            echo -e "Compressing $name..."
            if [ "$debug" == "yes" ]; then
                pigz -$pigzCompression "$dest/$dt/$name-"$now"-debug.tar"
            else
                pigz -$pigzCompression "$dest/$dt/$name-"$now".tar"
            fi
        fi
    # If container is stopped
    else
        echo -e "$name is already stopped"
        echo -e "Creating backup of $name"
        if [ "$debug" == "yes" ]; then
            tar -cf "$dest/$dt/$name-"$now"-debug.tar" -T /dev/null
        else
            tar cWfC "$dest/$dt/$name-"$now".tar" "$(dirname "$path")" "$(basename "$path")"
        fi
        if [ $usePigz == yes ]; then
            echo -e "Compressing $name..."
            if [ "$debug" == "yes" ]; then
                pigz -$pigzCompression "$dest/$dt/$name-"$now"-debug.tar"
            else
                pigz -$pigzCompression "$dest/$dt/$name-"$now".tar"
            fi
        fi
        echo -e "$name was stopped before backup, ignoring startup"
    fi
    # Information Gathering
    if [ $usePigz == yes ]; then
        if [ "$debug" == "yes" ]; then
            containersize=$(du -sh $dest/$dt/$name-"$now"-debug.tar.gz | awk '{print $1}')
        else
            containersize=$(du -sh $dest/$dt/$name-"$now".tar.gz | awk '{print $1}')
        fi
        echo "Container: $name has been backed up & compressed: $containersize"
    else
        if [ "$debug" == "yes" ]; then
            containersize=$(du -sh $dest/$dt/$name-"$now"-debug.tar | awk '{print $1}')
        else
            containersize=$(du -sh $dest/$dt/$name-"$now".tar | awk '{print $1}')
        fi
        echo "Container: $name has been backed up: $containersize"
    fi
    counter=$((counter+1))
    if [ "$ebug" == "yes" ];then
        echo "Backup counter: $counter"
    fi
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
    if [ "$debug" == "yes" ]; then
        tar -cf "$dest/$dt/$name-"$now"-debug.tar" -T /dev/null
    else
        tar cWfC "$dest/$dt/$name-"$now".tar" "$(dirname "$path")" "$(basename "$path")"
    fi
    if [ $usePigz == yes ]; then
            echo -e "Compressing $name..."
            if [ "$debug" == "yes" ]; then
                pigz -$pigzCompression "$dest/$dt/$name-"$now"-debug.tar"
            else
                pigz -$pigzCompression "$dest/$dt/$name-"$now".tar"
            fi
        fi
    echo "Finished backup for $name"
    # Information Gathering
    if [ $usePigz == yes ]; then
        if [ "$debug" == "yes" ]; then
            containersize=$(du -sh $dest/$dt/$name-"$now"-debug.tar.gz | awk '{print $1}')
        else
            containersize=$(du -sh $dest/$dt/$name-"$now".tar.gz | awk '{print $1}')
        fi
        echo "Container: $name has been backed up & compressed: $containersize"
    else
        if [ "$debug" == "yes" ]; then
            containersize=$(du -sh $dest/$dt/$name-"$now"-debug.tar | awk '{print $1}')
        else
            containersize=$(du -sh $dest/$dt/$name-"$now".tar | awk '{print $1}')
        fi
        echo "Container: $name has been backed up: $containersize"
    fi
    echo $containerinfo >> /tmp/appdata_nostop.tmp
    echo -e "-----------------------"
    nostop_counter=$((nostop_counter+1))
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
    if [ $(< "/tmp/appdata_error.tmp" wc -l) -ge 1 ]; then
        ${discordLoc} --webhook-url="$webhook" --username "Appdata Error Bot" \
            --title "Error notificaitons" \
            --avatar "https://cdn0.iconfinder.com/data/icons/shift-free/32/Error-128.png" \
            --thumbnail "https://cdn0.iconfinder.com/data/icons/shift-free/32/Error-1024.png" \
            --field "Errors; $(cat /tmp/appdata_error.tmp | jq -Rs . | cut -c 2- | rev | cut -c 2- | rev);false" \
            --color "0xFF0000" \
            --footer "Powered by: Drazzilb | Ignore double slash in file path." \
            --footer-icon "https://i.imgur.com/r69iYhr.png" \
            --timestamp
        echo -e "\nDiscord error notification sent."
    fi
    if [ "$counter" -ge "1" ] && [ "$nostop_counter" -eq "0" ]; then
        ${discordLoc} --webhook-url="$webhook" --username "${botName}" \
            --title "${titleName}" \
            --avatar "$avatarUrl" \
            --description "Appdata Backup Complete." \
            --field "Runtime; $runOutput.;false" \
            --field "Containers stopped & backed up; $counter;false" \
            --field "This backup's size:; $runsize;false" \
            --field "Total size of all backups:; ${totalsize};false" \
            --color "0x$barColor" \
            --footer "Powered by: Drazzilb" \
            --footer-icon "https://i.imgur.com/r69iYhr.png" \
            --timestamp
    fi
    if  [ "$nostop_counter" -ge "1" ] && [ "$counter" -eq "0" ]; then
        ${discordLoc} --webhook-url="$webhook" --username "${botName}" \
            --title "${titleName}" \
            --avatar "$avatarUrl" \
            --description "Appdata Backup Complete." \
            --field "Runtime; $runOutput.;false" \
            --field "Containers backed up without stopping; $nostop_counter;false" \
            --field "This backup's size:; $runsize;false" \
            --field "Total size of all backups:; ${totalsize};false" \
            --color "0x$barColor" \
            --footer "Powered by: Drazzilb" \
            --footer-icon "https://i.imgur.com/r69iYhr.png" \
            --timestamp
    fi
    if  [ "$nostop_counter" -ge "1" ] && [ "$counter" -ge "1" ]; then
        ${discordLoc} --webhook-url="$webhook" --username "${botName}" \
            --title "${titleName}" \
            --avatar "$avatarUrl" \
            --description "Appdata Backup Complete." \
            --field "Runtime; $runOutput.;false" \
            --field "Containers stopped & backed up; ${counter};false" \
            --field "Containers backed up without stopping; $nostop_counter;false" \
            --field "This backup's size:; $runsize;false" \
            --field "Total size of all backups:; ${totalsize};false" \
            --color "0x$barColor" \
            --footer "Powered by: Drazzilb" \
            --footer-icon "https://i.imgur.com/r69iYhr.png" \
            --timestamp
    fi
    echo -e "\nDiscord notification sent."
fi
echo -e '\nAll Done!\n'
# Debug output
if [ "$debug" == "yes" ]; then
    echo -e "Script has ended with debug set to ${debug}"
    echo -e "line count for appdata_error.tmp  = $(wc -l < /tmp/appdata_error.tmp)"
    echo -e "Counter = ${counter}"
    echo -e "nostop_counter = ${nostop_counter}"
    if [ "$delete_files" == "yes" ]; then
        echo -e "Files are being removed"
        rm "/tmp/appdata_error.tmp"
    else
        echo -e "Files need to removed located at: rm /tmp/appdata_error.tmp /tmp/appdata_nostop.tmp /tmp/appdata.tmp"
        # Copy the next line minus the pound/hashtag sign and paste it into your terminal
        # rm /tmp/appdata_error.tmp /tmp/appdata_nostop.tmp /tmp/appdata.tmp
    fi
    rm "/tmp/i.am.running.appdata"
    exit
fi
# Remove temp files
rm "/tmp/i.am.running.appdata"
rm "/tmp/appdata_error.tmp"
exit 