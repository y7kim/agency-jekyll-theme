pipeline {
  agent {
    docker {
      image 'ruby:latest'
      args '-e LANG=C.UTF-8'
    }

  }
  stages {
    stage('Prepare') {
      steps {
        sh 'bundle'
      }
    }
    stage('Tests') {
      steps {
        sh 'rake test:website --trace'
      }
    }
  }
}