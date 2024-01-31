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
WORKDIR /app

COPY --from=python-reqs /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages

# Set script environment variables
ENV XDG_CONFIG_HOME=/config
ENV US_CONFIG=/config/config.yml
ENV US_LOGS=/config/logs
ENV TZ=America/Los_Angeles

# Delete unnecessary setup files
RUN set -eux; \
    rm -f Pipfile Pipfile.lock; \
    groupadd -g 99 dockeruser; \
    useradd -u 100 -g 99 dockeruser; \
    apt-get update; \
    apt-get install -y --no-install-recommends wget curl unzip p7zip-full tzdata;
    

# Install rclone dependencies and rclone
RUN curl https://rclone.org/install.sh | bash && \
    apt-get remove -y curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Docker CLI inside the container
RUN apt-get update && \
    apt-get install -y docker.io

# Share the Docker socket with the container
VOLUME /var/run/docker.sock

# Test rclone installation
RUN rclone --version

# Copy the application source code into the container
COPY . .

# Copy config contents to /config

VOLUME /config

# Give permissions to all files under /app/scripts
RUN chmod -R 777 /app/scripts

CMD ["python", "main.py"]

# Entry point to start the container
RUN chmod +x start.sh

# Start the container
ENTRYPOINT ["bash", "./start.sh"]