package com.lazyspender.backend.util;

import com.lazyspender.backend.model.Transaction;
import com.lazyspender.backend.repository.TransactionRepository;
import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.io.FileReader;
import java.io.IOException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class CsvDataLoader implements CommandLineRunner {

    private final TransactionRepository transactionRepository;

    private static final String CSV_FILE_PATH = "/mnt/c/Users/Vinzie/Downloads/Phone Link/report_2025-12-05_170747.csv";
    private static final String DEFAULT_OWNER = "villamorvinzie";
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Override
    public void run(String... args) {
        try {
            log.info("Starting CSV data import...");
            List<Transaction> transactions = readTransactionsFromCsv();

            if (!transactions.isEmpty()) {
                transactionRepository.saveAll(transactions);
                log.info("Successfully imported {} transactions from CSV", transactions.size());
            } else {
                log.warn("No transactions found in CSV file");
            }
        } catch (Exception e) {
            log.error("Failed to import CSV data: {}", e.getMessage(), e);
        }
    }

    private List<Transaction> readTransactionsFromCsv() throws IOException, CsvException {
        List<Transaction> transactions = new ArrayList<>();

        try (CSVReader reader = new CSVReader(new FileReader(CSV_FILE_PATH))) {
            List<String[]> records = reader.readAll();

            // Skip header row
            for (int i = 1; i < records.size(); i++) {
                String[] record = records.get(i);
                String str = String.join("", record);
                record = str.split(";");

                if (record.length >= 10) {
                    try {
                        Transaction transaction = parseTransaction(record);
                        transactions.add(transaction);
                    } catch (Exception e) {
                        log.warn("Failed to parse record {}: {}", i, e.getMessage());
                    }
                }
            }
        }

        return transactions;
    }

    private Transaction parseTransaction(String[] record) {
        // CSV columns: account;category;currency;amount;ref_currency_amount;type;payment_type;payment_type_local;note;date;...
        String account = record[0];
        String category = record[1];
        String currency = record[2];
        double amount = parseDouble(record[3]);
        double refCurrencyAmount = parseDouble(record[4]);
        String note = record[8];
        Instant date = parseDate(record[9]);

        return Transaction.builder()
                .owner(DEFAULT_OWNER)
                .account(account)
                .category(category)
                .amount(amount)
                .note(note)
                .date(date)
                .currency(currency)
                .refCurrencyAmount(refCurrencyAmount)
                .build();
    }

    private double parseDouble(String value) {
        try {
            return Double.parseDouble(value.trim());
        } catch (NumberFormatException e) {
            log.warn("Failed to parse double value: {}", value);
            return 0.0;
        }
    }

    private Instant parseDate(String dateStr) {
        try {
            LocalDateTime localDateTime = LocalDateTime.parse(dateStr.trim(), DATE_FORMATTER);
            return localDateTime.atZone(ZoneId.systemDefault()).toInstant();
        } catch (Exception e) {
            log.warn("Failed to parse date: {}", dateStr);
            return Instant.now();
        }
    }
}
