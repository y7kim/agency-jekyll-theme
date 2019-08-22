pipeline {
  agent {
    docker {
      args '''-e "ANG=C.UTF-8 -e LANG=en_US.UTF-8
-e LANGUAGE=en_US.UTF-8 -e LC_ALL=en_US.UTF-8'''
      image 'ruby:buster'
    }

  }
  stages {
    stage('Prepare') {
      steps {
        sh '''locale;  export LANG=en_US.UTF-8; export LANGUAGE=en_US.UTF-8;
export LC_ALL=en_US.UTF-8'''
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