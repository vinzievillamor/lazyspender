package com.lazyspender.backend.repository;

import com.lazyspender.backend.model.User;
import com.google.cloud.spring.data.datastore.repository.DatastoreRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends DatastoreRepository<User, String> {
    Optional<User> findByOwner(String owner);
}
