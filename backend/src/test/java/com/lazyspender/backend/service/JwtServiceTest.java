package com.lazyspender.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.lazyspender.backend.config.JwtConfigProperties;

import io.jsonwebtoken.JwtException;

class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        JwtConfigProperties properties = new JwtConfigProperties();
        properties.setSecret("test-only-secret-at-least-32-bytes-long-xxxxx");
        jwtService = new JwtService(properties);
    }

    @Test
    void generateTokenRoundTripsOwnerClaim() {
        String token = jwtService.generateToken("villamorvinzie@gmail.com", "user-123");

        assertThat(jwtService.extractOwner(token)).isEqualTo("villamorvinzie@gmail.com");
        assertThat(jwtService.parseToken(token).getSubject()).isEqualTo("user-123");
    }

    @Test
    void parseTokenRejectsTamperedToken() {
        String token = jwtService.generateToken("villamorvinzie@gmail.com", "user-123");
        // Tamper the second-to-last character rather than the last: the final base64url
        // character of an HS256 signature only encodes 4 real bits (the rest is zero-padding),
        // so some replacements there decode to the same bytes and leave the signature valid.
        int tamperIndex = token.length() - 2;
        char replacement = token.charAt(tamperIndex) == 'a' ? 'b' : 'a';
        String tampered = token.substring(0, tamperIndex) + replacement + token.substring(tamperIndex + 1);

        assertThatThrownBy(() -> jwtService.parseToken(tampered)).isInstanceOf(JwtException.class);
    }

    @Test
    void parseTokenRejectsTokenSignedWithDifferentSecret() {
        JwtConfigProperties otherProperties = new JwtConfigProperties();
        otherProperties.setSecret("a-completely-different-secret-that-is-also-long-enough");
        JwtService otherJwtService = new JwtService(otherProperties);
        String token = otherJwtService.generateToken("villamorvinzie@gmail.com", "user-123");

        assertThatThrownBy(() -> jwtService.parseToken(token)).isInstanceOf(JwtException.class);
    }
}
