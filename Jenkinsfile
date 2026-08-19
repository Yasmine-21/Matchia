pipeline {

    agent any

    options {
        skipDefaultCheckout(true)
    }

    stages {

        stage('Checkout') {
            steps {
                echo 'Récupération du projet depuis GitHub...'
                checkout scm
            }
        }

        stage('Build Backend') {
            steps {
                dir('MatchiaBackend') {

                    echo 'Build du backend Spring Boot...'

                    sh 'chmod +x mvnw'

                    sh './mvnw clean package -DskipTests'
                }
            }
        }

        stage('Build Frontend') {
            steps {
                dir('MatchiaFrontend') {

                    nodejs(nodeJSInstallationName: 'NodeJS-24') {

                        echo 'Build du frontend React...'

                        sh 'node --version'
                        sh 'npm --version'

                        sh 'npm ci'
                        sh 'npm run build'
                    }
                }
            }
        }

        stage('Tests Backend') {
            steps {
                dir('MatchiaBackend') {

                    echo 'Exécution des tests backend...'

                    sh './mvnw test'
                }
            }
        }
        stage('SonarQube Backend') {
            steps {
                dir('MatchiaBackend') {
                    withSonarQubeEnv('Matchia-SonarQube') {
                        sh '''
                            ./mvnw org.sonarsource.scanner.maven:sonar-maven-plugin:sonar \
                            -Dsonar.projectKey=matchia-backend
                        '''
                    }
                }
            }
        }

    }

    post {

        success {
            echo 'BUILD ET TESTS MATCHIA SUCCESS ✅'
        }

        failure {
            echo 'PIPELINE MATCHIA FAILED ❌'
        }
    }
}