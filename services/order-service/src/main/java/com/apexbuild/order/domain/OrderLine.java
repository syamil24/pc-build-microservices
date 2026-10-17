package com.apexbuild.order.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "order_lines")
public class OrderLine {

    @Id
    private UUID id;

    @Column(name = "order_id", nullable = false)
    private UUID orderId;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "product_name", nullable = false)
    private String productName;

    @Column
    private String sku;

    @Column(name = "category_code")
    private String categoryCode;

    @Column(name = "unit_price_cents", nullable = false)
    private int unitPriceCents;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "line_total_cents", nullable = false)
    private int lineTotalCents;

    @Column(name = "build_id")
    private UUID buildId;

    protected OrderLine() {
    }

    public static OrderLine from(UUID orderId, UUID productId, String name, String sku, String categoryCode,
                                 int unitPriceCents, int quantity, UUID buildId) {
        OrderLine line = new OrderLine();
        line.id = UUID.randomUUID();
        line.orderId = orderId;
        line.productId = productId;
        line.productName = name;
        line.sku = sku;
        line.categoryCode = categoryCode;
        line.unitPriceCents = unitPriceCents;
        line.quantity = quantity;
        line.lineTotalCents = Totals.line(unitPriceCents, quantity);
        line.buildId = buildId;
        return line;
    }

    public String getSku() {
        return sku;
    }

    public String getCategoryCode() {
        return categoryCode;
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

    public int getLineTotalCents() {
        return lineTotalCents;
    }

    public UUID getBuildId() {
        return buildId;
    }
}
