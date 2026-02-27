package com.lazyspender.backend.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.lazyspender.backend.dto.PlannedPaymentRequest;
import com.lazyspender.backend.dto.PlannedPaymentResponse;
import com.lazyspender.backend.dto.TransactionRequest;
import com.lazyspender.backend.dto.TransactionResponse;
import com.lazyspender.backend.mapper.PlannedPaymentMapper;
import com.lazyspender.backend.mapper.TransactionMapper;
import com.lazyspender.backend.model.ConfirmationType;
import com.lazyspender.backend.model.EndType;
import com.lazyspender.backend.model.PaymentStatus;
import com.lazyspender.backend.model.PlannedPayment;
import com.lazyspender.backend.model.RecurrenceType;
import com.lazyspender.backend.model.TransactionType;
import com.lazyspender.backend.repository.PlannedPaymentRepository;
import com.lazyspender.backend.repository.TransactionRepository;
import com.lazyspender.backend.util.DateTimeUtils;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PlannedPaymentService {

    private final PlannedPaymentRepository plannedPaymentRepository;
    private final PlannedPaymentMapper plannedPaymentMapper;
    private final TransactionRepository transactionRepository;
    private final TransactionService transactionService;
    private final TransactionMapper transactionMapper;
    private final RecurrenceCalculator recurrenceCalculator;

    /**
     * Create a new planned payment
     */
    public PlannedPaymentResponse createPlannedPayment(PlannedPaymentRequest request) {
        validateRequest(request);

        PlannedPayment plannedPayment = plannedPaymentMapper.toEntity(request);
        plannedPayment.setId(UUID.randomUUID().toString());
        plannedPayment.setStatus(PaymentStatus.ACTIVE);
        plannedPayment.setNextDueDate(request.getStartDate());

        PlannedPayment saved = plannedPaymentRepository.save(plannedPayment);
        return plannedPaymentMapper.toResponse(saved);
    }

    /**
     * Get a planned payment by ID
     */
    public PlannedPaymentResponse getPlannedPaymentById(String id) {
        PlannedPayment plannedPayment = findPlannedPaymentOrThrow(id);
        return plannedPaymentMapper.toResponse(plannedPayment);
    }

    /**
     * Get all planned payments for an owner
     */
    public List<PlannedPaymentResponse> getAllPlannedPayments(String owner) {
        return plannedPaymentRepository.findByOwner(owner).stream()
                .map(plannedPaymentMapper::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get planned payments by owner and status
     */
    public List<PlannedPaymentResponse> getPlannedPaymentsByStatus(String owner, PaymentStatus status) {
        return plannedPaymentRepository.findByOwnerAndStatus(owner, status).stream()
                .map(plannedPaymentMapper::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Update a planned payment
     */
    public PlannedPaymentResponse updatePlannedPayment(String id, PlannedPaymentRequest request) {
        validateRequest(request);

        PlannedPayment plannedPayment = findPlannedPaymentOrThrow(id);
        plannedPaymentMapper.updateEntityFromRequest(request, plannedPayment);

        PlannedPayment updated = plannedPaymentRepository.save(plannedPayment);
        return plannedPaymentMapper.toResponse(updated);
    }

    /**
     * Delete a planned payment
     */
    public void deletePlannedPayment(String id) {
        if (!plannedPaymentRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Planned payment not found with id: " + id);
        }
        plannedPaymentRepository.deleteById(id);
    }

    /**
     * Confirm a planned payment - creates a transaction and advances the due date
     */
    public TransactionResponse confirmPlannedPayment(String plannedPaymentId) {
        PlannedPayment plannedPayment = findPlannedPaymentOrThrow(plannedPaymentId);

        if (plannedPayment.getStatus() != PaymentStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot confirm inactive planned payment");
        }

        // Create transaction from planned payment
        TransactionRequest txRequest = TransactionRequest.builder()
                .owner(plannedPayment.getOwner())
                .account(plannedPayment.getAccount())
                .category(plannedPayment.getCategory())
                .amount(plannedPayment.getAmount())
                .note(plannedPayment.getNote())
                .date(plannedPayment.getNextDueDate())
                .currency(plannedPayment.getCurrency())
                .refCurrencyAmount(plannedPayment.getAmount())
                .plannedPaymentId(plannedPaymentId)
                .type(TransactionType.EXPENSE)
                .build();

        TransactionResponse transaction = transactionService.createTransaction(txRequest);

        // Calculate next due date
        Instant nextDueDate = recurrenceCalculator.calculateNextDueDate(plannedPayment, plannedPayment.getNextDueDate());
        plannedPayment.setNextDueDate(nextDueDate);

        // Check if should be completed (count transactions linked to this planned payment)
        int completedCount = transactionRepository.countByPlannedPaymentId(plannedPaymentId);
        if (recurrenceCalculator.shouldComplete(plannedPayment, completedCount)) {
            plannedPayment.setStatus(PaymentStatus.COMPLETED);
        }

        plannedPaymentRepository.save(plannedPayment);
        return transaction;
    }

    /**
     * Get all transactions linked to a planned payment
     */
    public List<TransactionResponse> getTransactionsForPlannedPayment(String plannedPaymentId) {
        if (!plannedPaymentRepository.existsById(plannedPaymentId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Planned payment not found with id: " + plannedPaymentId);
        }

        return transactionRepository.findByPlannedPaymentId(plannedPaymentId).stream()
                .map(transactionMapper::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Auto-confirm all due payments with AUTO confirmation type
     */
    public List<TransactionResponse> autoConfirmDuePayments() {
        Instant now = DateTimeUtils.nowUtc();

        List<PlannedPayment> duePayments = plannedPaymentRepository
                .findByStatusAndConfirmationTypeAndNextDueDateLessThanEqual(
                        PaymentStatus.ACTIVE,
                        ConfirmationType.AUTO,
                        now);

        return duePayments.stream()
                .map(payment -> confirmPlannedPayment(payment.getId()))
                .collect(Collectors.toList());
    }

    /**
     * Validate the planned payment request
     */
    private void validateRequest(PlannedPaymentRequest request) {
        // Validate recurrence type - only MONTHLY is supported
        if (request.getRecurrenceType() != RecurrenceType.MONTHLY) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only MONTHLY recurrence type is supported");
        }

        // Validate end type - only OCCURRENCE and NEVER are supported
        if (request.getEndType() == EndType.DATE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "EndType.DATE is not supported. Use OCCURRENCE or NEVER");
        }

        // Validate endValue is provided for OCCURRENCE type
        if (request.getEndType() == EndType.OCCURRENCE &&
            (request.getEndValue() == null || request.getEndValue().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "endValue is required when endType is OCCURRENCE");
        }
    }

    /**
     * Find a planned payment by ID or throw NOT_FOUND exception
     */
    private PlannedPayment findPlannedPaymentOrThrow(String id) {
        return plannedPaymentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Planned payment not found with id: " + id));
    }
}
