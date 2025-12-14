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
public class BalanceTrendResponse {
    private double totalBalance;
    private String currency;
    private List<BalanceTrendDataPoint> dataPoints;
    private YAxisConfig yAxisConfig;
}
