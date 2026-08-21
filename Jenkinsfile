pipeline {

    agent any
    environment {
        AZURE_BACKEND_URL = 'https://matchia-backend.orangeocean-5e0d9a35.francecentral.azurecontainerapps.io'
    }

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
                        sh '''
                        VITE_API_URL=$AZURE_BACKEND_URL npm run build
                        '''
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

        stage('Docker Build') {
            steps {

                echo 'Construction des images Docker Matchia...'

                sh '''
                    docker build \
                        -t matchia-backend:latest \
                        ./MatchiaBackend
                '''

                sh '''
                    docker build \
                        --build-arg VITE_API_URL=$AZURE_BACKEND_URL \
                        -t matchia-frontend:latest \
                        ./MatchiaFrontend
                '''
            }
        }

        stage('Push Docker Images') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub',
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )
                ]) {
                    sh '''
                        echo "$DOCKER_PASS" | docker login \
                            -u "$DOCKER_USER" \
                            --password-stdin

                        # Backend
                        docker tag matchia-backend:latest \
                            yassmine24/matchia-backend:$BUILD_NUMBER

                        docker tag matchia-backend:latest \
                            yassmine24/matchia-backend:latest

                        # Frontend
                        docker tag matchia-frontend:latest \
                            yassmine24/matchia-frontend:$BUILD_NUMBER

                        docker tag matchia-frontend:latest \
                            yassmine24/matchia-frontend:latest

                        # Push Backend
                        docker push yassmine24/matchia-backend:$BUILD_NUMBER
                        docker push yassmine24/matchia-backend:latest

                        # Push Frontend
                        docker push yassmine24/matchia-frontend:$BUILD_NUMBER
                        docker push yassmine24/matchia-frontend:latest
                    '''
                }
            }
        }
        stage('Deploy Backend Azure') {
    steps {
        sh '''
            echo "Sélection de l'abonnement Azure..."

            az account set \
                --subscription "07ad1f36-8ed6-4652-854b-13599db84518"

            echo "Déploiement du backend Azure..."

            az containerapp update \
                --name matchia-backend \
                --resource-group rg-matchia \
                --image yassmine24/matchia-backend:latest \
                --revision-suffix v$BUILD_NUMBER \
                --output none
        '''
    }
}

        stage('Deploy Frontend Azure') {
    steps {
        sh '''
            echo "Sélection de l'abonnement Azure..."

            az account set \
                --subscription "07ad1f36-8ed6-4652-854b-13599db84518"

            echo "Déploiement de la dernière image frontend..."

            az containerapp update \
                --name matchia-frontend \
                --resource-group rg-matchia \
                --image yassmine24/matchia-frontend:latest \
                --revision-suffix v$BUILD_NUMBER
                --output none
        '''
    }
}
    }

    post {

        success {
            echo 'PIPELINE MATCHIA SUCCESS ✅'
        }

        failure {
            echo 'PIPELINE MATCHIA FAILED ❌'
        }
    }
}