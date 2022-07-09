#!/bin/bash

#------------- DEFINE VARIABLES -------------#
# Set your script name, must be unique to any other script.
name=''
# Set source directory
source=''
# Set backup directory
destination=''
# Number of days to keep backup
delete_after=2
# Use pigz to further compress your backup (yes) will use pigz to further compress, (no) will not use pigz
# Pigz package must be installed via NerdPack
usePigz=yes
pigzCompression=9						# Define compression level to use with pigz
										# 0 = No compression
										# 6 = Default compression
										# 9 = Maximum Compression
# Use unRAID's built in notification system
notify=yes
#------------- DEFINE DISCORD VARIABLES -------------#
# This section is not required
# This portion requires discord.sh to be downloaded and placed somewhere in a location accessable by this script
# You can find discord.sh ----> https://github.com/ChaoticWeg/discord.sh
# Simply download or clone the repo and extract the discord.sh file to a loaction then define that location in the discordLoc variable

# Use discord for notifications
useDiscord=yes
# Location for discord.sh, no trailing slash
discordLoc=''
# Discord webhook
webhook=''
# Name your bot
botName='Notification Bot'
# Give a title name to your discord messages
titleName='Server Notifications'
# The bar color for discord notifications, must be Hexcode
barColor='0xFFFFFF'

#------------- DO NOT MODIFY BELOW THIS LINE -------------#
# Will not run again if currently running.
if [ -e "/tmp/i.am.running.${name}" ]; then
    echo "Another instance of the script is running. Aborting."
    exit
else
    touch "/tmp/i.am.running.${name}"
fi

start=$(date +%s) # start time of script for statistics
cd "$(realpath -s $source)"

dest=$(realpath -s $destination)/
dt=$(date +"%m-%d-%Y")

# create the backup directory if it doesn't exist - error handling - will not create backup file it path does not exist
mkdir -p "$dest"
# Creating backup of directory
echo -e "\nCreating backup..."
mkdir -p "$dest/$dt"

now=$(date +"%I_%M_%p")
# Data Backup
tar -cf "$dest/$dt/backup-"$now".tar" "$source"
runsize=$(du -sh $dest/$dt/backup-"$now".tar | awk '{print $1}') #Set runsize information
if [ $usePigz == yes ]; then
    echo -e "\nUsing pigz to compress backup... this could take a while..."
    pigz -$pigzCompression "$dest/$dt/backup-"$now".tar"
    runsize=$(du -sh $dest/$dt/backup-"$now".tar.gz | awk '{print $1}')
fi

sleep 2
chmod -R 777 "$dest"

#Cleanup Old Backups
echo -e "\nRemoving backups older than " $delete_after "days...\n"
find $destination* -mtime +$delete_after -exec rm -rfd {} \;

end=$(date +%s)
# Runtime
totalTime=$((end - start))
seconds=$((totalTime % 60))
minutes=$((totalTime % 3600 / 60))
hours=$((totalTime / 3600))

if (("$minutes" == "0" && "$hours" == "0")); then
    echo "Script completed in $seconds seconds"
    runOutput="Script completed in $seconds seconds"
elif (("$hours" == "0")); then
    echo "Script completed in $minutes minutes and $seconds seconds"
    runOutput="Script completed in $minutes minutes and $seconds seconds"
else
    echo "Script completed in $hours hours $minutes minutes and $seconds seconds"
    runOutput="Script completed in $hours hours $minutes minutes and $seconds seconds"
fi

# Gather size information
echo -e "This backup's size: $runsize"
if [ -d $dest/ ]; then
    totalsize=$(du -sh $dest | awk '{print $1}')
    echo -e "\nTotal size of all backups: $totalsize"
fi
# Removing temp file
rm "/tmp/i.am.running.${name}"

# Notifications
if [ "$notify" == "yes" ]; then
    /usr/local/emhttp/webGui/scripts/notify -e "Unraid Server Notice" -s "${name} Backup" -d "Backup completed: ${name} data has been backed up." -i "normal"
fi
if [ "$useDiscord" == "yes" ]; then
    ${discordLoc}/discord.sh --webhook-url="$webhook" --username "${botName}" \
        --title "${titleName}" \
        --description "Backup completed: ${name} data has been backed up.\n$runOutput.\nThis backup's size: $runsize\nTotal size of all backups: ${totalsize}" \
        --color "$barColor" \
        --timestamp
    echo -e "\nDiscord notification sent."
fi
echo -e '\nAll Done!\n'

exit