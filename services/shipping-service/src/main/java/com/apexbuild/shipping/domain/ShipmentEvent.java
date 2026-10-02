package com.apexbuild.shipping.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "shipment_events")
public class ShipmentEvent {

    @Id
    private UUID id;

    @Column(name = "shipment_id", nullable = false)
    private UUID shipmentId;

    @Column(nullable = false)
    private String status;

    @Column(nullable = false)
    private String message;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    protected ShipmentEvent() {
    }

    public static ShipmentEvent of(UUID shipmentId, String status) {
        ShipmentEvent event = new ShipmentEvent();
        event.id = UUID.randomUUID();
        event.shipmentId = shipmentId;
        event.status = status;
        event.message = ShipmentFlow.message(status);
        event.occurredAt = Instant.now();
        return event;
    }

    public String getStatus() {
        return status;
    }

    public String getMessage() {
        return message;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }
}
