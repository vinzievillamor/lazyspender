package com.lazyspender.backend.dto;

import java.time.Instant;

import com.lazyspender.backend.model.AccessRole;
import com.lazyspender.backend.model.AccessStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountAccessResponse {

    private String id;
    private String owner;
    private String delegate;
    private AccessRole role;
    private AccessStatus status;
    private Instant createdAt;
    private Instant respondedAt;

    // Denormalized owner display info - populated only for "granted-to-me" listings.
    private String ownerName;
    private String ownerPictureUrl;
}
