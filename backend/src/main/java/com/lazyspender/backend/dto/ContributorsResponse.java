package com.lazyspender.backend.dto;

import java.util.List;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ContributorsResponse {
    private String category;
    private double totalCategoryAmount;
    private String currency;
    private List<ContributorItem> contributors;
}
