#!/usr/bin/env bash

# Initialize variables with default values
client_id=""
client_secret=""
sync_location=""
folder_id=""
token=""
gdrive_sa=""
verbose=true

# Function to print usage information
print_usage() {
    echo "Usage: $0 -i <client_id> -s <client_secret> -l <sync_location> -f <folder_id> -t <token>"
    echo "Options:"
    echo "  -i <client_id>: Specify the client id."
    echo "  -s <client_secret>: Specify the client secret."
    echo "  -l <sync_location>: Specify the sync location folder."
    echo "  -f <folder_id>: Specify the google drive folder id."
    echo "  -t <token>: OPTIONAL: Specify the token. not need if you have a service account."
    echo "  -g <gdrive_sa>: OPTIONAL: Specify the google drive service account file location."
}

# Parse command line arguments
while getopts ":i:s:l:f:t:g:" opt; do
    case $opt in
        i) client_id="$OPTARG";;
        s) client_secret="$OPTARG";;
        l) sync_location="$OPTARG";;
        f) folder_id="$OPTARG";;
        t) token="$OPTARG";;
        g) gdrive_sa="$OPTARG";;
        \?) echo "Invalid option: -$OPTARG" >&2; print_usage; exit 1;;
        :) echo "Option -$OPTARG requires an argument." >&2; print_usage; exit 1;;
    esac
done

#This creates a blank rclone google drive remote named "posters" we'll use for this command.
rclone config create posters drive config_is_local=false >&2

#RCLONE SYNC COMMAND
rclone sync \
   --drive-client-id "$client_id" \
   --drive-client-secret "$client_secret" \
   --drive-token "$token" \
   --drive-root-folder-id "$folder_id" \
   --drive-service-account-file "$gdrive_sa" \
   --fast-list \
   --tpslimit=5 \
   --no-update-modtime \
   --drive-use-trash=false \
   --drive-chunk-size=512M \
   --check-first \
   --bwlimit=80M \
   --size-only \
   --delete-after \
   -v \
   posters: "$sync_location"

if [ "$verbose" = false ]; then
    echo
fi

exit 0