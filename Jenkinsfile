pipeline {
  agent {
    dockerfile {
      filename './docker/ruby.dockerfile'
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
}