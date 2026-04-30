package com.lazyspender.backend.service;

import java.time.Year;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.temporal.Temporal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map.Entry;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import com.lazyspender.backend.dto.AggregationStrategy;
import com.lazyspender.backend.dto.Debt;
import com.lazyspender.backend.dto.DebtSummary;
import com.lazyspender.backend.dto.GetDebtTrendQuery;
import com.lazyspender.backend.dto.GetDebtTrendResult;
import com.lazyspender.backend.dto.PlannedPaymentResponse;
import com.lazyspender.backend.model.Transaction;
import com.lazyspender.backend.repository.TransactionRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DebtTrendService {

    private final PlannedPaymentService plannedPaymentService;
    private final TransactionRepository transactionRepository;

    public GetDebtTrendResult getDebtTrend(GetDebtTrendQuery query) {
        final var plannedPayments = plannedPaymentService.getAllPlannedPayments(query.owner());
        final var fetchTransaction = buildTransactionFetcher(query);
        final var debtSummaries = plannedPayments.parallelStream()
                .map(fetchTransaction)
                .flatMap(transactions -> transactions.stream().map(t -> getDebt(t, query.aggregationStrategy())))
                .collect(Collectors.groupingBy(Debt::period))
                .entrySet()
                .stream()
                .map(this::toDebtSummary)
                .toList();
        return GetDebtTrendResult.builder()
                .debtSummaries(debtSummaries)
                .build();
    }

    private DebtSummary toDebtSummary(Entry<Temporal, List<Debt>> entry) {
        final var totalAmount = entry.getValue()
                .stream()
                .mapToDouble(Debt::amount)
                .sum();
        return DebtSummary.builder()
                .debts(entry.getValue())
                .totalAmount(totalAmount)
                .period(entry.getKey())
                .build();
    }

    private Function<PlannedPaymentResponse, ArrayList<Transaction>> buildTransactionFetcher(
            GetDebtTrendQuery query) {
        return plannedPayment -> {
            final var page = PageRequest.ofSize(256);
            final var transactions = new ArrayList<Transaction>();
            var transactionsSlice = transactionRepository.findAllByPlannedPaymentIdAndWithinDateRange(
                    plannedPayment.getId(),
                    query.from(),
                    query.to(),
                    page);
            transactions.addAll(transactionsSlice.getContent());
            while (transactionsSlice.hasNext()) {
                transactionsSlice = transactionRepository.findAllByPlannedPaymentIdAndWithinDateRange(
                        plannedPayment.getId(),
                        query.from(),
                        query.to(),
                        transactionsSlice.getPageable().next());
                transactions.addAll(transactionsSlice.getContent());
            }
            return transactions;
        };
    }

    public Debt getDebt(Transaction transaction, AggregationStrategy aggregationStrategy) {
        final var period = switch (aggregationStrategy) {
            case AggregationStrategy.MONTHLY -> YearMonth.from(transaction.getDate().atZone(ZoneId.systemDefault()));
            case AggregationStrategy.YEARLY -> Year.from(transaction.getDate().atZone(ZoneId.systemDefault()));
            default -> throw new RuntimeException();
        };
        return Debt.builder()
                .amount(transaction.getAmount())
                .category(transaction.getCategory())
                .currency(transaction.getCurrency())
                .date(transaction.getDate())
                .note(transaction.getNote())
                .period(period)
                .build();
    }
}
