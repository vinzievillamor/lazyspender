package com.lazyspender.backend.migration;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.lazyspender.backend.model.Transaction;
import com.lazyspender.backend.repository.TransactionRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@ConditionalOnProperty(name = "migration.backfill-notes.enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class BackfillNotesMigration implements CommandLineRunner {

    private final TransactionRepository transactionRepository;

    // Special rules for Transportation category
    private static final String TRANSPORTATION_CATEGORY = "Transportation";
    private static final double CAR_AMORTIZATION_AMOUNT = 27439.0;
    private static final double MOTOR_RIDE_THRESHOLD = 100.0;
    private static final double GRAB_MAX_AMOUNT = 500.0;
    private static final double FUEL_MIN_AMOUNT = 2000.0;
    private static final double FUEL_MAX_AMOUNT = 4000.0;

    // Default note for Sports & Fitness when no match found
    private static final Map<String, String> DEFAULT_CATEGORY_NOTES = Map.of(
            "Sports & Fitness", "badminton"
    );

    @Override
    public void run(String... args) throws Exception {
        log.info("=== Starting Note Backfill Migration ===");

        // Fetch all transactions
        List<Transaction> allTransactions = new ArrayList<>();
        transactionRepository.findAll().forEach(allTransactions::add);
        log.info("Found {} total transactions in database", allTransactions.size());

        // Build category+amount to note mapping from existing transactions with notes
        // This allows us to copy notes from similar transactions in the same category
        Map<String, String> categoryAmountToNote = buildCategoryAmountMapping(allTransactions);
        log.info("Built {} category+amount mappings from existing transactions", categoryAmountToNote.size());

        int updatedFromCategoryAmount = 0;
        int updatedWithSpecialRule = 0;
        int updatedWithDefault = 0;
        int normalizedExisting = 0;
        int correctedNote = 0;
        int leftEmpty = 0;
        int skipped = 0;

        for (Transaction transaction : allTransactions) {
            String currentNote = transaction.getNote();
            boolean hasNote = currentNote != null && !currentNote.isBlank();

            if (hasNote && currentNote != null) {
                String normalizedNote = currentNote.toLowerCase().trim();

                // Rule: Transportation with "anniversary" note -> change to "fuel"
                if (TRANSPORTATION_CATEGORY.equals(transaction.getCategory())
                        && normalizedNote.equals("anniversary")) {
                    transaction.setNote("fuel");
                    transactionRepository.save(transaction);
                    correctedNote++;
                    log.debug("Corrected note: 'anniversary' -> 'fuel' for transaction {}",
                            transaction.getId());
                    continue;
                }

                // Normalize existing note to lowercase
                if (!normalizedNote.equals(currentNote)) {
                    transaction.setNote(normalizedNote);
                    transactionRepository.save(transaction);
                    normalizedExisting++;
                    log.debug("Normalized note: '{}' -> '{}' for transaction {}",
                            currentNote, normalizedNote, transaction.getId());
                } else {
                    skipped++;
                }
            } else {
                // Transaction has no note - apply rules in order of priority

                // Rule 1: Transportation with amount 27439 -> "car monthly amortization"
                if (TRANSPORTATION_CATEGORY.equals(transaction.getCategory())
                        && Math.abs(transaction.getAmount() - CAR_AMORTIZATION_AMOUNT) < 0.01) {
                    transaction.setNote("car monthly amortization");
                    transactionRepository.save(transaction);
                    updatedWithSpecialRule++;
                    log.debug("Set special rule note: 'car monthly amortization' for transaction {} (amount: {})",
                            transaction.getId(), transaction.getAmount());
                    continue;
                }

                // Rule 2: Transportation with amount < 100 -> "motor ride app"
                if (TRANSPORTATION_CATEGORY.equals(transaction.getCategory())
                        && Math.abs(transaction.getAmount()) < MOTOR_RIDE_THRESHOLD) {
                    transaction.setNote("motor ride app");
                    transactionRepository.save(transaction);
                    updatedWithSpecialRule++;
                    log.debug("Set special rule note: 'motor ride app' for transaction {} (amount: {})",
                            transaction.getId(), transaction.getAmount());
                    continue;
                }

                // Rule 3: Transportation with amount > 100 and <= 500 -> "grab"
                double absAmount = Math.abs(transaction.getAmount());
                if (TRANSPORTATION_CATEGORY.equals(transaction.getCategory())
                        && absAmount > MOTOR_RIDE_THRESHOLD && absAmount <= GRAB_MAX_AMOUNT) {
                    transaction.setNote("grab");
                    transactionRepository.save(transaction);
                    updatedWithSpecialRule++;
                    log.debug("Set special rule note: 'grab' for transaction {} (amount: {})",
                            transaction.getId(), transaction.getAmount());
                    continue;
                }

                // Rule 4: Transportation with amount 2000-4000 -> "fuel"
                if (TRANSPORTATION_CATEGORY.equals(transaction.getCategory())
                        && absAmount >= FUEL_MIN_AMOUNT && absAmount <= FUEL_MAX_AMOUNT) {
                    transaction.setNote("fuel");
                    transactionRepository.save(transaction);
                    updatedWithSpecialRule++;
                    log.debug("Set special rule note: 'fuel' for transaction {} (amount: {})",
                            transaction.getId(), transaction.getAmount());
                    continue;
                }

                // Rule 5: Try to match from same category with same amount
                String categoryAmountKey = createCategoryAmountKey(transaction.getCategory(), transaction.getAmount());
                String categoryMatchedNote = categoryAmountToNote.get(categoryAmountKey);

                if (categoryMatchedNote != null && !categoryMatchedNote.isBlank()) {
                    transaction.setNote(categoryMatchedNote.toLowerCase().trim());
                    transactionRepository.save(transaction);
                    updatedFromCategoryAmount++;
                    log.debug("Set note from category+amount match: '{}' for transaction {} (category: {}, amount: {})",
                            categoryMatchedNote, transaction.getId(), transaction.getCategory(), transaction.getAmount());
                    continue;
                }

                // Rule 6: Check if this category has a default note (only Sports & Fitness)
                String defaultNote = DEFAULT_CATEGORY_NOTES.get(transaction.getCategory());
                if (defaultNote != null) {
                    transaction.setNote(defaultNote);
                    transactionRepository.save(transaction);
                    updatedWithDefault++;
                    log.debug("Set default note: '{}' for transaction {} (category: {})",
                            defaultNote, transaction.getId(), transaction.getCategory());
                    continue;
                }

                // No match found - leave note empty
                leftEmpty++;
                log.debug("Left note empty for transaction {} (category: {}, amount: {})",
                        transaction.getId(), transaction.getCategory(), transaction.getAmount());
            }
        }

        log.info("=== Migration Complete ===");
        log.info("Updated from category+amount match: {}", updatedFromCategoryAmount);
        log.info("Updated with special rules (car/motor/grab/fuel): {}", updatedWithSpecialRule);
        log.info("Corrected notes (anniversary->fuel): {}", correctedNote);
        log.info("Updated with default notes: {}", updatedWithDefault);
        log.info("Normalized existing notes: {}", normalizedExisting);
        log.info("Left empty (no match): {}", leftEmpty);
        log.info("Skipped (already lowercase): {}", skipped);
        log.info("Total processed: {}", allTransactions.size());
    }

    /**
     * Builds a mapping of (category + amount) -> note from transactions that already have notes.
     * This allows copying notes to similar transactions in the same category with the same amount.
     */
    private Map<String, String> buildCategoryAmountMapping(List<Transaction> transactions) {
        Map<String, String> mapping = new HashMap<>();

        for (Transaction t : transactions) {
            if (t.getNote() != null && !t.getNote().isBlank()) {
                String key = createCategoryAmountKey(t.getCategory(), t.getAmount());
                // Only store the first occurrence
                mapping.putIfAbsent(key, t.getNote().toLowerCase().trim());
            }
        }

        return mapping;
    }

    private String createCategoryAmountKey(String category, double amount) {
        return String.format("%s_%.2f", category != null ? category : "", amount);
    }
}
