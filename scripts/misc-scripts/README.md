# The-Renamer:

The script performs the following actions:

Usage:
```
/path/to/script renamer.sh --dry-run
```
```
/path/to/script renamer.sh --move
```

* The script defines the source and destination directories, and a log directory where log files will be stored.
It defines an array of characters that need to be removed from the file names.
* It defines a function remove_characters that takes the current file name and removes characters from the characters_to_remove array, and also replaces any ampersand with the word "and". It also keeps any underscores that are immediately followed by the letter "S".
* It defines a function rename_files that loops through all files in the source directory, renames them according to the remove_characters function, and then moves them to the destination directory if the --move argument is passed, or renames the files in place if the --move argument is not passed.
* It defines a function rotate_logs that checks if there are already 6 logs in the log directory, and if so, finds the oldest log and deletes it.
* It checks if no arguments are passed or if more than one argument is passed, and if so it exits with an error message.
* It then checks the passed argument and sets the corresponding variable accordingly, and then calls the rename_files and rotate_logs functions.
* It also has a check for --no-move argument, if passed it will rename the files but won't move them. Also, the move option will only take effect when --no-move is not passed.
* The rename_files function is updated to move all files at the end of renaming them one by one.
* A log file is created on every run of the script and it is rotated as soon as 6 logs are accumulated.

Known Issues:
```
The script doesn't log if you're using --dry-run. It's kind of expected that if you're using dry-run that you're activly monitoring what's going on. Logs are for when you're not monitoring it activly and want ot check on it from time to time.

I'll eventually fix this:tm:
```
#noHL:

The script performs the following actions:

Usage:
```
/path/to/script nohl.sh --use-discord
```
```
/path/to/script nohl.sh --use-discord --bar-color 000000 --bot-name Botty_Mc_Botterson
```

* Defines variables for the source directory, log file, files to include in the search, Discord webhook URL, Discord bar color, and Discord bot name
* Provides command line options to set the bot name, Discord embed bar color, use Discord notifications, and display help
* Converts hex color codes to decimal
* Parses command line arguments to update the values of the variables
* Checks for proper configuration of the source directory, log file directory and existence of the log file before each run
* Search for hardlinks in the source directory and saves the results to the log file
* The script prompts the user to enter a webhook URL if the variable is empty, and updates the value of the webhook variable in the script file itself