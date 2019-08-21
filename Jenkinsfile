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
        sh 'LANG=en_US.UTF-8 rake test:website --trace'
      }
    }
  }
}