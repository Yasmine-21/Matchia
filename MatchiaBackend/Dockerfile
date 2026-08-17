# ==============================
# ÉTAPE 1 : BUILD
# ==============================

FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /app

# Copier d'abord le pom.xml
COPY pom.xml .

# Télécharger les dépendances
RUN mvn dependency:go-offline -B

# Copier le code source
COPY src ./src

# Compiler l'application
RUN mvn clean package -DskipTests


# ==============================
# ÉTAPE 2 : RUNTIME
# ==============================

FROM eclipse-temurin:17-jre

WORKDIR /app

# Copier uniquement le JAR créé
COPY --from=build /app/target/*.jar app.jar

# Port Spring Boot
EXPOSE 8081

# Démarrer l'application
ENTRYPOINT ["java", "-jar", "app.jar"]