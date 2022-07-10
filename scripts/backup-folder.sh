#!/bin/bash

#------------- DEFINE VARIABLES -------------#
name=''                                 # Set your script name, must be unique to any other script.
source=''                               # Set source directory
destination=''                          # Set backup directory
delete_after=2                          # Number of days to keep backup
usePigz=yes                             # Use pigz to further compress your backup (yes) will use pigz to further compress, (no) will not use pigz
                                            # Pigz package must be installed via NerdPack
pigzCompression=9						# Define compression level to use with pigz
                                            # 0 = No compression
                                            # 1 = Least compression/Fastest
                                            # 6 = Default compression/Default Speed
                                            # 9 = Maximum Compression/Slowest
notify=yes                              # Use unRAID's built in notification system
#------------- DEFINE DISCORD VARIABLES -------------#
# This section is not required
# This portion requires discord.sh to be downloaded and placed somewhere in a location accessable by this script
# You can find discord.sh ----> https://github.com/ChaoticWeg/discord.sh
# Simply download or clone the repo and extract the discord.sh file to a loaction then define that location in the discordLoc variable

useDiscord=yes                          # Use discord for notifications
discordLoc=''                           # Location for discord.sh, no trailing slash
webhook=''                              # Discord webhook
botName='Notification Bot'              # Name your bot
titleName='Server Notifications'        # Give a title name to your discord messages
barColor='FFFFFF'                       # The bar color for discord notifications, must be Hexcode
avatarUrl=''                            # Url for the avatar you want your bot to have

#------------- DO NOT MODIFY BELOW THIS LINE -------------#
# Will not run again if currently running.
if [ -e "/tmp/i.am.running.${name}" ]; then
    echo "Another instance of the script is running. Aborting."
    exit
else
    touch "/tmp/i.am.running.${name}"
fi

#Set variables
start=$(date +%s)                   #Sets start time for runtime information
cd "$(realpath -s $source)"
dest=$(realpath -s $destination)/
dt=$(date +"%m-%d-%Y")
now=$(date +"%I_%M_%p")

# create the backup directory if it doesn't exist - error handling - will not create backup file it path does not exist
mkdir -p "$dest"
# Creating backup of directory
echo -e "\nCreating backup..."
mkdir -p "$dest/$dt"

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
        --avatar "$avatarUrl" \
        --description "Backup completed: ${name} data has been backed up." \
        --field "Runtime; $runOutput.;false" \
        --field "This backup's size:; $runsize;false" \
        --field "Total size of all backups:; ${totalsize};false" \
        --color "0x$barColor" \
        --footer "Powered by: Drazzilb" \
        --footer-icon "https://i.imgur.com/r69iYhr.png" \
        --timestamp
    echo -e "\nDiscord notification sent."
fi
echo -e '\nAll Done!\n'

exit