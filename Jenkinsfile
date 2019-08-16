pipeline {
  agent {
    docker {
      image 'ruby:2.5.0'
      args '-e LANG=C.UTF-8 -c /bin/bash'
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