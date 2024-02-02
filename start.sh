#!/bin/bash

# Copy contents of /app/config to /config
cp -R /app/config/* /config

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

# Change ownership of the /app and /app/config directories to dockeruser
chown -R dockeruser:dockeruser /app /app/config

# Change ownership of the /config directory to dockeruser
chown -R dockeruser:dockeruser /config

# Execute the command as the dockeruser
exec runuser -u dockeruser -g dockeruser -- "$@"