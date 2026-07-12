package com.lazyspender.backend.security;

import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void unauthenticatedRequestToProtectedEndpointIsRejectedWithUnauthorized() throws Exception {
        mockMvc.perform(get("/api/transactions/mine"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void protectedEndpointRejectsGarbageBearerToken() throws Exception {
        mockMvc.perform(get("/api/transactions/mine").header("Authorization", "Bearer not-a-real-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void authEndpointIsPubliclyReachableEvenWhenItErrors() throws Exception {
        mockMvc.perform(post("/api/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"not-a-real-token\"}"))
                .andExpect(status().is(not(401)))
                .andExpect(status().is(not(403)));
    }
}
