package com.lazyspender.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ContributorItem {
    private String note;
    private double amount;
    private int count;
}
