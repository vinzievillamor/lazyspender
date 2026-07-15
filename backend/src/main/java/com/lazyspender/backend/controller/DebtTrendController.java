package com.lazyspender.backend.controller;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.lazyspender.backend.dto.DebtTrendResponse;
import com.lazyspender.backend.model.DebtAggregation;
import com.lazyspender.backend.security.AuthContext;
import com.lazyspender.backend.service.DebtTrendService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/debt-trend")
@RequiredArgsConstructor
public class DebtTrendController {

    private final DebtTrendService debtTrendService;

    @GetMapping
    public ResponseEntity<DebtTrendResponse> getDebtTrend(
            @RequestParam(name = "from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(name = "to") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(name = "aggregate") DebtAggregation aggregate) {

        DebtTrendResponse response = debtTrendService.getDebtTrend(AuthContext.getOwner(), from, to, aggregate);
        return ResponseEntity.ok(response);
    }
}
