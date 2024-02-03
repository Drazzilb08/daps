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

# Change ownership of the /app directory to dockeruser
chown -R dockeruser:dockeruser /app

# Change ownership of the /config directory to dockeruser
chown -R dockeruser:dockeruser /config

# Copy contents of /app/config to /config
cp -Rn /app/config/* /config

# Change permissions of the /config directory to 777
chmod -R 777 /config

# Execute the command as the dockeruser
exec runuser -u dockeruser -g dockeruser -- "$@"