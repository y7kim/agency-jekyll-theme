pipeline {
  agent {
    docker {
      image 'ruby:2.4.1'
    }

  }
  stages {
    stage('Build') {
      steps {
        sh '''

NOKOGIRI_USE_SYSTEM_LIBRARIES=true; export LC_ALL="en_US.UTF-8"; apt-get install libcurl4-openssl-dev -y; bundle install'''
        sh 'bundle exec jekyll build'
      }
    }
    stage('Tests') {
      steps {
        sh 'bundle exec htmlproofer ./_site'
      }
    }
  }
}