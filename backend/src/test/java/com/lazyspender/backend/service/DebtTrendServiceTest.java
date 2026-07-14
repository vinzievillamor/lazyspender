package com.lazyspender.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.lazyspender.backend.dto.DebtCategoryAmount;
import com.lazyspender.backend.dto.DebtTrendDataPoint;
import com.lazyspender.backend.dto.DebtTrendResponse;
import com.lazyspender.backend.model.DebtAggregation;
import com.lazyspender.backend.model.EndType;
import com.lazyspender.backend.model.PaymentStatus;
import com.lazyspender.backend.model.PlannedPayment;
import com.lazyspender.backend.model.Transaction;
import com.lazyspender.backend.repository.PlannedPaymentRepository;
import com.lazyspender.backend.repository.TransactionRepository;
import com.lazyspender.backend.util.DateTimeUtils;

@ExtendWith(MockitoExtension.class)
class DebtTrendServiceTest {

    private static final String OWNER = "test-owner";

    @Mock
    private PlannedPaymentRepository plannedPaymentRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @InjectMocks
    private DebtTrendService debtTrendService;

    // === Validation ===

    @Test
    void throwsBadRequestWhenFromIsNull() {
        ResponseStatusException exception = catchThrowableOfType(
                () -> debtTrendService.getDebtTrend(OWNER, null, LocalDate.of(2026, 1, 31), DebtAggregation.MONTHLY),
                ResponseStatusException.class);

        assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(exception.getReason()).isEqualTo("from and to are required");
    }

    @Test
    void throwsBadRequestWhenToIsNull() {
        ResponseStatusException exception = catchThrowableOfType(
                () -> debtTrendService.getDebtTrend(OWNER, LocalDate.of(2026, 1, 1), null, DebtAggregation.MONTHLY),
                ResponseStatusException.class);

        assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(exception.getReason()).isEqualTo("from and to are required");
    }

    @Test
    void throwsBadRequestWhenFromIsAfterTo() {
        ResponseStatusException exception = catchThrowableOfType(
                () -> debtTrendService.getDebtTrend(OWNER, LocalDate.of(2026, 2, 1), LocalDate.of(2026, 1, 1),
                        DebtAggregation.MONTHLY),
                ResponseStatusException.class);

        assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(exception.getReason()).isEqualTo("from must not be after to");
    }

    @Test
    void throwsBadRequestWhenRangeExceedsTenYears() {
        ResponseStatusException exception = catchThrowableOfType(
                () -> debtTrendService.getDebtTrend(OWNER, LocalDate.of(2010, 1, 1), LocalDate.of(2025, 1, 2),
                        DebtAggregation.MONTHLY),
                ResponseStatusException.class);

        assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(exception.getReason()).isEqualTo("date range must not exceed 10 years");
    }

    // === Debt calculation ===

    @Test
    void neverEndingPaymentContributesFlatAmountToEachBucketAfterStart() {
        PlannedPayment payment = neverEndingPayment("p1", "Rent", 1000, LocalDate.of(2026, 1, 15));
        stubRepositories(List.of(payment), List.of());

        DebtTrendResponse response = debtTrendService.getDebtTrend(OWNER, LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 3, 31), DebtAggregation.MONTHLY);

        assertThat(response.dataPoints()).extracting(DebtTrendDataPoint::label)
                .containsExactly("Jan 2026", "Feb 2026", "Mar 2026");
        assertThat(response.dataPoints()).extracting(DebtTrendDataPoint::totalDebt)
                .containsExactly(1000.0, 1000.0, 1000.0);
        assertThat(response.dataPoints().get(0).categories()).containsExactly(new DebtCategoryAmount("Rent", 1000));
        assertThat(response.totalDebt()).isEqualTo(1000.0);
        assertThat(response.currency()).isEqualTo("PHP");
    }

    @Test
    void occurrencePaymentShrinksAsTransactionsAreConfirmed() {
        PlannedPayment payment = occurrencePayment("p2", "Loan", 500, LocalDate.of(2026, 1, 1), 3);
        List<Transaction> transactions = List.of(
                confirmedTransaction("p2", LocalDate.of(2026, 1, 10)),
                confirmedTransaction("p2", LocalDate.of(2026, 2, 15)));
        stubRepositories(List.of(payment), transactions);

        DebtTrendResponse response = debtTrendService.getDebtTrend(OWNER, LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 3, 31), DebtAggregation.MONTHLY);

        assertThat(response.dataPoints()).extracting(DebtTrendDataPoint::totalDebt)
                .containsExactly(1000.0, 500.0, 500.0);
        assertThat(response.totalDebt()).isEqualTo(500.0);
    }

    @Test
    void occurrencePaymentReachesZeroOnceAllOccurrencesAreConfirmed() {
        PlannedPayment payment = occurrencePayment("p3", "Loan", 500, LocalDate.of(2026, 1, 1), 1);
        List<Transaction> transactions = List.of(confirmedTransaction("p3", LocalDate.of(2026, 1, 10)));
        stubRepositories(List.of(payment), transactions);

        DebtTrendResponse response = debtTrendService.getDebtTrend(OWNER, LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 1, 31), DebtAggregation.MONTHLY);

        assertThat(response.dataPoints()).hasSize(1);
        assertThat(response.dataPoints().get(0).totalDebt()).isEqualTo(0.0);
        assertThat(response.dataPoints().get(0).categories()).isEmpty();
        assertThat(response.totalDebt()).isEqualTo(0.0);
    }

    @Test
    void cancelledPaymentsAreExcludedFromDebt() {
        PlannedPayment active = neverEndingPayment("p1", "Utilities", 200, LocalDate.of(2025, 12, 1));
        PlannedPayment cancelled = neverEndingPayment("p2", "ShouldBeExcluded", 999999, LocalDate.of(2025, 12, 1));
        cancelled.setStatus(PaymentStatus.CANCELLED);
        stubRepositories(List.of(active, cancelled), List.of());

        DebtTrendResponse response = debtTrendService.getDebtTrend(OWNER, LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 1, 31), DebtAggregation.MONTHLY);

        assertThat(response.dataPoints()).hasSize(1);
        assertThat(response.dataPoints().get(0).categories()).containsExactly(new DebtCategoryAmount("Utilities", 200));
        assertThat(response.totalDebt()).isEqualTo(200.0);
    }

    @Test
    void paymentNotYetStartedContributesZero() {
        PlannedPayment payment = neverEndingPayment("p1", "Future", 1000, LocalDate.of(2026, 4, 1));
        stubRepositories(List.of(payment), List.of());

        DebtTrendResponse response = debtTrendService.getDebtTrend(OWNER, LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 3, 31), DebtAggregation.MONTHLY);

        assertThat(response.dataPoints()).extracting(DebtTrendDataPoint::totalDebt).containsExactly(0.0, 0.0, 0.0);
        assertThat(response.dataPoints()).allSatisfy(dp -> assertThat(dp.categories()).isEmpty());
        assertThat(response.totalDebt()).isEqualTo(0.0);
    }

    @Test
    void paymentsInSameCategoryAreAggregated() {
        PlannedPayment rentA = neverEndingPayment("p1", "Utilities", 200, LocalDate.of(2025, 12, 1));
        PlannedPayment rentB = neverEndingPayment("p2", "Utilities", 300, LocalDate.of(2025, 12, 1));
        stubRepositories(List.of(rentA, rentB), List.of());

        DebtTrendResponse response = debtTrendService.getDebtTrend(OWNER, LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 1, 31), DebtAggregation.MONTHLY);

        assertThat(response.dataPoints().get(0).categories()).containsExactly(new DebtCategoryAmount("Utilities", 500));
        assertThat(response.totalDebt()).isEqualTo(500.0);
    }

    @Test
    void yearlyAggregationProducesOneBucketPerYear() {
        PlannedPayment payment = neverEndingPayment("p1", "X", 100, LocalDate.of(2024, 1, 1));
        stubRepositories(List.of(payment), List.of());

        DebtTrendResponse response = debtTrendService.getDebtTrend(OWNER, LocalDate.of(2024, 1, 1),
                LocalDate.of(2026, 12, 31), DebtAggregation.YEARLY);

        assertThat(response.dataPoints()).extracting(DebtTrendDataPoint::label).containsExactly("2024", "2025", "2026");
        assertThat(response.dataPoints()).extracting(DebtTrendDataPoint::totalDebt).containsExactly(100.0, 100.0, 100.0);
    }

    @Test
    void currencyDefaultsToPhpWhenNoPlannedPayments() {
        stubRepositories(List.of(), List.of());

        DebtTrendResponse response = debtTrendService.getDebtTrend(OWNER, LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 1, 31), DebtAggregation.MONTHLY);

        assertThat(response.currency()).isEqualTo("PHP");
        assertThat(response.totalDebt()).isEqualTo(0.0);
    }

    @Test
    void currencyUsesFirstPlannedPaymentCurrency() {
        PlannedPayment payment = neverEndingPayment("p1", "X", 100, LocalDate.of(2025, 12, 1));
        payment.setCurrency("USD");
        stubRepositories(List.of(payment), List.of());

        DebtTrendResponse response = debtTrendService.getDebtTrend(OWNER, LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 1, 31), DebtAggregation.MONTHLY);

        assertThat(response.currency()).isEqualTo("USD");
    }

    @Test
    void dateEndTypeFallsBackToFlatAmount() {
        PlannedPayment payment = neverEndingPayment("p1", "Y", 150, LocalDate.of(2025, 12, 1));
        payment.setEndType(EndType.DATE);
        payment.setEndValue("2030-01-01");
        stubRepositories(List.of(payment), List.of());

        DebtTrendResponse response = debtTrendService.getDebtTrend(OWNER, LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 1, 31), DebtAggregation.MONTHLY);

        assertThat(response.dataPoints().get(0).totalDebt()).isEqualTo(150.0);
    }

    // === Y-axis scaling ===

    @Test
    void yAxisConfigScalesToNearestHundredThousandAboveMaxDebt() {
        PlannedPayment payment = neverEndingPayment("p1", "Big", 250000, LocalDate.of(2025, 12, 1));
        stubRepositories(List.of(payment), List.of());

        DebtTrendResponse response = debtTrendService.getDebtTrend(OWNER, LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 1, 31), DebtAggregation.MONTHLY);

        assertThat(response.yAxisConfig().getMinValue()).isEqualTo(0);
        assertThat(response.yAxisConfig().getMaxValue()).isEqualTo(300000);
        assertThat(response.yAxisConfig().getInterval()).isEqualTo(60000);
    }

    @Test
    void yAxisConfigFloorsAtHundredThousandWhenDebtIsLow() {
        stubRepositories(List.of(), List.of());

        DebtTrendResponse response = debtTrendService.getDebtTrend(OWNER, LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 1, 31), DebtAggregation.MONTHLY);

        assertThat(response.yAxisConfig().getMinValue()).isEqualTo(0);
        assertThat(response.yAxisConfig().getMaxValue()).isEqualTo(100000);
        assertThat(response.yAxisConfig().getInterval()).isEqualTo(20000);
    }

    // === Helpers ===

    private void stubRepositories(List<PlannedPayment> payments, List<Transaction> transactions) {
        when(plannedPaymentRepository.findByOwner(OWNER)).thenReturn(payments);
        when(transactionRepository.findByOwnerAndDateBetweenOrderByDateAsc(eq(OWNER), any(Instant.class),
                any(Instant.class))).thenReturn(transactions);
    }

    private PlannedPayment neverEndingPayment(String id, String category, double amount, LocalDate startDate) {
        return PlannedPayment.builder()
                .id(id)
                .owner(OWNER)
                .category(category)
                .amount(amount)
                .currency("PHP")
                .startDate(DateTimeUtils.toInstantStartOfDay(startDate))
                .endType(EndType.NEVER)
                .status(PaymentStatus.ACTIVE)
                .build();
    }

    private PlannedPayment occurrencePayment(String id, String category, double amount, LocalDate startDate,
            int totalOccurrences) {
        return PlannedPayment.builder()
                .id(id)
                .owner(OWNER)
                .category(category)
                .amount(amount)
                .currency("PHP")
                .startDate(DateTimeUtils.toInstantStartOfDay(startDate))
                .endType(EndType.OCCURRENCE)
                .endValue(String.valueOf(totalOccurrences))
                .status(PaymentStatus.ACTIVE)
                .build();
    }

    private Transaction confirmedTransaction(String plannedPaymentId, LocalDate date) {
        return Transaction.builder()
                .owner(OWNER)
                .plannedPaymentId(plannedPaymentId)
                .date(DateTimeUtils.toInstantStartOfDay(date))
                .build();
    }
}
