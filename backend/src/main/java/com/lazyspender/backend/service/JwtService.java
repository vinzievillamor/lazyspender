package com.lazyspender.backend.service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.stereotype.Service;

import com.lazyspender.backend.config.JwtConfigProperties;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class JwtService {

    private static final String OWNER_CLAIM = "owner";
    private static final long SESSION_DURATION_HOURS = 24;

    private final JwtConfigProperties jwtConfigProperties;

    public String generateToken(String owner, String userId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId)
                .claim(OWNER_CLAIM, owner)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(SESSION_DURATION_HOURS, ChronoUnit.HOURS)))
                .signWith(signingKey())
                .compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(signingKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String extractOwner(String token) {
        return parseToken(token).get(OWNER_CLAIM, String.class);
    }

    private SecretKey signingKey() {
        return Keys.hmacShaKeyFor(jwtConfigProperties.getSecret().getBytes(StandardCharsets.UTF_8));
    }
}
