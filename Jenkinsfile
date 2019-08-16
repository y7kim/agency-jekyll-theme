pipeline {
  agent {
    docker {
      image 'ruby:2.4.0'
      args '-e LANG=C.UTF-8 LANGUAGE=en_US.UTF-8 LC_ALL=en_US.UTF-8'
    }

  }
  stages {
    stage('Prepare') {
      steps {
        sh 'printenv'
      }
    }
    stage('Tests') {
      steps {
        sh '#rake test:website'
      }
    }
  }
}