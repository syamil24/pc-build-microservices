package com.apexbuild.shipping.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Entity
@Table(name = "shipments")
public class Shipment {

    @Id
    private UUID id;

    @Column(name = "order_id", nullable = false, unique = true)
    private UUID orderId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "tracking_number", nullable = false, unique = true)
    private String trackingNumber;

    @Column(nullable = false)
    private String status;

    @Column(name = "carrier_name", nullable = false)
    private String carrierName;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Shipment() {
    }

    public static Shipment open(UUID orderId, UUID userId) {
        Shipment shipment = new Shipment();
        shipment.id = UUID.randomUUID();
        shipment.orderId = orderId;
        shipment.userId = userId;
        shipment.trackingNumber = "APX" + ThreadLocalRandom.current().nextLong(1_000_000_000L, 9_999_999_999L);
        shipment.status = "CREATED";
        shipment.carrierName = "Apex Courier (emulated)";
        shipment.createdAt = Instant.now();
        shipment.updatedAt = shipment.createdAt;
        return shipment;
    }

    public UUID getId() {
        return id;
    }

    public UUID getOrderId() {
        return orderId;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getTrackingNumber() {
        return trackingNumber;
    }

    public String getStatus() {
        return status;
    }

    public String getCarrierName() {
        return carrierName;
    }

    public void setStatus(String status) {
        this.status = status;
        this.updatedAt = Instant.now();
    }
}
