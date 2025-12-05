package com.lazyspender.backend.model;

import com.google.cloud.spring.data.datastore.core.mapping.Entity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;

import java.time.Instant;

@Entity(name = "transactions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Transaction {

    @Id
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
