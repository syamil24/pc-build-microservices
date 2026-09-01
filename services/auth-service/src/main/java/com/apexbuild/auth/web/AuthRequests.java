package com.apexbuild.auth.web;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public final class AuthRequests {

    private AuthRequests() {
    }

    public record RegisterRequest(
            @Email @NotBlank String email,
            @NotBlank @Size(min = 8, max = 72) String password,
            @NotBlank @Size(max = 120) String fullName
    ) {
    }

    public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {
    }

    public record RefreshRequest(@NotBlank String refreshToken) {
    }

    public record AuthResponse(String accessToken, String refreshToken, String tokenType, long expiresInSeconds,
                               UUID userId, String email, String role, String fullName) {
    }

    public record MeResponse(UUID userId, String email, String role) {
    }
}
