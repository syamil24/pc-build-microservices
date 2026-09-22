package com.apexbuild.order.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "carts")
public class Cart {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Cart() {
    }

    public static Cart forUser(UUID userId) {
        Cart cart = new Cart();
        cart.id = UUID.randomUUID();
        cart.userId = userId;
        cart.updatedAt = Instant.now();
        return cart;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public void touch() {
        this.updatedAt = Instant.now();
    }
}
