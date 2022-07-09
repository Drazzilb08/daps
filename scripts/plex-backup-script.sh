#!/bin/bash

#------------- DEFINE VARIABLES -------------#
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
usePigz=no								# Due to the size of full backups if you're using a full backup and would like to really compress your backups down as much as possible use pigz
											# Pigz package must be installed via NerdPack
#------------- DEFINE DISCORD VARIABLES -------------#
# This section is not required
# This portion requires discord.sh to be downloaded and placed somewhere in a location accessable by this script
# You can find discord.sh ----> https://github.com/ChaoticWeg/discord.sh
# Simply download or clone the repo and extract the discord.sh file to a loaction then define that location in the discordLoc variable

# Use discord for notifications
useDiscord=no
# The folder containing discord.sh, no trailing slash
discordLoc=''
# Discord webhook
webhook=''
# Name your bot
botName='Notification Bot'
# Give a title name to your discord messages
titleName='Server Notifications'
# The bar color for discord notifications, must be Hexcode
barColor='0xE5A00D'
									
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
now="$(date +"%I_%M_%p)"


# create tar file of essential databases and preferences -- The Plug-in Support preferences will keep settings of any plug-ins, even though they will need to be reinstalled.
if [ $fullbackup == no ]; then
	echo -e  "\n\nCreating essential backup... please wait"
	mkdir -p "$dest/Essential/$dt"
	
	if [ $debug != true ]; then
		tar -cf "$dest/Essential/$dt/Essential_Plex_Data_Backup-"$now".tar" "Plug-in Support/Databases" "Plug-in Support/Preferences" Preferences.xml
	else
		tar -cf "$dest/Essential/$dt/Essential_Plex_Data_Backup-debug0-"$now".tar" Preferences.xml
	fi

	if [ $force_full_backup != 0 ]; then
		days=$(( ($(date --date="$date" +%s) - $(date --date="$lastbackup" +%s) )/(60*60*24) ))

		if [[ $days -gt $force_full_backup ]] || [[ $lastbackup == 0 ]]
			then
				cf=true	# created full backup
				echo -e  "\nCreating full backup now... please wait\n"
				mkdir -p "$dest/Full/$dt"
				
				if [ $debug != true ]; then
					tar -cf "$dest/Full/$dt/Full_Plex_Data_Backup-"$now".tar" "$source"
                    # Compress tar into tar.gz file greatly reducing the size of the backup.
					if [ usePigz == yes ]; then
				    	pigz -9 "Full_Plex_Data_Backup-"$now".tar"
					fi
				else
					tar -cf "$dest/Full/$dt/Full_Plex_Data_Backup-debug1-"$now".tar" Preferences.xml
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
			tar -cf "$dest/Full/$dt/Full_Plex_Data_Backup-"$now".tar" "$source"
		else
			tar -cf "$dest/Full/$dt/Full_Plex_Data_Backup-debug2-"$now".tar" Preferences.xml
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
end=`date +%s`
# Runtime
totalTime=$((end - start))
seconds=$((totalTime % 60))
minutes=$((totalTime % 3600 / 60))
hours=$((totalTime / 3600))

if (($minutes == 0 && $hours == 0)); then
    echo "Plex backup completed in $seconds seconds"
    runOutput="Plex backup completed in $seconds seconds"
elif (($hours == 0)); then
    echo "Plex backup completed in $minutes minutes and $seconds seconds"
    runOutput="Plex backup completed in $minutes minutes and $seconds seconds"
else
    echo "Plex backup completed in $hours hours $minutes minutes and $seconds seconds"
    runOutput="Plex backup completed in $hours hours $minutes minutes and $seconds seconds"
fi
#unRaid notificaitons
if [ $notify == yes ]; then
	if [ $fullbackup == no ]; then
			if [ $cf = false ]; then
				essentialsize=$(du -sh $dest/Essential/$dt/ | awk '{print $1}')
				/usr/local/emhttp/webGui/scripts/notify -e "Unraid Server Notice" -s "Plex Backup" -d "Essential Plex data has been backed up." -i "normal"
				echo -e  "Essential backup: $essentialsize"
			else
				essentialsize=$(du -sh $dest/Essential/$dt/ | awk '{print $1}')
				fullsize=$(du -sh $dest/Full/$dt/ | awk '{print $1}')
				/usr/local/emhttp/webGui/scripts/notify -e "Unraid Server Notice" -s "Plex Backup" -d "Essential & Full Plex data has been backed up." -i "normal"
				echo -e  "Essential backup: $essentialsize"
				echo -e  "Full Backup: $fullsize"
			fi
	else
		essentialsize=$(du -sh $dest/Essential/$dt/ | awk '{print $1}')
		fullsize=$(du -sh $dest/Full/$dt/ | awk '{print $1}')
		/usr/local/emhttp/webGui/scripts/notify -e "Unraid Server Notice" -s "Plex Backup" -d "Complete Plex data has been backed up." -i "normal"
		echo -e  "Full Backup: $fullsize"
	fi
fi
if [ -d $dest/Essential/ ]; then
	totalessential=$(du -sh $dest/Essential/ | awk '{print $1}')
	echo -e  "Total size of all Essential backups: $totalessential"
fi
if [ -d $dest/Full/ ]; then
	totalfull=$(du -sh $dest/Full/ | awk '{print $1}')
	echo -e  "Total size of all Full backups: $totalfull)"
fi
# Discord Notifications
if [ $useDiscord == yes ]; then
	if [ $fullbackup == no ]; then
		if [ $cf = false ]; then
			${discordLoc}/discord.sh --webhook-url="$webhook" --username "${botName}" \
				--title "Plex Backup" \
				--description "Essential Plex data has been backed up.\n$runOutput.\nThis essential backup size: $essentialsize\nTotal size of all Essential backups: $totalessential" \
				--color "$barColor" \
				--timestamp
			echo -e "\nDiscord notification sent."
		else
			${discordLoc}/discord.sh --webhook-url="$webhook" --username "${botName}" \
				--title "Plex Backup" \
				--description "Essential & Full Plex data has been backed up.\n$runOutput\nThis essential backup size: $essentialsize\nThis full Backup: $fullsize\nTotal size of all Essential backups: $totalessential\nTotal size of all Full backups: $totalfull" \
				--color "$barColor" \
				--timestamp
			echo -e "\nDiscord notification sent."
		fi
	else
		${discordLoc}/discord.sh --webhook-url="$webhook" --username "${botName}" \
			--title "Plex Backup" \
			--description "Full Plex data has been backed up.\n$runOutput.\nThis full Backup: $fullsize\nTotal size of all Full backups: $totalfull" \
			--color "$barColor" \
			--timestamp
		echo -e "\nDiscord notification sent."
	fi
fi

echo -e  '\nAll Done!\n'
# Remove lock file
rm "/tmp/i.am.running"

exit