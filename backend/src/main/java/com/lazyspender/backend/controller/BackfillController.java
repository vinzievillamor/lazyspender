package com.lazyspender.backend.controller;

import java.security.Principal;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.lazyspender.backend.migration.BackfillPlannedPaymentsIdForTransaction;
import com.lazyspender.backend.migration.BackfillTransportationCategorySplit;
import com.lazyspender.backend.migration.BackfillUserAccountsMigration;

import lombok.AllArgsConstructor;

@RestController
@RequestMapping(path = "/api/backfill")
@AllArgsConstructor
public class BackfillController {

    private final BackfillPlannedPaymentsIdForTransaction backfillPlannedPaymentsIdForTransaction;
    private final BackfillUserAccountsMigration backfillUserAccountsMigration;
    private final BackfillTransportationCategorySplit backfillTransportationCategorySplit;

    @PostMapping(path = "/transaction-planned-payments")
    public ResponseEntity<Void> backfillTransactionPlannedPayments(Principal principal) {
        backfillPlannedPaymentsIdForTransaction.backfillPlannedPaymentId(principal.getName());
        return ResponseEntity.status(HttpStatus.OK).build();
    }

    @PostMapping(path = "/user-accounts")
    public ResponseEntity<Void> backfillUserAccounts(Principal principal) {
        backfillUserAccountsMigration.backfillAccounts(principal.getName());
        return ResponseEntity.status(HttpStatus.OK).build();
    }

    @PostMapping(path = "/transportation-category-split")
    public ResponseEntity<Void> backfillTransportationCategorySplit() {
        backfillTransportationCategorySplit.backfillTransactions();
        backfillTransportationCategorySplit.backfillPlannedPayments();
        return ResponseEntity.status(HttpStatus.OK).build();
    }

}