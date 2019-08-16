pipeline {
  agent {
    docker {
      args '-e LANG=C.UTF-8'
      image 'ruby:2.5.0'
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
        sh 'rake test:website'
      }
    }
  }
  environment {
    LANG = 'C.UTF-8'
  }
}