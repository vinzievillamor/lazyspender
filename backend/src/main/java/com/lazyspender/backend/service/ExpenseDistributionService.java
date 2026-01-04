package com.lazyspender.backend.service;

import java.time.Instant;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.CompletableFuture;

import org.springframework.stereotype.Service;

import com.google.cloud.Timestamp;
import com.google.cloud.datastore.AggregationQuery;
import com.google.cloud.datastore.AggregationResult;
import com.google.cloud.datastore.AggregationResults;
import com.google.cloud.datastore.Datastore;
import com.google.cloud.datastore.EntityQuery;
import com.google.cloud.datastore.Query;
import com.google.cloud.datastore.StructuredQuery.CompositeFilter;
import com.google.cloud.datastore.StructuredQuery.PropertyFilter;
import com.google.cloud.datastore.aggregation.Aggregation;
import com.lazyspender.backend.config.ExpenseConfigProperties;
import com.lazyspender.backend.dto.ExpenseDistributionItem;
import com.lazyspender.backend.dto.ExpenseDistributionResponse;
import com.lazyspender.backend.model.TransactionType;
import com.lazyspender.backend.model.TrendPeriod;
import com.lazyspender.backend.util.DateTimeUtils;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ExpenseDistributionService {

    private final Datastore datastore;
    private final ExpenseConfigProperties expenseConfig;

    private static final String KIND = "transactions";
    private static final String AMOUNT_ALIAS = "total_amount";

    public ExpenseDistributionResponse getExpenseDistribution(String owner, List<String> accounts, TrendPeriod period) {
        Instant endDate = DateTimeUtils.endOfTodayUtc();
        Instant startDate = calculateStartDate(period);

        Timestamp startTimestamp = Timestamp.ofTimeSecondsAndNanos(startDate.getEpochSecond(), startDate.getNano());
        Timestamp endTimestamp = Timestamp.ofTimeSecondsAndNanos(endDate.getEpochSecond(), endDate.getNano());

        // Run parallel SUM aggregation queries for each category
        List<CompletableFuture<ExpenseDistributionItem>> futures = expenseConfig.getExpenseCategories().stream()
                .map(category -> CompletableFuture.supplyAsync(() -> {
                    double sum = runSumAggregationQuery(owner, category, startTimestamp, endTimestamp);
                    return new ExpenseDistributionItem(category, sum, 0.0);
                }))
                .toList();

        // Wait for all queries and collect results
        List<ExpenseDistributionItem> items = futures.stream()
                .map(CompletableFuture::join)
                .filter(item -> item.getAmount() > 0)
                .toList();

        // Calculate total expense
        double totalExpense = items.stream()
                .mapToDouble(ExpenseDistributionItem::getAmount)
                .sum();

        // Build distribution with percentages, sorted by amount descending
        List<ExpenseDistributionItem> distribution = items.stream()
                .map(item -> ExpenseDistributionItem.builder()
                        .category(item.getCategory())
                        .amount(item.getAmount())
                        .percentage(totalExpense > 0 ? (item.getAmount() / totalExpense) * 100 : 0)
                        .build())
                .sorted(Comparator.comparingDouble(ExpenseDistributionItem::getAmount).reversed())
                .toList();

        return ExpenseDistributionResponse.builder()
                .totalExpense(totalExpense)
                .currency("PHP")
                .distribution(distribution)
                .build();
    }

    private double runSumAggregationQuery(String owner, String category, Timestamp startDate, Timestamp endDate) {
        // Build entity query with filters
        EntityQuery baseQuery = Query.newEntityQueryBuilder()
                .setKind(KIND)
                .setFilter(CompositeFilter.and(
                        PropertyFilter.eq("owner", owner),
                        PropertyFilter.eq("type", TransactionType.EXPENSE.name()),
                        PropertyFilter.eq("category", category),
                        PropertyFilter.ge("date", startDate),
                        PropertyFilter.le("date", endDate)
                ))
                .build();

        // Build aggregation query with SUM
        AggregationQuery aggregationQuery = Query.newAggregationQueryBuilder()
                .over(baseQuery)
                .addAggregation(Aggregation.sum("amount").as(AMOUNT_ALIAS))
                .build();

        // Run the aggregation query
        AggregationResults results = datastore.runAggregation(aggregationQuery);

        // Extract the sum value
        for (AggregationResult result : results) {
            if (result.get(AMOUNT_ALIAS) != null) {
                return result.getDouble(AMOUNT_ALIAS);
            }
        }

        return 0.0;
    }

    private Instant calculateStartDate(TrendPeriod period) {
        ZonedDateTime now = DateTimeUtils.toUtcZonedDateTime(DateTimeUtils.nowUtc());
        return switch (period) {
            case LAST_12_WEEKS -> now.minusWeeks(12).truncatedTo(ChronoUnit.DAYS).toInstant();
            case LAST_YEAR -> now.minusYears(1).truncatedTo(ChronoUnit.DAYS).toInstant();
            case FROM_START -> Instant.EPOCH;
        };
    }
}
