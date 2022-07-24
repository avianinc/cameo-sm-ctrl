# noVNC access to CSM 19.0SP4, jupyterlab, and demo script to control CSM behaviors levereging selenium  #

FROM ubuntu:20.04
#FROM openjdk:11
LABEL maintainer="jdehart@avian.com" 

# Set correct environment variables
ENV HOME /root
ENV DEBIAN_FRONTEND noninteractive
ENV LC_ALL C.UTF-8
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US.UTF-8
ENV TZ=America/New_York
ENV SCREEN_RESOLUTION 1280x768
ENV SCILAB_EXECUTABLE='/tmp/scilab-6.0.2/bin/scilab-adv-cli'
#ENV SCILAB_EXECUTABLE="scilab-adv-cli"

ENV JAVA_HOME=/usr/lib/jvm/java-8-openjdk-amd64
ENV PATH=$PATH:$JAVA_HOME/bin:/tmp/bin

# See --> https://groups.google.com/g/jaer-users/c/G6mZ7EXmiYQ
#ENV _JAVA_OPTIONS="-Djogl.disable.openglcore=false"
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Base install
RUN apt-get update && apt-get -y install \
	xvfb \
	x11vnc \
	supervisor \
	fluxbox \
	net-tools \
	git-core \
	git \
    procps \
	nano \
	openjdk-8-jre \
	python3-pip \
	wget \
	unzip \
	firefox \
	fonts-liberation \
	libgbm1 \
	xdg-utils

# House cleaning
RUN apt-get -y autoremove \
	&& apt-get clean autoclean \
	&& rm -rf /var/lib/apt/lists/{apt,dpkg,cache,log} /var/tmp/*

# Install jupyter
RUN pip install --upgrade pip 
RUN pip install jupyterlab pandas matplotlib numpy ipywidgets selenium jupyterlab-novnc jupyterlab-drawio
RUN pip cache purge

# Download CSM19.0SP4-Demo from my google drive and unzip
WORKDIR /tmp
# Howto --> https://bcrf.biochem.wisc.edu/2021/02/05/download-google-drive-files-using-wget/
# File --> https://drive.google.com/file/d/1il_s5kfhala6iTsSeY9TLHJo2bNET68w/view?usp=sharing
# Format for large files: wget --load-cookies /tmp/cookies.txt "https://docs.google.com/uc?export=download&confirm=$(wget --quiet --save-cookies /tmp/cookies.txt --keep-session-cookies --no-check-certificate 'https://docs.google.com/uc?export=download&id=FILEID' -O- | sed -rn 's/.*confirm=([0-9A-Za-z_]+).*/\1\n/p')&id=FILEID" -O FILENAME && rm -rf /tmp/cookies.txt
RUN wget --load-cookies /tmp/cookies.txt "https://docs.google.com/uc?export=download&confirm=$(wget --quiet --save-cookies /tmp/cookies.txt --keep-session-cookies --no-check-certificate 'https://docs.google.com/uc?export=download&id=1il_s5kfhala6iTsSeY9TLHJo2bNET68w' -O- | sed -rn 's/.*confirm=([0-9A-Za-z_]+).*/\1\n/p')&id=1il_s5kfhala6iTsSeY9TLHJo2bNET68w" -O csm19.zip && rm -rf /tmp/cookies.txt
# or from Avian S3 repo
# wget https://tinyurl.com/29rdtet5  
RUN unzip csm19.zip
RUN rm csm19.zip

# Docker's supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Set display
ENV DISPLAY :0

# Change work directory to add novnc files
WORKDIR /root/
RUN git clone https://github.com/novnc/noVNC.git ./novnc  && \
    git clone https://github.com/novnc/websockify.git ./novnc/utils/websockify
#RUN ln -s /root/novnc/vnc_lite.html /root/novnc/index.html
RUN ln -s /root/novnc/vnc.html /root/novnc/index.html

# Example folders
ADD cstk2py /root/

# Preload CSM webserver
COPY webserver_plugin/CST_Web_Server_Plugin_190_sp4.zip /root/
RUN unzip CST_Web_Server_Plugin_190_sp4.zip
RUN cp -r ~/plugins/com.nomagic.magicdraw.simulation.webserver /tmp/plugins/com.nomagic.magicdraw.simulation.webserver
RUN cp -r ~/data/resourcemanager/* /tmp/data/resourcemanager/

# fetch firefox geckodriver and start the selenium server for remote access
# https://www.selenium.dev/documentation/webdriver/getting_started/install_drivers/
# https://pypi.org/project/selenium/
# https://www.selenium.dev/documentation/webdriver/remote_webdriver/
# https://firefox-source-docs.mozilla.org/testing/geckodriver/Flags.html#code-allow-hosts-var-allow-hosts-var-code
RUN wget https://github.com/mozilla/geckodriver/releases/download/v0.31.0/geckodriver-v0.31.0-linux64.tar.gz
RUN tar -xvzf geckodriver-v0.31.0-linux64.tar.gz
RUN chmod +x geckodriver
RUN mv geckodriver /usr/local/bin

EXPOSE 8888
EXPOSE 6901
EXPOSE 8080

CMD ["/usr/bin/supervisord"]
