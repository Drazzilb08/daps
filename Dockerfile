# Stage 1: Create an intermediate image for installing pipenv and converting Pipfile to requirements.txt
FROM python:3.11-slim as pipenv

# Copy Pipfile and Pipfile.lock to the intermediate image
COPY Pipfile Pipfile.lock ./

# Install pipenv and use it to generate requirements.txt
RUN pip3 install --no-cache-dir --upgrade pipenv; \
    pipenv requirements > requirements.txt

# Debugging: Display the contents of requirements.txt
RUN cat requirements.txt

# Stage 2: Create an intermediate image for installing Python dependencies from requirements.txt
FROM python:3.11-slim as python-reqs

# Copy requirements.txt from the pipenv stage to the intermediate image
COPY --from=pipenv /requirements.txt requirements.txt

# Install gcc for building Python dependencies; install app dependencies
RUN apt-get update; \
    apt-get install -y gcc; \
    pip3 install --no-cache-dir -r requirements.txt

# Stage 3: Create the final image with the application and rclone setup
FROM python:3.11-slim

# Metadata and labels
LABEL maintainer="Drazzilb" \
      description="userScripts" \
      org.opencontainers.image.source="https://github.com/Drazzilb08/userScripts" \
      org.opencontainers.image.authors="Drazzilb" \
      org.opencontainers.image.title="userScripts"

# Set working directory and copy Python packages from the python-reqs stage

COPY --from=python-reqs /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages

ARG BRANCH="master"
ARG CONFIG_DIR=/config

# Set script environment variables
ENV CONFIG_DIR=/config
ENV TZ=America/Los_Angeles
ENV BRANCH=${BRANCH}
ENV DOCKER_ENV=true

# Install curl, unzip, p7zip-full, tzdata, vim, rclone and docker-cli - remove curl and clean up
# Delete unnecessary setup files
RUN set -eux; \
    rm -f Pipfile Pipfile.lock; \
    apt-get update; \
    apt-get install -y --no-install-recommends wget curl unzip p7zip-full tzdata vim jdupes jq; \
    curl https://rclone.org/install.sh | bash

RUN apt-get update; \
    apt-get install -y --no-install-recommends docker-cli; \
    apt-get clean; 

VOLUME /var/run/docker.sock
VOLUME /config
VOLUME /data

WORKDIR /app

COPY . .

# Create a new user called dockeruser with the specified PUID and PGID
RUN groupadd -g 99 dockeruser; \
    useradd -u 100 -g 99 dockeruser; \
    chown -R dockeruser:dockeruser /app; 


# Entrypoint script
ENTRYPOINT ["bash", "start.sh"]