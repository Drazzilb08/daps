#!/bin/bash

# Set default values for PUID, PGID, and UMASK
PUID=${PUID:-100}
PGID=${PGID:-99}
UMASK=${UMASK:-002}

# Set the umask value
umask $UMASK

# Modify the group ID of the dockeruser
groupmod -o -g "$PGID" dockeruser

# Modify the user ID of the dockeruser
usermod -o -u "$PUID" dockeruser

# Make sure the /config/logs directory exists
mkdir -p /config/logs

# Change ownership of the /app and /config directory to dockeruser
chown -R dockeruser:dockeruser /app /config /config/logs

# Copy contents of /app/config to /config
cp -Rn /app/config/* /config

# Change permissions of the /config directory to 777
chmod -R 777 /config

# Execute the command as the dockeruser
exec runuser -u dockeruser -g dockeruser -- "$@"