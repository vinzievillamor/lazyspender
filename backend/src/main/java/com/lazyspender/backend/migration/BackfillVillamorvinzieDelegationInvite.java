package com.lazyspender.backend.migration;

import java.util.Arrays;
import java.util.UUID;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import com.lazyspender.backend.model.AccessRole;
import com.lazyspender.backend.model.AccessStatus;
import com.lazyspender.backend.model.AccountAccess;
import com.lazyspender.backend.repository.AccountAccessRepository;
import com.lazyspender.backend.repository.UserRepository;
import com.lazyspender.backend.util.DateTimeUtils;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * One-off bootstrap: invites the real Google-signed-in account as a
 * COLLABORATOR delegate on the pre-SSO hardcoded owner "villamorvinzie",
 * whose data would otherwise stay orphaned forever (nothing can
 * authenticate as that owner anymore, so the normal auth-gated
 * POST /api/account-access endpoint can't be used to create this invite).
 *
 * Runs on every app boot but is idempotent: it checks for an existing
 * AccountAccess row across all statuses (not just PENDING/ACCEPTED) so a
 * later reject/revoke is never silently re-created on the next restart.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class BackfillVillamorvinzieDelegationInvite implements ApplicationRunner {

    private static final String LEGACY_OWNER = "villamorvinzie";
    private static final String DELEGATE_EMAIL = "villamorvinzie@gmail.com";

    private final AccountAccessRepository accountAccessRepository;
    private final UserRepository userRepository;

    @Override
    public void run(ApplicationArguments args) {
        try {
            backfillInvite();
        } catch (Exception e) {
            log.error("Failed to backfill delegation invite from {} to {}", LEGACY_OWNER, DELEGATE_EMAIL, e);
        }
    }

    private void backfillInvite() {
        boolean alreadyHandled = Arrays.stream(AccessStatus.values())
                .anyMatch(status -> accountAccessRepository
                        .findByOwnerAndDelegateAndStatus(LEGACY_OWNER, DELEGATE_EMAIL, status)
                        .isPresent());
        if (alreadyHandled) {
            log.info("Delegation invite from {} to {} already exists, skipping", LEGACY_OWNER, DELEGATE_EMAIL);
            return;
        }

        if (userRepository.findByOwner(DELEGATE_EMAIL).isEmpty()) {
            log.warn("No User found for {}, skipping delegation invite backfill", DELEGATE_EMAIL);
            return;
        }

        AccountAccess grant = AccountAccess.builder()
                .id(UUID.randomUUID().toString())
                .owner(LEGACY_OWNER)
                .delegate(DELEGATE_EMAIL)
                .role(AccessRole.COLLABORATOR)
                .status(AccessStatus.PENDING)
                .createdAt(DateTimeUtils.nowUtc())
                .build();
        accountAccessRepository.save(grant);
        log.info("Created delegation invite from {} to {}", LEGACY_OWNER, DELEGATE_EMAIL);
    }
}
