package com.apexbuild.web.security;

import com.apexbuild.common.error.ApexException;
import com.apexbuild.common.error.ErrorCode;
import com.apexbuild.common.security.AuthenticatedUser;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

public final class CurrentUser {

    private CurrentUser() {
    }

    public static AuthenticatedUser require() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser user)) {
            throw new ApexException(ErrorCode.UNAUTHORIZED, "Login required");
        }
        return user;
    }

    public static UUID id() {
        return require().userId();
    }
}
