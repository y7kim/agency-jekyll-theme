pipeline {
  agent {
    docker {
      image 'ruby:2.4.1'
      args '''export LANGUAGE=en_US.UTF-8
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8'''
    }

  }
  stages {
    stage('Build') {
      steps {
        sh '''









 NOKOGIRI_USE_SYSTEM_LIBRARIES=true; bundle install'''
        sh 'bundle exec jekyll build'
      }
    }
    stage('Tests') {
      steps {
        sh 'bundle exec htmlproofer ./_site'
      }
    }
  }
  environment {
    LANGUAGE = 'en_US.UTF-8'
    LANG = 'en_US.UTF-8'
    LC_ALL = 'en_US.UTF-8'
  }
}