# https://webostv.developer.lge.com/develop/getting-started/app-debugging
#  https://commondatastorage.googleapis.com/chromium-browser-snapshots/index.html?prefix=Linux_x64/320008/

FROM ubuntu:xenial

RUN apt update \
    && apt install -y \
    unzip \
    sudo \
    chromium-browser \
    xfwm4 \
    libgconf-2-4 \
    libxss1 \
    xinput \
    tightvncserver 

ADD https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/Linux_x64%2F320008%2Fchrome-linux.zip?generation=1426035118231000&alt=media /root/chrome-linux.zip
RUN unzip /root/chrome-linux.zip -d /apps

RUN useradd user -s /bin/bash \
    && mkdir -p /home/user \
    && chown -R user:user /home/user \
    && chown -R user:user /apps \
    && mv /apps/chrome-linux/chrome_sandbox /apps/chrome-linux/chrome-sandbox \
    && chown root /apps/chrome-linux/chrome-sandbox \
    && chmod 4755 /apps/chrome-linux/chrome-sandbox
