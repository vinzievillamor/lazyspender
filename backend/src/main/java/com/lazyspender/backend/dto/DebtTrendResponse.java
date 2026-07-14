package com.lazyspender.backend.dto;

import java.util.List;

public record DebtTrendResponse(double totalDebt, String currency, List<DebtTrendDataPoint> dataPoints,
        YAxisConfig yAxisConfig) {
}
