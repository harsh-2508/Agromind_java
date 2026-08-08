# Stage 1: Build the application using Maven
FROM maven:3.9.6-eclipse-temurin-23-alpine AS build
WORKDIR /app
COPY pom.xml .
# Download dependencies first (caches them for faster future builds)
RUN mvn dependency:go-offline

COPY src ./src
# Build the jar, skipping tests to speed up deployment
RUN mvn clean package -DskipTests

# Stage 2: Create the lightweight production image
FROM eclipse-temurin:23-jre-alpine
WORKDIR /app

# Copy the built jar from the build stage
COPY --from=build /app/target/*.jar app.jar

# Expose the port render will use
EXPOSE 8080


# run the application
ENTRYPOINT