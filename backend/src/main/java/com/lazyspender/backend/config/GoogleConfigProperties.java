package com.lazyspender.backend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "app.google")
@Data
public class GoogleConfigProperties {
    private String clientId;
}
