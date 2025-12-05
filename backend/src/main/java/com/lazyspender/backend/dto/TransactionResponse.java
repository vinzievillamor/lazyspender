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
public class TransactionResponse {

    private Long id;
    private String owner;
    private String account;
    private String category;
    private double amount;
    private String note;
    private Instant date;
    private String currency;
    private double refCurrencyAmount;
}
