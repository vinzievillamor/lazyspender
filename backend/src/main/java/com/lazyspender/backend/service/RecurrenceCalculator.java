package com.lazyspender.backend.service;

import com.lazyspender.backend.model.EndType;
import com.lazyspender.backend.model.PlannedPayment;
import com.lazyspender.backend.model.RecurrenceType;
import org.springframework.stereotype.Component;

import java.time.*;
import java.time.temporal.TemporalAdjusters;

@Component
public class RecurrenceCalculator {

    /**
     * Calculate the next due date after the current date for a planned payment
     *
     * @param plannedPayment The planned payment configuration
     * @param currentDate The current due date
     * @return The next due date, or null if no more occurrences
     */
    public Instant calculateNextDueDate(PlannedPayment plannedPayment, Instant currentDate) {
        if (plannedPayment.getRecurrenceType() == RecurrenceType.WEEKLY) {
            return calculateNextWeeklyDate(currentDate, plannedPayment.getRecurrenceValue());
        } else if (plannedPayment.getRecurrenceType() == RecurrenceType.MONTHLY) {
            return calculateNextMonthlyDate(currentDate, plannedPayment.getRecurrenceValue());
        }

        return null;
    }

    /**
     * Calculate the next occurrence for weekly recurrence
     *
     * @param currentDate Current date
     * @param dayOfWeekString Day of week (e.g., "MONDAY", "TUESDAY")
     * @return Next occurrence instant
     */
    private Instant calculateNextWeeklyDate(Instant currentDate, String dayOfWeekString) {
        DayOfWeek targetDayOfWeek = DayOfWeek.valueOf(dayOfWeekString);

        LocalDate currentLocalDate = LocalDate.ofInstant(currentDate, ZoneId.of("UTC"));

        // Find next occurrence of target day of week
        LocalDate nextDate = currentLocalDate.with(TemporalAdjusters.next(targetDayOfWeek));

        return nextDate.atStartOfDay(ZoneId.of("UTC")).toInstant();
    }

    /**
     * Calculate the next occurrence for monthly recurrence
     * Handles edge cases like month-end dates (e.g., day 31 in months with 30 days, Feb 29)
     *
     * @param currentDate Current date
     * @param dayOfMonthString Day of month as string (e.g., "15", "31")
     * @return Next occurrence instant
     */
    private Instant calculateNextMonthlyDate(Instant currentDate, String dayOfMonthString) {
        int targetDayOfMonth = Integer.parseInt(dayOfMonthString);

        LocalDate currentLocalDate = LocalDate.ofInstant(currentDate, ZoneId.of("UTC"));

        // Move to next month
        LocalDate nextMonth = currentLocalDate.plusMonths(1);

        // Handle edge case: if target day doesn't exist in next month (e.g., day 31 in Feb)
        // use the last day of that month instead
        int maxDayInNextMonth = nextMonth.lengthOfMonth();
        int actualDay = Math.min(targetDayOfMonth, maxDayInNextMonth);

        LocalDate nextDate = LocalDate.of(nextMonth.getYear(), nextMonth.getMonth(), actualDay);

        return nextDate.atStartOfDay(ZoneId.of("UTC")).toInstant();
    }

    /**
     * Check if a planned payment should be marked as COMPLETED
     * This method checks end conditions against the number of completed transactions
     *
     * @param plannedPayment The planned payment to check
     * @param completedCount The number of transactions created from this planned payment
     * @return true if it should be completed
     */
    public boolean shouldComplete(PlannedPayment plannedPayment, int completedCount) {
        if (plannedPayment.getEndType() == EndType.OCCURRENCE) {
            int maxOccurrences = Integer.parseInt(plannedPayment.getEndValue());
            return completedCount >= maxOccurrences;
        }

        if (plannedPayment.getEndType() == EndType.DATE) {
            Instant endDate = Instant.parse(plannedPayment.getEndValue());
            Instant nextDue = plannedPayment.getNextDueDate();
            return nextDue != null && nextDue.isAfter(endDate);
        }

        // NEVER type never completes automatically
        return false;
    }
}
