pipeline {
  agent {
    docker {
      image 'ruby:latest'
    }

  }
  stages {
    stage('Build') {
      steps {
        sh 'bundle install'
        sh 'rake build:website'
      }
    }
    stage('Tests') {
      steps {
        sh 'rake test:website'
      }
    }
  }
}