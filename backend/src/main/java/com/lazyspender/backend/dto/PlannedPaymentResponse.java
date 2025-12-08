package com.lazyspender.backend.dto;

import com.lazyspender.backend.model.ConfirmationType;
import com.lazyspender.backend.model.EndType;
import com.lazyspender.backend.model.PaymentStatus;
import com.lazyspender.backend.model.RecurrenceType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlannedPaymentResponse {

    private String id;
    private String owner;
    private String account;
    private String category;
    private double amount;
    private String description;
    private String currency;

    private Instant startDate;
    private RecurrenceType recurrenceType;
    private String recurrenceValue;

    private EndType endType;
    private String endValue;

    private ConfirmationType confirmationType;

    private PaymentStatus status;
    private Instant nextDueDate;
}
