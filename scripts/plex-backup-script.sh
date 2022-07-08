#!/bin/bash

# 	-- USER CONFIGURATION --	#

source="/mnt/user/appdata/plex"			# path to your plex appdata location
destination="/mnt/user/backup/plex"     # path to your backup folder
notify=yes							    # (yes/no) Unraid notification that the backup was performed
delete_after=7							# number of days to keep backups
fullbackup=no						    # (yes/no) creation of entire Plex backup (yes) or essential data only (no)
									        # Yes will significantly increase the amount of time and size to create a backup
									        # as all metadata (potentially hundreds of thousands of files) is included in the backup.
force_full_backup=7						# create a full backup every (#) number of days, in addition to regular essential data (0 to disable)
									        # this will create an essential backup and then a full backup separately
									        # this setting is ignored if fullbackup = yes
keep_full=2							    # number of full backups to keep - these can be very large
									
#	-- END USER CONFIGURATION --	#


#       DO NOT MODIFY BELOW THIS LINE
#-------------------------------------------------------------------------------------------------------

if [ -e "/tmp/i.am.running" ]; then
    echo "Another instance of the script is running. Aborting."
    exit
else
    touch  "/tmp/i.am.running"
fi

start=`date +%s`	# start time of script for statistics

# Read timestamp of the last full backup, if any
if [ -f /boot/config/plugins/user.scripts/scripts/last_plex_backup ]; then
	while IFS= read -r line; do
		lastbackup=$line
	done < /boot/config/plugins/user.scripts/scripts/last_plex_backup
else
	lastbackup=0
fi


# $(realpath -s $source) takes care of the presence or absense of a trailing slash (/) on the source path - error handling
cd "$(realpath -s $source)"

# set the destination directory and a date
dest=$(realpath -s $destination)/
dt=$(date +"%m-%d-%Y")
debug=false	#testing only

# create the backup directory if it doesn't exist - error handling - will not create backup file it path does not exist
mkdir -p "$dest"

# create tar file of essential databases and preferences -- The Plug-in Support preferences will keep settings of any plug-ins, even though they will need to be reinstalled.
if [ $fullbackup == no ]; then
	echo -e  "\n\nCreating essential backup... please wait"
	mkdir -p "$dest/Essential/$dt"
	
	if [ $debug != true ]; then
		tar -cf "$dest/Essential/$dt/Essential_Plex_Data_Backup-$(date +"%I_%M_%p").tar" "Plug-in Support/Databases" "Plug-in Support/Preferences" Preferences.xml
	else
		tar -cf "$dest/Essential/$dt/Essential_Plex_Data_Backup-debug0-$(date +"%I_%M_%p").tar" Preferences.xml
	fi

	if [ $force_full_backup != 0 ]; then
		days=$(( ($(date --date="$date" +%s) - $(date --date="$lastbackup" +%s) )/(60*60*24) ))

		if [[ $days -gt $force_full_backup ]] || [[ $lastbackup == 0 ]]
			then
				cf=true	# created full backup
				echo -e  "\nCreating full backup now... please wait\n"
				mkdir -p "$dest/Full/$dt"
				
				if [ $debug != true ]; then
					tar -cf "$dest/Full/$dt/Full_Plex_Data_Backup-$(date +"%I_%M_%p").tar" "$source"
                    # Compress tar into tar.gz file greatly reducing the size of the backup.
				    pigz -9 "Full_Plex_Data_Backup-debug1-$(date +"%I_%M_%p").tar"
				else
					tar -cf "$dest/Full/$dt/Full_Plex_Data_Backup-debug1-$(date +"%I_%M_%p").tar" Preferences.xml
				fi
				# save the date of the full backup
				date > /boot/config/plugins/user.scripts/scripts/last_plex_backup
			else
				cf=false
				echo -e  "\nLast full backup created " $days " ago... skipping\n"
		fi
	fi
    
else
	echo -e  "\nCreating full backup... please wait\n"
	mkdir -p "$dest/Full/$dt"
			
	if [ $debug != true ]
		then
			tar -cf "$dest/Full/$dt/Full_Plex_Data_Backup-$(date +"%I_%M_%p").tar" "$source"
		else
			tar -cf "$dest/Full/$dt/Full_Plex_Data_Backup-debug2-$(date +"%I_%M_%p").tar" Preferences.xml
	fi
	
	# save the date of the full backup
	date > /boot/config/plugins/user.scripts/scripts/last_plex_backup
fi

sleep 2
chmod -R 777 "$dest"

echo -e  "\n\nRemoving Essential backups older than " $delete_after "days... please wait\n\n"
find $destination/Essential* -mtime +$delete_after -exec rm -rfd {} \;

old=$(( $force_full_backup*$keep_full ))
if [ -d "$destination/Full" ]; then 
	echo -e  "Removing Full backups older than " $old "days... please wait\n\n\n"
	find $destination/Full* -mtime +$old -exec rm -rfd {} \;
fi

if [ $notify == yes ]; then
	if [ $fullbackup == no ]; then
			if [ $cf = false ]; then
				/usr/local/emhttp/webGui/scripts/notify -e "Unraid Server Notice" -s "Plex Backup" -d "Essential Plex data has been backed up." -i "normal"
				echo -e  Essential backup: "$(du -sh $dest/Essential/$dt/)\n"
			else
				/usr/local/emhttp/webGui/scripts/notify -e "Unraid Server Notice" -s "Plex Backup" -d "Essential & Full Plex data has been backed up." -i "normal"
				echo -e  Essential backup: "$(du -sh $dest/Essential/$dt/)\n"
				echo -e  Full backup: "$(du -sh $dest/Full/$dt/)\n"
			fi
	else
		/usr/local/emhttp/webGui/scripts/notify -e "Unraid Server Notice" -s "Plex Backup" -d "Complete Plex data has been backed up." -i "normal"
		echo -e  Full backup: "$(du -sh $dest/Full/$dt/)\n"
	fi
fi


end=`date +%s`
echo -e  "\nTotal time for backup: " $((end-start)) "seconds\n"
echo -e  '\nAll Done!\n'
if [ -d $dest/Essential/ ]; then
	echo -e  Total size of all Essential backups: "$(du -sh $dest/Essential/)"
fi
if [ -d $dest/Full/ ]; then
	echo -e  Total size of all Full backups: "$(du -sh $dest/Full/)"
fi

rm "/tmp/i.am.running"

exit