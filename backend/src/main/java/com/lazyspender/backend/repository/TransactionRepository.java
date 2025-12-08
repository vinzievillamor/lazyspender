package com.lazyspender.backend.repository;

import com.google.cloud.spring.data.datastore.repository.DatastoreRepository;
import com.lazyspender.backend.model.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransactionRepository extends DatastoreRepository<Transaction, String> {

    Page<Transaction> findByOwner(String owner, Pageable pageable);

    Page<Transaction> findAll(Pageable pageable);

    List<Transaction> findByPlannedPaymentId(String plannedPaymentId);

    int countByPlannedPaymentId(String plannedPaymentId);
}
