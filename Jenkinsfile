pipeline {
  agent {
    docker {
      image 'mvn'
    }

  }
  stages {
    stage('') {
      steps {
        sh 'mvn -B'
      }
    }
  }
  environment {
    NOKOGIRI_USE_SYSTEM_LIBRARIES = 'true'
  }
}