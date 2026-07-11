package com.lazyspender.backend.dto;

import java.time.Instant;

import com.lazyspender.backend.model.TransactionType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

@Data
@Builder(toBuilder = true)
public class TransactionRequest {

    private String owner;

    @NotBlank(message = "Account is required")
    private String account;

    @NotBlank(message = "Category is required")
    private String category;

    @NotNull(message = "Amount is required")
    private double amount;

    private String note;

    @NotNull(message = "Date is required")
    private Instant date;

    private String currency;

    private double refCurrencyAmount;

    private String plannedPaymentId;

    @NotNull(message = "Transaction type is required")
    private TransactionType type;

    @Builder.Default
    private boolean confirm = true;
}
