pipeline {
  agent {
    docker {
      image 'ruby:2.4.1'
    }

  }
  stages {
    stage('Build') {
      steps {
        sh 'bundle exec jekyll'
      }
    }
    stage('Test') {
      steps {
        sh '''build
bundle exec htmlproofer ./_site'''
      }
    }
  }
  environment {
    NOKOGIRI_USE_SYSTEM_LIBRARIES = 'true'
  }
}