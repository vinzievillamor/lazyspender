package com.lazyspender.backend.migration;

import org.springframework.stereotype.Service;

import com.lazyspender.backend.mapper.TransactionMapper;
import com.lazyspender.backend.service.PlannedPaymentService;
import com.lazyspender.backend.service.TransactionService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class BackfillPlannedPaymentsIdForTransaction {

    private final TransactionService transactionService;
    private final TransactionMapper transactionMapper;
    private final PlannedPaymentService plannedPaymentService;

    public void backfillPlannedPaymentId(String owner) {
        log.info("Start backfill process for BackfillPlannedPaymentsIdForTransaction owner: {}", owner);
        final var plannedPayments = plannedPaymentService.getAllPlannedPayments(owner);
        plannedPayments.forEach(plannedPayment -> {
            String category = plannedPayment.getCategory();
            String note = plannedPayment.getNote();

            log.info("category: {}, note: {}", category, note);

            transactionService.getTransactionsByOwnerAndCategoryAndNote(owner, category, note)
                    .stream()
                    .map(transactionMapper::toEntity)
                    .forEach(transaction -> {
                        final var updatedTransaction = transaction.toBuilder()
                                .plannedPaymentId(plannedPayment.getId())
                                .build();
                        final var transactionReq = transactionMapper.toRequest(updatedTransaction);
                        transactionService.updateTransaction(updatedTransaction.getId(), transactionReq);
                    });
        });
    }

}
