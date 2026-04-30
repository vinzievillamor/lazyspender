package com.lazyspender.backend.dto;

import java.time.Instant;

import lombok.Builder;

@Builder(toBuilder = true)
public record GetDebtTrendQuery(String owner, 
                                Instant from, 
                                Instant to, 
                                AggregationStrategy aggregationStrategy) {

}
