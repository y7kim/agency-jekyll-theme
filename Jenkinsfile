pipeline {
  agent {
    docker {
      image 'ruby:2.4.1'
      args 'sudo rm -rf'
    }

  }
  stages {
    stage('Build') {
      steps {
        sh './scripts/cibuild'
      }
    }
  }
  environment {
    NOKOGIRI_USE_SYSTEM_LIBRARIES = 'true'
  }
}