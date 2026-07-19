package com.lazyspender.backend.migration;

import java.util.Arrays;
import java.util.UUID;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import com.lazyspender.backend.model.AccessRole;
import com.lazyspender.backend.model.AccessStatus;
import com.lazyspender.backend.model.AccountAccess;
import com.lazyspender.backend.model.User;
import com.lazyspender.backend.repository.AccountAccessRepository;
import com.lazyspender.backend.repository.UserRepository;
import com.lazyspender.backend.util.DateTimeUtils;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * One-off bootstrap: invites rachellebalcos20@gmail.com as a COLLABORATOR
 * delegate on the pre-SSO hardcoded owner "villamorvinzie", the same setup
 * already backfilled for villamorvinzie@gmail.com (see
 * BackfillVillamorvinzieDelegationInvite).
 *
 * Unlike that case, this delegate hasn't signed in yet, so no User record
 * exists for them. This backfill pre-provisions a bare User row (owner/email
 * set, no googleId yet) so that AuthService.authenticateWithGoogle's
 * findByEmail fallback merges into it - rather than creating a duplicate -
 * on their first real Google sign-in.
 *
 * Runs on every app boot but is idempotent: it checks for an existing
 * AccountAccess row across all statuses (not just PENDING/ACCEPTED) so a
 * later reject/revoke is never silently re-created on the next restart, and
 * it only creates the User row if one doesn't already exist for this email.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class BackfillRachelleDelegationInvite implements ApplicationRunner {

    private static final String LEGACY_OWNER = "villamorvinzie";
    private static final String DELEGATE_EMAIL = "rachellebalcos20@gmail.com";

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

        ensureUserExists();

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

    private void ensureUserExists() {
        if (userRepository.findByEmail(DELEGATE_EMAIL).isPresent()) {
            return;
        }

        User newUser = User.builder()
                .id(UUID.randomUUID().toString())
                .owner(DELEGATE_EMAIL)
                .email(DELEGATE_EMAIL)
                .accounts(Arrays.asList("Savings", "Crypto"))
                .build();
        userRepository.save(newUser);
        log.info("Pre-provisioned User record for {} ahead of their first sign-in", DELEGATE_EMAIL);
    }
}
