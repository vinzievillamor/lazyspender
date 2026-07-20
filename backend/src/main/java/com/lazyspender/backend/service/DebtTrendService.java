package com.lazyspender.backend.service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.lazyspender.backend.dto.DebtCategoryAmount;
import com.lazyspender.backend.dto.DebtTrendDataPoint;
import com.lazyspender.backend.dto.DebtTrendResponse;
import com.lazyspender.backend.dto.YAxisConfig;
import com.lazyspender.backend.model.DebtAggregation;
import com.lazyspender.backend.model.EndType;
import com.lazyspender.backend.model.PaymentStatus;
import com.lazyspender.backend.model.PlannedPayment;
import com.lazyspender.backend.model.Transaction;
import com.lazyspender.backend.repository.PlannedPaymentRepository;
import com.lazyspender.backend.repository.TransactionRepository;
import com.lazyspender.backend.util.DateTimeUtils;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DebtTrendService {

    private static final long MAX_RANGE_DAYS = 3653; // ~10 years

    private final PlannedPaymentRepository plannedPaymentRepository;
    private final TransactionRepository transactionRepository;

    public DebtTrendResponse getDebtTrend(String owner, LocalDate from, LocalDate to, DebtAggregation aggregate) {
        validateRange(from, to);

        Instant rangeStart = DateTimeUtils.toInstantStartOfDay(from);
        Instant rangeEnd = to.atTime(LocalTime.MAX).atZone(DateTimeUtils.getUtcZoneId()).toInstant();

        List<PlannedPayment> plannedPayments = plannedPaymentRepository.findByOwner(owner).stream()
                .filter(payment -> payment.getStatus() != PaymentStatus.CANCELLED)
                .toList();

        // Fetch once and group in-memory (Datastore has no per-plannedPaymentId aggregate query)
        List<Transaction> transactions = transactionRepository
                .findByOwnerAndDateBetweenOrderByDateAsc(owner, Instant.EPOCH, rangeEnd);

        Map<String, List<Instant>> confirmedDatesByPlannedPaymentId = new HashMap<>();
        for (Transaction transaction : transactions) {
            if (transaction.getPlannedPaymentId() != null) {
                confirmedDatesByPlannedPaymentId
                        .computeIfAbsent(transaction.getPlannedPaymentId(), key -> new ArrayList<>())
                        .add(transaction.getDate());
            }
        }

        List<DebtTrendDataPoint> dataPoints = buildDataPoints(plannedPayments, confirmedDatesByPlannedPaymentId,
                rangeStart, rangeEnd, aggregate);

        double totalDebt = dataPoints.isEmpty() ? 0 : dataPoints.get(dataPoints.size() - 1).totalDebt();
        String currency = plannedPayments.isEmpty() ? "PHP" : plannedPayments.get(0).getCurrency();
        YAxisConfig yAxisConfig = calculateYAxisConfig(dataPoints);

        return new DebtTrendResponse(totalDebt, currency, dataPoints, yAxisConfig);
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "from and to are required");
        }
        if (from.isAfter(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "from must not be after to");
        }
        if (ChronoUnit.DAYS.between(from, to) > MAX_RANGE_DAYS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "date range must not exceed 10 years");
        }
    }

    private List<DebtTrendDataPoint> buildDataPoints(List<PlannedPayment> plannedPayments,
            Map<String, List<Instant>> confirmedDatesByPlannedPaymentId, Instant rangeStart, Instant rangeEnd,
            DebtAggregation aggregate) {

        List<DebtTrendDataPoint> dataPoints = new ArrayList<>();

        ZonedDateTime bucketStart = getInitialBucketStart(rangeStart, aggregate);
        ZonedDateTime rangeEndDateTime = DateTimeUtils.toUtcZonedDateTime(rangeEnd);

        while (bucketStart.isBefore(rangeEndDateTime)) {
            ZonedDateTime nextBucketStart = getNextBucketStart(bucketStart, aggregate);
            Instant bucketEndExclusive = nextBucketStart.toInstant();

            Map<String, Double> amountByLabel = new HashMap<>();
            // First category seen for a label wins; in practice a note uniquely
            // identifies one debt, so this only matters if two payments happen to
            // share identical note text.
            Map<String, String> categoryByLabel = new HashMap<>();
            for (PlannedPayment payment : plannedPayments) {
                double amount = calculateOutstandingAmount(payment, confirmedDatesByPlannedPaymentId, bucketEndExclusive);
                if (amount > 0) {
                    String label = debtLabel(payment);
                    amountByLabel.merge(label, amount, Double::sum);
                    categoryByLabel.putIfAbsent(label, payment.getCategory());
                }
            }

            List<DebtCategoryAmount> categories = amountByLabel.entrySet().stream()
                    .map(entry -> new DebtCategoryAmount(entry.getKey(), entry.getValue(),
                            categoryByLabel.get(entry.getKey())))
                    .toList();

            double totalDebt = categories.stream().mapToDouble(DebtCategoryAmount::amount).sum();

            dataPoints.add(new DebtTrendDataPoint(formatLabel(bucketStart, aggregate), bucketStart.toInstant(),
                    totalDebt, categories));

            bucketStart = nextBucketStart;
        }

        return dataPoints;
    }

    /**
     * Debts are broken down per payment note (e.g. "Car loan"), since the note
     * identifies the individual debt; category is only a fallback for payments
     * saved without a note. The DebtCategoryAmount.category field carries this
     * label on the wire.
     */
    private String debtLabel(PlannedPayment payment) {
        String note = payment.getNote();
        return (note != null && !note.isBlank()) ? note : payment.getCategory();
    }

    /**
     * Outstanding amount for a payment as of a bucket's (exclusive) end instant.
     * OCCURRENCE payments shrink toward zero as linked transactions are confirmed;
     * NEVER payments contribute a flat recurring amount since they have no finite payoff.
     */
    private double calculateOutstandingAmount(PlannedPayment payment,
            Map<String, List<Instant>> confirmedDatesByPlannedPaymentId, Instant bucketEndExclusive) {

        if (!payment.getStartDate().isBefore(bucketEndExclusive)) {
            return 0;
        }

        if (payment.getEndType() == EndType.NEVER) {
            return payment.getAmount();
        }

        if (payment.getEndType() == EndType.OCCURRENCE) {
            int totalOccurrences = Integer.parseInt(payment.getEndValue());
            List<Instant> confirmedDates = confirmedDatesByPlannedPaymentId.getOrDefault(payment.getId(), List.of());
            long confirmedCount = confirmedDates.stream()
                    .filter(date -> date.isBefore(bucketEndExclusive))
                    .count();
            long remainingOccurrences = Math.max(0, totalOccurrences - confirmedCount);
            return remainingOccurrences * payment.getAmount();
        }

        // EndType.DATE is rejected by PlannedPaymentService.validateRequest today; no production data reaches here.
        return payment.getAmount();
    }

    private ZonedDateTime getInitialBucketStart(Instant rangeStart, DebtAggregation aggregate) {
        ZonedDateTime zdt = DateTimeUtils.toUtcZonedDateTime(rangeStart);
        return switch (aggregate) {
            case MONTHLY -> zdt.withDayOfMonth(1).truncatedTo(ChronoUnit.DAYS);
            case YEARLY -> zdt.withDayOfYear(1).truncatedTo(ChronoUnit.DAYS);
        };
    }

    private ZonedDateTime getNextBucketStart(ZonedDateTime bucketStart, DebtAggregation aggregate) {
        return switch (aggregate) {
            case MONTHLY -> bucketStart.plusMonths(1);
            case YEARLY -> bucketStart.plusYears(1);
        };
    }

    private String formatLabel(ZonedDateTime bucketStart, DebtAggregation aggregate) {
        DateTimeFormatter formatter = switch (aggregate) {
            case MONTHLY -> DateTimeFormatter.ofPattern("MMM yyyy");
            case YEARLY -> DateTimeFormatter.ofPattern("yyyy");
        };
        return bucketStart.format(formatter);
    }

    private YAxisConfig calculateYAxisConfig(List<DebtTrendDataPoint> dataPoints) {
        double maxDebt = dataPoints.stream()
                .mapToDouble(DebtTrendDataPoint::totalDebt)
                .max()
                .orElse(0);

        double maxValue = Math.ceil(maxDebt / 100000.0) * 100000.0;
        if (maxValue < 100000) {
            maxValue = 100000;
        }

        return YAxisConfig.builder()
                .minValue(0)
                .maxValue(maxValue)
                .interval(maxValue / 5)
                .build();
    }
}
