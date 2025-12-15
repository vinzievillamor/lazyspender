package com.lazyspender.backend.util;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.TemporalAdjusters;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * Utility class for date/time operations using UTC as the standard timezone.
 * All timestamps are stored and processed in UTC to avoid timezone-related
 * issues.
 * Frontend should handle conversion to user's local timezone for display.
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class DateTimeUtils {

    private static final ZoneId UTC = ZoneId.of("UTC");

    /**
     * Get the current instant in UTC
     * 
     * @return Current instant
     */
    public static Instant nowUtc() {
        return Instant.now();
    }

    /**
     * Convert Instant to ZonedDateTime in UTC
     * 
     * @param instant The instant to convert
     * @return ZonedDateTime in UTC
     */
    public static ZonedDateTime toUtcZonedDateTime(Instant instant) {
        return ZonedDateTime.ofInstant(instant, UTC);
    }

    /**
     * Convert Instant to LocalDate in UTC
     * 
     * @param instant The instant to convert
     * @return LocalDate in UTC
     */
    public static LocalDate toUtcLocalDate(Instant instant) {
        return LocalDate.ofInstant(instant, UTC);
    }

    /**
     * Convert LocalDate to Instant at start of day in UTC
     * 
     * @param localDate The local date to convert
     * @return Instant at start of day in UTC
     */
    public static Instant toInstantStartOfDay(LocalDate localDate) {
        return localDate.atStartOfDay(UTC).toInstant();
    }

    /**
     * Get the start of the current day in UTC
     * 
     * @return Instant at start of current day in UTC
     */
    public static Instant startOfTodayUtc() {
        return LocalDate.now(UTC).atStartOfDay(UTC).toInstant();
    }

    /**
     * Get the end of the current day in UTC (23:59:59.999999999)
     * 
     * @return Instant at end of current day in UTC
     */
    public static Instant endOfTodayUtc() {
        return LocalDate.now(UTC).atTime(LocalTime.MAX).atZone(UTC).toInstant();
    }

    /**
     * Calculate the next occurrence of a specific day of week in UTC
     * 
     * @param currentDate     Current instant
     * @param targetDayOfWeek Target day of week
     * @return Next occurrence as Instant
     */
    public static Instant nextDayOfWeek(Instant currentDate, DayOfWeek targetDayOfWeek) {
        LocalDate currentLocalDate = toUtcLocalDate(currentDate);
        LocalDate nextDate = currentLocalDate.with(TemporalAdjusters.next(targetDayOfWeek));
        return toInstantStartOfDay(nextDate);
    }

    /**
     * Calculate the next monthly occurrence for a specific day of month in UTC
     * Handles edge cases like month-end dates (e.g., day 31 in months with 30 days)
     *
     * @param currentDate      Current instant
     * @param targetDayOfMonth Target day of month (1-31)
     * @return Next occurrence as Instant
     */
    public static Instant nextMonthDay(Instant currentDate, int targetDayOfMonth) {
        LocalDate currentLocalDate = toUtcLocalDate(currentDate);
        LocalDate nextMonth = currentLocalDate.plusMonths(1);

        // Handle edge case: if target day doesn't exist in next month
        int maxDayInNextMonth = nextMonth.lengthOfMonth();
        int actualDay = Math.min(targetDayOfMonth, maxDayInNextMonth);

        LocalDate nextDate = LocalDate.of(nextMonth.getYear(), nextMonth.getMonth(), actualDay);
        return toInstantStartOfDay(nextDate);
    }

    /**
     * Parse ISO-8601 date string to Instant
     * 
     * @param dateString ISO-8601 formatted date string
     * @return Instant
     */
    public static Instant parseInstant(String dateString) {
        return Instant.parse(dateString);
    }

    /**
     * Get ZoneId for UTC
     * 
     * @return UTC ZoneId
     */
    public static ZoneId getUtcZoneId() {
        return UTC;
    }

}
