#!/usr/bin/env bash

set -e

bundle exec jekyll build
bundle exec htmlprofer ./_site
