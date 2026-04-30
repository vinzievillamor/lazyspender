package com.lazyspender.backend.controller;

import java.time.Instant;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.lazyspender.backend.dto.AggregationStrategy;
import com.lazyspender.backend.dto.GetDebtTrendQuery;
import com.lazyspender.backend.dto.GetDebtTrendResponse;
import com.lazyspender.backend.service.DebtTrendService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping(path = "/api/debt-trend")
@RequiredArgsConstructor
@Slf4j
public class DebtTrendController {

    private final DebtTrendService debtTrendService;

    @GetMapping
    public ResponseEntity<GetDebtTrendResponse> getDebtTrend(
            @RequestParam final Instant from,
            @RequestParam final Instant to,
            @RequestParam final AggregationStrategy aggregationStrategy,
            @RequestHeader final String owner) {
        final var debtTrendQuery = GetDebtTrendQuery.builder()
                .aggregationStrategy(aggregationStrategy)
                .from(from)
                .to(to)
                .owner(owner)
                .build();
        final var debtTrendResult = debtTrendService.getDebtTrend(debtTrendQuery);
        final var response = GetDebtTrendResponse.builder().debtSummaries(debtTrendResult.debtSummaries()).build();
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }
}
