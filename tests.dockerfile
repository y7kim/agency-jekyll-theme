FROM ruby:2.4.3

RUN gem install bundle
RUN apt-get update -y \
    && apt-get install -y npm \
    libcurl4-openssl-dev
RUN npm install -g sass-lint htmllint-cli markdownlint-cli
WORKDIR /tmp
