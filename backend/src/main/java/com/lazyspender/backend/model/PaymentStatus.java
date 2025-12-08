package com.lazyspender.backend.model;

public enum PaymentStatus {
    ACTIVE,      // Currently active
    PAUSED,      // Temporarily paused
    COMPLETED,   // Reached end condition
    CANCELLED    // User cancelled
}
