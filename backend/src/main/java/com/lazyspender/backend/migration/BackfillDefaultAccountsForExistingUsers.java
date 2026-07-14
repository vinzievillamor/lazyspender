package com.lazyspender.backend.migration;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import com.lazyspender.backend.model.User;
import com.lazyspender.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * One-off bootstrap: {@link BackfillUserAccountsMigration} only backfills the
 * currently authenticated principal via POST /api/backfill/user-accounts, so
 * users created before default accounts existed (see AuthService) stay stuck
 * without any accounts unless they happen to call that endpoint themselves.
 *
 * Runs on every app boot but is idempotent: BackfillUserAccountsMigration
 * already skips any user that already has accounts.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class BackfillDefaultAccountsForExistingUsers implements ApplicationRunner {

    private final UserRepository userRepository;
    private final BackfillUserAccountsMigration backfillUserAccountsMigration;

    @Override
    public void run(ApplicationArguments args) {
        try {
            backfillAll();
        } catch (Exception e) {
            log.error("Failed to backfill default accounts for existing users", e);
        }
    }

    private void backfillAll() {
        int backfilled = 0;
        for (User user : userRepository.findAll()) {
            if (user.getAccounts() == null || user.getAccounts().isEmpty()) {
                backfillUserAccountsMigration.backfillAccounts(user.getOwner());
                backfilled++;
            }
        }
        log.info("Default accounts backfill complete: {} user(s) updated", backfilled);
    }
}
