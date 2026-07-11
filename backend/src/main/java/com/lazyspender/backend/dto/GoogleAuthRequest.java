package com.lazyspender.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record GoogleAuthRequest(

        @NotBlank(message = "ID token is required") String idToken) {

}
