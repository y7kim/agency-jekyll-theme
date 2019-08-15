pipeline {
  agent {
    docker {
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
        sh 'rake test:website'
      }
    }
  }
}