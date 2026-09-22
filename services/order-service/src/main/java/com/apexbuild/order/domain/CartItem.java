package com.apexbuild.order.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "cart_items")
public class CartItem {

    @Id
    private UUID id;

    @Column(name = "cart_id", nullable = false)
    private UUID cartId;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "product_name", nullable = false)
    private String productName;

    @Column(name = "unit_price_cents", nullable = false)
    private int unitPriceCents;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "build_id")
    private UUID buildId;

    protected CartItem() {
    }

    public static CartItem create(UUID cartId, UUID productId, String name, int unitPriceCents, int quantity, UUID buildId) {
        CartItem item = new CartItem();
        item.id = UUID.randomUUID();
        item.cartId = cartId;
        item.productId = productId;
        item.productName = name;
        item.unitPriceCents = unitPriceCents;
        item.quantity = quantity;
        item.buildId = buildId;
        return item;
    }

    public UUID getId() {
        return id;
    }

    public UUID getCartId() {
        return cartId;
    }

    public UUID getProductId() {
        return productId;
    }

    public String getProductName() {
        return productName;
    }

    public int getUnitPriceCents() {
        return unitPriceCents;
    }

    public int getQuantity() {
        return quantity;
    }

    public UUID getBuildId() {
        return buildId;
    }

    public void addQuantity(int more) {
        this.quantity += more;
    }
}
