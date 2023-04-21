 # FROM jekyll/builder:latest
FROM ruby:3.1.1-alpine3.15

# Install dependencies
RUN apk add --no-cache \
    curl \
    gnupg \
    build-base \
    ruby-dev \
    libffi-dev \
    zlib-dev \
    openssl-dev \
    yaml-dev \
    readline-dev \
    libxml2-dev \
    libxslt-dev \
    sudo \
    bash \
    git

ENV JEKYLL_UID=1001
ENV JEKYLL_GID=121

# add user mane with id 1001 and group docker with id 121 and login shell bash
RUN addgroup -g $JEKYLL_GID -S docker && \
    adduser -u $JEKYLL_UID -S mane -G docker -s /bin/bash

# allow sudo without password for docker group members
RUN echo '%docker ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

USER mane

EXPOSE 4000
