package com.lazyspender.backend.migration;

import java.util.Arrays;
import java.util.List;

import org.springframework.stereotype.Service;

import com.lazyspender.backend.model.User;
import com.lazyspender.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class BackfillUserAccountsMigration {

    private static final List<String> DEFAULT_ACCOUNTS = Arrays.asList("Savings", "Crypto");

    private final UserRepository userRepository;

    public void backfillAccounts(String owner) {
        User user = userRepository.findByOwner(owner)
                .orElseThrow(() -> new RuntimeException("User not found with owner: " + owner));

        if (user.getAccounts() != null && !user.getAccounts().isEmpty()) {
            log.info("User {} already has accounts, skipping backfill", owner);
            return;
        }

        user.setAccounts(DEFAULT_ACCOUNTS);
        userRepository.save(user);
        log.info("Backfilled default accounts for user {}", owner);
    }
}
