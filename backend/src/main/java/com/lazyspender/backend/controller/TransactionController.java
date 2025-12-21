package com.lazyspender.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.lazyspender.backend.dto.PageResponse;
import com.lazyspender.backend.dto.TransactionRequest;
import com.lazyspender.backend.dto.TransactionResponse;
import com.lazyspender.backend.service.TransactionService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @PostMapping
    public ResponseEntity<TransactionResponse> createTransaction(@Valid @RequestBody TransactionRequest request) {
        TransactionResponse response = transactionService.createTransaction(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TransactionResponse> getTransactionById(@PathVariable(name = "id") String id) {
        TransactionResponse response = transactionService.getTransactionById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<PageResponse<TransactionResponse>> getAllTransactions(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size) {
        PageResponse<TransactionResponse> response = transactionService.getAllTransactions(page, size);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/owner/{owner}")
    public ResponseEntity<PageResponse<TransactionResponse>> getTransactionsByOwner(
            @PathVariable(name = "owner") String owner,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size) {
        PageResponse<TransactionResponse> response = transactionService.getTransactionsByOwner(owner, page, size);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TransactionResponse> updateTransaction(
            @PathVariable(name = "id") String id,
            @Valid @RequestBody TransactionRequest request) {
        TransactionResponse response = transactionService.updateTransaction(id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTransaction(@PathVariable(name = "id") String id) {
        transactionService.deleteTransaction(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/distinct-notes")
    public ResponseEntity<List<String>> getDistinctNotes(@RequestParam(name = "owner") String owner) {
        List<String> distinctNotes = transactionService.getDistinctNotesByOwner(owner);
        return ResponseEntity.ok(distinctNotes);
    }
}
