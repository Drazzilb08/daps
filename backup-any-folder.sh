#!/bin/bash

#------------- DEFINE VARIABLES -------------#
# Script name
name='updateme'

# Set source directory
source='/path/to/source'

# Set backup directory
destination='/path/to/destination'
# Set Number of Days to Keep Backups 
delete_after=2


#------------- DO NOT MODIFY BELOW THIS LINE -------------#
# Will not run again if currently running.
if [ -e "/tmp/i.am.running.${name}" ]; then
    echo "Another instance of the script is running. Aborting."
    exit
else
    touch  "/tmp/i.am.running.${name}"
fi

start=`date +%s`	# start time of script for statistics
cd "$(realpath -s $source)"

dest=$(realpath -s $destination)/
dt=$(date +"%m-%d-%Y")

# create the backup directory if it doesn't exist - error handling - will not create backup file it path does not exist
mkdir -p "$dest"
# Creating backup of directory
echo -e  "\n\nCreating backup... please wait"
mkdir -p "$dest/$dt"

#Script Data Backup
tar -cf "$dest/$dt/backup-$(date +"%I_%M_%p").tar" "$source"
pigz -9 "$dest/$dt/backup-$(date +"%I_%M_%p").tar"

sleep 2
chmod -R 777 "$dest"

#Cleanup Old Backups
echo -e  "\n\nRemoving backups older than " $delete_after "days... please wait\n\n"
find $destination* -mtime +$delete_after -exec rm -rfd {} \;


end=`date +%s`
#Finish
echo -e  "\nTotal time for backup: " $((end-start)) "seconds\n"
echo -e  '\nAll Done!\n'
if [ -d $dest/ ]; then
	echo -e  Total size of all backups: "$(du -sh $dest/)"
fi
rm "/tmp/i.am.running.${name}"
exit