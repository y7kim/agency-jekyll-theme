pipeline {
  agent {
    docker {
      image 'ruby:241'
    }

  }
  stages {
    stage('Build') {
      steps {
        sh 'bundle install'
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
    NOKOGIRI_USE_SYSTEM_LIBRARIES = 'true'
  }
}