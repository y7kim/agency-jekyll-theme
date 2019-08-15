pipeline {
  agent {
    dockerfile {
      filename 'tests.dockerfile'
    }

  }
  stages {
    stage('Build') {
      steps {
        sh 'bundle install; bundle exec jekyll build; '
      }
    }
    stage('Tests') {
      steps {
        sh 'htmllint _includes/stripped_markdown.html; markdownlint _posts _drafts _pages README.md; sass-lint --verbose --no-exit; bundle exec htmlproofer _site --allow-hash-href --assume-extension --url-ignore "/localhost/" --http-status-ignore "999"'
      }
    }
  }
}