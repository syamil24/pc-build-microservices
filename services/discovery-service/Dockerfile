FROM eclipse-temurin:21-jre
WORKDIR /app
COPY target/*.jar app.jar
ENV JAVA_OPTS="-Xms48m -Xmx160m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:MaxMetaspaceSize=96m -Xss256k"
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
