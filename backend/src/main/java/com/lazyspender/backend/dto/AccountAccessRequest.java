package com.lazyspender.backend.dto;

import com.lazyspender.backend.model.AccessRole;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountAccessRequest {

    @NotBlank(message = "Email is required")
    private String email;

    @NotNull(message = "Role is required")
    private AccessRole role;
}
