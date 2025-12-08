package com.lazyspender.backend.repository;

import com.google.cloud.spring.data.datastore.repository.DatastoreRepository;
import com.lazyspender.backend.model.ConfirmationType;
import com.lazyspender.backend.model.PaymentStatus;
import com.lazyspender.backend.model.PlannedPayment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface PlannedPaymentRepository extends DatastoreRepository<PlannedPayment, String> {

    List<PlannedPayment> findByOwner(String owner);

    List<PlannedPayment> findByOwnerAndStatus(String owner, PaymentStatus status);

    Page<PlannedPayment> findByOwner(String owner, Pageable pageable);

    List<PlannedPayment> findByStatusAndConfirmationTypeAndNextDueDateLessThanEqual(
            PaymentStatus status,
            ConfirmationType confirmationType,
            Instant nextDueDate
    );
}
