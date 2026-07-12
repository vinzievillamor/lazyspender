package com.lazyspender.backend.security;

import org.springframework.security.core.context.SecurityContextHolder;

import lombok.experimental.UtilityClass;

@UtilityClass
public class AuthContext {

    private final ThreadLocal<String> requestingUser = new ThreadLocal<>();

    public String getOwner() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    public String getRequestingUser() {
        String user = requestingUser.get();
        return user != null ? user : getOwner();
    }

    void setRequestingUser(String user) {
        requestingUser.set(user);
    }

    void clear() {
        requestingUser.remove();
    }
}
