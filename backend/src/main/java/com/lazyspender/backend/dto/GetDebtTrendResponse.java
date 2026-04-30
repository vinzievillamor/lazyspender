package com.lazyspender.backend.dto;

import java.util.List;

import lombok.Builder;

@Builder
public record GetDebtTrendResponse(List<DebtSummary> debtSummaries) {

}
