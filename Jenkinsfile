pipeline {
  agent {
    docker {
      image 'ruby:2.4.1'
    }

  }
  stages {
    stage('Build') {
      steps {
        sh '''

NOKOGIRI_USE_SYSTEM_LIBRARIES=true;








 bundle install'''
        sh 'bundle exec jekyll build'
      }
    }
    stage('Tests') {
      steps {
        sh 'bundle exec htmlproofer ./_site'
      }
    }
  }
}