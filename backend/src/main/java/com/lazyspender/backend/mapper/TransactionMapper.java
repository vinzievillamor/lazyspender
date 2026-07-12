package com.lazyspender.backend.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import com.lazyspender.backend.dto.TransactionRequest;
import com.lazyspender.backend.dto.TransactionResponse;
import com.lazyspender.backend.model.Transaction;

@Mapper(componentModel = "spring")
public interface TransactionMapper {

    @Mapping(target = "id", ignore = true)
    Transaction toEntity(TransactionRequest request);

    TransactionResponse toResponse(Transaction transaction);

    Transaction toEntity(TransactionResponse response);

    TransactionRequest toRequest(Transaction transaction);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    void updateEntityFromRequest(TransactionRequest request, @MappingTarget Transaction transaction);
}
