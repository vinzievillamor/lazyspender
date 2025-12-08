package com.lazyspender.backend.mapper;

import com.lazyspender.backend.dto.PlannedPaymentRequest;
import com.lazyspender.backend.dto.PlannedPaymentResponse;
import com.lazyspender.backend.model.PlannedPayment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface PlannedPaymentMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "nextDueDate", ignore = true)
    PlannedPayment toEntity(PlannedPaymentRequest request);

    PlannedPaymentResponse toResponse(PlannedPayment plannedPayment);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "nextDueDate", ignore = true)
    void updateEntityFromRequest(PlannedPaymentRequest request, @MappingTarget PlannedPayment plannedPayment);
}
