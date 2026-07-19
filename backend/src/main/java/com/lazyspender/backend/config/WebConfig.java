package com.lazyspender.backend.config;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class WebConfig {

    // Registered with Spring Security (see SecurityConfig#securityFilterChain) rather than via
    // WebMvcConfigurer#addCorsMappings, because that WebMvcConfigurer hook only covers
    // RequestMappingHandlerMapping (regular @RestController endpoints) - it silently skips
    // /actuator/** requests, which are served by a separate WebMvcEndpointHandlerMapping, causing
    // real browser CORS preflights to actuator endpoints to be rejected even though this "/**"
    // pattern nominally covers them. Spring Security's CorsFilter runs earlier in the chain and
    // applies uniformly to every request regardless of which handler mapping ultimately serves it.
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of(
                "http://localhost:*",              // Local development (any port)
                "exp://*",                         // Expo Go (any host/port)
                "http://192.168.*.*:*",            // Local network IPs (any port)
                "http://10.*.*.*:*"                // Private network range (any port)
        ));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
