# Stage 1: Build the application using the Maven Wrapper
FROM eclipse-temurin:23-jdk AS build
WORKDIR /app

# Copy the Maven wrapper and project files
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./

# Fix potential Windows line endings and make the wrapper executable
RUN sed -i 's/\r$//' mvnw
RUN chmod +x mvnw

# Download dependencies (caches them for faster future builds)
RUN ./mvnw dependency:go-offline

# Copy the source code and build the jar
COPY src ./src
RUN ./mvnw clean package -DskipTests

# Stage 2: Create the lightweight production image
FROM eclipse-temurin:23-jre
WORKDIR /app

# Copy the built jar from the build stage
COPY --from=build /app/target/*.jar app.jar

# Expose the port Render will use
EXPOSE 8080

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]