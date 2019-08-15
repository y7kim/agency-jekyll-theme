pipeline {
  agent {
    docker {
      image 'ruby:latest'
    }

  }
  stages {
    stage('Build') {
      steps {
        sh 'rake build:website'
        sh 'bundle install'
      }
    }
    stage('Tests') {
      steps {
        sh 'rake test:website'
      }
    }
  }
}