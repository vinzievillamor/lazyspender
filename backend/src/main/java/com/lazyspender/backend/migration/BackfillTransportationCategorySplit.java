package com.lazyspender.backend.migration;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.lazyspender.backend.model.PlannedPayment;
import com.lazyspender.backend.model.Transaction;
import com.lazyspender.backend.repository.PlannedPaymentRepository;
import com.lazyspender.backend.repository.TransactionRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * One-off backfill retiring the "Transportation" category in favor of
 * Parking/Ride-Hailing/Fuel/Toll/Car Maintenance/Car Loan/Incident-Emergencies.
 * Runs once on boot when enabled; see https://github.com/vinzievillamor/lazyspender/issues/51.
 */
@Component
@ConditionalOnProperty(name = "migration.backfill-transportation-category-split.enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class BackfillTransportationCategorySplit implements ApplicationRunner {

    private static final String TRANSPORTATION_CATEGORY = "Transportation";

    private record CategoryNote(String category, String note) {
    }

    // Exact-match mapping keyed by the current (lowercased, trimmed) note.
    private static final Map<String, CategoryNote> NOTE_MAPPING = Map.ofEntries(
            Map.entry("parking", new CategoryNote("Parking", "parking")),
            Map.entry("parking incident", new CategoryNote("Incident/Emergencies", "parking incident")),
            Map.entry("grab", new CategoryNote("Ride-Hailing", "grab")),
            Map.entry("motor ride app", new CategoryNote("Ride-Hailing", "motor ride app")),
            Map.entry("from/to sogo", new CategoryNote("Ride-Hailing", "grab")),
            Map.entry("rachelle to mytown la", new CategoryNote("Ride-Hailing", "grab")),
            Map.entry("sm makati to rachelle house", new CategoryNote("Ride-Hailing", "grab")),
            Map.entry("fuel", new CategoryNote("Fuel", "fuel")),
            Map.entry("car wash", new CategoryNote("Car Maintenance", "car wash")),
            Map.entry("car pms", new CategoryNote("Car Maintenance", "car maintenance")),
            Map.entry("car scent", new CategoryNote("Car Maintenance", "car maintenance")),
            Map.entry("car maintenance", new CategoryNote("Car Maintenance", "car maintenance")),
            Map.entry("battery", new CategoryNote("Car Maintenance", "car maintenance")),
            Map.entry("blade asia wiper fluid", new CategoryNote("Car Maintenance", "car maintenance")),
            Map.entry("car insurance", new CategoryNote("Car Maintenance", "car maintenance")),
            Map.entry("car registration renewal", new CategoryNote("Car Maintenance", "car maintenance")),
            Map.entry("car monthly amortization", new CategoryNote("Car Loan", "amortization")),
            Map.entry("toll", new CategoryNote("Toll", "toll")),
            Map.entry("autosweep", new CategoryNote("Toll", "toll")),
            Map.entry("traffic violation", new CategoryNote("Incident/Emergencies", "traffic violation")));

    private final TransactionRepository transactionRepository;
    private final PlannedPaymentRepository plannedPaymentRepository;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        backfillTransactions();
        backfillPlannedPayments();
    }

    private void backfillTransactions() {
        log.info("=== Starting Transportation Category Split (Transactions) ===");

        List<Transaction> allTransactions = new ArrayList<>();
        transactionRepository.findAll().forEach(allTransactions::add);

        int updated = 0;
        int skippedNoMatch = 0;

        for (Transaction transaction : allTransactions) {
            if (!TRANSPORTATION_CATEGORY.equals(transaction.getCategory())) {
                continue;
            }

            CategoryNote mapped = resolveMapping(transaction.getNote(), transaction.getAmount());
            if (mapped == null) {
                skippedNoMatch++;
                log.warn("No mapping found for transaction {} (note='{}', amount={})",
                        transaction.getId(), transaction.getNote(), transaction.getAmount());
                continue;
            }

            transaction.setCategory(mapped.category());
            transaction.setNote(mapped.note());
            transactionRepository.save(transaction);
            updated++;
        }

        log.info("=== Transaction Backfill Complete === updated={} skippedNoMatch={} totalScanned={}",
                updated, skippedNoMatch, allTransactions.size());
    }

    private void backfillPlannedPayments() {
        log.info("=== Starting Transportation Category Split (Planned Payments) ===");

        List<PlannedPayment> allPlannedPayments = new ArrayList<>();
        plannedPaymentRepository.findAll().forEach(allPlannedPayments::add);

        int updated = 0;
        int skippedNoMatch = 0;

        for (PlannedPayment plannedPayment : allPlannedPayments) {
            if (!TRANSPORTATION_CATEGORY.equals(plannedPayment.getCategory())) {
                continue;
            }

            CategoryNote mapped = resolveMapping(plannedPayment.getNote(), plannedPayment.getAmount());
            if (mapped == null) {
                skippedNoMatch++;
                log.warn("No mapping found for planned payment {} (note='{}', amount={})",
                        plannedPayment.getId(), plannedPayment.getNote(), plannedPayment.getAmount());
                continue;
            }

            plannedPayment.setCategory(mapped.category());
            plannedPayment.setNote(mapped.note());
            plannedPaymentRepository.save(plannedPayment);
            updated++;
        }

        log.info("=== Planned Payment Backfill Complete === updated={} skippedNoMatch={} totalScanned={}",
                updated, skippedNoMatch, allPlannedPayments.size());
    }

    private CategoryNote resolveMapping(String note, double amount) {
        String normalized = note == null ? "" : note.toLowerCase().trim();

        if (!normalized.isBlank()) {
            return NOTE_MAPPING.get(normalized);
        }

        // No note text to go on: amount == 100.00 exactly closes an off-by-one
        // gap in the old BackfillNotesMigration ("motor ride app" rule used
        // strict "< 100"); anything else with no signal defaults to Ride-Hailing.
        if (Math.abs(amount - 100.0) < 0.01) {
            return new CategoryNote("Ride-Hailing", "motor ride app");
        }
        return new CategoryNote("Ride-Hailing", "grab");
    }
}
