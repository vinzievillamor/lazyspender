package com.lazyspender.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExpenseDistributionResponse {
    private double totalExpense;
    private String currency;
    private List<ExpenseDistributionItem> distribution;
}
