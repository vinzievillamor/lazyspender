package com.lazyspender.backend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;

@Configuration
@ConfigurationProperties(prefix = "app.cors")
@Data
public class CorsConfigProperties {
    private List<String> allowedOriginPatterns = new ArrayList<>();
}
