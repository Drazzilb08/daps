FROM hotio/base:alpinevpn

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

# Install wget, curl, unzip, p7zip-full, tzdata, vim
RUN apk add wget curl unzip tzdata vim && \
    apk add --no-cache --repository http://dl-cdn.alpinelinux.org/alpine/edge/community/ --allow-untrusted p7zip

# Install rclone
RUN curl https://rclone.org/install.sh | bash

# Install rclone dependencies
RUN apk add --no-cache ca-certificates fuse

# Test rclone installation
RUN rclone --version

# Install docker-cli
RUN apk add --no-cache docker-cli

VOLUME /config

# Give permissions to all files under /app/scripts
RUN chmod -R 777 /app/scripts

CMD ["python", "main.py"]