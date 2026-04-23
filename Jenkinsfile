pipeline {
  agent any

  options {
    timestamps()
  }

  parameters {
    booleanParam(name: 'RUN_SONAR', defaultValue: false, description: 'Run SonarQube analysis.')
    string(name: 'SONAR_HOST_URL', defaultValue: 'http://localhost:9000', description: 'SonarQube server URL.')
  }

  stages {
    stage('Install') {
      steps {
        script {
          if (isUnix()) {
            sh 'npm ci'
          } else {
            bat 'npm ci'
          }
        }
      }
    }

    stage('Test with Coverage') {
      steps {
        script {
          if (isUnix()) {
            sh 'npm run test:ci'
          } else {
            bat 'npm run test:ci'
          }
        }
      }
    }

    stage('Build Production') {
      steps {
        script {
          if (isUnix()) {
            sh 'npm run build:prod'
          } else {
            bat 'npm run build:prod'
          }
        }
      }
    }

    stage('SonarQube') {
      when {
        expression { return params.RUN_SONAR }
      }
      steps {
        withCredentials([string(credentialsId: 'sonarqube-token', variable: 'SONAR_TOKEN')]) {
          script {
            if (isUnix()) {
              sh "npx sonar-scanner -Dsonar.host.url=${params.SONAR_HOST_URL} -Dsonar.token=\$SONAR_TOKEN"
            } else {
              bat "npx sonar-scanner -Dsonar.host.url=${params.SONAR_HOST_URL} -Dsonar.token=%SONAR_TOKEN%"
            }
          }
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'coverage/**,dist/**', allowEmptyArchive: true
    }
  }
}
