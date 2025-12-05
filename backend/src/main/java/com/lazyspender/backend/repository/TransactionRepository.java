package com.lazyspender.backend.repository;

import com.google.cloud.spring.data.datastore.repository.DatastoreRepository;
import com.lazyspender.backend.model.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

@Repository
public interface TransactionRepository extends DatastoreRepository<Transaction, Long> {

    Page<Transaction> findByOwner(String owner, Pageable pageable);

    Page<Transaction> findAll(Pageable pageable);
}
