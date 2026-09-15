package com.apexbuild.inventory.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "reservation_lines")
public class ReservationLine {

    @Id
    private UUID id;

    @Column(name = "reservation_id", nullable = false)
    private UUID reservationId;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(nullable = false)
    private int quantity;

    protected ReservationLine() {
    }

    public static ReservationLine of(UUID reservationId, UUID productId, int quantity) {
        ReservationLine line = new ReservationLine();
        line.id = UUID.randomUUID();
        line.reservationId = reservationId;
        line.productId = productId;
        line.quantity = quantity;
        return line;
    }

    public UUID getProductId() {
        return productId;
    }

    public int getQuantity() {
        return quantity;
    }
}
