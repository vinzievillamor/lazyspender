package com.lazyspender.backend.dto;

/**
 * category here is actually the debt's display label (the payment's note, falling
 * back to its planned-payment category when no note is set - see
 * DebtTrendService.debtLabel). originalCategory is always the planned payment's
 * true category (e.g. "Car Loan"), kept alongside so the frontend can show it as
 * a chip next to the note without losing which category a debt belongs to.
 */
public record DebtCategoryAmount(String category, double amount, String originalCategory) {
}
