FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests -B

FROM eclipse-temurin:17-jre
WORKDIR /app
# --- Observability: traces pillar ---
# The OpenTelemetry Java agent auto-instruments Spring MVC + JDBC + RabbitMQ, exports spans over
# OTLP, and injects trace_id/span_id into the logback MDC for log correlation. Vendored into the
# build context (not ADD'd from GitHub Releases) so the build never depends on that CDN. All
# behaviour is driven by OTEL_* env set in the k8s manifest.
COPY otel/opentelemetry-javaagent.jar /otel/opentelemetry-javaagent.jar
ENV JAVA_TOOL_OPTIONS=-javaagent:/otel/opentelemetry-javaagent.jar
COPY --from=build /app/target/orders.jar .
EXPOSE 8007
CMD ["java", "-jar", "orders.jar"]
