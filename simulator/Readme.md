# Simulator

We use a Docker image of Debian and install required dependencies for running the older Chrome Browser and a vnc server.

Based on info found on [WebOS App Debugging](https://webostv.developer.lge.com/develop/getting-started/app-debugging)
we found downloads to old versions of Chrome.

Confusingly the version downloaded from v38 reports Chrome/43 as navigator.userAgent 🤷

## Setup (Build the image)

```sh
docker build . -t legacy-chrome
```

## Run

From the simulator folder run:

```sh
docker run -it --rm -p 5901:5901 -v $PWD/user:/home/user legacy-chrome
```

```sh
su -l user

USER=user tightvncserver :1
DISPLAY=:1 /apps/chrome-linux/chrome --no-sandbox http://host.docker.internal:3000/ &
```

Open Finder and press <kbd>⌘</kbd> + <kbd>K</kbd> and connect to server:

```
vnc://localhost:5901
```

Start tvkit and browse to http://host.docker.internal:3000/
