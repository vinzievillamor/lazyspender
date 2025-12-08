package com.lazyspender.backend.model;

public enum EndType {
    OCCURRENCE,  // End after N occurrences
    DATE,        // End on specific date
    NEVER        // Never end (until manually stopped)
}
