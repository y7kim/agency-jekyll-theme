pipeline {
  agent {
    docker {
      image 'ruby:2.3'
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
        sh 'rake test:website'
      }
    }
    stage('Publish') {
      steps {
        script {
          docker.withRegistry('https://registry.hub.docker.com', 'dockerhub_nexaoo') {
            def websiteImage = docker.build("nexaoo/cyriltavian:${env.BUILD_ID}", "-f ./docker/dockerfile .")
            websiteImage.push()
          }
        }

      }
    }
  }
  environment {
    LC_ALL = 'C.UTF-8'
  }
}