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
  }
  environment {
    LC_ALL = 'C.UTF-8'
  }
}