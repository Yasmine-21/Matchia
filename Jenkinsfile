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

                    echo 'Build + Tests du backend Spring Boot...'

                    sh 'chmod +x mvnw'
                    sh './mvnw clean verify'
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

        stage('Tests Frontend') {
            steps {
                dir('MatchiaFrontend') {

                    nodejs(nodeJSInstallationName: 'NodeJS-24') {

                        echo 'Exécution des tests frontend...'

                        sh 'npm run test:coverage'
                    }
                }
            }
        }

        stage('SonarQube Backend') {
            steps {
                dir('MatchiaBackend') {
                    withSonarQubeEnv('Matchia-SonarQube') {
                        sh '''
                            ./mvnw org.sonarsource.scanner.maven:sonar-maven-plugin:5.7.0.6970:sonar \
                            -Dsonar.projectKey=matchia-backend \
                            -Dsonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml
                        '''
                    }
                }
            }
        }

        stage('SonarQube Frontend') {
            steps {
                dir('MatchiaFrontend') {
                    nodejs(nodeJSInstallationName: 'NodeJS-24') {
                        withSonarQubeEnv(
                            installationName: 'Matchia-SonarQube',
                            credentialsId: 'sonar-frontend-token'
                        ) {
                            sh '''
                                npx @sonar/scan \
                                -Dsonar.host.url=$SONAR_HOST_URL \
                                -Dsonar.token=$SONAR_AUTH_TOKEN
                            '''
                        }
                    }
                }
            }
        }
    }

    post {

        success {
            echo 'BUILD, TESTS ET ANALYSES MATCHIA SUCCESS ✅'
        }

        failure {
            echo 'PIPELINE MATCHIA FAILED ❌'
        }
    }
}