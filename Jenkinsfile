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

bundle exec jekyll build'''
      }
    }
    stage('Tests') {
      steps {
        sh 'bundle exec htmlproofer ./_site'
        sh 'ls -l'
      }
    }
    stage('Build dockerfile') {
      steps {
        sh 'docker build -t cyril-tavian:latest ./dockerfile'
      }
    }
  }
  environment {
    NOKOGIRI_USE_SYSTEM_LIBRARIES = 'true'
  }
}