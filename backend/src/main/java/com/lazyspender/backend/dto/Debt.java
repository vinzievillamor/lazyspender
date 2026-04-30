package com.lazyspender.backend.dto;

import java.time.Instant;
import java.time.temporal.Temporal;

import lombok.Builder;

@Builder
public record Debt(
        String category,
        String note,
        String currency,
        double amount,
        Instant date,
        Temporal period) {
}
