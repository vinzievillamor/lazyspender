package com.lazyspender.backend.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.lazyspender.backend.dto.PlannedPaymentRequest;
import com.lazyspender.backend.dto.PlannedPaymentResponse;
import com.lazyspender.backend.dto.TransactionRequest;
import com.lazyspender.backend.dto.TransactionResponse;
import com.lazyspender.backend.mapper.PlannedPaymentMapper;
import com.lazyspender.backend.model.ConfirmationType;
import com.lazyspender.backend.model.PaymentStatus;
import com.lazyspender.backend.model.PlannedPayment;
import com.lazyspender.backend.repository.PlannedPaymentRepository;
import com.lazyspender.backend.repository.TransactionRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PlannedPaymentService {

    private final PlannedPaymentRepository plannedPaymentRepository;
    private final PlannedPaymentMapper plannedPaymentMapper;
    private final TransactionRepository transactionRepository;
    private final TransactionService transactionService;
    private final RecurrenceCalculator recurrenceCalculator;

    public PlannedPaymentResponse createPlannedPayment(PlannedPaymentRequest request) {
        PlannedPayment plannedPayment = plannedPaymentMapper.toEntity(request);

        // Generate UUID for new planned payment
        plannedPayment.setId(UUID.randomUUID().toString());

        // Initialize status tracking fields
        plannedPayment.setStatus(PaymentStatus.ACTIVE);
        plannedPayment.setNextDueDate(request.getStartDate());

        PlannedPayment savedPlannedPayment = plannedPaymentRepository.save(plannedPayment);
        return plannedPaymentMapper.toResponse(savedPlannedPayment);
    }

    public PlannedPaymentResponse getPlannedPaymentById(String id) {
        PlannedPayment plannedPayment = plannedPaymentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Planned payment not found with id: " + id));
        return plannedPaymentMapper.toResponse(plannedPayment);
    }

    public List<PlannedPaymentResponse> getAllPlannedPayments(String owner) {
        List<PlannedPayment> plannedPayments = plannedPaymentRepository.findByOwner(owner);
        return plannedPayments.stream()
                .map(plannedPaymentMapper::toResponse)
                .collect(Collectors.toList());
    }

    public List<PlannedPaymentResponse> getPlannedPaymentsByStatus(String owner, PaymentStatus status) {
        List<PlannedPayment> plannedPayments = plannedPaymentRepository.findByOwnerAndStatus(owner, status);
        return plannedPayments.stream()
                .map(plannedPaymentMapper::toResponse)
                .collect(Collectors.toList());
    }

    public PlannedPaymentResponse updatePlannedPayment(String id, PlannedPaymentRequest request) {
        PlannedPayment plannedPayment = plannedPaymentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Planned payment not found with id: " + id));

        plannedPaymentMapper.updateEntityFromRequest(request, plannedPayment);
        PlannedPayment updatedPlannedPayment = plannedPaymentRepository.save(plannedPayment);
        return plannedPaymentMapper.toResponse(updatedPlannedPayment);
    }

    public void deletePlannedPayment(String id) {
        if (!plannedPaymentRepository.existsById(id)) {
            throw new RuntimeException("Planned payment not found with id: " + id);
        }
        plannedPaymentRepository.deleteById(id);
    }

    public TransactionResponse confirmPlannedPayment(String plannedPaymentId) {
        PlannedPayment plannedPayment = plannedPaymentRepository.findById(plannedPaymentId)
                .orElseThrow(() -> new RuntimeException("Planned payment not found with id: " + plannedPaymentId));

        // Create transaction from planned payment data
        TransactionRequest transactionRequest = TransactionRequest.builder()
                .owner(plannedPayment.getOwner())
                .account(plannedPayment.getAccount())
                .category(plannedPayment.getCategory())
                .amount(plannedPayment.getAmount())
                .note(plannedPayment.getDescription())
                .date(plannedPayment.getNextDueDate())
                .currency(plannedPayment.getCurrency())
                .refCurrencyAmount(plannedPayment.getAmount())
                .plannedPaymentId(plannedPaymentId)
                .build();

        TransactionResponse transaction = transactionService.createTransaction(transactionRequest);

        // Calculate next due date
        Instant nextDueDate = recurrenceCalculator.calculateNextDueDate(plannedPayment, plannedPayment.getNextDueDate());
        plannedPayment.setNextDueDate(nextDueDate);

        // Check if planned payment should be completed using COUNT aggregation
        int completedCount = transactionRepository.countByPlannedPaymentId(plannedPaymentId);
        if (recurrenceCalculator.shouldComplete(plannedPayment, completedCount)) {
            plannedPayment.setStatus(PaymentStatus.COMPLETED);
        }

        plannedPaymentRepository.save(plannedPayment);

        return transaction;
    }

    public List<TransactionResponse> autoConfirmDuePayments() {
        Instant now = Instant.now();

        // Find all active planned payments with AUTO confirmation that are due
        List<PlannedPayment> duePayments = plannedPaymentRepository
                .findByStatusAndConfirmationTypeAndNextDueDateLessThanEqual(
                        PaymentStatus.ACTIVE,
                        ConfirmationType.AUTO,
                        now
                );

        return duePayments.stream()
                .map(payment -> confirmPlannedPayment(payment.getId()))
                .collect(Collectors.toList());
    }
}
