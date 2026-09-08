package com.apexbuild.user.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "profiles")
public class Profile {

    @Id
    private UUID id;

    @Column(name = "auth_user_id", nullable = false, unique = true)
    private UUID authUserId;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    private String phone;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Profile() {
    }

    public static Profile create(UUID authUserId, String email, String fullName) {
        Profile profile = new Profile();
        profile.id = UUID.randomUUID();
        profile.authUserId = authUserId;
        profile.email = email.toLowerCase();
        profile.fullName = fullName;
        profile.createdAt = Instant.now();
        return profile;
    }

    public UUID getId() {
        return id;
    }

    public UUID getAuthUserId() {
        return authUserId;
    }

    public String getEmail() {
        return email;
    }

    public String getFullName() {
        return fullName;
    }

    public String getPhone() {
        return phone;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }
}
