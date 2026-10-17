package com.apexbuild.common.security;

import com.apexbuild.common.error.ApexException;
import com.apexbuild.common.error.ErrorCode;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import javax.crypto.SecretKey;
import java.math.BigInteger;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.RSAPublicKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.UUID;

public class JwtService {

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final HttpClient HTTP = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();

    private final SecretKey key;
    private final String keycloakIssuer;
    private volatile List<RsaKey> jwks = List.of();
    private volatile long jwksFetchedAt;

    public JwtService(String secret) {
        this(secret, "");
    }

    public JwtService(String secret, String keycloakIssuer) {
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("JWT_SECRET must be at least 32 bytes");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.keycloakIssuer = keycloakIssuer == null ? "" : keycloakIssuer.replaceAll("/$", "");
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
            if (isRsa(token)) {
                return parseKeycloak(token);
            }
            Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            return new JwtClaims(UUID.fromString(claims.getSubject()), claims.get("email", String.class),
                    claims.get("role", String.class));
        } catch (ApexException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            throw new ApexException(ErrorCode.UNAUTHORIZED, "Invalid or expired token");
        }
    }

    static String chooseRole(List<String> roles) {
        if (roles.contains("ADMIN")) {
            return "ADMIN";
        }
        if (roles.contains("CUSTOMER")) {
            return "CUSTOMER";
        }
        return "CUSTOMER";
    }

    private JwtClaims parseKeycloak(String token) {
        if (keycloakIssuer.isBlank()) {
            throw new ApexException(ErrorCode.UNAUTHORIZED, "Invalid or expired token");
        }
        String kid = header(token).path("kid").asText("");
        Claims claims = Jwts.parser().verifyWith(publicKey(kid)).clockSkewSeconds(30).build()
                .parseSignedClaims(token).getPayload();
        if (!keycloakIssuer.equals(claims.getIssuer())) {
            throw new ApexException(ErrorCode.UNAUTHORIZED, "Invalid or expired token");
        }
        String email = textClaim(claims, "email");
        if (email == null) {
            email = textClaim(claims, "preferred_username");
        }
        String userId = textClaim(claims, "apex_user_id");
        if (userId == null) {
            userId = claims.getSubject();
        }
        return new JwtClaims(UUID.fromString(userId), email, chooseRole(realmRoles(claims)));
    }

    private RSAPublicKey publicKey(String kid) {
        RSAPublicKey found = findKey(kid);
        if (found == null) {
            refreshJwks();
            found = findKey(kid);
        }
        if (found == null) {
            throw new ApexException(ErrorCode.UNAUTHORIZED, "Invalid or expired token");
        }
        return found;
    }

    private RSAPublicKey findKey(String kid) {
        for (RsaKey candidate : jwks) {
            if (candidate.kid.equals(kid)) {
                return candidate.key;
            }
        }
        return null;
    }

    private void refreshJwks() {
        long now = System.currentTimeMillis();
        if (now - jwksFetchedAt < 1_000 && !jwks.isEmpty()) {
            return;
        }
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(keycloakIssuer + "/protocol/openid-connect/certs"))
                    .timeout(Duration.ofSeconds(5)).GET().build();
            HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new ApexException(ErrorCode.UNAUTHORIZED, "Invalid or expired token");
            }
            JsonNode keys = JSON.readTree(response.body()).path("keys");
            List<RsaKey> parsed = new ArrayList<>();
            for (JsonNode item : keys) {
                if (!"RSA".equals(item.path("kty").asText())) {
                    continue;
                }
                parsed.add(new RsaKey(item.path("kid").asText(), rsa(item.path("n").asText(), item.path("e").asText())));
            }
            jwks = List.copyOf(parsed);
            jwksFetchedAt = now;
        } catch (ApexException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ApexException(ErrorCode.UNAUTHORIZED, "Invalid or expired token");
        }
    }

    private static RSAPublicKey rsa(String modulus, String exponent) throws Exception {
        BigInteger n = new BigInteger(1, base64Url(modulus));
        BigInteger e = new BigInteger(1, base64Url(exponent));
        return (RSAPublicKey) KeyFactory.getInstance("RSA").generatePublic(new RSAPublicKeySpec(n, e));
    }

    static byte[] base64Url(String value) {
        int remainder = value.length() % 4;
        String padded = remainder == 0 ? value : value + "====".substring(remainder);
        return Base64.getUrlDecoder().decode(padded);
    }

    private static String textClaim(Claims claims, String name) {
        Object value = claims.get(name);
        if (value instanceof String text && !text.isBlank()) {
            return text;
        }
        if (value instanceof List<?> list && !list.isEmpty() && list.get(0) != null) {
            String text = String.valueOf(list.get(0));
            return text.isBlank() ? null : text;
        }
        return null;
    }

    private static List<String> realmRoles(Claims claims) {
        Object access = claims.get("realm_access");
        List<String> roles = new ArrayList<>();
        if (access instanceof java.util.Map<?, ?> map && map.get("roles") instanceof List<?> values) {
            for (Object value : values) {
                roles.add(String.valueOf(value));
            }
        }
        return roles;
    }

    private static boolean isRsa(String token) {
        return "RS256".equals(header(token).path("alg").asText());
    }

    private static JsonNode header(String token) {
        try {
            String encoded = token.substring(0, token.indexOf('.'));
            byte[] json = base64Url(encoded);
            return JSON.readTree(json);
        } catch (Exception ex) {
            throw new ApexException(ErrorCode.UNAUTHORIZED, "Invalid or expired token");
        }
    }

    private record RsaKey(String kid, RSAPublicKey key) {
    }
}
