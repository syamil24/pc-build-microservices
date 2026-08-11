package com.apexbuild.common.security;

import java.util.UUID;

public record JwtClaims(UUID userId, String email, String role) {
}
