package com.lazyspender.backend.service;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import com.lazyspender.backend.dto.BalanceTrendDataPoint;
import com.lazyspender.backend.dto.BalanceTrendResponse;
import com.lazyspender.backend.dto.YAxisConfig;
import com.lazyspender.backend.model.Transaction;
import com.lazyspender.backend.model.TransactionType;
import com.lazyspender.backend.model.TrendPeriod;
import com.lazyspender.backend.repository.TransactionRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class BalanceTrendService {

    private final TransactionRepository transactionRepository;

    public BalanceTrendResponse getBalanceTrend(String owner, List<String> accounts, TrendPeriod period) {
        // Calculate date range based on period
        Instant endDate = Instant.now();
        Instant startDate = calculateStartDate(period);

        // Fetch transactions using custom GQL query
        List<Transaction> allTransactions = transactionRepository
                .findByOwnerAndDateBetweenOrderByDateAsc(owner, startDate, endDate);

        // Filter by accounts (Datastore doesn't support IN predicate in derived queries)
        List<Transaction> transactions = allTransactions.stream()
                .filter(tx -> accounts == null || accounts.isEmpty() || accounts.contains(tx.getAccount()))
                .toList();

        // For FROM_START period, use the first transaction date as start date
        if (period == TrendPeriod.FROM_START && !transactions.isEmpty()) {
            startDate = transactions.get(0).getDate();
        }

        // Calculate opening balance (balance before the start date)
        // For FROM_START period, opening balance is 0 since we're starting from the first transaction
        double openingBalance = (period == TrendPeriod.FROM_START) ? 0 : calculateOpeningBalance(owner, accounts, startDate);

        // Calculate balance trend data points (aggregation based on period)
        List<BalanceTrendDataPoint> dataPoints = calculateDataPoints(transactions, startDate, endDate, period, openingBalance);

        // Calculate total balance
        double totalBalance = calculateTotalBalance(dataPoints);

        // Determine currency (from first transaction or default)
        String currency = transactions.isEmpty() ? "PHP" : transactions.get(0).getCurrency();

        // Calculate Y-axis configuration
        YAxisConfig yAxisConfig = calculateYAxisConfig(dataPoints);

        return BalanceTrendResponse.builder()
                .totalBalance(totalBalance)
                .currency(currency)
                .dataPoints(dataPoints)
                .yAxisConfig(yAxisConfig)
                .build();
    }

    private Instant calculateStartDate(TrendPeriod period) {
        ZonedDateTime now = ZonedDateTime.now();
        return switch (period) {
            case LAST_12_WEEKS -> now.minusWeeks(12).truncatedTo(ChronoUnit.DAYS).toInstant();
            case LAST_YEAR -> now.minusYears(1).truncatedTo(ChronoUnit.DAYS).toInstant();
            case FROM_START -> Instant.EPOCH;
        };
    }

    private double calculateOpeningBalance(String owner, List<String> accounts, Instant startDate) {
        // If accounts filter is specified, we need to fetch and filter manually
        // since Datastore doesn't support SUM with IN predicate
        if (accounts != null && !accounts.isEmpty()) {
            List<Transaction> previousTransactions = transactionRepository
                    .findByOwnerAndDateBetweenOrderByDateAsc(owner, Instant.EPOCH, startDate);

            // Filter by accounts and calculate balance
            double openingBalance = 0;
            for (Transaction tx : previousTransactions) {
                if (accounts.contains(tx.getAccount())) {
                    if (tx.getType() == TransactionType.INCOME) {
                        openingBalance += tx.getAmount();
                    } else {
                        openingBalance -= tx.getAmount();
                    }
                }
            }
            return openingBalance;
        }

        // Use aggregate SUM queries for better performance when no account filter
        Double totalIncome = transactionRepository.sumAmountByOwnerAndTypeAndDateBefore(owner, TransactionType.INCOME, startDate);
        Double totalExpense = transactionRepository.sumAmountByOwnerAndTypeAndDateBefore(owner, TransactionType.EXPENSE, startDate);

        // Handle null values (when no transactions exist)
        double income = (totalIncome != null) ? totalIncome : 0;
        double expense = (totalExpense != null) ? totalExpense : 0;

        return income - expense;
    }

    private List<BalanceTrendDataPoint> calculateDataPoints(List<Transaction> transactions, Instant startDate, Instant endDate, TrendPeriod period, double openingBalance) {
        List<BalanceTrendDataPoint> dataPoints = new ArrayList<>();

        if (transactions.isEmpty()) {
            // Return a single data point for today with the opening balance
            dataPoints.add(BalanceTrendDataPoint.builder()
                    .label(formatDate(Instant.now(), period))
                    .timestamp(Instant.now())
                    .balance(openingBalance)
                    .income(0)
                    .expense(0)
                    .build());
            return dataPoints;
        }

        // Group transactions based on period and calculate cumulative balance
        double cumulativeBalance = openingBalance;
        ZonedDateTime currentPeriodStart = getInitialPeriodStart(startDate, period);
        ZonedDateTime endDateTime = ZonedDateTime.ofInstant(endDate, ZoneId.systemDefault());

        int transactionIndex = 0;

        while (currentPeriodStart.isBefore(endDateTime)) {
            Instant periodStart = currentPeriodStart.toInstant();
            Instant periodEnd = getNextPeriodStart(currentPeriodStart, period).toInstant();

            double periodIncome = 0;
            double periodExpense = 0;

            // Process all transactions for this period
            while (transactionIndex < transactions.size()) {
                Transaction tx = transactions.get(transactionIndex);

                if (tx.getDate().isBefore(periodStart)) {
                    transactionIndex++;
                    continue;
                }

                if (tx.getDate().isBefore(periodEnd)) {
                    double amount = tx.getAmount();

                    if (tx.getType() == TransactionType.INCOME) {
                        cumulativeBalance += amount;
                        periodIncome += amount;
                    } else {
                        cumulativeBalance -= amount;
                        periodExpense += amount;
                    }

                    transactionIndex++;
                } else {
                    break;
                }
            }

            // Add data point for this period (only if there was activity or it's the first/last period)
            if (periodIncome > 0 || periodExpense > 0 ||
                currentPeriodStart.equals(getInitialPeriodStart(startDate, period)) ||
                !getNextPeriodStart(currentPeriodStart, period).isBefore(endDateTime)) {

                dataPoints.add(BalanceTrendDataPoint.builder()
                        .label(formatDate(periodStart, period))
                        .timestamp(periodStart)
                        .balance(cumulativeBalance)
                        .income(periodIncome)
                        .expense(periodExpense)
                        .build());
            }

            currentPeriodStart = getNextPeriodStart(currentPeriodStart, period);
        }

        return dataPoints;
    }

    private ZonedDateTime getInitialPeriodStart(Instant startDate, TrendPeriod period) {
        ZonedDateTime zdt = ZonedDateTime.ofInstant(startDate, ZoneId.systemDefault());

        return switch (period) {
            case FROM_START, LAST_YEAR -> zdt.withDayOfMonth(1).truncatedTo(ChronoUnit.DAYS);
            case LAST_12_WEEKS -> {
                // Align to start of week (Monday)
                yield zdt.with(java.time.DayOfWeek.MONDAY).truncatedTo(ChronoUnit.DAYS);
            }
        };
    }

    private ZonedDateTime getNextPeriodStart(ZonedDateTime currentPeriodStart, TrendPeriod period) {
        return switch (period) {
            case FROM_START, LAST_YEAR -> currentPeriodStart.plusMonths(1);
            case LAST_12_WEEKS -> currentPeriodStart.plusWeeks(1);
        };
    }

    private String formatDate(Instant instant, TrendPeriod period) {
        ZonedDateTime zdt = instant.atZone(ZoneId.systemDefault());
        DateTimeFormatter formatter = switch (period) {
            case FROM_START, LAST_YEAR -> DateTimeFormatter.ofPattern("MMM yyyy");
            case LAST_12_WEEKS -> DateTimeFormatter.ofPattern("MMM d");
        };
        return zdt.format(formatter);
    }

    private double calculateTotalBalance(List<BalanceTrendDataPoint> dataPoints) {
        if (dataPoints.isEmpty()) {
            return 0;
        }
        // Return the last data point's balance (cumulative)
        return dataPoints.get(dataPoints.size() - 1).getBalance();
    }

    private YAxisConfig calculateYAxisConfig(List<BalanceTrendDataPoint> dataPoints) {
        if (dataPoints.isEmpty()) {
            return YAxisConfig.builder()
                    .minValue(0)
                    .maxValue(100000)
                    .interval(20000)
                    .build();
        }

        // Find max balance value
        double maxBalance = dataPoints.stream()
                .mapToDouble(BalanceTrendDataPoint::getBalance)
                .max()
                .orElse(0);

        // Round up to next hundred thousand
        double maxValue = Math.ceil(maxBalance / 100000.0) * 100000.0;

        // If maxValue is 0 or too small, set a minimum
        if (maxValue < 100000) {
            maxValue = 100000;
        }

        double interval = maxValue / 5;

        return YAxisConfig.builder()
                .minValue(0)
                .maxValue(maxValue)
                .interval(interval)
                .build();
    }
}
