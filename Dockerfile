FROM jekyll/jekyll:latest

ADD . /srv/jekyll

RUN chown -R jekyll:jekyll /srv/jekyll && \
    chmod -R 777 /srv/jekyll
