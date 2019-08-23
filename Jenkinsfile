pipeline {
  agent {
    docker {
      image 'ruby:2.3'
    }

  }
  stages {
    stage('Prepare') {
      steps {
        sh 'bundle install'
      }
    }
    stage('Tests') {
      steps {
        sh 'rake test:website'
      }
    }
    stage('Build dockerimage') {
      steps {
        sh 'docker build -f ./docker/dockerfile . -t test:test'
      }
    }
  }
  environment {
    LC_ALL = 'C.UTF-8'
  }
}