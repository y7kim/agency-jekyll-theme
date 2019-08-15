pipeline {
  agent {
    docker {
      image 'ruby:latest'
    }

  }
  stages {
    stage('Prepare') {
      steps {
        sh '''export LANG=en_US.UTF-8; 
export LANGUAGE=en_US.UTF-8; export LC_ALL=en_US.UTF-8; bundle'''
      }
    }
    stage('Tests') {
      steps {
        sh 'rake test:website'
      }
    }
  }
}