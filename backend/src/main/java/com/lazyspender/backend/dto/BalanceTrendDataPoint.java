package com.lazyspender.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BalanceTrendDataPoint {
    private String label;
    private Instant timestamp;
    private double balance;
    private double income;
    private double expense;
}
