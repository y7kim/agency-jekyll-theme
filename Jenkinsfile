pipeline {
  agent {
    docker {
      image 'ruby'
    }

  }
  stages {
    stage('build') {
      steps {
        sh 'bundle exec jekyll build'
      }
    }
    stage('test') {
      steps {
        sh 'bundle exec htmlproofer ./_site'
      }
    }
  }
}