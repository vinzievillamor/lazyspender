package com.lazyspender.backend.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.lazyspender.backend.dto.BalanceTrendResponse;
import com.lazyspender.backend.model.TrendPeriod;
import com.lazyspender.backend.security.AuthContext;
import com.lazyspender.backend.service.BalanceTrendService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/balance-trend")
@RequiredArgsConstructor
public class BalanceTrendController {

    private final BalanceTrendService balanceTrendService;

    @GetMapping
    public ResponseEntity<BalanceTrendResponse> getBalanceTrend(
            @RequestParam(name = "accounts", required = false) List<String> accounts,
            @RequestParam(name = "period") TrendPeriod period) {

        BalanceTrendResponse response = balanceTrendService.getBalanceTrend(AuthContext.getOwner(), accounts, period);
        return ResponseEntity.ok(response);
    }
}
