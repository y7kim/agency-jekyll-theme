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
        sh 'LANG=en_US.UTF-8 rake test:website --trace'
      }
    }
  }
}