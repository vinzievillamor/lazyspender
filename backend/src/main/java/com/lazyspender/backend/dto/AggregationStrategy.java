package com.lazyspender.backend.dto;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.ToString;

@RequiredArgsConstructor
@Getter
@ToString
public enum AggregationStrategy {

    MONTHLY("monthly"),
    YEARLY("yearly");

    private final String value;
}
