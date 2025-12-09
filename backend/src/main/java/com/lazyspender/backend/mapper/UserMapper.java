package com.lazyspender.backend.mapper;

import com.lazyspender.backend.dto.UserRequest;
import com.lazyspender.backend.dto.UserResponse;
import com.lazyspender.backend.model.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface UserMapper {
    @Mapping(target = "id", ignore = true)
    User toEntity(UserRequest request);

    UserResponse toResponse(User user);

    @Mapping(target = "id", ignore = true)
    void updateEntityFromRequest(UserRequest request, @MappingTarget User user);
}
