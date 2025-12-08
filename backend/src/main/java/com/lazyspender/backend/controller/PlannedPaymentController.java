package com.lazyspender.backend.controller;

import com.lazyspender.backend.dto.PlannedPaymentRequest;
import com.lazyspender.backend.dto.PlannedPaymentResponse;
import com.lazyspender.backend.model.PaymentStatus;
import com.lazyspender.backend.service.PlannedPaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/planned-payments")
@RequiredArgsConstructor
public class PlannedPaymentController {

    private final PlannedPaymentService plannedPaymentService;

    @PostMapping
    public ResponseEntity<PlannedPaymentResponse> createPlannedPayment(@Valid @RequestBody PlannedPaymentRequest request) {
        PlannedPaymentResponse response = plannedPaymentService.createPlannedPayment(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PlannedPaymentResponse> getPlannedPaymentById(@PathVariable(name = "id") String id) {
        PlannedPaymentResponse response = plannedPaymentService.getPlannedPaymentById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<PlannedPaymentResponse>> getPlannedPayments(
            @RequestParam(name = "owner") String owner,
            @RequestParam(name = "status", required = false) PaymentStatus status) {
        List<PlannedPaymentResponse> response;
        if (status != null) {
            response = plannedPaymentService.getPlannedPaymentsByStatus(owner, status);
        } else {
            response = plannedPaymentService.getAllPlannedPayments(owner);
        }
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PlannedPaymentResponse> updatePlannedPayment(
            @PathVariable(name = "id") String id,
            @Valid @RequestBody PlannedPaymentRequest request) {
        PlannedPaymentResponse response = plannedPaymentService.updatePlannedPayment(id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePlannedPayment(@PathVariable(name = "id") String id) {
        plannedPaymentService.deletePlannedPayment(id);
        return ResponseEntity.noContent().build();
    }
}
