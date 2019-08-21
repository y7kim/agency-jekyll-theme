pipeline {
  agent {
    docker {
      image 'ruby:latest'
      args '''-e "ANG=C.UTF-8 -e LANG=en_US.UTF-8
-e LANGUAGE=en_US.UTF-8 -e LC_ALL=en_US.UTF-8'''
    }

  }
  stages {
    stage('Prepare') {
      steps {
        sh 'bundle'
        sh '''locale; localectl status; export LANG=en_US.UTF-8; export LANGUAGE=en_US.UTF-8;
export LC_ALL=en_US.UTF-8'''
      }
    }
    stage('Tests') {
      steps {
        sh 'rake test:website --trace'
      }
    }
  }
}