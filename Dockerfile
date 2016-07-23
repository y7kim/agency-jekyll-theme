FROM jekyll/jekyll:latest

COPY . /srv/jekyll

RUN chown -R jekyll:jekyll /srv/jekyll && \
    chmod -R 777 /srv/jekyll
