package com.lazyspender.backend.dto;

import java.time.Instant;

import com.lazyspender.backend.model.ConfirmationType;
import com.lazyspender.backend.model.EndType;
import com.lazyspender.backend.model.RecurrenceType;

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
public class PlannedPaymentRequest {

    @NotBlank(message = "Owner is required")
    private String owner;

    @NotBlank(message = "Account is required")
    private String account;

    @NotBlank(message = "Category is required")
    private String category;

    @NotNull(message = "Amount is required")
    private double amount;

    private String note;

    private String currency;

    @NotNull(message = "Start date is required")
    private Instant startDate;

    @NotNull(message = "Recurrence type is required")
    private RecurrenceType recurrenceType;

    @NotBlank(message = "Recurrence value is required")
    private String recurrenceValue;

    @NotNull(message = "End type is required")
    private EndType endType;

    private String endValue;  // Optional - depends on endType

    @NotNull(message = "Confirmation type is required")
    private ConfirmationType confirmationType;
}
