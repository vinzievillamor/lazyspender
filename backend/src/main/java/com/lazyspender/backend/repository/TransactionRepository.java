package com.lazyspender.backend.repository;

import com.google.cloud.spring.data.datastore.repository.DatastoreRepository;
import com.google.cloud.spring.data.datastore.repository.query.Query;
import com.lazyspender.backend.model.Transaction;
import com.lazyspender.backend.model.TransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface TransactionRepository extends DatastoreRepository<Transaction, String> {

    Page<Transaction> findByOwner(String owner, Pageable pageable);

    Page<Transaction> findAll(Pageable pageable);

    List<Transaction> findByPlannedPaymentId(String plannedPaymentId);

    int countByPlannedPaymentId(String plannedPaymentId);

    @Query("SELECT * FROM transactions WHERE owner = @owner AND date >= @startDate AND date <= @endDate ORDER BY date ASC")
    List<Transaction> findByOwnerAndDateBetweenOrderByDateAsc(@Param("owner") String owner, @Param("startDate") Instant startDate, @Param("endDate") Instant endDate);

    @Query("SELECT SUM(amount) FROM transactions WHERE owner = @owner AND type = @type AND date < @beforeDate")
    Double sumAmountByOwnerAndTypeAndDateBefore(@Param("owner") String owner, @Param("type") TransactionType type, @Param("beforeDate") Instant beforeDate);

    @Query("SELECT DISTINCT ON (note) note FROM transactions WHERE owner = @owner ORDER BY note ASC")
    List<String> findDistinctNotesByOwner(@Param("owner") String owner);
}
