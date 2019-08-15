FROM centos:7
LABEL maintainer="Cyril TAVIAN <c.tavian@outlook.fr>"

# Install tools
## Update 
RUN yum update -y
## Add epel release repo
RUN yum install -y epel-release
## Install NPM and RUBY for test
RUN yum install -y npm ruby
## Install tools 
RUN npm install -g sass-lint htmllint-cli markdownlint-cli

WORKDIR /
CMD /bin/bash

