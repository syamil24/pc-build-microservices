package com.apexbuild.auth.service;

import com.apexbuild.auth.domain.RefreshToken;
import com.apexbuild.auth.domain.UserAccount;
import com.apexbuild.auth.repo.RefreshTokenRepository;
import com.apexbuild.auth.repo.UserAccountRepository;
import com.apexbuild.auth.web.AuthRequests.AuthResponse;
import com.apexbuild.auth.web.AuthRequests.LoginRequest;
import com.apexbuild.auth.web.AuthRequests.MeResponse;
import com.apexbuild.auth.web.AuthRequests.RefreshRequest;
import com.apexbuild.auth.web.AuthRequests.RegisterRequest;
import com.apexbuild.common.config.ApexProperties;
import com.apexbuild.common.error.ApexException;
import com.apexbuild.common.error.ErrorCode;
import com.apexbuild.common.messaging.KafkaTopics;
import com.apexbuild.common.security.JwtService;
import com.apexbuild.web.http.RemoteClients;
import com.apexbuild.web.messaging.EventPublisher;
import com.apexbuild.web.security.CurrentUser;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;

@Service
public class AuthService {

    private final UserAccountRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final ApexProperties properties;
    private final EventPublisher events;
    private final RemoteClients remoteClients;
    private final SecureRandom random = new SecureRandom();

    public AuthService(UserAccountRepository users, RefreshTokenRepository refreshTokens, PasswordEncoder passwordEncoder,
                       JwtService jwtService, ApexProperties properties, EventPublisher events, RemoteClients remoteClients) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.properties = properties;
        this.events = events;
        this.remoteClients = remoteClients;
    }

    public void ensureSeeded(RegisterRequest request, String role) {
        users.findByEmailIgnoreCase(request.email()).ifPresentOrElse(
                existing -> publishProfile(existing, request.fullName()),
                () -> register(request, role));
    }

    @Transactional
    public AuthResponse register(RegisterRequest request, String role) {
        if (users.existsByEmailIgnoreCase(request.email())) {
            throw new ApexException(ErrorCode.CONFLICT, "An account with that email already exists");
        }
        UserAccount user = users.save(UserAccount.create(request.email(), passwordEncoder.encode(request.password()), role));
        publishProfile(user, request.fullName());
        return tokens(user, request.fullName());
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        UserAccount user = users.findByEmailIgnoreCase(request.email())
                .filter(UserAccount::isEnabled)
                .filter(found -> passwordEncoder.matches(request.password(), found.getPasswordHash()))
                .orElseThrow(() -> new ApexException(ErrorCode.UNAUTHORIZED, "Email or password is incorrect"));
        return tokens(user, null);
    }

    @Transactional
    public AuthResponse refresh(RefreshRequest request) {
        RefreshToken stored = refreshTokens.findByTokenHash(hash(request.refreshToken()))
                .orElseThrow(() -> new ApexException(ErrorCode.UNAUTHORIZED, "Refresh token is invalid"));
        if (stored.isRevoked() || stored.getExpiresAt().isBefore(Instant.now())) {
            throw new ApexException(ErrorCode.UNAUTHORIZED, "Refresh token is expired");
        }
        stored.revoke();
        UserAccount user = users.findById(stored.getUserId())
                .orElseThrow(() -> new ApexException(ErrorCode.UNAUTHORIZED, "Account no longer exists"));
        return tokens(user, null);
    }

    public MeResponse me() {
        var user = CurrentUser.require();
        return new MeResponse(user.userId(), user.email(), user.role());
    }

    private AuthResponse tokens(UserAccount user, String fullName) {
        String access = jwtService.issue(user.getId(), user.getEmail(), user.getRole(),
                Duration.ofMinutes(properties.getAccessTokenMinutes()));
        String refresh = rawRefresh();
        refreshTokens.save(RefreshToken.issue(user.getId(), hash(refresh),
                Instant.now().plus(Duration.ofDays(properties.getRefreshTokenDays()))));
        return new AuthResponse(access, refresh, "Bearer", properties.getAccessTokenMinutes() * 60L,
                user.getId(), user.getEmail(), user.getRole(), fullName);
    }

    private void publishProfile(UserAccount user, String fullName) {
        var payload = Map.of("authUserId", user.getId().toString(), "email", user.getEmail(), "fullName", fullName);
        events.publish(KafkaTopics.USER_REGISTERED, user.getId().toString(), payload);
        try {
            remoteClients.call("user", "user-service", client -> client.post()
                    .uri("/api/users/internal/profiles")
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity());
        } catch (RuntimeException ex) {
            // Kafka remains the durable path if the user service is still starting.
        }
    }

    private String rawRefresh() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String raw) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }
}
