# syntax=docker/dockerfile:1

# ---------- Build stage ----------
# Compila o jar com Maven + JDK 21. O cache do Maven e reaproveitado entre
# builds via a camada de dependencias (go-offline) antes de copiar o codigo.
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app

# 1) Baixa dependencias primeiro (camada cacheavel).
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

# 2) Copia o codigo e empacota (testes rodam no CI/local; aqui pulamos para
#    builds de deploy mais rapidos).
COPY src ./src
RUN mvn -B -q -DskipTests clean package

# ---------- Runtime stage ----------
# Imagem enxuta so com o JRE 21 para rodar o jar.
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app

# Usuario nao-root por seguranca.
RUN groupadd --system app && useradd --system --gid app app

COPY --from=build /app/target/saas-payment-service-0.1.0.jar app.jar
USER app

# O Render injeta a porta via env PORT; o application.yml ja usa ${PORT:3000}.
EXPOSE 3000

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
