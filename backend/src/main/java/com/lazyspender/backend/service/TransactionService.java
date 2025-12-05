package com.lazyspender.backend.service;

import com.lazyspender.backend.dto.PageResponse;
import com.lazyspender.backend.dto.TransactionRequest;
import com.lazyspender.backend.dto.TransactionResponse;
import com.lazyspender.backend.mapper.TransactionMapper;
import com.lazyspender.backend.model.Transaction;
import com.lazyspender.backend.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final TransactionMapper transactionMapper;

    public TransactionResponse createTransaction(TransactionRequest request) {
        Transaction transaction = transactionMapper.toEntity(request);
        Transaction savedTransaction = transactionRepository.save(transaction);
        return transactionMapper.toResponse(savedTransaction);
    }

    public TransactionResponse getTransactionById(Long id) {
        Transaction transaction = transactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transaction not found with id: " + id));
        return transactionMapper.toResponse(transaction);
    }

    public PageResponse<TransactionResponse> getAllTransactions(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "date"));
        Page<Transaction> transactionPage = transactionRepository.findAll(pageable);
        return mapToPageResponse(transactionPage);
    }

    public PageResponse<TransactionResponse> getTransactionsByOwner(String owner, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "date"));
        Page<Transaction> transactionPage = transactionRepository.findByOwner(owner, pageable);
        return mapToPageResponse(transactionPage);
    }

    public TransactionResponse updateTransaction(Long id, TransactionRequest request) {
        Transaction transaction = transactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transaction not found with id: " + id));

        transactionMapper.updateEntityFromRequest(request, transaction);
        Transaction updatedTransaction = transactionRepository.save(transaction);
        return transactionMapper.toResponse(updatedTransaction);
    }

    public void deleteTransaction(Long id) {
        if (!transactionRepository.existsById(id)) {
            throw new RuntimeException("Transaction not found with id: " + id);
        }
        transactionRepository.deleteById(id);
    }

    private PageResponse<TransactionResponse> mapToPageResponse(Page<Transaction> transactionPage) {
        List<TransactionResponse> content = transactionPage.getContent().stream()
                .map(transactionMapper::toResponse)
                .collect(Collectors.toList());

        return PageResponse.<TransactionResponse>builder()
                .content(content)
                .pageNumber(transactionPage.getNumber())
                .pageSize(transactionPage.getSize())
                .totalElements(transactionPage.getTotalElements())
                .totalPages(transactionPage.getTotalPages())
                .hasNext(transactionPage.hasNext())
                .hasPrevious(transactionPage.hasPrevious())
                .build();
    }
}
