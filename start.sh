#!/bin/bash

PUID=${PUID:-100}
PGID=${PGID:-99}
UMASK=${UMASK:-002}

# Create a new group called dockeruser with the specified group ID
umask $UMASK

# Create a new user called dockeruser with the specified user ID
groupmod -o -g "$PGID" dockeruser

# Modify the group ID of the dockeruser
usermod -o -u "$PUID" dockeruser

# Copy contents of /app/config to /config
cp -Rn /app/config/* /config

# Change permissions of the /config directory to 777
chmod -R 777 /config

# Loop through all mounted volumes
for volume in $(find / -mount | cut -d' ' -f3); do
  # Skip over read-only volumes
  if mount | grep -F "$volume" | grep -q "(ro,"; then
    continue
  fi
  if [[ "$volume" =~ ^/(root|home|etc|var|boot|usr|mnt|lib|bin|sbin|lib64|proc|sys|dev|run|tmp|media|srv|opt|snap|app) ]]; then
    continue
  fi
  # Change ownership recursively
  chown -R $PUID:$PGID "$volume"
done

chown -R $PUID:$PGID /app

# Run the command as the dockeruser
exec runuser -u dockeruser -g dockeruser -- "$@"