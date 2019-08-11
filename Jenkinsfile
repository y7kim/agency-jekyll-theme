pipeline {
  agent {
    docker {
      image 'ruby:latest'
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
}