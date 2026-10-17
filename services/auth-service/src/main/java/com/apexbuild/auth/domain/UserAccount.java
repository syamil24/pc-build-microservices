package com.apexbuild.auth.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
public class UserAccount {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String role;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected UserAccount() {
    }

    public static UserAccount create(String email, String passwordHash, String role) {
        return linked(UUID.randomUUID(), email, passwordHash, role);
    }

    public static UserAccount linked(UUID id, String email, String passwordHash, String role) {
        UserAccount user = new UserAccount();
        user.id = id;
        user.email = email.toLowerCase();
        user.passwordHash = passwordHash;
        user.role = role;
        user.createdAt = Instant.now();
        return user;
    }

    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getRole() {
        return role;
    }

    public boolean isEnabled() {
        return enabled;
    }
}
