package com.lazyspender.backend.model;

import java.time.Instant;

import org.springframework.data.annotation.Id;

import com.google.cloud.spring.data.datastore.core.mapping.Entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity(name = "accountAccess")
@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class AccountAccess {

    @Id
    private String id;

    private String owner;

    private String delegate;

    private AccessRole role;

    private AccessStatus status;

    private Instant createdAt;

    private Instant respondedAt;
}
