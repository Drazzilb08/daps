FROM hotio/base:alpinevpn

# ARG BRANCH
ARG BRANCH=master

# Set working directory
WORKDIR /app

# Copy to the working directory
COPY . .

# Install Python
RUN apk add --no-cache python3

# Install pip3
RUN apk add --no-cache py3-pip

# Install pipenv and use it to generate requirements.txt
RUN pip3 install --no-cache-dir --upgrade pipenv; \
    pipenv requirements > requirements.txt

# Install gcc for building Python dependencies; install app dependencies
RUN apk update; \
    apk install -y gcc; \
    pip3 install --no-cache-dir -r requirements.txt

# Install curl, unzip, p7zip-full, tzdata, vim, rclone and docker-cli - remove curl and clean up
RUN apk add curl unzip tzdata vim docker-cli \
    && apk add --no-cache --repository http://dl-cdn.alpinelinux.org/alpine/edge/community/ p7zip \
    && apk add --no-cache --repository http://dl-cdn.alpinelinux.org/alpine/edge/testing/ jdupes \
    && curl https://rclone.org/install.sh | bash \
    && apk add --no-cache ca-certificates fuse \
    && rm -rf /var/cache/apk/*

# Test rclone installation
RUN rclone --version

# Metadata and labels
LABEL maintainer="Drazzilb" \
      description="userScripts" \
      org.opencontainers.image.source="https://github.com/Drazzilb08/userScripts" \
      org.opencontainers.image.authors="Drazzilb" \
      org.opencontainers.image.title="userScripts"

# Set script environment variables
ENV CONFIG_DIR=/config
ENV DATA_DIR=/data
ENV LOG_DIR=/config/logs
ENV TZ=America/Los_Angeles
ENV BRANCH=${BRANCH}

VOLUME [ "/config" ]
VOLUME [ "/data" ]
# Docker.sock
VOLUME [ "/var/run/docker.sock" ]

COPY root/ /
