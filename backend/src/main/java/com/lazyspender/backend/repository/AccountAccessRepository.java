package com.lazyspender.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.google.cloud.spring.data.datastore.repository.DatastoreRepository;
import com.lazyspender.backend.model.AccessStatus;
import com.lazyspender.backend.model.AccountAccess;

@Repository
public interface AccountAccessRepository extends DatastoreRepository<AccountAccess, String> {

    List<AccountAccess> findByDelegateAndStatus(String delegate, AccessStatus status);

    List<AccountAccess> findByOwnerAndStatus(String owner, AccessStatus status);

    Optional<AccountAccess> findByOwnerAndDelegateAndStatus(String owner, String delegate, AccessStatus status);
}
