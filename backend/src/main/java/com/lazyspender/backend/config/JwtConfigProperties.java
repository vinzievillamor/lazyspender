package com.lazyspender.backend.config;

import jakarta.annotation.PostConstruct;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

@Configuration
@ConfigurationProperties(prefix = "app.jwt")
@Data
public class JwtConfigProperties {
    private String secret;

    // @ConfigurationProperties binding ignores unresolvable ${...} placeholders by default,
    // so a missing JWT_SECRET env var silently leaves the literal "${JWT_SECRET}" string here
    // instead of failing - fail startup loudly instead.
    @PostConstruct
    void validate() {
        if (!StringUtils.hasText(secret) || secret.startsWith("${")) {
            throw new IllegalStateException(
                    "app.jwt.secret is not configured - set the JWT_SECRET environment variable");
        }
    }
}
