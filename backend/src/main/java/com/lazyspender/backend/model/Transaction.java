package com.lazyspender.backend.model;

import java.time.Instant;

import org.springframework.data.annotation.Id;

import com.google.cloud.spring.data.datastore.core.mapping.Entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Entity(name = "transactions")
@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Transaction {

    @Id
    private String id;

    private String owner;

    private String account;

    @EqualsAndHashCode.Include
    private String category;

    @EqualsAndHashCode.Include
    private double amount;

    @EqualsAndHashCode.Include
    private String note;

    @EqualsAndHashCode.Include
    private Instant date;

    @EqualsAndHashCode.Include
    private String currency;

    private double refCurrencyAmount;

    private String plannedPaymentId;

    private TransactionType type;

    @Builder.Default
    private boolean confirm = true;
}
