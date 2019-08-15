pipeline {
  agent {
    docker {
      image 'ubuntu:latest'
    }

  }
  stages {
    stage('Build') {
      steps {
        sh 'npm install -g sass-lint htmllint-cli markdownlint-cli'
        sh 'bundle exec jekyll build; '
      }
    }
    stage('Tests') {
      steps {
        sh 'htmllint _includes/stripped_markdown.html; markdownlint _posts _drafts _pages README.md; sass-lint --verbose --no-exit; bundle exec htmlproofer _site --allow-hash-href --assume-extension --url-ignore "/localhost/" --http-status-ignore "999"'
      }
    }
  }
  environment {
    LANGUAGE = 'en_US.UTF-8'
    LANG = 'en_US.UTF-8'
    LC_ALL = 'en_US.UTF-8'
  }
}