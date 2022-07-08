#!/bin/bash

#------------- DEFINE VARIABLES -------------#
name='Script'
# Set your script name, must be unique to any other script.
source='/boot/config/plugins/user.scripts/scripts/'
# Set source directory
destination='/mnt/user/backup/scripts/'
# Set backup directory
delete_after=2
# Number of days to keep backup
usePigz=yes
# Use pigz to further compress your backup (yes) will use pigz to further compress, (no) will not use pigz
# Pigz package must be installed via NerdPack
notify=yes
#------------- DEFINE DISCORD VARIABLES -------------#
# This portion requires discord.sh to be downloaded and placed somewhere in a location accessable by this script
# You can find discord.sh ----> https://github.com/ChaoticWeg/discord.sh
# Simply download or clone the repo and extract the discord.sh file to a loaction then define that location in the discordLoc variable

# Use discord for notifications
useDiscord=yes
# Location for discord.sh, no trailing slash
discordLoc='/mnt/user/data/scripts/discord-script'
# Discord webhook
webhook=""
# Name your bot
botName="Notification Bot"
# Give a title name to your discord messages
titleName="Server Notifications"
# The bar color for discord notifications
barColor="0xFFFFFF"

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

#Script Data Backup
if [ $usePigz == yes ]; then
    echo -e "\nUsing pigz to create backup... this could take a while..."
    tar -cf "$dest/$dt/backup-$(date +"%I_%M_%p").tar" "$source"
    pigz -9 "$dest/$dt/backup-$(date +"%I_%M_%p").tar"
else
    tar -cf "$dest/$dt/backup-$(date +"%I_%M_%p").tar" "$source"
fi

sleep 2
chmod -R 777 "$dest"

#Cleanup Old Backups
echo -e "\nRemoving backups older than " $delete_after "days...\n"
find $destination* -mtime +$delete_after -exec rm -rfd {} \;

end=$(date +%s)
totalTime=$((end - start))
seconds=$((totalTime % 60))
minutes=$((totalTime / 60))
hours=$((totalSeconds / 60 / 60 % 24))

if (($minutes == 0 && $hours == 0)); then
    echo "Script completed in $seconds seconds"
    runOutput="Script completed in $seconds seconds"
elif (($hours == 0)); then
    echo "Script completed in $minutes minutes and $seconds seconds"
    runOutput="Script completed in $minutes minutes and $seconds seconds"
else
    echo "Script completed in $hours hours $minutes minutes and $seconds seconds"
    runOutput="Script completed in $hours hours $minutes minutes and $seconds seconds"
fi

#Finish
if [ -d $dest/ ]; then
    size=$(du -sh $dest | awk '{print $1}')
    echo -e "\nTotal size of all backups: $size."
fi

# Removing temp file
rm "/tmp/i.am.running.${name}"
if [ $notify == yes ]; then
    /usr/local/emhttp/webGui/scripts/notify -e "Unraid Server Notice" -s "${name} Backup" -d "Backup completed: ${name} data has been backed up." -i "normal"
fi
if [ $useDiscord == yes ]; then
    ${discordLoc}/discord.sh --webhook-url="$webhook" --username "${botName}" \
        --title "${titleName}" \
        --description "Backup completed: ${name} data has been backed up.\n$runOutput.\nTotal size of all backups: ${size}" \
        --color "$barColor" \
        --timestamp
    echo -e "\nDiscord notification sent."
fi
echo -e '\nAll Done!\n'

exit
