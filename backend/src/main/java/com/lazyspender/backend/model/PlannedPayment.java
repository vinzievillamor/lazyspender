package com.lazyspender.backend.model;

import com.google.cloud.spring.data.datastore.core.mapping.Entity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;

import java.time.Instant;

@Entity(name = "PlannedPayments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlannedPayment {

    @Id
    private String id;

    // === Payment Details ===
    private String owner;

    private String account;

    private String category;

    private double amount;

    private String description;

    private String currency;

    // === Recurrence Configuration ===
    private Instant startDate;

    private RecurrenceType recurrenceType;

    private String recurrenceValue;  // Store as String, handle WEEKLY (day name) or MONTHLY (number as string)

    // === End Condition ===
    private EndType endType;

    private String endValue;  // Store as String, handle OCCURRENCE (number as string) or DATE (ISO string)

    // === Confirmation Settings ===
    private ConfirmationType confirmationType;

    // === Status Tracking ===
    private PaymentStatus status;

    private Instant nextDueDate;
}
