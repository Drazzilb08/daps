#!/bin/bash

#------------- DEFINE VARIABLES -------------#
# Set your script name, must be unique to any other script.
name='Pictures'
# Set source directory
source='/mnt/user/pictures/'
# Set backup directory
destination='/mnt/user/backup/pictures/'
# Number of days to keep backup
delete_after=2
# Use pigz to further compress your backup (yes) will use pigz to further compress, (no) will not use pigz
    # Pigz package must be installed via NerdPack
usePigz=yes
# (yes/no) Unraid notification that the backup was performed
notify=yes 

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
#Finish
echo -e "\nTotal time for backup: " $((end - start)) "seconds\n"
if [ -d $dest/ ]; then
    echo -e Total size of all backups: "$(du -sh $dest/)"
fi

# Removing temp file
rm "/tmp/i.am.running.${name}"
if [ $notify == yes ]; then
    /usr/local/emhttp/webGui/scripts/notify -e "Unraid Server Notice" -s "${name} Backup" -d "Backup completed: ${name} data has been backed up." -i "normal"
fi
echo -e '\nAll Done!\n'

exit
