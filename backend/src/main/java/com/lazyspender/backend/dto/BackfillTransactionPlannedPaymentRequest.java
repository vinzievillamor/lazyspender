package com.lazyspender.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record BackfillTransactionPlannedPaymentRequest(

        @NotBlank(message = "Owner must be present") String owner) {

}
