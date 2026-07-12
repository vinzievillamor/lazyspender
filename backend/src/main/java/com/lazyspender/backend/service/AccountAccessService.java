package com.lazyspender.backend.service;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.lazyspender.backend.dto.AccountAccessRequest;
import com.lazyspender.backend.dto.AccountAccessResponse;
import com.lazyspender.backend.mapper.AccountAccessMapper;
import com.lazyspender.backend.model.AccessRole;
import com.lazyspender.backend.model.AccessStatus;
import com.lazyspender.backend.model.AccountAccess;
import com.lazyspender.backend.model.User;
import com.lazyspender.backend.repository.AccountAccessRepository;
import com.lazyspender.backend.repository.UserRepository;
import com.lazyspender.backend.util.DateTimeUtils;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AccountAccessService {

    private final AccountAccessRepository accountAccessRepository;
    private final UserRepository userRepository;
    private final AccountAccessMapper accountAccessMapper;

    /**
     * Confirms an ACCEPTED grant exists from owner to delegate with sufficient role.
     * Throws AccessDeniedException (translated to 403 by Spring Security) otherwise.
     */
    public void assertAccess(String owner, String delegate, AccessRole requiredRole) {
        AccountAccess grant = accountAccessRepository
                .findByOwnerAndDelegateAndStatus(owner, delegate, AccessStatus.ACCEPTED)
                .orElseThrow(() -> new AccessDeniedException(
                        "No accepted access grant from " + owner + " to " + delegate));

        boolean sufficient = grant.getRole() == AccessRole.COLLABORATOR || requiredRole == AccessRole.READ;
        if (!sufficient) {
            throw new AccessDeniedException(
                    "Grant from " + owner + " to " + delegate + " does not permit " + requiredRole);
        }
    }

    public AccountAccessResponse createInvite(String owner, AccountAccessRequest request) {
        User delegateUser = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "No user found with email: " + request.getEmail()));
        String delegate = delegateUser.getOwner();

        if (delegate.equals(owner)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot invite yourself");
        }

        boolean hasActiveGrant = accountAccessRepository
                .findByOwnerAndDelegateAndStatus(owner, delegate, AccessStatus.PENDING).isPresent()
                || accountAccessRepository
                        .findByOwnerAndDelegateAndStatus(owner, delegate, AccessStatus.ACCEPTED).isPresent();
        if (hasActiveGrant) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "An active invite already exists for this user");
        }

        AccountAccess grant = AccountAccess.builder()
                .id(UUID.randomUUID().toString())
                .owner(owner)
                .delegate(delegate)
                .role(request.getRole())
                .status(AccessStatus.PENDING)
                .createdAt(DateTimeUtils.nowUtc())
                .build();

        return accountAccessMapper.toResponse(accountAccessRepository.save(grant));
    }

    public List<AccountAccessResponse> getPending(String delegate) {
        return accountAccessRepository.findByDelegateAndStatus(delegate, AccessStatus.PENDING).stream()
                .map(accountAccessMapper::toResponse)
                .collect(Collectors.toList());
    }

    public List<AccountAccessResponse> getGrantedToMe(String delegate) {
        return accountAccessRepository.findByDelegateAndStatus(delegate, AccessStatus.ACCEPTED).stream()
                .map(this::toEnrichedResponse)
                .collect(Collectors.toList());
    }

    public List<AccountAccessResponse> getGrantedByMe(String owner) {
        return List.of(AccessStatus.values()).stream()
                .flatMap(status -> accountAccessRepository.findByOwnerAndStatus(owner, status).stream())
                .sorted(Comparator.comparing(AccountAccess::getCreatedAt))
                .map(accountAccessMapper::toResponse)
                .collect(Collectors.toList());
    }

    public void accept(String id, String delegate) {
        AccountAccess grant = findByIdOrThrow(id);
        requireDelegate(grant, delegate);
        requireStatus(grant, AccessStatus.PENDING);

        grant.setStatus(AccessStatus.ACCEPTED);
        grant.setRespondedAt(DateTimeUtils.nowUtc());
        accountAccessRepository.save(grant);
    }

    public void reject(String id, String delegate) {
        AccountAccess grant = findByIdOrThrow(id);
        requireDelegate(grant, delegate);
        requireStatus(grant, AccessStatus.PENDING);

        grant.setStatus(AccessStatus.REJECTED);
        grant.setRespondedAt(DateTimeUtils.nowUtc());
        accountAccessRepository.save(grant);
    }

    public void revoke(String id, String owner) {
        AccountAccess grant = findByIdOrThrow(id);
        requireOwner(grant, owner);
        if (grant.getStatus() != AccessStatus.PENDING && grant.getStatus() != AccessStatus.ACCEPTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Grant is not active");
        }

        grant.setStatus(AccessStatus.REVOKED);
        grant.setRespondedAt(DateTimeUtils.nowUtc());
        accountAccessRepository.save(grant);
    }

    public void leave(String id, String delegate) {
        AccountAccess grant = findByIdOrThrow(id);
        requireDelegate(grant, delegate);
        requireStatus(grant, AccessStatus.ACCEPTED);

        grant.setStatus(AccessStatus.REVOKED);
        grant.setRespondedAt(DateTimeUtils.nowUtc());
        accountAccessRepository.save(grant);
    }

    private AccountAccessResponse toEnrichedResponse(AccountAccess grant) {
        AccountAccessResponse response = accountAccessMapper.toResponse(grant);
        userRepository.findByOwner(grant.getOwner()).ifPresent(owner -> {
            response.setOwnerName(owner.getName());
            response.setOwnerPictureUrl(owner.getPictureUrl());
        });
        return response;
    }

    private AccountAccess findByIdOrThrow(String id) {
        return accountAccessRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Access grant not found with id: " + id));
    }

    private void requireDelegate(AccountAccess grant, String delegate) {
        if (!grant.getDelegate().equals(delegate)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not the delegate for this grant");
        }
    }

    private void requireOwner(AccountAccess grant, String owner) {
        if (!grant.getOwner().equals(owner)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not the owner for this grant");
        }
    }

    private void requireStatus(AccountAccess grant, AccessStatus expected) {
        if (grant.getStatus() != expected) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Grant is not in " + expected + " status");
        }
    }
}
