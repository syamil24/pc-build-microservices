package com.apexbuild.common.security;

import com.apexbuild.common.error.ApexException;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class JwtServiceTest {

    private static final String SECRET = "apex-build-test-secret-must-be-32b";

    @Test
    void issuesAndParsesAToken() {
        JwtService jwt = new JwtService(SECRET);
        UUID userId = UUID.randomUUID();
        String token = jwt.issue(userId, "a@apexbuild.local", "CUSTOMER", Duration.ofMinutes(5));
        JwtClaims claims = jwt.parse(token);
        assertEquals(userId, claims.userId());
        assertEquals("a@apexbuild.local", claims.email());
        assertEquals("CUSTOMER", claims.role());
    }

    @Test
    void rejectsAShortSecret() {
        assertThrows(IllegalStateException.class, () -> new JwtService("too-short"));
    }

    @Test
    void prefersTheAdminRoleWhenBothArePresent() {
        assertEquals("ADMIN", JwtService.chooseRole(List.of("CUSTOMER", "ADMIN", "default-roles-apex")));
        assertEquals("CUSTOMER", JwtService.chooseRole(List.of("CUSTOMER")));
    }

    @Test
    void decodesUnpaddedBase64Url() {
        assertEquals("a", new String(JwtService.base64Url("YQ")));
    }

    @Test
    void rejectsATamperedToken() {
        JwtService jwt = new JwtService(SECRET);
        String token = jwt.issue(UUID.randomUUID(), "a@apexbuild.local", "CUSTOMER", Duration.ofMinutes(5));
        assertThrows(ApexException.class, () -> jwt.parse(token + "x"));
    }
}
