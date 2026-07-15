package com.lazyspender.backend.dto;

import java.time.Instant;
import java.util.List;

public record DebtTrendDataPoint(String label, Instant timestamp, double totalDebt, List<DebtCategoryAmount> categories) {
}
