pipeline {
  agent {
    docker {
      image 'ruby:2.4.1'
    }

  }
  stages {
    stage('Build') {
      steps {
        sh 'sudo rm -rf *'
      }
    }
  }
  environment {
    NOKOGIRI_USE_SYSTEM_LIBRARIES = 'true'
  }
}