package com.lazyspender.backend.service;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.lazyspender.backend.config.GoogleConfigProperties;
import com.lazyspender.backend.dto.AuthResponse;
import com.lazyspender.backend.model.User;
import com.lazyspender.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final GoogleConfigProperties googleConfigProperties;
    private final UserRepository userRepository;
    private final JwtService jwtService;

    private GoogleIdTokenVerifier verifier;

    public AuthResponse authenticateWithGoogle(String idTokenString) {
        GoogleIdToken.Payload payload = verifyGoogleIdToken(idTokenString);

        String googleId = payload.getSubject();
        String email = payload.getEmail();
        String name = (String) payload.get("name");
        String pictureUrl = (String) payload.get("picture");

        User user = userRepository.findByGoogleId(googleId)
                .or(() -> userRepository.findByEmail(email))
                .orElseGet(() -> {
                    User newUser = new User();
                    newUser.setId(UUID.randomUUID().toString());
                    newUser.setOwner(email);
                    return newUser;
                });

        user.setGoogleId(googleId);
        user.setEmail(email);
        user.setName(name);
        user.setPictureUrl(pictureUrl);
        User savedUser = userRepository.save(user);

        String token = jwtService.generateToken(savedUser.getOwner(), savedUser.getId());

        return AuthResponse.builder()
                .token(token)
                .id(savedUser.getId())
                .owner(savedUser.getOwner())
                .email(savedUser.getEmail())
                .name(savedUser.getName())
                .pictureUrl(savedUser.getPictureUrl())
                .build();
    }

    private GoogleIdToken.Payload verifyGoogleIdToken(String idTokenString) {
        try {
            GoogleIdToken idToken = getVerifier().verify(idTokenString);
            if (idToken == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid Google ID token");
            }
            return idToken.getPayload();
        } catch (GeneralSecurityException | IOException | IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Failed to verify Google ID token", e);
        }
    }

    private synchronized GoogleIdTokenVerifier getVerifier() {
        if (verifier == null) {
            verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                    .setAudience(Collections.singletonList(googleConfigProperties.getClientId()))
                    .build();
        }
        return verifier;
    }
}
