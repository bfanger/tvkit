FROM --platform=linux/amd64 debian:10

RUN apt update \
    && apt install -y \
    unzip \
    sudo \
    libxss1 \
    libnss3 \
    libasound2 \
    libgtk2.0-0 \
    libgtk-3-0 \
    libgconf-2-4 \
    libnss3 \
    libxss1 \
    libasound2 \
    libxtst6 \
    xauth \
    xvfb \
    xinput \
    tightvncserver \
    lwm \
    xterm

# https://webostv.developer.lge.com/develop/getting-started/app-debugging
#  https://commondatastorage.googleapis.com/chromium-browser-snapshots/index.html?prefix=Linux_x64/320008/
ADD https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/Linux_x64%2F320008%2Fchrome-linux.zip?generation=1426035118231000&alt=media /root/chrome-linux.zip
RUN unzip /root/chrome-linux.zip -d /apps

RUN useradd user -s /bin/bash \
    && mkdir -p /home/user \
    && chown -R user:user /home/user \
    && chown -R user:user /apps \
    && mv /apps/chrome-linux/chrome_sandbox /apps/chrome-linux/chrome-sandbox \
    && chown root /apps/chrome-linux/chrome-sandbox \
    && chmod 4755 /apps/chrome-linux/chrome-sandbox

# Example usage:
#
# docker build . -t legacy-chrome && docker run -it --rm -p 5901:5901 -v $PWD/user:/home/user legacy-chrome
# 
# su -l user
# 
# USER=user tightvncserver :1
# DISPLAY=:1 /apps/chrome-linux/chrome --no-sandbox http://host.docker.internal:3000/ &
