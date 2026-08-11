package com.apexbuild.common.security;

import com.apexbuild.common.error.ApexException;
import com.apexbuild.common.error.ErrorCode;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

public class JwtService {

    private final SecretKey key;

    public JwtService(String secret) {
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("JWT_SECRET must be at least 32 bytes");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String issue(UUID userId, String email, String role, Duration ttl) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId.toString())
                .claim("email", email)
                .claim("role", role)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(ttl)))
                .signWith(key)
                .compact();
    }

    public JwtClaims parse(String token) {
        try {
            var claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            return new JwtClaims(UUID.fromString(claims.getSubject()), claims.get("email", String.class),
                    claims.get("role", String.class));
        } catch (RuntimeException ex) {
            throw new ApexException(ErrorCode.UNAUTHORIZED, "Invalid or expired token");
        }
    }
}
