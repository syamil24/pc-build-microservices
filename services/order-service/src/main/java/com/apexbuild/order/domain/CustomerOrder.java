package com.apexbuild.order.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "orders")
public class CustomerOrder {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String status;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(name = "total_cents", nullable = false)
    private int totalCents;

    @Column(name = "address_snapshot", nullable = false)
    private String addressSnapshot;

    @Column(name = "payment_id")
    private UUID paymentId;

    @Column(name = "checkout_url")
    private String checkoutUrl;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected CustomerOrder() {
    }

    public static CustomerOrder create(UUID userId, int totalCents, String addressSnapshot) {
        CustomerOrder order = new CustomerOrder();
        order.id = UUID.randomUUID();
        order.userId = userId;
        order.status = "PENDING_PAYMENT";
        order.currency = "MYR";
        order.totalCents = totalCents;
        order.addressSnapshot = addressSnapshot;
        order.createdAt = Instant.now();
        return order;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public int getTotalCents() {
        return totalCents;
    }

    public String getAddressSnapshot() {
        return addressSnapshot;
    }

    public UUID getPaymentId() {
        return paymentId;
    }

    public void setPaymentId(UUID paymentId) {
        this.paymentId = paymentId;
    }

    public String getCheckoutUrl() {
        return checkoutUrl;
    }

    public void setCheckoutUrl(String checkoutUrl) {
        this.checkoutUrl = checkoutUrl;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public String getCurrency() {
        return currency;
    }
}
