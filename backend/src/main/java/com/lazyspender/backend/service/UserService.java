package com.lazyspender.backend.service;

import com.lazyspender.backend.dto.UserRequest;
import com.lazyspender.backend.dto.UserResponse;
import com.lazyspender.backend.mapper.UserMapper;
import com.lazyspender.backend.model.User;
import com.lazyspender.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.StreamSupport;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final UserMapper userMapper;

    public UserResponse create(UserRequest request) {
        User user = userMapper.toEntity(request);
        user.setId(UUID.randomUUID().toString());
        User savedUser = userRepository.save(user);
        return userMapper.toResponse(savedUser);
    }

    public UserResponse getById(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
        return userMapper.toResponse(user);
    }

    public UserResponse getByOwner(String owner) {
        User user = userRepository.findByOwner(owner)
                .orElseThrow(() -> new RuntimeException("User not found with owner: " + owner));
        return userMapper.toResponse(user);
    }

    public List<UserResponse> getAll() {
        Iterable<User> users = userRepository.findAll();
        return StreamSupport.stream(users.spliterator(), false)
                .map(userMapper::toResponse)
                .toList();
    }

    public UserResponse update(String id, UserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
        userMapper.updateEntityFromRequest(request, user);
        User updatedUser = userRepository.save(user);
        return userMapper.toResponse(updatedUser);
    }

    public void delete(String id) {
        if (!userRepository.existsById(id)) {
            throw new RuntimeException("User not found with id: " + id);
        }
        userRepository.deleteById(id);
    }
}
