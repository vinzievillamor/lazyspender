package com.lazyspender.backend.controller;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.lazyspender.backend.dto.ContributorsResponse;
import com.lazyspender.backend.dto.ExpenseDistributionResponse;
import com.lazyspender.backend.model.TrendPeriod;
import com.lazyspender.backend.service.ExpenseDistributionService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/expense-distribution")
@RequiredArgsConstructor
public class ExpenseDistributionController {

    private final ExpenseDistributionService expenseDistributionService;

    @GetMapping
    public ResponseEntity<ExpenseDistributionResponse> getExpenseDistribution(
            Principal principal,
            @RequestParam(name = "accounts", required = false) List<String> accounts,
            @RequestParam(name = "period") TrendPeriod period) {

        ExpenseDistributionResponse response =
                expenseDistributionService.getExpenseDistribution(principal.getName(), accounts, period);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/contributors")
    public ResponseEntity<ContributorsResponse> getMethodName(
        Principal principal,
        @RequestParam(name = "category") String category,
        @RequestParam(name = "period") TrendPeriod period
    ) {
        final var response = expenseDistributionService.getTopContributors(
                principal.getName(), URLDecoder.decode(category, StandardCharsets.UTF_8), period);
        return ResponseEntity.ok(response);
    }
    
}
