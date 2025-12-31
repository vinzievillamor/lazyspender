package com.lazyspender.backend.model;

import java.time.Instant;

import org.springframework.data.annotation.Id;

import com.google.cloud.spring.data.datastore.core.mapping.Entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity(name = "transactions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Transaction {

    @Id
    private String id;

    private String owner;

    private String account;

    private String category;

    private double amount;

    private String note;

    private Instant date;

    private String currency;

    private double refCurrencyAmount;

    private String plannedPaymentId;

    private TransactionType type;

    @Builder.Default
    private boolean confirm = true;
}
