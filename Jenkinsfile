pipeline {
  agent {
    docker {
      args '-e LANG=C.UTF-8'
      image 'ruby:latest'
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
  environment {
    LANG = 'C.UTF-8'
  }
}