package com.lazyspender.backend.mapper;

import org.mapstruct.Mapper;

import com.lazyspender.backend.dto.AccountAccessResponse;
import com.lazyspender.backend.model.AccountAccess;

@Mapper(componentModel = "spring")
public interface AccountAccessMapper {

    AccountAccessResponse toResponse(AccountAccess accountAccess);
}
