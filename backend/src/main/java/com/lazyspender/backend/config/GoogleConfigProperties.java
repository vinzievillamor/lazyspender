package com.lazyspender.backend.config;

import jakarta.annotation.PostConstruct;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

@Configuration
@ConfigurationProperties(prefix = "app.google")
@Data
public class GoogleConfigProperties {
    private String clientId;

    // @ConfigurationProperties binding ignores unresolvable ${...} placeholders by default,
    // so a missing GOOGLE_CLIENT_ID env var silently leaves the literal "${GOOGLE_CLIENT_ID}"
    // string here instead of failing - fail startup loudly instead.
    @PostConstruct
    void validate() {
        if (!StringUtils.hasText(clientId) || clientId.startsWith("${")) {
            throw new IllegalStateException(
                    "app.google.client-id is not configured - set the GOOGLE_CLIENT_ID environment variable");
        }
    }
}
