# Cameo (MagicDraw) behavior controller using Selenium and Jupyterlab
Cameo - Ubuntu 20.04 w/fluxbox hosted on noVNC <br>
This is an interesting little example of using Selenium in Jupyterlab to control a Cameo State Machine.


BUILD: `docker build -t avianinc/csm_controller:main` <br>
RUN: `docker run -it -p 8888:8888 -p 6091:6091 -p 8080:8080 avianinc/csm_controller:main` <br>
PULL: `docker pull avianinc/csm_controller:main`
