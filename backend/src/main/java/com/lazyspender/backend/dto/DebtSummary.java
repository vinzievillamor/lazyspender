package com.lazyspender.backend.dto;

import java.time.temporal.Temporal;
import java.util.List;

import lombok.Builder;

@Builder
public record DebtSummary(double totalAmount, Temporal period, List<Debt> debts) {

}
