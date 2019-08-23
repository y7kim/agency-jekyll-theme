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
    stage('Build image') {
      steps {
        def dockerfile = './docker/dockerfile'
        def customImage = docker.build("nexaoo/cyriltavian:${env.BUILD_ID}", "-f ${dockerfile} .")
        docker.withRegistry('https://registry.hub.docker.com', 'dockerhub-nexaoo') {
          app.push("${env.BUILD_ID}")
          app.push("latest")
        }
      }
  }
  environment {
    LC_ALL = 'C.UTF-8'
  }
}