package com.lazyspender.backend.repository;

import java.time.Instant;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.google.cloud.spring.data.datastore.repository.DatastoreRepository;
import com.google.cloud.spring.data.datastore.repository.query.Query;
import com.lazyspender.backend.model.Transaction;
import com.lazyspender.backend.model.TransactionType;

@Repository
public interface TransactionRepository extends DatastoreRepository<Transaction, String> {

    Page<Transaction> findByOwner(String owner, Pageable pageable);

    Page<Transaction> findAll(Pageable pageable);

    List<Transaction> findByPlannedPaymentId(String plannedPaymentId);

    int countByPlannedPaymentId(String plannedPaymentId);

    @Query("SELECT * FROM transactions WHERE owner = @owner AND date >= @startDate AND date <= @endDate ORDER BY date ASC")
    List<Transaction> findByOwnerAndDateBetweenOrderByDateAsc(@Param("owner") String owner,
            @Param("startDate") Instant startDate, @Param("endDate") Instant endDate);

    @Query("SELECT SUM(amount) FROM transactions WHERE owner = @owner AND type = @type AND date < @beforeDate")
    Double sumAmountByOwnerAndTypeAndDateBefore(@Param("owner") String owner, @Param("type") TransactionType type,
            @Param("beforeDate") Instant beforeDate);

    @Query("SELECT DISTINCT ON (note) note FROM transactions WHERE owner = @owner ORDER BY note ASC")
    List<String> findDistinctNotesByOwner(@Param("owner") String owner);

    @Query("SELECT * FROM transactions WHERE owner = @owner AND category = @category AND date >= @startDate AND date <= @endDate")
    List<Transaction> findByOwnerAndCategoryWithinDateRange(
            @Param("owner") String owner,
            @Param("category") String category,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate);

    @Query("SELECT * FROM transactions WHERE owner = @owner AND note = @note AND category = @category")
    List<Transaction> findAllByOwnerAndCategoryAndNote(
        @Param("owner") String owner, 
        @Param("note") String note, 
        @Param("category") String category);

    @Query("SELECT * FROM transactions WHERE plannedPaymentId = @plannedPaymentId AND date >= @from AND date <= @to")
    Page<Transaction> findAllByPlannedPaymentIdAndWithinDateRange(
        @Param("plannedPaymentId") String plannedPaymentId, 
        @Param("from") Instant from, 
        @Param("to") Instant to, 
        Pageable pageable);
}
