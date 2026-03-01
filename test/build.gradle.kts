plugins {
    java
    id("org.springframework.boot") version "3.3.0"
    id("io.spring.dependency-management") version "1.1.5"
    id("com.diffplug.spotless") version "6.25.0"
    id("org.flywaydb.flyway") version "10.15.0"
}

group = "io.ourfit"
version = "1.0.3"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}

dependencyManagement {
    imports {
        mavenBom("org.springframework.cloud:spring-cloud-dependencies:2023.0.1")
    }
}

val queryDSLVersion by extra("5.1.0")
val jpaModelGenVersion by extra("6.6.4.Final")
val jjwtVersion by extra("0.12.6")
val j2htmlVersion by extra("1.6.0")
val tikaVersion by extra("3.0.0")
val jacksonVersion by extra("2.17.3")
val flywayDBVersion by extra("10.15.0")
val archUnitVersion by extra("1.4.1")

repositories {
    mavenCentral()
    gradlePluginPortal()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter")
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-data-redis")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-cache")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.cloud:spring-cloud-starter-openfeign")
    implementation("org.springframework.boot:spring-boot-configuration-processor")
    implementation("io.jsonwebtoken:jjwt-api:$jjwtVersion")
    implementation("io.jsonwebtoken:jjwt-impl:$jjwtVersion")
    implementation("io.jsonwebtoken:jjwt-jackson:$jjwtVersion")
    runtimeOnly("com.mysql:mysql-connector-j")
    // AWS SDK
    implementation(platform("software.amazon.awssdk:bom:2.24.0"))
    implementation("software.amazon.awssdk:s3")
    // Lombok
    implementation("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")
    // QueryDSL
    implementation("com.querydsl:querydsl-jpa:$queryDSLVersion:jakarta")
    annotationProcessor("com.querydsl:querydsl-apt:$queryDSLVersion:jakarta")
    annotationProcessor("jakarta.persistence:jakarta.persistence-api")
    annotationProcessor("jakarta.annotation:jakarta.annotation-api")
    // JPA Model Gen
    annotationProcessor("org.hibernate.orm:hibernate-jpamodelgen:$jpaModelGenVersion")
    // Mail HTML Template
    implementation("com.j2html:j2html:$j2htmlVersion")
    implementation("org.apache.tika:tika-core:$tikaVersion")
    implementation("com.fasterxml.jackson.dataformat:jackson-dataformat-xml:$jacksonVersion")
    // DataBase Schema Migration
    implementation("org.flywaydb:flyway-mysql:$flywayDBVersion")
    implementation("org.flywaydb:flyway-core:$flywayDBVersion")
    // Local Development
    developmentOnly("org.springframework.boot:spring-boot-devtools")
    // Testing
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
    testImplementation("org.testcontainers:junit-jupiter")
    testImplementation("org.mockito:mockito-junit-jupiter")
    testImplementation("org.assertj:assertj-core")
    testImplementation("org.springframework.boot:spring-boot-starter-test") {
        exclude(group = "junit", module = "junit")
    }
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("com.tngtech.archunit:archunit-junit5:$archUnitVersion")
    // Test Containers
    testImplementation("org.springframework.boot:spring-boot-testcontainers")
    testImplementation("org.testcontainers:mysql")
    testImplementation("org.testcontainers:localstack")
}

spotless {
    java {
        googleJavaFormat()
                .formatJavadoc(true)
        endWithNewline()
        formatAnnotations()
        removeUnusedImports()
        trimTrailingWhitespace()
    }
}

tasks.jar {
    isEnabled = false
}

tasks.withType<Test> {
    useJUnitPlatform()
    reports {
        html.required.set(false)
        junitXml.required.set(false)
    }
    maxParallelForks = (Runtime.getRuntime().availableProcessors() / 2)
            .coerceAtLeast(1)
            .coerceAtMost(3)
}
