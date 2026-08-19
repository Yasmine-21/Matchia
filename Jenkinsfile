pipeline {

    agent any

    options {
        skipDefaultCheckout(true)
    }

    stages {

        // =====================================================
        // 1. RÉCUPÉRATION DU CODE DEPUIS GITHUB
        // =====================================================

        stage('Checkout') {
            steps {
                echo 'Récupération du projet depuis GitHub...'
                checkout scm
            }
        }


        // =====================================================
        // 2. BUILD BACKEND SPRING BOOT
        // =====================================================

        stage('Build Backend') {
            steps {

                dir('MatchiaBackend') {

                    echo 'Build du backend Spring Boot...'

                    sh 'chmod +x mvnw'

                    sh './mvnw clean package -DskipTests'
                }
            }
        }


        // =====================================================
        // 3. BUILD FRONTEND REACT
        // =====================================================

        stage('Build Frontend') {
            steps {

                dir('MatchiaFrontend') {

                    nodejs(nodeJSInstallationName: 'NodeJS-22') {

                        echo 'Build du frontend React...'

                        sh 'node --version'

                        sh 'npm --version'

                        sh 'npm ci'

                        sh 'npm run build'
                    }
                }
            }
        }

    }


    // =========================================================
    // RÉSULTAT
    // =========================================================

    post {

        success {
            echo 'BUILD MATCHIA SUCCESS ✅'
        }

        failure {
            echo 'BUILD MATCHIA FAILED ❌'
        }

    }
}