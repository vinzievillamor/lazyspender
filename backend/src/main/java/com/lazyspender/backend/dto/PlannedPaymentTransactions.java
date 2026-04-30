package com.lazyspender.backend.dto;

import java.util.List;

import com.lazyspender.backend.model.Transaction;

import lombok.Builder;

@Builder
public record PlannedPaymentTransactions(PlannedPaymentResponse plannedPayment, List<Transaction> transactions) {

}
