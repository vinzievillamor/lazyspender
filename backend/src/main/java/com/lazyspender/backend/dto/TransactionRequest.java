package com.lazyspender.backend.dto;

import com.lazyspender.backend.model.TransactionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionRequest {

    @NotBlank(message = "Owner is required")
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
}
