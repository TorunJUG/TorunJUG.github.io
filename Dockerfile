FROM ubuntu:12.04

RUN apt-get update && apt-get -y install git make gcc wget ruby1.9.3
RUN locale-gen en_US.UTF-8

ENV LC_ALL=en_US.UTF-8
ENV LANG=en_US.UTF-8

WORKDIR /root/octopress

CMD gem install bundler && bundle install && rake generate && rake preview

EXPOSE 4000
