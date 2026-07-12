package com.lazyspender.backend.security;

import java.io.IOException;
import java.util.Collections;

import org.springframework.http.HttpMethod;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.lazyspender.backend.model.AccessRole;
import com.lazyspender.backend.service.AccountAccessService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class DelegatedAccessFilter extends OncePerRequestFilter {

    private static final String DELEGATED_OWNER_HEADER = "X-Delegated-Owner";
    private static final String ACCOUNT_ACCESS_PATH_PREFIX = "/api/account-access";

    private final AccountAccessService accountAccessService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {
        try {
            if (!request.getRequestURI().startsWith(ACCOUNT_ACCESS_PATH_PREFIX)) {
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                String delegatedOwner = request.getHeader(DELEGATED_OWNER_HEADER);

                if (auth != null && delegatedOwner != null && !delegatedOwner.equals(auth.getName())) {
                    AccessRole required = HttpMethod.GET.matches(request.getMethod())
                            ? AccessRole.READ
                            : AccessRole.COLLABORATOR;
                    accountAccessService.assertAccess(delegatedOwner, auth.getName(), required);

                    AuthContext.setRequestingUser(auth.getName());
                    SecurityContextHolder.getContext().setAuthentication(
                            new UsernamePasswordAuthenticationToken(delegatedOwner, null, Collections.emptyList()));
                }
            }

            filterChain.doFilter(request, response);
        } finally {
            AuthContext.clear();
        }
    }
}
