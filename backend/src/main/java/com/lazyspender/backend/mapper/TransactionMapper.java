package com.lazyspender.backend.mapper;

import com.lazyspender.backend.dto.TransactionRequest;
import com.lazyspender.backend.dto.TransactionResponse;
import com.lazyspender.backend.model.Transaction;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface TransactionMapper {

    @Mapping(target = "id", ignore = true)
    Transaction toEntity(TransactionRequest request);

    TransactionResponse toResponse(Transaction transaction);

    @Mapping(target = "id", ignore = true)
    void updateEntityFromRequest(TransactionRequest request, @MappingTarget Transaction transaction);
}
