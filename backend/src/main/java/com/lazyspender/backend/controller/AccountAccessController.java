package com.lazyspender.backend.controller;

import java.security.Principal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.lazyspender.backend.dto.AccountAccessRequest;
import com.lazyspender.backend.dto.AccountAccessResponse;
import com.lazyspender.backend.service.AccountAccessService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Managing your own access grants always uses the real signed-in identity from
 * {@link Principal} - this path is excluded from delegated-header resolution in
 * {@code DelegatedAccessFilter} so a delegate can never end up creating/revoking
 * grants under the owner's identity they're currently acting as.
 */
@RestController
@RequestMapping("/api/account-access")
@RequiredArgsConstructor
public class AccountAccessController {

    private final AccountAccessService accountAccessService;

    @PostMapping
    public ResponseEntity<AccountAccessResponse> createInvite(
            @Valid @RequestBody AccountAccessRequest request, Principal principal) {
        AccountAccessResponse response = accountAccessService.createInvite(principal.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/pending")
    public ResponseEntity<List<AccountAccessResponse>> getPending(Principal principal) {
        return ResponseEntity.ok(accountAccessService.getPending(principal.getName()));
    }

    @GetMapping("/granted-to-me")
    public ResponseEntity<List<AccountAccessResponse>> getGrantedToMe(Principal principal) {
        return ResponseEntity.ok(accountAccessService.getGrantedToMe(principal.getName()));
    }

    @GetMapping("/granted-by-me")
    public ResponseEntity<List<AccountAccessResponse>> getGrantedByMe(Principal principal) {
        return ResponseEntity.ok(accountAccessService.getGrantedByMe(principal.getName()));
    }

    @PostMapping("/{id}/accept")
    public ResponseEntity<Void> accept(@PathVariable("id") String id, Principal principal) {
        accountAccessService.accept(id, principal.getName());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<Void> reject(@PathVariable("id") String id, Principal principal) {
        accountAccessService.reject(id, principal.getName());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> revoke(@PathVariable("id") String id, Principal principal) {
        accountAccessService.revoke(id, principal.getName());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/leave")
    public ResponseEntity<Void> leave(@PathVariable("id") String id, Principal principal) {
        accountAccessService.leave(id, principal.getName());
        return ResponseEntity.noContent().build();
    }
}
